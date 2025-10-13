import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/ApiClient';

const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));

const BillingPrint = () => {
  const { billId, customerId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [store, setStore] = useState({
    name: 'Thangam Medicals',
    subtitle: 'Pharmacy & General Stores',
    phone: '00000 00000',
    address: '',
    gstin: '',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/bills/${billId}`);
        setBill(data);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load bill');
      } finally { setLoading(false); }
    };
    if (billId) load();
  }, [billId]);

  // Set a clean document title to avoid 'Vite + React' in browser print headers
  useEffect(() => {
    const prev = document.title;
    const title = bill ? `${bill.billNumber || 'Invoice'} - ${bill.customerId?.name || 'Customer'}` : 'Invoice';
    document.title = title;
    return () => { document.title = prev; };
  }, [bill]);

  // Try to fetch store settings; ignore errors if route is restricted
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        const s = data || {};
        setStore(prev => ({
          ...prev,
          name: s.storeName || prev.name,
          subtitle: s.storeSubtitle || prev.subtitle,
          phone: s.storePhone || prev.phone,
          address: s.storeAddress || prev.address,
          gstin: s.storeGstin || prev.gstin,
        }));
      } catch {}
    };
    loadSettings();
  }, []);

  const onPrint = () => window.print();

  // Auto-print on load and attempt to close after printing (when opened in a new tab)
  useEffect(() => {
    if (!bill) return;
    const handler = () => {
      setTimeout(() => {
        try { window.close(); } catch {}
      }, 300);
    };
    window.addEventListener('afterprint', handler);
    // trigger print shortly after render to ensure layout paints
    const t = setTimeout(() => window.print(), 150);
    return () => { window.removeEventListener('afterprint', handler); clearTimeout(t); };
  }, [bill]);

  if (loading) return <div className="container py-4">Loading…</div>;
  if (error) return <div className="container py-4" style={{ color: 'var(--status-danger)' }}>{error}</div>;
  if (!bill) return <div className="container py-4">Bill not found</div>;

  const createdAt = bill.billingDate ? new Date(bill.billingDate) : (bill.createdAt ? new Date(bill.createdAt) : new Date());

  return (
    <div style={{ background: '#fff', color: '#000' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1rem' }}>
        {/* Actions (not printed) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }} className="no-print">
          <button className="btn btn-outline-secondary" onClick={() => navigate(`/customers/${customerId}/billing`)}>Back</button>
          <button className="btn btn-primary" onClick={onPrint}>Print</button>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{store.name}</div>
            {store.subtitle ? <div style={{ fontSize: 12 }}>{store.subtitle}</div> : null}
            {store.address ? <div style={{ fontSize: 12 }}>{store.address}</div> : null}
            {store.phone ? <div style={{ fontSize: 12 }}>Phone: {store.phone}</div> : null}
            {store.gstin ? <div style={{ fontSize: 12 }}>GSTIN: {store.gstin}</div> : null}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14 }}><strong>Bill No:</strong> {bill.billNumber || bill._id}</div>
            <div style={{ fontSize: 14 }}><strong>Date:</strong> {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Customer Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 700 }}>Customer</div>
            <div>{bill.customerId?.name || '-'}</div>
            <div style={{ fontSize: 12 }}>{bill.customerId?.phone || ''}</div>
            <div style={{ fontSize: 12 }}>{bill.customerId?.email || ''}</div>
          </div>
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #000', padding: '6px 4px' }}>#</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #000', padding: '6px 4px' }}>Product</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #000', padding: '6px 4px' }}>MRP</th>
              <th style={{ textAlign: 'center', borderBottom: '1px solid #000', padding: '6px 4px' }}>Qty</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #000', padding: '6px 4px' }}>Disc%</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #000', padding: '6px 4px' }}>GST%</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #000', padding: '6px 4px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(bill.items || []).filter(it => (it?.productName && Number(it?.lineAmount||0) > 0 && Number(it?.mrp||0) > 0 && Number(it?.quantity||0) > 0)).map((it, idx) => (
              <tr key={idx}>
                <td style={{ padding: '6px 4px' }}>{idx + 1}</td>
                <td style={{ padding: '6px 4px' }}>{it.productName || it.medicineId?.name || '-'}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>{currency(it.mrp)}</td>
                <td style={{ padding: '6px 4px', textAlign: 'center' }}>{it.quantity}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>{Number(it.discountPct || 0)}%</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>{Number(it.gstPct || 0)}%</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>{currency(it.lineAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <table style={{ minWidth: 320, fontSize: 14 }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px' }}>Subtotal</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{currency(bill.subtotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 8px' }}>Discount</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{currency(bill.totalDiscount)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 8px' }}>GST</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{currency(bill.totalGst)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px', fontWeight: 800, borderTop: '1px solid #000' }}>Grand Total</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, borderTop: '1px solid #000' }}>{currency(bill.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1rem', fontSize: 12, textAlign: 'center' }}>
          Thank you for your purchase!
        </div>
      </div>

      {/* Print styles */}
      <style>
        {`@media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Hide app chrome during print */
          header { display: none !important; }
          .Toastify { display: none !important; }
          nav { display: none !important; }
          /* Try to reduce browser header/footer; user may still need to uncheck Headers/Footers in print dialog */
          @page { margin: 0; }
          html, body { margin: 0; padding: 0; }
        }`}
      </style>
    </div>
  );
};

export default BillingPrint;
