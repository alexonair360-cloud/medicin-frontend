import React, { useEffect, useMemo, useState } from 'react';
import Style from './Dashboard.module.css';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { getSalesReport, getExpiringBatches, getMedicines, getStockSummary } from '../../api/reportService';
import Loader from '../../components/ui/Loader.jsx';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [stockSummary, setStockSummary] = useState([]); // [{ _id: medicineId, totalQty }]
  const [expiring, setExpiring] = useState([]);
  const [salesSeries, setSalesSeries] = useState([]); // [{ date, total }]
  const [salesRange, setSalesRange] = useState('last30'); // last7 | last15 | last30

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [meds, stock, exp, sales] = await Promise.all([
          getMedicines(),
          getStockSummary(),
          getExpiringBatches({ days: 30 }),
          getSalesReport(salesRange === 'last15' ? { days: 15 } : { range: salesRange }),
        ]);
        setMedicines(meds || []);
        setStockSummary(stock || []);
        setExpiring(Array.isArray(exp) ? exp : (exp?.batches || []));
        const salesArr = Array.isArray(sales) ? sales : (sales?.series || sales?.data || []);
        setSalesSeries(salesArr);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [salesRange]);

  const stockMap = useMemo(() => {
    const map = {};
    (stockSummary || []).forEach(r => { if (r && r._id) map[String(r._id)] = r.totalQty || 0; });
    return map;
  }, [stockSummary]);

  const lowStockCount = useMemo(() => {
    return (medicines || []).reduce((acc, m) => {
      const threshold = typeof m.defaultLowStockThreshold === 'number' ? m.defaultLowStockThreshold : 0;
      const qty = stockMap[String(m._id)] || 0;
      return acc + (qty <= threshold ? 1 : 0);
    }, 0);
  }, [medicines, stockMap]);

  const expiringCount = useMemo(() => (expiring || []).length, [expiring]);

  const lowStockItems = useMemo(() => {
    const rows = (medicines || []).map(m => {
      const qty = stockMap[String(m._id)] || 0;
      const threshold = typeof m.defaultLowStockThreshold === 'number' ? m.defaultLowStockThreshold : 0;
      return { id: m._id, name: m.name, qty, threshold };
    }).filter(r => r.qty <= r.threshold);
    rows.sort((a, b) => a.qty - b.qty);
    return rows.slice(0, 8);
  }, [medicines, stockMap]);

  const expiringSoonItems = useMemo(() => {
    const rows = (expiring || []).map(b => ({
      medicineName: b.medicineId?.name || b.medicineName || b.medicine?.name || b.name || '—',
      batchNo: b.batchNo || b.batch || '—',
      expiryDate: b.expiryDate || b.expiry || b.date,
      quantity: b.quantity || b.qty || 0,
    }));
    return rows.slice(0, 8);
  }, [expiring]);

  const todaySales = useMemo(() => {
    // Try to find entry for today; else fall back to last point
    const toISODate = (d) => new Date(d).toISOString().slice(0, 10);
    const today = toISODate(new Date());
    const found = (salesSeries || []).find(s => toISODate(s.date || s.day || s._id || s.x) === today);
    const val = found ? (found.total || found.amount || found.y || 0) : (salesSeries.slice(-1)[0]?.total || salesSeries.slice(-1)[0]?.amount || 0);
    return Number(val) || 0;
  }, [salesSeries]);

  // Sales trend dataset
  const salesChart = useMemo(() => {
    const labels = (salesSeries || []).map(s => {
      const d = new Date(s.date || s.day || s._id || s.x);
      if (Number.isNaN(d.getTime())) return '';
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const data = (salesSeries || []).map(s => Number(s.total || s.amount || s.y || 0));
    return {
      labels,
      datasets: [
        {
          label: 'Sales',
          data,
          borderColor: '#11b4d4',
          backgroundColor: 'rgba(17, 180, 212, 0.25)',
          fill: true,
          tension: 0.35,
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
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981' }}>{loading ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(todaySales)}</p>
          </div>
        </div>
      </section>

      {/* Sales Trends */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Profit Trends</h2>
        <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--background-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 500, opacity: 0.8 }}>Profit Over Time</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((salesSeries || []).reduce((s, x) => s + Number(x.total || x.amount || x.y || 0), 0))}</p>
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
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                },
                plugins: { legend: { display: false } },
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
                  </tr>
                </thead>
                <tbody>
                  {(lowStockItems || []).length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: '0.75rem', opacity: 0.7 }}>No low stock items</td></tr>
                  ) : lowStockItems.map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{r.name}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{r.qty}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{r.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  </tr>
                </thead>
                <tbody>
                  {(expiringSoonItems || []).length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '0.75rem', opacity: 0.7 }}>No upcoming expiries</td></tr>
                  ) : expiringSoonItems.map((b, idx) => (
                    <tr key={`${b.batchNo}-${idx}`}>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{b.medicineName}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{b.batchNo}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>{b.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
