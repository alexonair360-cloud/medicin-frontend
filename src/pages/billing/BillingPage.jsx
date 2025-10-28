import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/ApiClient';
import Style from '../medicine/Medicine.module.css';

const BillingPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        <h2 className={Style.title}>Customer Bills</h2>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/customers')}>
          Back to Customers
        </button>
      </div>

      <div>
        {/* Existing Bills - Full Width */}
        <div>
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
                      >GenerateBill</button>
                      <button className={Style.dangerLink} onClick={() => onDeleteBill(b)} style={{ marginLeft: '8px' }}>Delete</button>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
