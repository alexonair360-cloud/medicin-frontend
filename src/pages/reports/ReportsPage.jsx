import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ReportsPage.module.css';
import Loader from '../../components/ui/Loader.jsx';
import { getExpiringBatches, getMedicines, getSalesReport, getStockSummary } from '../../api/reportService';

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
  const [type, setType] = useState('expiry'); // expiry | lowstock | sales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tableRef = useRef(null);

  // Data stores
  const [expiring, setExpiring] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [salesSeries, setSalesSeries] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        if (type === 'expiry') {
          const exp = await getExpiringBatches({ days: 30 });
          setExpiring(Array.isArray(exp) ? exp : (exp?.batches || []));
        } else if (type === 'lowstock') {
          const [meds, stock] = await Promise.all([
            getMedicines(),
            getStockSummary(),
          ]);
          setMedicines(meds || []);
          setStockSummary(stock || []);
        } else if (type === 'sales') {
          const sales = await getSalesReport({ range: 'last30' });
          const series = Array.isArray(sales) ? sales : (sales?.series || sales?.data || []);
          setSalesSeries(series);
        }
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [type]);

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

  const onExport = () => {
    const filename = type === 'expiry' ? 'expiry_report' : type === 'lowstock' ? 'low_stock_report' : 'sales_report';
    downloadExcelFromTable(`${filename}.xls`, tableRef.current);
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
          <button className={styles.button} onClick={onExport}>Export Excel</button>
        </div>
      </div>

      {error && <div style={{ color: 'var(--status-danger)', marginBottom: '0.75rem' }}>{error}</div>}

      {loading ? (
        <Loader />
      ) : (
        <>
          {type === 'expiry' && (
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
                  ) : (expiring || []).map((b, idx) => (
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
          )}

          {type === 'lowstock' && (
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
                  ) : (lowStockRows || []).map((r, idx) => (
                    <tr key={`${r.name}-${idx}`}>
                      <td className={styles.td}>{r.name}</td>
                      <td className={`${styles.td} ${styles.center}`}>{r.qty}</td>
                      <td className={`${styles.td} ${styles.center}`}>{r.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === 'sales' && (
            <div className={styles.tableWrap}>
              <table className={styles.table} ref={tableRef}>
                <thead className={styles.thead}>
                  <tr>
                    <th className={styles.th}>Date</th>
                    <th className={`${styles.th} ${styles.center}`}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(salesSeries || []).length === 0 ? (
                    <tr><td className={styles.td} colSpan={2} style={{ padding: '1rem', textAlign: 'center' }}>No data</td></tr>
                  ) : (salesSeries || []).map((s, idx) => (
                    <tr key={`${s.date || s.day || s._id || s.x}-${idx}`}>
                      <td className={styles.td}>{new Date(s.date || s.day || s._id || s.x).toLocaleDateString()}</td>
                      <td className={`${styles.td} ${styles.center}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(s.total || s.amount || s.y || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
