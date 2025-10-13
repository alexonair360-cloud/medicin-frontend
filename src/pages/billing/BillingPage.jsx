import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/ApiClient';
import Style from '../medicine/Medicine.module.css';

const emptyRow = () => ({ productName: '', mrp: '', quantity: '1', discountPct: '', gstPct: '' });

const BillingPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([emptyRow()]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onChange = (i, field, value) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const resetForm = () => setRows([emptyRow()]);

  const computeLine = (r) => {
    const mrp = Number(r.mrp || 0);
    const qty = Math.max(0, Number(r.quantity || 0));
    const discountPct = Math.max(0, Number(r.discountPct || 0));
    const gstPct = Math.max(0, Number(r.gstPct || 0));
    const base = mrp * qty;
    const afterDiscount = base * (1 - discountPct / 100);
    const withGst = afterDiscount * (1 + gstPct / 100);
    return { base, afterDiscount, total: Math.round(withGst) };
  };

  const grandTotal = useMemo(() => rows.reduce((sum, r) => sum + computeLine(r).total, 0), [rows]);

  const loadBills = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/bills?customerId=${customerId}`);
      setBills(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (customerId) loadBills(); }, [customerId]);

  const onSaveBill = async () => {
    if (!customerId) return;
    if (rows.length === 0) return;
    try {
      setSaving(true);
      const items = rows.map(r => ({
        productName: r.productName,
        mrp: Number(r.mrp || 0),
        quantity: Number(r.quantity || 0),
        discountPct: Number(r.discountPct || 0),
        gstPct: Number(r.gstPct || 0),
      }));
      const { data: created } = await api.post('/bills', { customerId, items });
      resetForm();
      loadBills();
      if (created && created._id) {
        // Open print in a new tab; BillingPrint auto-triggers print and attempts to close itself
        const url = `/customers/${customerId}/billing/${created._id}/print`;
        window.open(url, '_blank', 'noopener,noreferrer');
        // Fire-and-forget email sending
        try { await api.post(`/bills/${created._id}/email`); } catch (e) { /* ignore email errors in UI flow */ }
      }
    } catch (e) {
      // optional toast could be added
    } finally { setSaving(false); }
  };

  const onDeleteBill = async (bill) => {
    if (!bill?._id) return;
    if (!window.confirm('Delete this bill?')) return;
    try {
      await api.delete(`/bills/${bill._id}`);
      loadBills();
    } catch (e) {
      // handle error UI if needed
    }
  };

  return (
    <div className={Style.page}>
      <div className={Style.headerRow}>
        <h2 className={Style.title}>Billing</h2>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Left: Existing Bills (70%) */}
        <div style={{ flex: '1 1 70%' }}>
          <div className={Style.tableWrap}>
            <table className={Style.table}>
              <thead className={Style.thead}>
                <tr>
                  <th className={Style.th}>Date</th>
                  <th className={`${Style.th} ${Style.center}`}>Items</th>
                  <th className={`${Style.th} ${Style.right}`}>Subtotal</th>
                  <th className={`${Style.th} ${Style.right}`}>Discount</th>
                  <th className={`${Style.th} ${Style.right}`}>GST</th>
                  <th className={`${Style.th} ${Style.right}`}>Grand Total</th>
                  <th className={`${Style.th} ${Style.center}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className={Style.td} colSpan={7}>Loading...</td></tr>
                ) : bills.length === 0 ? (
                  <tr><td className={Style.td} colSpan={7}>No bills found for this customer.</td></tr>
                ) : bills.map((b) => (
                  <tr key={b._id}>
                    <td className={Style.td}>{new Date(b.billingDate || b.createdAt).toLocaleString()}</td>
                    <td className={`${Style.td} ${Style.center}`}>{(b.items || []).length}</td>
                    <td className={`${Style.td} ${Style.right}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(b.subtotal)}</td>
                    <td className={`${Style.td} ${Style.right}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(b.totalDiscount)}</td>
                    <td className={`${Style.td} ${Style.right}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(b.totalGst)}</td>
                    <td className={`${Style.td} ${Style.right}`}><strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(b.grandTotal)}</strong></td>
                    <td className={`${Style.td} ${Style.center}`}>
                      <button
                        onClick={() => navigate(`/customers/${customerId}/billing/${b._id}/print`)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >View/Print</button>
                      <button className={Style.dangerLink} onClick={() => onDeleteBill(b)} style={{ marginLeft: '8px' }}>Delete</button>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: New Bill form (30%) */}
        <div style={{ flex: '0 0 30%', minWidth: 280, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          <div className={Style.tableWrap}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(var(--primary-rgb), 0.2)', fontWeight: 700 }}>New Bill</div>
            <div style={{ padding: '0.75rem 1rem', display: 'grid', gap: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Product</label>
                <input className="form-control" placeholder="Product name" value={rows[rows.length-1]?.productName || ''} onChange={(e) => onChange(rows.length-1, 'productName', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>MRP</label>
                  <input className="form-control" type="number" min="0" step="0.01" value={rows[rows.length-1]?.mrp || ''} onChange={(e) => onChange(rows.length-1, 'mrp', e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Quantity</label>
                  <input className="form-control" type="number" min="1" step="1" value={rows[rows.length-1]?.quantity || ''} onChange={(e) => onChange(rows.length-1, 'quantity', e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Discount %</label>
                  <input className="form-control" type="number" min="0" step="0.01" value={rows[rows.length-1]?.discountPct || ''} onChange={(e) => onChange(rows.length-1, 'discountPct', e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>GST %</label>
                  <input className="form-control" type="number" min="0" step="0.01" value={rows[rows.length-1]?.gstPct || ''} onChange={(e) => onChange(rows.length-1, 'gstPct', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>Amount: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(computeLine(rows[rows.length-1] || {}).total || 0)}</div>
                <div className={Style.filterBtns}>
                  <button className={Style.filterGhost} onClick={resetForm}>Reset</button>
                  <button className={Style.filterPrimary} onClick={addRow}>Add Item</button>
                </div>
              </div>

              {/* Items preview list */}
              <div style={{ borderTop: '1px solid rgba(var(--primary-rgb), 0.2)', paddingTop: '0.5rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Items</div>
                {rows.length <= 1 ? (
                  <div className="form-text">No items added yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {rows.slice(0, -1).map((r, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background-light)', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.productName || '—'}</div>
                          <div className="form-text">Qty {r.quantity || 0} • MRP {r.mrp || 0} • Disc {r.discountPct || 0}% • GST {r.gstPct || 0}%</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ fontWeight: 700 }}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(computeLine(r).total)}</div>
                          <button className={Style.dangerLink} onClick={() => removeRow(idx)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save section */}
              <div style={{ borderTop: '1px solid rgba(var(--primary-rgb), 0.2)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="form-text">Grand Total</div>
                  <div style={{ fontWeight: 800 }}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(grandTotal)}</div>
                </div>
                <button className={Style.filterPrimary} onClick={onSaveBill} disabled={saving || rows.length <= 1}>{saving ? 'Saving...' : 'Save Bill'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
