import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './VendorsPage.module.css';
import VendorList from './VendorList';
import VendorForm from './VendorForm';
import Button from '../../components/ui/Button';
import Modal from '../../components/Modal';
import { getVendors, deleteVendor, createVendor, updateVendor } from '../../api/vendorService';
import { getOutstandingSummary } from '../../api/vendorOrdersService';
import Loader from '../../components/ui/Loader.jsx';

const VendorsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchField, setSearchField] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [outstandingTotal, setOutstandingTotal] = useState(0);

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors();
    fetchOutstanding();
  }, []);

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const data = await getVendors();
      // Normalize response: accept array or wrapped object { vendors: [...] } or { data: [...] }
      const list = Array.isArray(data) ? data : (data?.vendors || data?.data || []);
      const normalized = list.map(v => ({ ...v, id: v.id ?? v._id }));
      setVendors(normalized);
      setError(null);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors. Please try again later.');
      toast.error('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOutstanding = async () => {
    try {
      const { totalOutstanding } = await getOutstandingSummary();
      setOutstandingTotal(Number(totalOutstanding || 0));
    } catch (e) {
      // Non-blocking error
      console.warn('Failed to fetch outstanding summary', e);
    }
  };

  const handleAddVendor = () => {
    setEditingVendor(null);
    setIsModalOpen(true);
  };

  const handleEditVendor = (vendor) => {
    setEditingVendor(vendor);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVendor(null);
  };

  // Filter vendors based on searchField and searchQuery
  const filteredVendors = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(v => {
      const value = String(
        searchField === 'name' ? v.name ?? '' :
        searchField === 'email' ? v.email ?? '' :
        searchField === 'phone' ? v.phone ?? '' :
        ''
      ).toLowerCase();
      return value.includes(q);
    });
  }, [vendors, searchField, searchQuery]);

  const handleSubmit = async (vendorData) => {
    try {
      setIsSaving(true);
      if (editingVendor) {
        const id = editingVendor.id ?? editingVendor._id;
        await updateVendor(id, vendorData);
        toast.success('Vendor updated successfully');
      } else {
        await createVendor(vendorData);
        toast.success('Vendor added successfully');
      }
      handleCloseModal();
      // Refresh list from server to stay consistent
      await fetchVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
      const msg = error?.message || error?.response?.data?.message || 'Failed to save vendor';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDelete = (vendor) => {
    setPendingDelete(vendor);
    setConfirmOpen(true);
  };

  const confirmDeleteVendor = async () => {
    if (!pendingDelete) return;
    try {
      setIsDeleting(true);
      const id = pendingDelete.id ?? pendingDelete._id;
      await deleteVendor(id);
      setVendors(prev => prev.filter(v => (v.id ?? v._id) !== id));
      toast.success('Vendor deleted successfully');
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Vendors</h1>
        <div className={styles.actionsRow}>
          <div className={styles.outstanding}>
            Total Outstanding: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(outstandingTotal)}
          </div>
          <div className={styles.searchControls}>
            <select
              className={styles.select}
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={`Search by ${searchField}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleAddVendor} variant="primary">
            Add New Vendor
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <VendorList 
          vendors={filteredVendors} 
          onEditVendor={handleEditVendor} 
          onDeleteVendor={handleRequestDelete} 
        />
      )}

      <Modal open={isModalOpen} onClose={handleCloseModal} title={editingVendor ? 'Edit Vendor' : 'Add New Vendor'}>
        <VendorForm 
          initialData={editingVendor} 
          onSubmit={handleSubmit} 
          onCancel={handleCloseModal} 
          isSubmitting={isSaving}
        />
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setPendingDelete(null); }}
        title="Delete Vendor"
        footer={(
          <>
            <Button variant="outline" onClick={() => { if (!isDeleting) { setConfirmOpen(false); setPendingDelete(null); } }} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={confirmDeleteVendor} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button>
          </>
        )}
      >
        <p>Are you sure you want to delete <strong>{pendingDelete?.name || 'this vendor'}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default VendorsPage;
