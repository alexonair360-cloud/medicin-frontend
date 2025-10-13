import React, { useEffect, useMemo, useState } from 'react';
import styles from './CustomersPage.module.css';
import Loader from '../../components/ui/Loader.jsx';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../api/customerService';
import Modal from '../../components/Modal.jsx';
import { toast } from 'react-toastify';

// Placeholder API wiring; replace with real service when backend is ready
const mockFetchCustomers = async () => {
  // simulate latency
  await new Promise(r => setTimeout(r, 400));
  return [
    { id: 'CUST-001', name: 'John Doe', phone: '9876543210', email: 'john@example.com', totalOrders: 3, totalSpent: 1520 },
    { id: 'CUST-002', name: 'Priya Sharma', phone: '9123456780', email: 'priya@example.com', totalOrders: 5, totalSpent: 3890 },
  ];
};

const CustomersPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = add, object = edit
  const [form, setForm] = useState({ customerId: '', name: '', phone: '', email: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await listCustomers(query);
        setCustomers(rows);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q));
  }, [customers, query]);

  const openAdd = () => {
    setEditing(null);
    setForm({ customerId: '', name: '', phone: '', email: '', address: '' });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ customerId: c.customerId || '', name: c.name || '', phone: c.phone || '', email: c.email || '', address: c.address || '' });
    setModalOpen(true);
  };

  const onSave = async () => {
    if (!form.name?.trim() || !form.phone?.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      setSaving(true);
      if (editing && editing._id) {
        await updateCustomer(editing._id, form);
        toast.success('Customer updated');
      } else {
        await createCustomer(form);
        toast.success('Customer added');
      }
      // refresh list
      const rows = await listCustomers(query);
      setCustomers(rows);
      setModalOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (c) => {
    if (!c?._id) return;
    if (!window.confirm(`Delete customer ${c.name}?`)) return;
    try {
      await deleteCustomer(c._id);
      toast.success('Customer deleted');
      const rows = await listCustomers(query);
      setCustomers(rows);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Customers</h2>
        <div className={styles.toolbar}>
          <input className={styles.searchInput} placeholder="Search name, phone or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={openAdd}>Add Customer</button>
        </div>
      </div>

      {error && <div style={{ color: 'var(--status-danger)', marginBottom: '0.75rem' }}>{error}</div>}

      {loading ? (
        <Loader />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Customer ID</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Phone</th>
                <th className={styles.th}>Email</th>
                <th className={`${styles.th} ${styles.center}`}>Orders</th>
                <th className={`${styles.th} ${styles.center}`}>Total Spent</th>
                <th className={`${styles.th} ${styles.center}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className={styles.td} colSpan={7} style={{ padding: '1rem', textAlign: 'center' }}>No customers found</td></tr>
              ) : filtered.map((c) => (
                <tr key={c._id || c.id}>
                  <td className={styles.td}>{c.customerId || c.id || '—'}</td>
                  <td className={styles.td}>{c.name}</td>
                  <td className={styles.td}>{c.phone}</td>
                  <td className={styles.td}>{c.email || '—'}</td>
                  <td className={`${styles.td} ${styles.center}`}>{c.totalOrders ?? '—'}</td>
                  <td className={`${styles.td} ${styles.center}`}>{c.totalSpent != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(c.totalSpent) : '—'}</td>
                  <td className={`${styles.td} ${styles.center}`}>
                    <div className={styles.actions}>
                      <button className={styles.button} onClick={() => openEdit(c)}>Edit</button>
                      <button className={styles.button} onClick={() => onDelete(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title={editing ? 'Edit Customer' : 'Add Customer'}
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        footer={(
          <>
            <button className={styles.button} onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </>
        )}
      >
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Customer ID</label>
            <input className={styles.searchInput} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} placeholder="Optional (e.g., CUST-001)" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Name</label>
            <input className={styles.searchInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Phone</label>
            <input className={styles.searchInput} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Email</label>
            <input className={styles.searchInput} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Address</label>
            <textarea className={styles.searchInput} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address (optional)" rows={3} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomersPage;
