import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './VendorsPage.module.css';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import { listVendorOrders, createVendorOrder, deleteVendorOrder, updateVendorOrder, getOutstandingForVendor } from '../../api/vendorOrdersService';
import Loader from '../../components/ui/Loader.jsx';

const VendorOrdersPage = () => {
  const navigate = useNavigate();
  const { vendorId } = useParams();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vendorOutstanding, setVendorOutstanding] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all'); // all | paid | unpaid

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    orderId: '',
    orderDate: new Date().toISOString().slice(0,10),
    totalAmount: '',
    paidAmount: '',
    status: 'unpaid',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await listVendorOrders(vendorId, statusFilter === 'all' ? undefined : statusFilter);
      setOrders(Array.isArray(data) ? data : (data?.data || []));
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstanding = async () => {
    try {
      const { totalOutstanding } = await getOutstandingForVendor(vendorId);
      setVendorOutstanding(Number(totalOutstanding || 0));
    } catch (e) {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchOutstanding();
  }, [vendorId, statusFilter]);

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.orderId.trim()) errs.orderId = 'Order ID is required';
    if (form.totalAmount !== '' && (isNaN(Number(form.totalAmount)) || Number(form.totalAmount) < 0)) errs.totalAmount = 'Enter a valid non-negative number';
    if (form.paidAmount !== '' && (isNaN(Number(form.paidAmount)) || Number(form.paidAmount) < 0)) errs.paidAmount = 'Enter a valid non-negative number';
    if (form.totalAmount !== '' && form.paidAmount !== '' && Number(form.paidAmount) > Number(form.totalAmount)) errs.paidAmount = 'Paid cannot exceed total';
    if (form.orderDate && isNaN(new Date(form.orderDate).getTime())) errs.orderDate = 'Invalid date';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      const payload = {
        orderId: form.orderId,
        orderDate: form.orderDate || undefined,
        totalAmount: form.totalAmount !== '' ? Number(form.totalAmount) : undefined,
        paidAmount: form.paidAmount !== '' ? Number(form.paidAmount) : undefined,
        status: form.status,
        notes: form.notes || undefined,
      };
      await createVendorOrder(vendorId, payload);
      setForm({ orderId: '', orderDate: new Date().toISOString().slice(0,10), totalAmount: '', paidAmount: '', status: 'unpaid', notes: '' });
      fetchOrders();
      fetchOutstanding();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  const fmtINR = (n) => {
    if (n == null) return '-';
    const num = Number(n);
    if (Number.isNaN(num)) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };
  const fmtDate = (d) => {
    try {
      if (!d) return '-';
      const date = typeof d === 'string' ? new Date(d) : d;
      if (Number.isNaN(date.getTime())) return '-';
      return date.toLocaleDateString();
    } catch { return '-'; }
  };

  // Inline edit helpers
  const startEdit = (o) => {
    setEditingId(o.id);
    setEditErrors({});
    setEditForm({
      orderId: o.orderId || '',
      orderDate: o.orderDate ? new Date(o.orderDate).toISOString().slice(0,10) : '',
      totalAmount: o.totalAmount != null ? String(o.totalAmount) : '',
      paidAmount: o.paidAmount != null ? String(o.paidAmount) : '',
      status: o.status || 'unpaid',
      notes: o.notes || '',
    });
  };

  const onEditChange = (e) => setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const validateEdit = () => {
    const errs = {};
    if (!editForm.orderId.trim()) errs.orderId = 'Order ID is required';
    if (editForm.totalAmount !== '' && (isNaN(Number(editForm.totalAmount)) || Number(editForm.totalAmount) < 0)) errs.totalAmount = 'Enter a valid non-negative number';
    if (editForm.paidAmount !== '' && (isNaN(Number(editForm.paidAmount)) || Number(editForm.paidAmount) < 0)) errs.paidAmount = 'Enter a valid non-negative number';
    if (editForm.totalAmount !== '' && editForm.paidAmount !== '' && Number(editForm.paidAmount) > Number(editForm.totalAmount)) errs.paidAmount = 'Paid cannot exceed total';
    if (editForm.orderDate && isNaN(new Date(editForm.orderDate).getTime())) errs.orderDate = 'Invalid date';
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveEdit = async () => {
    if (!validateEdit()) return;
    try {
      await updateVendorOrder(vendorId, editingId, {
        orderId: editForm.orderId,
        orderDate: editForm.orderDate || undefined,
        totalAmount: editForm.totalAmount !== '' ? Number(editForm.totalAmount) : undefined,
        paidAmount: editForm.paidAmount !== '' ? Number(editForm.paidAmount) : undefined,
        status: editForm.status,
        notes: editForm.notes || undefined,
      });
      setEditingId(null);
      setEditForm({});
      fetchOrders();
      fetchOutstanding();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update order');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditErrors({});
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Vendor Orders</h1>
        <div className={styles.actionsRow}>
          <Button variant="outline" onClick={() => navigate('/vendors')}>Back to Vendors</Button>
          <div className={styles.outstanding}>Outstanding: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(vendorOutstanding)}</div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Create Order</div>
          <div className={styles.sectionGrid}>
            <Input label="Order ID" name="orderId" value={form.orderId} onChange={onChange} error={formErrors.orderId} helperText={formErrors.orderId} required />
            <Input label="Order Date" name="orderDate" type="date" value={form.orderDate} onChange={onChange} error={formErrors.orderDate} helperText={formErrors.orderDate} />
            <div className={styles.twoFieldsRow}>
              <Input label="Total Amount" name="totalAmount" type="number" min="0" step="0.01" value={form.totalAmount} onChange={onChange} error={formErrors.totalAmount} helperText={formErrors.totalAmount} />
              <Input label="Paid Amount" name="paidAmount" type="number" min="0" step="0.01" value={form.paidAmount} onChange={onChange} error={formErrors.paidAmount} helperText={formErrors.paidAmount} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="status">Status</label>
              <select id="status" name="status" className={styles.select} value={form.status} onChange={onChange}>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
          <div className={styles.formRow}>
            <TextArea label="Notes" name="notes" rows={2} value={form.notes} onChange={onChange} />
          </div>
          <div className={styles.formActions}>
            <Button variant="primary" onClick={submit} disabled={creating}>{creating ? 'Creating...' : 'Create Order'}</Button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>Orders</div>
          <div className={styles.actions} style={{ marginBottom: '0.5rem' }}>
            <div className={styles.segmented}>
              <button
                className={`${styles.segBtn} ${statusFilter === 'all' ? styles.segBtnActive : ''}`}
                onClick={() => setStatusFilter('all')}
              >All</button>
              <button
                className={`${styles.segBtn} ${statusFilter === 'paid' ? styles.segBtnActive : ''}`}
                onClick={() => setStatusFilter('paid')}
              >Paid</button>
              <button
                className={`${styles.segBtn} ${statusFilter === 'unpaid' ? styles.segBtnActive : ''}`}
                onClick={() => setStatusFilter('unpaid')}
              >Unpaid</button>
            </div>
          </div>
          {loading ? (
            <Loader />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead className={styles.thead}>
                  <tr>
                    <th className={styles.th}>Order ID</th>
                    <th className={styles.th}>Date</th>
                    <th className={styles.th}>Total Amount</th>
                    <th className={styles.th}>Paid</th>
                    <th className={styles.th}>Remaining</th>
                    <th className={styles.th}>Status</th>
                    <th className={`${styles.th} ${styles.center}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td className={styles.td} colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No orders yet</td></tr>
                  ) : orders.map(o => {
                  const isEditing = editingId === o.id;
                  const remaining = Math.max(0, (Number((isEditing ? editForm.totalAmount : o.totalAmount) || 0) - Number((isEditing ? editForm.paidAmount : o.paidAmount) || 0)));
                  return (
                    <tr key={o.id}>
                      <td className={styles.td}>
                        {isEditing ? (
                          <Input name="orderId" value={editForm.orderId} onChange={onEditChange} error={editErrors.orderId} helperText={editErrors.orderId} />
                        ) : o.orderId}
                      </td>
                      <td className={styles.td}>
                        {isEditing ? (
                          <Input name="orderDate" type="date" value={editForm.orderDate} onChange={onEditChange} error={editErrors.orderDate} helperText={editErrors.orderDate} />
                        ) : fmtDate(o.orderDate || o.createdAt)}
                      </td>
                      <td className={styles.td}>
                        {isEditing ? (
                          <Input name="totalAmount" type="number" min="0" step="0.01" value={editForm.totalAmount} onChange={onEditChange} error={editErrors.totalAmount} helperText={editErrors.totalAmount} />
                        ) : fmtINR(o.totalAmount)}
                      </td>
                      <td className={styles.td}>
                        {isEditing ? (
                          <Input name="paidAmount" type="number" min="0" step="0.01" value={editForm.paidAmount} onChange={onEditChange} error={editErrors.paidAmount} helperText={editErrors.paidAmount} />
                        ) : fmtINR(o.paidAmount)}
                      </td>
                      <td className={styles.td}>
                        {fmtINR(remaining)}
                      </td>
                      <td className={styles.td}>
                        {isEditing ? (
                          <select name="status" className={styles.select} value={editForm.status} onChange={onEditChange}>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                          </select>
                        ) : (o.status === 'paid' ? 'Paid' : 'Unpaid')}
                      </td>
                      <td className={`${styles.td} ${styles.center}`}>
                        {isEditing ? (
                          <>
                            <button className={styles.actionLink} onClick={saveEdit}>Save</button>
                            <button className={styles.dangerLink} onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className={styles.actionLink} onClick={() => startEdit(o)}>Edit</button>
                            <button className={styles.dangerLink} onClick={async () => {
                              const ok = window.confirm('Are you sure you want to delete this order?');
                              if (!ok) return;
                              await deleteVendorOrder(vendorId, o.id);
                              fetchOrders();
                            }}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorOrdersPage;
