import React, { useEffect, useMemo, useState } from 'react';
import Style from './Medicine.module.css';
import api from '../../api/ApiClient';
import Modal from '../../components/Modal';
import { toast } from 'react-toastify';
import VendorSelect from '../../components/vendors/VendorSelect';
import Loader from '../../components/ui/Loader.jsx';
import { useNavigate } from 'react-router-dom';
import ReactPaginate from 'react-paginate';

const SearchIcon = (props) => (
  <svg className={Style.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6Z"/>
  </svg>
);

const Medicine = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [stockMap, setStockMap] = useState({}); // { medicineId: totalQty }
  const [latestBatchMap, setLatestBatchMap] = useState({}); // { medicineId: { batchNo, expiryDate, manufacturingDate, unitPrice, mrp, discountPercent } }
  const [statsMap, setStatsMap] = useState({}); // { medicineId: { totalBatches, expiringSoonCount, totalInStock } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all | in | out
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null); // medicine object
  const [form, setForm] = useState({
    name: '',
    defaultLowStockThreshold: '', vendorId: '',
  });
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // medicine object
  // No two-step delete; we block delete when stock > 0
  const [page, setPage] = useState(0); // zero-based
  const [pageSize] = useState(10); // fixed per request

  const fetchMedicines = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/medicines');
      setItems(Array.isArray(data) ? data : (data?.items || []));
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicineStats = async () => {
    try {
      const { data } = await api.get('/inventory/medicine-stats?expDays=30');
      const map = {};
      (data || []).forEach((row) => {
        if (row && row._id) {
          map[String(row._id)] = {
            totalBatches: row.totalBatches || 0,
            expiringSoonCount: row.expiringSoonCount || 0,
            totalInStock: row.totalInStock || 0,
          };
        }
      });
      setStatsMap(map);
    } catch {
      // non-blocking
    }
  };

  const handleDeleteClick = (m) => {
    const current = stockMap[String(m._id)] || 0;
    if (current > 0) {
      toast.warn('Cannot delete: stock is greater than 0');
      return;
    }
    setPendingDelete(m);
    setConfirmOpen(true);
  };

  const fetchStockSummary = async () => {
    try {
      const { data: stock } = await api.get('/inventory/stock-summary');
      const map = {};
      (stock || []).forEach(row => {
        if (row && row._id) {
          const key = String(row._id);
          map[key] = row.totalQty || 0;
        }
      });
      setStockMap(map);
    } catch {
      // ignore transient stock fetch errors in UI
    }
  };

  const fetchLatestBatchSummary = async () => {
    try {
      const { data } = await api.get('/inventory/latest-batch-summary');
      const map = {};
      (data || []).forEach(row => {
        if (row && row._id) {
          const key = String(row._id);
          map[key] = row;
        }
      });
      setLatestBatchMap(map);
    } catch {
      // ignore transient errors
    }
  };

  useEffect(() => {
    fetchMedicines();
    fetchStockSummary();
    fetchLatestBatchSummary();
    fetchMedicineStats();
    const id = setInterval(fetchStockSummary, 10000); // refresh stock every 10s
    return () => clearInterval(id);
  }, []);

  // Refresh stock when the page/tab regains focus or becomes visible
  useEffect(() => {
    const onFocus = () => fetchStockSummary();
    const onVis = () => { if (document.visibilityState === 'visible') fetchStockSummary(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(m => (m.name || '').toLowerCase().includes(q));
  }, [items, search]);

  const filteredByStock = useMemo(() => {
    if (stockFilter === 'all') return filtered;
    return filtered.filter(m => {
      const qty = stockMap[String(m._id)] || 0;
      return stockFilter === 'in' ? qty > 0 : qty === 0;
    });
  }, [filtered, stockFilter, stockMap]);

  // Reset to first page when search/filter changes or data updates
  useEffect(() => { setPage(0); }, [search, stockFilter, items.length]);

  const pageCount = useMemo(() => Math.ceil((filteredByStock?.length || 0) / pageSize) || 1, [filteredByStock, pageSize]);
  const pagedItems = useMemo(() => {
    const start = page * pageSize;
    return (filteredByStock || []).slice(start, start + pageSize);
  }, [filteredByStock, page, pageSize]);

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submitAdd = async () => {
    setFormError('');
    try {
      const payload = {
        name: form.name,
        defaultLowStockThreshold: form.defaultLowStockThreshold ? Number(form.defaultLowStockThreshold) : 0,
        vendorId: form.vendorId || undefined,
      };
      if (!payload.name) { setFormError('Name is required'); return; }
      const { data: created } = await api.post('/medicines', payload);
      // Optimistically update the table immediately
      setItems(prev => [created, ...prev]);
      setShowAdd(false);
      setForm({ name: '', defaultLowStockThreshold: '', vendorId: '' });
      // Optionally refresh in background to stay in sync with server sorting/fields
      fetchMedicines();
      toast.success('Medicine added');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to add medicine';
      setFormError(msg);
      toast.error(msg);
    }
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      name: m.name || '',
      defaultLowStockThreshold: typeof m.defaultLowStockThreshold === 'number' ? String(m.defaultLowStockThreshold) : '',
      vendorId: (m.vendorId && (m.vendorId._id || m.vendorId)) || '',
    });
    setShowEdit(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    setFormError('');
    try {
      const updates = {
        name: form.name,
        defaultLowStockThreshold: form.defaultLowStockThreshold ? Number(form.defaultLowStockThreshold) : undefined,
        vendorId: form.vendorId || undefined,
      };
      const { data: updated } = await api.put(`/medicines/${editing._id}`, updates);
      setItems(prev => prev.map(x => x._id === updated._id ? updated : x));
      setShowEdit(false);
      setEditing(null);
      toast.success('Medicine updated');
      // Refresh in background to ensure populated vendor and server ordering are reflected
      fetchMedicines();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to update medicine';
      setFormError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className={Style.page}>
      {/* Header */}
      <div className={Style.headerRow}>
        <h2 className={Style.title}>Medicine Inventory</h2>
        <button
          className={Style.addBtn}
          type="button"
          onClick={() => {
            setForm({ name: '', defaultLowStockThreshold: '', vendorId: '' });
            setFormError('');
            setShowAdd(true);
          }}
        >
          <PlusIcon />
          <span>Add Medicine</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className={Style.toolbar}>
        <div className={Style.searchWrap}>
          <SearchIcon />
          <input
            className={Style.searchInput}
            type="text"
            placeholder="Search by medicine name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={Style.filterBtns}>
          <button
            className={stockFilter === 'all' ? Style.filterPrimary : Style.filterGhost}
            onClick={() => setStockFilter('all')}
            aria-pressed={stockFilter === 'all'}
          >All</button>
          <button
            className={stockFilter === 'in' ? Style.filterPrimary : Style.filterGhost}
            onClick={() => setStockFilter('in')}
            aria-pressed={stockFilter === 'in'}
          >In Stock</button>
          <button
            className={stockFilter === 'out' ? Style.filterPrimary : Style.filterGhost}
            onClick={() => setStockFilter('out')}
            aria-pressed={stockFilter === 'out'}
          >Out of Stock</button>
          <button
            className={Style.filterGhost}
            onClick={fetchStockSummary}
            title="Refresh stock"
          >Refresh</button>
        </div>
      </div>

      {error && <div style={{ color: 'var(--status-danger)', marginTop: '0.75rem' }}>{error}</div>}

      {/* Table */}
      {loading ? (
        <Loader />
      ) : (
        <div className={Style.tableWrap}>
          <table className={Style.table}>
            <thead className={Style.thead}>
              <tr>
                <th className={Style.th} scope="col">Medicine Name</th>
                <th className={Style.th} scope="col">Vendor</th>
                <th className={`${Style.th} ${Style.center}`} scope="col">Total Batches</th>
                <th className={`${Style.th} ${Style.center}`} scope="col">Expiring Soon (30d)</th>
                <th className={`${Style.th} ${Style.center}`} scope="col">In Stock</th>
                <th className={`${Style.th} ${Style.center}`} scope="col">Threshold</th>
                <th className={`${Style.th} ${Style.center}`} scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredByStock.length === 0 ? (
                <tr><td className={Style.td} colSpan={7}>No medicines found.</td></tr>
              ) : (
                pagedItems.map((m) => (
                  <tr key={m._id}>
                    <td className={Style.td}>{m.name}</td>
                    <td className={Style.td}>{m.vendorId ? `${m.vendorId.name || '-'}` + (m.vendorId.phone ? ` (${m.vendorId.phone})` : '') : '-'}</td>
                    {(() => {
                      const s = statsMap[String(m._id)] || {};
                      const inStock = (typeof s.totalInStock === 'number') ? s.totalInStock : (stockMap[String(m._id)] ?? 0);
                      return (
                        <>
                          <td className={`${Style.td} ${Style.center}`}>{s.totalBatches ?? '-'}</td>
                          <td className={`${Style.td} ${Style.center}`}>{s.expiringSoonCount ?? '-'}</td>
                          <td className={`${Style.td} ${Style.center}`}>{inStock}</td>
                        </>
                      );
                    })()}
                    <td className={`${Style.td} ${Style.center}`}>{typeof m.defaultLowStockThreshold === 'number' ? m.defaultLowStockThreshold : '-'}</td>
                    <td className={`${Style.td} ${Style.center}`}>
                      <button
                        onClick={() => openEdit(m)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >Edit</button>
                      <button
                        className={`${Style.dangerLink} ${stockMap[String(m._id)] > 0 ? Style.disabled : ''}`}
                        aria-disabled={stockMap[String(m._id)] > 0}
                        onClick={() => handleDeleteClick(m)}
                        title={stockMap[String(m._id)] > 0 ? 'Cannot delete: stock > 0' : 'Delete'}
                        style={{ marginLeft: '8px' }}
                      >Delete</button>
                      <button
                        style={{
                          marginLeft: '8px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/medicines/${m._id}/batches`)}
                        title="View and manage batches for this medicine"
                      >Batches</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Pagination */}
          {filteredByStock.length > 0 && (
            <div className={Style.paginationWrap}>
              <ReactPaginate
                breakLabel="…"
                nextLabel=">"
                onPageChange={(ev) => setPage(ev.selected)}
                pageRangeDisplayed={3}
                marginPagesDisplayed={1}
                pageCount={pageCount}
                previousLabel="<"
                renderOnZeroPageCount={null}
                forcePage={page}
                containerClassName={Style.pagination}
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
      )}

      {/* Confirm Delete Modal */}
      <Modal
        title="Delete Medicine"
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        footer={(
          <>
            <button className={`${Style.filterGhost} ${Style.btn}`} onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button
              className={`${Style.filterPrimary} ${Style.btn}`}
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await api.delete(`/medicines/${pendingDelete._id}`);
                  setItems(prev => prev.filter(x => x._id !== pendingDelete._id));
                  setStockMap(prev => {
                    const key = String(pendingDelete._id);
                    const { [key]: _, ...rest } = prev;
                    return rest;
                  });
                  toast.success('Medicine deleted');
                } catch (e) {
                  toast.error(e?.response?.data?.message || 'Failed to delete');
                } finally {
                  setConfirmOpen(false);
                  setPendingDelete(null);
                }
              }}
            >Delete</button>
          </>
        )}
      >
        <p>Are you sure you want to delete <strong>{pendingDelete?.name}</strong>? This action cannot be undone.</p>
      </Modal>

      {/* Add Modal */}
      <Modal
        title="Add Medicine"
        open={showAdd}
        onClose={() => setShowAdd(false)}
        size="lg"
        footer={(
          <>
            <button className={`${Style.filterGhost} ${Style.btn}`} onClick={() => setShowAdd(false)}>Cancel</button>
            <button className={`${Style.filterPrimary} ${Style.btn}`} onClick={submitAdd}>Save</button>
          </>
        )}
      >
        <div>
          {formError && <div className="mb-2" style={{ color: 'var(--status-danger)' }}>{formError}</div>}
          <div className={Style.section}>
            <div className={Style.sectionTitle}>Vendor</div>
            <VendorSelect
              value={form.vendorId}
              onChange={(v) => setForm(f => ({ ...f, vendorId: v?.id ?? v?._id ?? '' }))}
              placeholder="Select vendor (Name and Phone)"
            />
            <div className="form-text">Shown as Name (Phone) to distinguish duplicates.</div>
          </div>
          <div className={Style.section}>
            <div className={Style.sectionTitle}>Basic Details</div>
            <div className={Style.sectionGrid}>
              <div>
                <label className="form-label">Name</label>
                <input name="name" value={form.name} onChange={onChange} className="form-control" placeholder="e.g. Paracetamol" />
              </div>
              <div>
                <label className="form-label">Low Stock Threshold</label>
                <input name="defaultLowStockThreshold" value={form.defaultLowStockThreshold} onChange={onChange} className="form-control" type="number" min="0" placeholder="e.g. 25" />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Medicine"
        open={showEdit}
        onClose={() => setShowEdit(false)}
        size="lg"
        footer={(
          <>
            <button className={`${Style.filterGhost} ${Style.btn}`} onClick={() => setShowEdit(false)}>Cancel</button>
            <button className={`${Style.filterPrimary} ${Style.btn}`} onClick={submitEdit}>Save</button>
          </>
        )}
      >
        <div className={""}>
          {formError && <div className="mb-2" style={{ color: 'var(--status-danger)' }}>{formError}</div>}
          <div className={Style.section}>
            <div className={Style.sectionTitle}>Vendor</div>
            <VendorSelect
              value={form.vendorId}
              onChange={(v) => setForm(f => ({ ...f, vendorId: v?.id ?? v?._id ?? '' }))}
              placeholder="Select vendor (Name and Phone)"
            />
            <div className="form-text">Shown as Name (Phone) to distinguish duplicates.</div>
          </div>
          <div className={Style.section}>
            <div className={Style.sectionTitle}>Basic Details</div>
            <div className={Style.sectionGrid}>
              <div>
                <label className="form-label">Name</label>
                <input name="name" value={form.name} onChange={onChange} className="form-control" placeholder="e.g. Paracetamol" />
              </div>
              <div>
                <label className="form-label">Low Stock Threshold</label>
                <input name="defaultLowStockThreshold" value={form.defaultLowStockThreshold} onChange={onChange} className="form-control" type="number" min="0" placeholder="e.g. 25" />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Medicine;
