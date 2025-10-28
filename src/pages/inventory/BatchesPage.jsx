import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/ApiClient';
import Loader from '../../components/ui/Loader.jsx';
import { toast } from 'react-toastify';
import Style from '../medicine/Medicine.module.css';
import Modal from '../../components/Modal';

const BatchesPage = () => {
  const { medicineId } = useParams();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [medicineName, setMedicineName] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const [form, setForm] = useState({
    batchNo: '', quantity: '', expiryDate: '', manufacturingDate: '', unitPrice: '', mrp: '', purchaseDate: ''
  });

  const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));

  const fetchBatches = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (medicineId) params.set('medicineId', medicineId);
      if (vendorFilter) params.set('vendorId', vendorFilter);
      const { data } = await api.get(`/inventory/batches?${params.toString()}`);
      setBatches(Array.isArray(data) ? data : []);
      // Derive medicine name if present
      const first = (Array.isArray(data) && data[0]) || null;
      if (first?.medicineId?.name) setMedicineName(first.medicineId.name);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, [medicineId, vendorFilter]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const openAdd = () => {
    setForm({ batchNo: '', quantity: '', expiryDate: '', manufacturingDate: '', unitPrice: '', mrp: '', purchaseDate: '' });
    setShowAdd(true);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    const qty = Number(form.quantity || 0) || 0;
    if (qty <= 0) { toast.warn('Quantity must be greater than 0'); return; }
    if (!form.expiryDate) { toast.warn('Expiry Date is required'); return; }
    try {
      await api.post('/inventory/add-batch', {
        medicineId,
        quantity: qty,
        batchNo: form.batchNo || undefined,
        expiryDate: form.expiryDate || undefined,
        manufacturingDate: form.manufacturingDate || undefined,
        unitPrice: form.unitPrice !== '' ? Number(form.unitPrice) : undefined,
        mrp: form.mrp !== '' ? Number(form.mrp) : undefined,
        purchaseDate: form.purchaseDate || undefined,
      });
      toast.success('Batch added');
      setShowAdd(false);
      fetchBatches();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to add batch');
    }
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      batchNo: b.batchNo || '',
      quantity: String(b.quantity ?? ''),
      expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().slice(0, 10) : '',
      manufacturingDate: b.manufacturingDate ? new Date(b.manufacturingDate).toISOString().slice(0, 10) : '',
      unitPrice: b.unitPrice != null ? String(b.unitPrice) : '',
      mrp: b.mrp != null ? String(b.mrp) : '',
      purchaseDate: b.purchaseDate ? new Date(b.purchaseDate).toISOString().slice(0, 10) : ''
    });
    setShowEdit(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      batchNo: form.batchNo || undefined,
      quantity: form.quantity !== '' ? Number(form.quantity) : undefined,
      expiryDate: form.expiryDate || undefined,
      manufacturingDate: form.manufacturingDate || undefined,
      unitPrice: form.unitPrice !== '' ? Number(form.unitPrice) : undefined,
      mrp: form.mrp !== '' ? Number(form.mrp) : undefined,
      purchaseDate: form.purchaseDate || undefined,
    };
    try {
      await api.put(`/inventory/batches/${editing._id}`, payload);
      toast.success('Batch updated');
      setShowEdit(false);
      setEditing(null);
      fetchBatches();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update batch');
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    try {
      await api.delete(`/inventory/batches/${pendingDelete._id}`);
      toast.success('Batch deleted');
      setConfirmOpen(false);
      setPendingDelete(null);
      fetchBatches();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete batch');
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  const headerName = medicineName || (batches[0]?.medicineId?.name) || '';
  const vendorLabel = useMemo(() => {
    const withVendor = batches.find((x) => x?.vendorId);
    const v = withVendor?.vendorId;
    return v ? `${v.name || '-'}` + (v.phone ? ` (${v.phone})` : '') : '-';
  }, [batches]);

  return (
    <div className={Style.page}>
      <div className={Style.headerRow}>
        <div>
          <h2 className={Style.title}>Batches</h2>
          {headerName && <div className="text-muted">Medicine: <strong>{headerName}</strong></div>}
        </div>
        <div className={Style.filterBtns}>
          <button className={Style.filterGhost} onClick={() => navigate('/medicines')}>Back</button>
          <button className={Style.filterPrimary} onClick={openAdd}>Add Batch</button>
        </div>
      </div>

      {error && <div style={{ color: 'var(--status-danger)', marginTop: '0.75rem' }}>{error}</div>}

      {loading ? <Loader /> : (
        <div className={Style.tableWrap}>
          <table className={Style.table}>
            <thead className={Style.thead}>
              <tr>
                <th className={Style.th} scope="col">Batch No</th>
                <th className={`${Style.th} ${Style.center}`} scope="col">Qty</th>
                <th className={Style.th} scope="col">Expiry</th>
                <th className={Style.th} scope="col">Mfg</th>
                <th className={Style.th} scope="col">Unit Price</th>
                <th className={Style.th} scope="col">MRP</th>
                <th className={Style.th} scope="col">Purchase Date</th>
                <th className={`${Style.th} ${Style.center}`} scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td className={Style.td} colSpan={7}>No batches found.</td></tr>
              ) : batches.map((b) => (
                <tr key={b._id}>
                  <td className={Style.td}>{b.batchNo}</td>
                  <td className={`${Style.td} ${Style.center}`}>{b.quantity}</td>
                  <td className={Style.td}>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '-'}</td>
                  <td className={Style.td}>{b.manufacturingDate ? new Date(b.manufacturingDate).toLocaleDateString() : '-'}</td>
                  <td className={Style.td}>{b.unitPrice != null ? fmtINR(b.unitPrice) : '-'}</td>
                  <td className={Style.td}>{b.mrp != null ? fmtINR(b.mrp) : '-'}</td>
                  <td className={Style.td}>{b.purchaseDate ? new Date(b.purchaseDate).toLocaleDateString() : '-'}</td>
                  <td className={`${Style.td} ${Style.center}`}>
                    <button
                      onClick={() => openEdit(b)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >Edit</button>
                    <button className={`${Style.dangerLink}`} onClick={() => { setPendingDelete(b); setConfirmOpen(true); }} style={{ marginLeft: '8px' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Batch</h5>
                <button type="button" className="btn-close" onClick={() => setShowAdd(false)}></button>
              </div>
              <form onSubmit={submitAdd}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Quantity</label>
                      <input name="quantity" type="number" min="1" className="form-control" value={form.quantity} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Batch No</label>
                      <input name="batchNo" className="form-control" value={form.batchNo} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Expiry Date</label>
                      <input name="expiryDate" type="date" className="form-control" value={form.expiryDate} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Manufacturing Date</label>
                      <input name="manufacturingDate" type="date" className="form-control" value={form.manufacturingDate} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Unit Purchase Price</label>
                      <input name="unitPrice" type="number" step="0.01" min="0" className="form-control" value={form.unitPrice} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">MRP</label>
                      <input name="mrp" type="number" step="0.01" min="0" className="form-control" value={form.mrp} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Purchase Date</label>
                      <input name="purchaseDate" type="date" className="form-control" value={form.purchaseDate} onChange={onChange} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Batch</h5>
                <button type="button" className="btn-close" onClick={() => setShowEdit(false)}></button>
              </div>
              <form onSubmit={submitEdit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Quantity</label>
                      <input name="quantity" type="number" min="0" className="form-control" value={form.quantity} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Batch No</label>
                      <input name="batchNo" className="form-control" value={form.batchNo} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Expiry Date</label>
                      <input name="expiryDate" type="date" className="form-control" value={form.expiryDate} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Manufacturing Date</label>
                      <input name="manufacturingDate" type="date" className="form-control" value={form.manufacturingDate} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Unit Purchase Price</label>
                      <input name="unitPrice" type="number" step="0.01" min="0" className="form-control" value={form.unitPrice} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">MRP</label>
                      <input name="mrp" type="number" step="0.01" min="0" className="form-control" value={form.mrp} onChange={onChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Purchase Date</label>
                      <input name="purchaseDate" type="date" className="form-control" value={form.purchaseDate} onChange={onChange} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <Modal
        title="Delete Batch"
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setPendingDelete(null); }}
        footer={(
          <>
            <button className={Style.filterGhost} onClick={() => { setConfirmOpen(false); setPendingDelete(null); }}>Cancel</button>
            <button className={Style.filterPrimary} onClick={onDelete}>Delete</button>
          </>
        )}
      >
        <p>Are you sure you want to delete batch <strong>{pendingDelete?.batchNo}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default BatchesPage;
