import React, { useEffect, useMemo, useState } from 'react';
import Style from './Dashboard.module.css';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import ReactPaginate from 'react-paginate';
import { toast } from 'react-toastify';
import api from '../../api/ApiClient';
import { getSalesReport, getExpiringBatches, getMedicines, getStockSummary } from '../../api/reportService';
import Loader from '../../components/ui/Loader.jsx';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [stockSummary, setStockSummary] = useState([]); // [{ _id: medicineId, totalQty }]
  const [expiring, setExpiring] = useState({ items: [], total: 0, page: 1 });
  const [lowStock, setLowStock] = useState({ items: [], total: 0, page: 1 });
  const [salesSeries, setSalesSeries] = useState([]); // [{ date, sales, profit }]
  const [salesRange, setSalesRange] = useState('last30'); // last7 | last15 | last30
  const [expiringPage, setExpiringPage] = useState(1);
  const [lowStockPage, setLowStockPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({ show: false, type: '', id: '', name: '' });

  // Fetch KPIs only once on mount
  useEffect(() => {
    const fetchKPIs = async () => {
      setLoading(true);
      setError('');
      try {
        const [meds, stock] = await Promise.all([
          getMedicines(),
          getStockSummary(),
        ]);
        setMedicines(meds || []);
        setStockSummary(stock || []);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchKPIs();
  }, []);

  // Fetch expiring batches with pagination
  useEffect(() => {
    const fetchExpiring = async () => {
      try {
        const response = await getExpiringBatches({ days: 30, page: expiringPage, limit: 10 });
        setExpiring(response || { items: [], total: 0, page: 1 });
      } catch (e) {
        console.error('Failed to load expiring batches:', e);
      }
    };
    fetchExpiring();
  }, [expiringPage]);

  // Fetch low stock with pagination
  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const { data } = await api.get('/reports/low-stock', {
          params: { page: lowStockPage, limit: 10 }
        });
        setLowStock(data || { items: [], total: 0, page: 1 });
      } catch (e) {
        console.error('Failed to load low stock:', e);
      }
    };
    fetchLowStock();
  }, [lowStockPage]);

  // Fetch sales data when range changes
  useEffect(() => {
    const fetchSales = async () => {
      try {
        // Calculate date range
        const to = new Date();
        const from = new Date();
        if (salesRange === 'last7') from.setDate(from.getDate() - 7);
        else if (salesRange === 'last15') from.setDate(from.getDate() - 15);
        else from.setDate(from.getDate() - 30);

        const salesReport = await getSalesReport({ 
          from: from.toISOString().slice(0, 10), 
          to: to.toISOString().slice(0, 10) 
        });
        
        // Extract daily data with sales and profit
        const dailyData = salesReport?.daily?.items || [];
        setSalesSeries(dailyData);
      } catch (e) {
        console.error('Failed to load sales data:', e);
      }
    };
    fetchSales();
  }, [salesRange]);

  const stockMap = useMemo(() => {
    const map = {};
    (stockSummary || []).forEach(r => { if (r && r._id) map[String(r._id)] = r.totalQty || 0; });
    return map;
  }, [stockSummary]);

  const lowStockCount = useMemo(() => lowStock.total || 0, [lowStock]);
  const expiringCount = useMemo(() => expiring.total || 0, [expiring]);

  const todayProfit = useMemo(() => {
    // Try to find entry for today; else fall back to last point
    const toISODate = (d) => new Date(d).toISOString().slice(0, 10);
    const today = toISODate(new Date());
    const found = (salesSeries || []).find(s => toISODate(s.date) === today);
    const val = found ? (found.profit || 0) : (salesSeries.slice(-1)[0]?.profit || 0);
    return Number(val) || 0;
  }, [salesSeries]);

  // Sales and Profit trend dataset
  const salesChart = useMemo(() => {
    const labels = (salesSeries || []).map(s => {
      const d = new Date(s.date);
      if (Number.isNaN(d.getTime())) return '';
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const salesData = (salesSeries || []).map(s => Number(s.sales || 0));
    const profitData = (salesSeries || []).map(s => Number(s.profit || 0));
    
    return {
      labels,
      datasets: [
        {
          label: 'Total Sales',
          data: salesData,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#EF4444',
        },
        {
          label: 'Profit',
          data: profitData,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#10B981',
        },
      ],
    };
  }, [salesSeries]);

  // Top stock items (by quantity)
  const topStock = useMemo(() => {
    const joined = (medicines || []).map(m => ({
      id: m._id,
      name: m.name,
      qty: stockMap[String(m._id)] || 0,
    }));
    joined.sort((a, b) => b.qty - a.qty);
    return joined.slice(0, 5);
  }, [medicines, stockMap]);

  const topStockChart = useMemo(() => ({
    labels: topStock.map(x => x.name),
    datasets: [{
      label: 'Units',
      data: topStock.map(x => x.qty),
      backgroundColor: 'rgba(17, 180, 212, 0.35)',
      borderRadius: 6,
    }],
  }), [topStock]);

  // Show delete confirmation modal
  const showDeleteConfirmation = (type, id, name) => {
    setDeleteModal({ show: true, type, id, name });
  };

  // Confirm delete action
  const confirmDelete = async () => {
    const { type, id, name } = deleteModal;
    setDeleteModal({ show: false, type: '', id: '', name: '' });
    
    try {
      if (type === 'medicine') {
        await api.delete(`/medicines/${id}`);
        toast.success('Medicine deleted successfully');
        
        // Refresh data
        const [meds, stock, lowStockData] = await Promise.all([
          getMedicines(),
          getStockSummary(),
          api.get('/reports/low-stock', { params: { page: lowStockPage, limit: 10 } })
        ]);
        setMedicines(meds || []);
        setStockSummary(stock || []);
        setLowStock(lowStockData.data || { items: [], total: 0, page: 1 });
      } else if (type === 'batch') {
        await api.delete(`/batches/${id}`);
        toast.success('Batch deleted successfully');
        
        // Refresh expiring batches
        const response = await getExpiringBatches({ days: 30, page: expiringPage, limit: 10 });
        setExpiring(response || { items: [], total: 0, page: 1 });
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to delete ${type}`);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteModal({ show: false, type: '', id: '', name: '' });
  };

  return (
    <div className={Style.container}>
      <h1 className={Style.title}>Dashboard</h1>
      <p className={Style.subtitle}>Overview of key metrics and alerts for your medical shop.</p>

      {error && <div style={{ color: 'var(--status-danger)', marginTop: '0.75rem' }}>{error}</div>}

      {/* KPIs */}
      <section style={{ marginTop: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Key Performance Indicators</h2>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--background-light)' }}>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.25rem' }}>Low Stock Count</p>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-danger)' }}>{loading ? '—' : lowStockCount}</p>
          </div>
          <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--background-light)' }}>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.25rem' }}>Expiring Medicines Count</p>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#F59E0B' }}>{loading ? '—' : expiringCount}</p>
          </div>
          <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--background-light)' }}>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.25rem' }}>Today's Profit</p>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981' }}>{loading ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(todayProfit)}</p>
          </div>
        </div>
      </section>

      {/* Sales Trends */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Sales & Profit Trends</h2>
        <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--background-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 500, opacity: 0.8 }}>Total Sales & Profit</p>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444' }}>{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((salesSeries || []).reduce((s, x) => s + Number(x.sales || 0), 0))}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981' }}>{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((salesSeries || []).reduce((s, x) => s + Number(x.profit || 0), 0))}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={() => setSalesRange('last7')} className={`btn-range ${salesRange==='last7' ? 'active' : ''}`} style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', background: salesRange==='last7' ? 'rgba(17,180,212,0.15)' : 'transparent' }}>7d</button>
              <button onClick={() => setSalesRange('last15')} className={`btn-range ${salesRange==='last15' ? 'active' : ''}`} style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', background: salesRange==='last15' ? 'rgba(17,180,212,0.15)' : 'transparent' }}>15d</button>
              <button onClick={() => setSalesRange('last30')} className={`btn-range ${salesRange==='last30' ? 'active' : ''}`} style={{ padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', background: salesRange==='last30' ? 'rgba(17,180,212,0.15)' : 'transparent' }}>30d</button>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <Line
              data={salesChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    left: 10,
                    right: 10,
                    top: 10,
                    bottom: 0
                  }
                },
                scales: {
                  y: { 
                    beginAtZero: true, 
                    ticks: { 
                      precision: 0,
                      padding: 10
                    },
                    grid: {
                      drawBorder: true,
                      color: 'rgba(0, 0, 0, 0.05)'
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      padding: 5
                    }
                  }
                },
                plugins: { 
                  legend: { 
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                      usePointStyle: true,
                      padding: 15,
                      font: { size: 12 }
                    }
                  } 
                },
              }}
            />
          </div>
        </div>
      </section>

      {/* Inventory Top Items */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Inventory Top Items</h2>
        <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--background-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 500, opacity: 0.8 }}>Top Stocked</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{topStock.reduce((s, x) => s + x.qty, 0)} Units</p>
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Last Inventory Snapshot</div>
          </div>
          <div style={{ height: 260 }}>
            <Bar
              data={topStockChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>
      </section>

      {/* Low Stock and Expiring Tables */}
      <section>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--background-light)' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Low Stock</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.7 }}>
                    <th style={{ padding: '0.5rem' }}>Medicine</th>
                    <th style={{ padding: '0.5rem' }}>Qty</th>
                    <th style={{ padding: '0.5rem' }}>Threshold</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(lowStock.items || []).length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '0.75rem', opacity: 0.7 }}>No low stock items</td></tr>
                  ) : lowStock.items.map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{r.name}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{r.qty}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{r.threshold}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                        <button 
                          onClick={() => showDeleteConfirmation('medicine', r.id, r.name)}
                          style={{ 
                            padding: '0.25rem 0.5rem', 
                            fontSize: '0.85rem',
                            background: '#EF4444', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer' 
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lowStock.total > 10 && (
              <div style={{ marginTop: '1rem' }}>
                <ReactPaginate
                  breakLabel="…"
                  nextLabel=">"
                  onPageChange={(ev) => setLowStockPage(ev.selected + 1)}
                  pageRangeDisplayed={2}
                  marginPagesDisplayed={1}
                  pageCount={Math.ceil(lowStock.total / 10)}
                  previousLabel="<"
                  renderOnZeroPageCount={null}
                  forcePage={lowStockPage - 1}
                  containerClassName={Style.pagination}
                  pageClassName={Style.pageItem}
                  pageLinkClassName={Style.pageLink}
                  activeClassName={Style.active}
                  previousClassName={Style.pageItem}
                  nextClassName={Style.pageItem}
                  previousLinkClassName={Style.pageLink}
                  nextLinkClassName={Style.pageLink}
                  disabledClassName={Style.disabled}
                />
              </div>
            )}
          </div>
          <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--background-light)' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Expiring Soon</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.7 }}>
                    <th style={{ padding: '0.5rem' }}>Medicine</th>
                    <th style={{ padding: '0.5rem' }}>Batch</th>
                    <th style={{ padding: '0.5rem' }}>Expiry</th>
                    <th style={{ padding: '0.5rem' }}>Qty</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(expiring.items || []).length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '0.75rem', opacity: 0.7 }}>No upcoming expiries</td></tr>
                  ) : expiring.items.map((b, idx) => (
                    <tr key={`${b.batchNo}-${idx}`}>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{b.medicineName}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{b.batchNo || b.batch || '—'}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{b.quantity || b.qty || 0}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                        <button 
                          onClick={() => showDeleteConfirmation('batch', b._id, b.batchNo || b.batch)}
                          style={{ 
                            padding: '0.25rem 0.5rem', 
                            fontSize: '0.85rem',
                            background: '#EF4444', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer' 
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {expiring.total > 10 && (
              <div style={{ marginTop: '1rem' }}>
                <ReactPaginate
                  breakLabel="…"
                  nextLabel=">"
                  onPageChange={(ev) => setExpiringPage(ev.selected + 1)}
                  pageRangeDisplayed={2}
                  marginPagesDisplayed={1}
                  pageCount={Math.ceil(expiring.total / 10)}
                  previousLabel="<"
                  renderOnZeroPageCount={null}
                  forcePage={expiringPage - 1}
                  containerClassName={Style.pagination}
                  pageClassName={Style.pageItem}
                  pageLinkClassName={Style.pageLink}
                  activeClassName={Style.active}
                  previousClassName={Style.pageItem}
                  nextClassName={Style.pageItem}
                  previousLinkClassName={Style.pageLink}
                  nextLinkClassName={Style.pageLink}
                  disabledClassName={Style.disabled}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>
              Confirm Delete
            </h3>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              {deleteModal.type === 'medicine' 
                ? `Are you sure you want to delete "${deleteModal.name}"? This will also delete all associated batches.`
                : `Are you sure you want to delete batch "${deleteModal.name}"?`
              }
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelDelete}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.5rem',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  background: '#EF4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
