import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ReportsPage.module.css';
import Loader from '../../components/ui/Loader.jsx';
import ReactPaginate from 'react-paginate';
import { getExpiringBatches, getMedicines, getSalesReport, getStockSummary } from '../../api/reportService';
import * as XLSX from 'xlsx';
import api from '../../api/ApiClient';

const toCSV = (headers, rows) => {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    if (s.search(/[",\n]/g) >= 0) return `"${s}"`;
    return s;
  };
  const headerLine = headers.map(escape).join(',');
  const lines = rows.map(r => r.map(escape).join(','));
  return [headerLine, ...lines].join('\n');
};

const downloadCSV = (filename, headers, rows) => {
  const csv = toCSV(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export the currently rendered HTML table as an Excel-compatible .xls file
const downloadExcelFromTable = (filename, tableEl) => {
  if (!tableEl) return;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    </head><body>${tableEl.outerHTML}</body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const ReportsPage = () => {
  const [type, setType] = useState('sales'); // expiry | lowstock | sales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tableRef = useRef(null);
  // Sales date range
  const todayISO = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(todayISO);
  const [debouncedFrom, setDebouncedFrom] = useState(defaultFrom);
  const [debouncedTo, setDebouncedTo] = useState(todayISO);

  // Data stores
  const [expiring, setExpiring] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesDaily, setSalesDaily] = useState({ items: [], total: 0, page: 1 });
  const [topCustomers, setTopCustomers] = useState({ items: [], total: 0, page: 1 });
  const [topProducts, setTopProducts] = useState({ items: [], total: 0, page: 1 });

  // Pagination states
  const [expiryPage, setExpiryPage] = useState(0);
  const [lowStockPage, setLowStockPage] = useState(0);
  const [dailyPage, setDailyPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        if (type === 'expiry') {
          const exp = await getExpiringBatches({ days: 30, limit: 1000 });
          // Handle both array and paginated response
          if (Array.isArray(exp)) {
            setExpiring(exp);
          } else if (exp?.items) {
            setExpiring(exp.items);
          } else {
            setExpiring(exp?.batches || []);
          }
        } else if (type === 'lowstock') {
          const [meds, stock] = await Promise.all([
            getMedicines(),
            getStockSummary(),
          ]);
          setMedicines(meds || []);
          setStockSummary(stock || []);
        } else if (type === 'sales') {
          const params = { 
            from: debouncedFrom, 
            to: debouncedTo,
            dailyPage,
            customersPage,
            productsPage
          };
          const data = await getSalesReport(params);
          setSalesSummary(data?.summary || null);
          setSalesDaily(data?.daily || { items: [], total: 0, page: 1 });
          setTopCustomers(data?.topCustomers || { items: [], total: 0, page: 1 });
          setTopProducts(data?.topProducts || { items: [], total: 0, page: 1 });
        }
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [type, debouncedFrom, debouncedTo, dailyPage, customersPage, productsPage]);

  // Debounce date range changes for sales
  useEffect(() => {
    if (type !== 'sales') return; // only when sales is active
    const t = setTimeout(() => {
      setDebouncedFrom(fromDate);
      setDebouncedTo(toDate);
    }, 500);
    return () => clearTimeout(t);
  }, [type, fromDate, toDate]);

  const stockMap = useMemo(() => {
    const map = {};
    (stockSummary || []).forEach(r => { if (r && r._id) map[String(r._id)] = r.totalQty || 0; });
    return map;
  }, [stockSummary]);

  const lowStockRows = useMemo(() => {
    if (type !== 'lowstock') return [];
    const rows = (medicines || []).map(m => {
      const qty = stockMap[String(m._id)] || 0;
      const threshold = typeof m.defaultLowStockThreshold === 'number' ? m.defaultLowStockThreshold : 0;
      return { name: m.name, qty, threshold };
    }).filter(r => r.qty <= r.threshold);
    rows.sort((a, b) => a.qty - b.qty);
    return rows;
  }, [type, medicines, stockMap]);

  // Paginated expiry data
  const paginatedExpiring = useMemo(() => {
    const start = expiryPage * pageSize;
    return (expiring || []).slice(start, start + pageSize);
  }, [expiring, expiryPage]);

  // Paginated low stock data
  const paginatedLowStock = useMemo(() => {
    const start = lowStockPage * pageSize;
    return lowStockRows.slice(start, start + pageSize);
  }, [lowStockRows, lowStockPage]);

  // Reset pagination when report type changes
  useEffect(() => {
    setExpiryPage(0);
    setLowStockPage(0);
  }, [type]);

  const onExport = async () => {
    try {
      let endpoint = '';
      let filename = '';
      let params = {};

      if (type === 'sales') {
        endpoint = '/reports/sales/export-excel';
        filename = 'sales_report.xlsx';
        params = { from: fromDate, to: toDate };
      } else if (type === 'expiry') {
        endpoint = '/reports/expiring-batches/export-excel';
        filename = 'expiry_report.xlsx';
        params = { days: 30 };
      } else if (type === 'lowstock') {
        endpoint = '/reports/low-stock/export-excel';
        filename = 'low_stock_report.xlsx';
        params = {};
      }

      // Download from backend
      const response = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Reports</h2>
        <div className={styles.toolbar}>
          <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expiry">Expiry Report</option>
            <option value="lowstock">Low Stock Report</option>
            <option value="sales">Sales Report</option>
          </select>
          {type === 'sales' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ fontSize: 12, opacity: 0.8 }}>From</label>
              <input type="date" className={styles.select} value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} />
              <label style={{ fontSize: 12, opacity: 0.8 }}>To</label>
              <input type="date" className={styles.select} value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          )}
          <button className={styles.button} onClick={onExport}>Export Excel</button>
        </div>
      </div>

      {error && <div style={{ color: 'var(--status-danger)', marginBottom: '0.75rem' }}>{error}</div>}

      {loading ? (
        <Loader />
      ) : (
        <>
          {type === 'expiry' && (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table} ref={tableRef}>
                  <thead className={styles.thead}>
                    <tr>
                      <th className={styles.th}>Medicine</th>
                      <th className={styles.th}>Batch</th>
                      <th className={styles.th}>Expiry</th>
                      <th className={`${styles.th} ${styles.center}`}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expiring || []).length === 0 ? (
                      <tr><td className={styles.td} colSpan={4} style={{ padding: '1rem', textAlign: 'center' }}>No upcoming expiries</td></tr>
                    ) : paginatedExpiring.map((b, idx) => (
                      <tr key={`${b.batchNo || b.batch || 'batch'}-${idx}`}>
                        <td className={styles.td}>{b.medicineId?.name || b.medicineName || b.medicine?.name || b.name || '-'}</td>
                        <td className={styles.td}>{b.batchNo || b.batch || '-'}</td>
                        <td className={styles.td}>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : (b.expiry || b.date ? new Date(b.expiry || b.date).toLocaleDateString() : '-')}</td>
                        <td className={`${styles.td} ${styles.center}`}>{b.quantity || b.qty || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {expiring.length > pageSize && (
                <div className={styles.paginationWrap}>
                  <ReactPaginate
                    breakLabel="…"
                    nextLabel=">"
                    onPageChange={(ev) => setExpiryPage(ev.selected)}
                    pageRangeDisplayed={3}
                    marginPagesDisplayed={1}
                    pageCount={Math.ceil(expiring.length / pageSize)}
                    previousLabel="<"
                    renderOnZeroPageCount={null}
                    forcePage={expiryPage}
                    containerClassName={styles.pagination}
                    pageClassName={styles.pageItem}
                    pageLinkClassName={styles.pageLink}
                    activeClassName={styles.active}
                    previousClassName={styles.pageItem}
                    nextClassName={styles.pageItem}
                    previousLinkClassName={styles.pageLink}
                    nextLinkClassName={styles.pageLink}
                    disabledClassName={styles.disabled}
                  />
                </div>
              )}
            </>
          )}

          {type === 'lowstock' && (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table} ref={tableRef}>
                  <thead className={styles.thead}>
                    <tr>
                      <th className={styles.th}>Medicine</th>
                      <th className={`${styles.th} ${styles.center}`}>Qty</th>
                      <th className={`${styles.th} ${styles.center}`}>Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lowStockRows || []).length === 0 ? (
                      <tr><td className={styles.td} colSpan={3} style={{ padding: '1rem', textAlign: 'center' }}>No low stock items</td></tr>
                    ) : paginatedLowStock.map((r, idx) => (
                      <tr key={`${r.name}-${idx}`}>
                        <td className={styles.td}>{r.name}</td>
                        <td className={`${styles.td} ${styles.center}`}>{r.qty}</td>
                        <td className={`${styles.td} ${styles.center}`}>{r.threshold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lowStockRows.length > pageSize && (
                <div className={styles.paginationWrap}>
                  <ReactPaginate
                    breakLabel="…"
                    nextLabel=">"
                    onPageChange={(ev) => setLowStockPage(ev.selected)}
                    pageRangeDisplayed={3}
                    marginPagesDisplayed={1}
                    pageCount={Math.ceil(lowStockRows.length / pageSize)}
                    previousLabel="<"
                    renderOnZeroPageCount={null}
                    forcePage={lowStockPage}
                    containerClassName={styles.pagination}
                    pageClassName={styles.pageItem}
                    pageLinkClassName={styles.pageLink}
                    activeClassName={styles.active}
                    previousClassName={styles.pageItem}
                    nextClassName={styles.pageItem}
                    previousLinkClassName={styles.pageLink}
                    nextLinkClassName={styles.pageLink}
                    disabledClassName={styles.disabled}
                  />
                </div>
              )}
            </>
          )}

          {type === 'sales' && (
            <>
              {/* KPIs */}
              <div className={styles.kpis}>
                <div className={styles.kpi}>
                  <div className={styles.kpiTitle}>Total Sales</div>
                  <div className={styles.kpiValue}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(salesSummary?.totalSales || 0)}</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiTitle}>Orders</div>
                  <div className={styles.kpiValue}>{salesSummary?.orders || 0}</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiTitle}>Profit</div>
                  <div className={styles.kpiValue}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(salesSummary?.totalProfit || 0)}</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiTitle}>Discount</div>
                  <div className={styles.kpiValue}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(salesSummary?.totalDiscount || 0)}</div>
                </div>
              </div>

              {/* Daily breakdown */}
              <div className={styles.tableWrap}>
                <div className={styles.sectionTitle}>Daily Breakdown</div>
                <table className={styles.table} ref={tableRef}>
                  <thead className={styles.thead}>
                    <tr>
                      <th className={styles.th}>Date</th>
                      <th className={`${styles.th} ${styles.center}`}>Orders</th>
                      <th className={`${styles.th} ${styles.center}`}>Sales</th>
                      <th className={`${styles.th} ${styles.center}`}>Discount</th>
                      <th className={`${styles.th} ${styles.center}`}>GST</th>
                      <th className={`${styles.th} ${styles.center}`}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(salesDaily.items || []).length === 0 ? (
                      <tr><td className={styles.td} colSpan={6} style={{ padding: '1rem', textAlign: 'center' }}>No data</td></tr>
                    ) : (salesDaily.items || []).map((r, idx) => (
                      <tr key={`${r.date}-${idx}`}>
                        <td className={styles.td}>{new Date(r.date).toLocaleDateString()}</td>
                        <td className={`${styles.td} ${styles.center}`}>{r.orders}</td>
                        <td className={`${styles.td} ${styles.center}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(r.sales || 0)}</td>
                        <td className={`${styles.td} ${styles.center}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(r.discount || 0)}</td>
                        <td className={`${styles.td} ${styles.center}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(r.gst || 0)}</td>
                        <td className={`${styles.td} ${styles.center}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(r.net || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {salesDaily.total > 10 && (
                  <div className={styles.paginationWrap}>
                    <ReactPaginate
                      breakLabel="…"
                      nextLabel=">"
                      onPageChange={(ev) => setDailyPage(ev.selected + 1)}
                      pageRangeDisplayed={3}
                      marginPagesDisplayed={1}
                      pageCount={Math.ceil(salesDaily.total / 10)}
                      previousLabel="<"
                      renderOnZeroPageCount={null}
                      forcePage={dailyPage - 1}
                      containerClassName={styles.pagination}
                      pageClassName={styles.pageItem}
                      pageLinkClassName={styles.pageLink}
                      activeClassName={styles.active}
                      previousClassName={styles.pageItem}
                      nextClassName={styles.pageItem}
                      previousLinkClassName={styles.pageLink}
                      nextLinkClassName={styles.pageLink}
                      disabledClassName={styles.disabled}
                    />
                  </div>
                )}
              </div>

              {/* Top lists */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div className={styles.tableWrap}>
                  <div className={styles.sectionTitle}>Top Customers</div>
                  <table className={styles.table}>
                    <thead className={styles.thead}>
                      <tr>
                        <th className={styles.th}>Customer</th>
                        <th className={`${styles.th} ${styles.center}`}>Orders</th>
                        <th className={`${styles.th} ${styles.center}`}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(topCustomers.items || []).length === 0 ? (
                        <tr><td className={styles.td} colSpan={3} style={{ padding: '1rem', textAlign: 'center' }}>No data</td></tr>
                      ) : (topCustomers.items || []).map((c, idx) => (
                        <tr key={`${c.customerId || idx}`}>
                          <td className={styles.td}>{c.name || '-'}{c.phone ? ` (${c.phone})` : ''}</td>
                          <td className={`${styles.td} ${styles.center}`}>{c.orders || 0}</td>
                          <td className={`${styles.td} ${styles.center}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(c.total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {topCustomers.total > 10 && (
                    <div className={styles.paginationWrap}>
                      <ReactPaginate
                        breakLabel="…"
                        nextLabel=">"
                        onPageChange={(ev) => setCustomersPage(ev.selected + 1)}
                        pageRangeDisplayed={3}
                        marginPagesDisplayed={1}
                        pageCount={Math.ceil(topCustomers.total / 10)}
                        previousLabel="<"
                        renderOnZeroPageCount={null}
                        forcePage={customersPage - 1}
                        containerClassName={styles.pagination}
                        pageClassName={styles.pageItem}
                        pageLinkClassName={styles.pageLink}
                        activeClassName={styles.active}
                        previousClassName={styles.pageItem}
                        nextClassName={styles.pageItem}
                        previousLinkClassName={styles.pageLink}
                        nextLinkClassName={styles.pageLink}
                        disabledClassName={styles.disabled}
                      />
                    </div>
                  )}
                </div>
                <div className={styles.tableWrap}>
                  <div className={styles.sectionTitle}>Top Products</div>
                  <table className={styles.table}>
                    <thead className={styles.thead}>
                      <tr>
                        <th className={styles.th}>Product</th>
                        <th className={`${styles.th} ${styles.center}`}>Qty</th>
                        <th className={`${styles.th} ${styles.center}`}>Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(topProducts.items || []).length === 0 ? (
                        <tr><td className={styles.td} colSpan={3} style={{ padding: '1rem', textAlign: 'center' }}>No data</td></tr>
                      ) : (topProducts.items || []).map((p, idx) => (
                        <tr key={`${p.name || idx}`}>
                          <td className={styles.td}>{p.name || '-'}</td>
                          <td className={`${styles.td} ${styles.center}`}>{p.qty || 0}</td>
                          <td className={`${styles.td} ${styles.center}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.sales || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {topProducts.total > 10 && (
                    <div className={styles.paginationWrap}>
                      <ReactPaginate
                        breakLabel="…"
                        nextLabel=">"
                        onPageChange={(ev) => setProductsPage(ev.selected + 1)}
                        pageRangeDisplayed={3}
                        marginPagesDisplayed={1}
                        pageCount={Math.ceil(topProducts.total / 10)}
                        previousLabel="<"
                        renderOnZeroPageCount={null}
                        forcePage={productsPage - 1}
                        containerClassName={styles.pagination}
                        pageClassName={styles.pageItem}
                        pageLinkClassName={styles.pageLink}
                        activeClassName={styles.active}
                        previousClassName={styles.pageItem}
                        nextClassName={styles.pageItem}
                        previousLinkClassName={styles.pageLink}
                        nextLinkClassName={styles.pageLink}
                        disabledClassName={styles.disabled}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
