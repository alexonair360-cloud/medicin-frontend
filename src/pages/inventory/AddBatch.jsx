import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/ApiClient';
import Loader from '../../components/ui/Loader.jsx';
import { toast } from 'react-toastify';

const useQuery = () => new URLSearchParams(useLocation().search);

const AddBatch = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const preselectMedicineId = query.get('medicineId') || '';

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    medicineId: '',
    quantity: '',
    batchNo: '',
    expiryDate: '',
    manufacturingDate: '',
    unitPrice: '',
    mrp: '',
    // vendorId is locked to the selected medicine's vendor
  });
  const [lockedVendor, setLockedVendor] = useState({ id: '', label: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/medicines');
        const list = Array.isArray(data) ? data : (data?.items || []);
        setMedicines(list);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load medicines');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (preselectMedicineId) {
      setForm((f) => ({ ...f, medicineId: preselectMedicineId }));
    }
  }, [preselectMedicineId]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const selectedMedicine = useMemo(() => medicines.find(m => String(m._id) === String(form.medicineId)), [medicines, form.medicineId]);

  useEffect(() => {
    // Lock vendor to selected medicine's vendor
    if (selectedMedicine) {
      const v = selectedMedicine.vendorId;
      const id = (v && (v._id || v)) || '';
      const label = v ? `${v.name || '-'}${v.phone ? ` (${v.phone})` : ''}` : '-';
      setLockedVendor({ id: String(id), label });
    } else {
      setLockedVendor({ id: '', label: '' });
    }
  }, [selectedMedicine]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const qty = Number(form.quantity || 0) || 0;
    if (!form.medicineId) { setError('Medicine is required'); return; }
    if (qty <= 0) { setError('Quantity must be greater than 0'); return; }
    if (qty > 0 && !form.expiryDate) { setError('Expiry Date is required when adding stock'); return; }

    const payload = {
      medicineId: form.medicineId,
      quantity: qty,
      batchNo: form.batchNo || undefined,
      expiryDate: form.expiryDate || undefined,
      manufacturingDate: form.manufacturingDate || undefined,
      unitPrice: form.unitPrice !== '' ? Number(form.unitPrice) : undefined,
      mrp: form.mrp !== '' ? Number(form.mrp) : undefined,
      vendorId: lockedVendor.id || undefined,
    };

    try {
      setSubmitting(true);
      await api.post('/inventory/add-batch', payload);
      toast.success('Batch added');
      navigate('/medicines');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to add batch';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="m-0">Add Batch</h2>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/medicines')}>
          Back to Medicines
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <form onSubmit={onSubmit} className="" noValidate>
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="mb-3">
            <label className="form-label">Medicine</label>
            <select
              className="form-select"
              name="medicineId"
              value={form.medicineId}
              onChange={onChange}
              required
            >
              <option value="">Select medicine...</option>
              {medicines.map((m) => (
                <option key={m._id} value={m._id}>{m.name}{m.vendorId ? ` - ${m.vendorId.name || ''}` : ''}</option>
              ))}
            </select>
            {selectedMedicine && (
              <div className="form-text">Selected: {selectedMedicine.name}</div>
            )}
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Quantity</label>
              <input type="number" min="1" name="quantity" value={form.quantity} onChange={onChange} className="form-control" required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Batch No</label>
              <input name="batchNo" value={form.batchNo} onChange={onChange} className="form-control" placeholder="e.g. B-123" />
            </div>
            <div className="col-md-4">
              <label className="form-label">Expiry Date</label>
              <input type="date" name="expiryDate" value={form.expiryDate} onChange={onChange} className="form-control" required={Number(form.quantity||0)>0} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Manufacturing Date</label>
              <input type="date" name="manufacturingDate" value={form.manufacturingDate} onChange={onChange} className="form-control" />
            </div>
            <div className="col-md-4">
              <label className="form-label">Unit Purchase Price</label>
              <input type="number" step="0.01" min="0" name="unitPrice" value={form.unitPrice} onChange={onChange} className="form-control" />
            </div>
            <div className="col-md-4">
              <label className="form-label">MRP</label>
              <input type="number" step="0.01" min="0" name="mrp" value={form.mrp} onChange={onChange} className="form-control" />
            </div>
          </div>

          {Number(form.quantity) > 0 && form.unitPrice !== '' && (
            <div className="form-text mt-2">
              Purchased Amount (calc): {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
                Number(form.quantity || 0) * Number(form.unitPrice || 0)
              )}
            </div>
          )}

          <div className="mt-4 d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Batch'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddBatch;
