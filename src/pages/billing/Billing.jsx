import React, { useEffect, useState, useMemo } from 'react';
import api from '../../api/ApiClient';
import Loader from '../../components/ui/Loader.jsx';
import Style from '../medicine/Medicine.module.css';
import ReactPaginate from 'react-paginate';
import { toast } from 'react-toastify';

const SearchIcon = (props) => (
  <svg className={Style.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const Billing = () => {
  const [medicines, setMedicines] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modal and Cart states
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchQuantities, setBatchQuantities] = useState({});
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [cart, setCart] = useState([]);
  const [printReceipt, setPrintReceipt] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  
  // Customer details for SMS
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsCustomerPhone, setSmsCustomerPhone] = useState('');
  
  // Customer search and selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [showAllReceipts, setShowAllReceipts] = useState(false);
  const [allBills, setAllBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Bills search and pagination
  const [billsSearch, setBillsSearch] = useState('');
  const [billsSearchType, setBillsSearchType] = useState('billId'); // 'billId' or 'customerId'
  const [billsPage, setBillsPage] = useState(0);
  const [billsPageSize] = useState(15);
  const [billsTotalCount, setBillsTotalCount] = useState(0);

  // Debounce search with 500ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Debounce customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch.trim().length >= 2) {
        searchCustomers(customerSearch);
      } else {
        setCustomerSearchResults([]);
        setShowCustomerDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('customer-search-dropdown');
      const input = document.getElementById('customer-search-input');
      if (dropdown && input && !dropdown.contains(event.target) && !input.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDropdown]);

  // Search customers by name
  const searchCustomers = async (query) => {
    setSearchingCustomers(true);
    try {
      const { data } = await api.get(`/customers?q=${query}`);
      setCustomerSearchResults(Array.isArray(data) ? data : []);
      setShowCustomerDropdown(true);
    } catch (e) {
      setCustomerSearchResults([]);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const fetchMedicines = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('page', page + 1); // Backend expects 1-based page
      params.set('limit', pageSize);
      
      const { data } = await api.get(`/medicines?${params.toString()}`);
      const items = Array.isArray(data) ? data : (data?.items || []);
      const total = data?.total || items.length;
      
      setMedicines(items);
      setTotalCount(total);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load medicines');
    } finally {
      setLoading(false);
    }
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
      // ignore transient stock fetch errors
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

  useEffect(() => {
    fetchMedicines();
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchStockSummary();
    fetchMedicineStats();
  }, []);

  const pageCount = useMemo(() => Math.ceil(totalCount / pageSize) || 1, [totalCount, pageSize]);

  const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));

  // Check if medicine is already in cart
  const isMedicineInCart = (medicineId) => {
    return cart.some(item => item.medicineId === medicineId);
  };

  // Get existing quantities for a medicine from cart
  const getExistingQuantities = (medicineId) => {
    const quantities = {};
    cart.forEach(item => {
      if (item.medicineId === medicineId) {
        quantities[item.batchId] = item.quantity;
      }
    });
    return quantities;
  };

  // Open batch selection modal
  const handleAddClick = async (medicine) => {
    setSelectedMedicine(medicine);
    setShowBatchModal(true);
    setLoadingBatches(true);
    
    // Pre-populate quantities if editing
    const existingQty = getExistingQuantities(medicine._id);
    setBatchQuantities(existingQty);
    
    try {
      const { data } = await api.get(`/inventory/batches?medicineId=${medicine._id}`);
      const availableBatches = (data || []).filter(b => b.quantity > 0);
      setBatches(availableBatches);
    } catch (e) {
      toast.error('Failed to load batches');
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Handle quantity change for a batch
  const handleBatchQuantityChange = (batchId, value) => {
    const qty = parseInt(value, 10) || 0;
    setBatchQuantities(prev => ({
      ...prev,
      [batchId]: qty
    }));
  };

  // Add selected batches to cart
  const handleAddToCart = () => {
    const selectedBatches = Object.entries(batchQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([batchId, qty]) => {
        const batch = batches.find(b => b._id === batchId);
        return { batch, quantity: qty };
      });

    if (selectedBatches.length === 0) {
      toast.warn('Please select at least one batch with quantity');
      return;
    }

    // Validate quantities
    for (const { batch, quantity } of selectedBatches) {
      if (quantity > batch.quantity) {
        toast.error(`Quantity for batch ${batch.batchNo} exceeds available stock (${batch.quantity})`);
        return;
      }
    }

    // Remove existing items for this medicine from cart
    const filteredCart = cart.filter(item => item.medicineId !== selectedMedicine._id);

    // Add updated cart items
    const cartItems = selectedBatches.map(({ batch, quantity }) => ({
      medicineId: selectedMedicine._id,
      medicineName: selectedMedicine.name,
      batchId: batch._id,
      batchNo: batch.batchNo,
      quantity,
      mrp: batch.mrp || 0,
      gstPercent: selectedMedicine.gstPercent || 0,
      discountPercent: selectedMedicine.discountPercent || 0,
    }));

    setCart([...filteredCart, ...cartItems]);
    setShowBatchModal(false);
    toast.success(isMedicineInCart(selectedMedicine._id) ? 'Cart updated' : 'Added to cart');
  };

  // Calculate cart totals
  const cartTotals = useMemo(() => {
    let subtotal = 0;
    let totalGST = 0;
    let totalDiscount = 0;

    cart.forEach(item => {
      const itemTotal = item.mrp * item.quantity;
      const discount = (itemTotal * item.discountPercent) / 100;
      const afterDiscount = itemTotal - discount;
      const gst = (afterDiscount * item.gstPercent) / 100;
      
      subtotal += itemTotal;
      totalDiscount += discount;
      totalGST += gst;
    });

    const grandTotal = subtotal - totalDiscount + totalGST;

    return { subtotal, totalDiscount, totalGST, grandTotal };
  }, [cart]);

  // Remove item from cart
  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Fetch all bills with search and pagination
  const fetchAllBills = async () => {
    setLoadingBills(true);
    try {
      const params = new URLSearchParams();
      params.set('page', billsPage + 1);
      params.set('limit', billsPageSize);
      
      if (billsSearch) {
        if (billsSearchType === 'billId') {
          params.set('billNumber', billsSearch);
        } else if (billsSearchType === 'customerId') {
          params.set('customerId', billsSearch);
        }
      }
      
      const { data } = await api.get(`/bills?${params.toString()}`);
      const items = Array.isArray(data) ? data : (data?.items || []);
      const total = data?.total || items.length;
      
      setAllBills(items);
      setBillsTotalCount(total);
    } catch (e) {
      toast.error('Failed to load bills');
    } finally {
      setLoadingBills(false);
    }
  };

  // Fetch bills when modal opens or search/page changes
  useEffect(() => {
    if (showAllReceipts) {
      fetchAllBills();
    }
  }, [showAllReceipts, billsSearch, billsSearchType, billsPage]);

  // Handle customer selection from dropdown
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.name} (${customer.customerId})`);
    setShowCustomerDropdown(false);
  };

  // Handle "New Customer" option
  const handleNewCustomer = async () => {
    const name = customerSearch.trim();
    if (!name) {
      toast.warn('Please enter customer name');
      return;
    }
    
    try {
      const { data: newCustomer } = await api.post('/customers', { name });
      setSelectedCustomer(newCustomer);
      setCustomerSearch(`${newCustomer.name} (${newCustomer.customerId})`);
      setShowCustomerDropdown(false);
      toast.success(`New customer created: ${newCustomer.customerId}`);
    } catch (e) {
      toast.error('Failed to create customer');
    }
  };

  // Clear customer selection
  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerSearchResults([]);
    setShowCustomerDropdown(false);
  };

  // Handle SMS checkbox click
  const handleSMSCheckboxChange = (checked) => {
    if (checked) {
      if (!selectedCustomer) {
        toast.warn('Please select a customer first');
        return;
      }
      // Open modal to collect phone number
      setShowSMSModal(true);
    } else {
      // Uncheck and clear SMS data
      setSendSMS(false);
      setSmsCustomerPhone('');
    }
  };

  // Save SMS customer phone
  const handleSaveSMSCustomer = () => {
    if (!smsCustomerPhone.trim()) {
      toast.warn('Please enter customer phone number');
      return;
    }
    setSendSMS(true);
    setShowSMSModal(false);
    toast.success('SMS will be sent to customer');
  };

  // Handle print receipt
  const handlePrintReceipt = async () => {
    if (cart.length === 0) {
      toast.warn('Cart is empty');
      return;
    }

    setSubmitting(true);
    try {
      let customerId;
      
      // If customer is selected, use it
      if (selectedCustomer) {
        customerId = selectedCustomer._id;
        
        // If SMS is enabled, update customer phone
        if (sendSMS && smsCustomerPhone.trim()) {
          try {
            await api.put(`/customers/${customerId}`, {
              phone: smsCustomerPhone.trim()
            });
          } catch (e) {
            // Continue even if phone update fails
          }
        }
      } else {
        // Create or get walk-in customer
        try {
          const { data: customers } = await api.get('/customers?search=Walk-in');
          const walkIn = customers?.find(c => c.name === 'Walk-in Customer');
          
          if (walkIn) {
            customerId = walkIn._id;
          } else {
            const { data: newCustomer } = await api.post('/customers', {
              name: 'Walk-in Customer'
            });
            customerId = newCustomer._id;
          }
        } catch (e) {
          toast.error('Failed to create customer');
          setSubmitting(false);
          return;
        }
      }

      // Prepare bill items
      const billItems = cart.map(item => ({
        medicineId: item.medicineId,
        batchId: item.batchId,
        productName: item.medicineName,
        batchNo: item.batchNo,
        mrp: item.mrp,
        quantity: item.quantity,
        discountPct: item.discountPercent,
        gstPct: item.gstPercent,
      }));

      // Create bill
      const { data: bill } = await api.post('/bills', {
        customerId,
        items: billItems,
        notes: ''
      });

      toast.success(`Bill created: ${bill.billNumber}`);

      // Print if checkbox is checked
      if (printReceipt) {
        printBill(bill);
      }

      // Clear cart, customer selection, and SMS details
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setSendSMS(false);
      setSmsCustomerPhone('');
      
      // Refresh data
      fetchMedicines();
      fetchStockSummary();
      fetchMedicineStats();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  // Print bill - same format as BillingPrint.jsx
  const printBill = (bill) => {
    const printWindow = window.open('', '_blank');
    const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));
    const createdAt = bill.billingDate ? new Date(bill.billingDate) : (bill.createdAt ? new Date(bill.createdAt) : new Date());
    
    const itemsRows = bill.items.map((item, idx) => `
      <tr>
        <td style="padding:6px 4px">${idx + 1}</td>
        <td style="padding:6px 4px">${item.productName}</td>
        <td style="padding:6px 4px;text-align:right">${currency(item.mrp)}</td>
        <td style="padding:6px 4px;text-align:center">${item.quantity}</td>
        <td style="padding:6px 4px;text-align:right">${Number(item.discountPct || 0)}%</td>
        <td style="padding:6px 4px;text-align:right">${Number(item.gstPct || 0)}%</td>
        <td style="padding:6px 4px;text-align:right">${currency(item.lineAmount)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${bill.billNumber || 'Invoice'} - ${bill.customerId?.name || 'Customer'}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            background: #fff; 
            color: #000; 
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 1rem;
          }
          .no-print { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 0.5rem; 
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #000;
            padding-bottom: 0.5rem;
            margin-bottom: 0.75rem;
          }
          .store-name {
            font-size: 24px;
            font-weight: 800;
          }
          .store-subtitle {
            font-size: 12px;
          }
          .bill-info {
            text-align: right;
            font-size: 14px;
          }
          .customer-info {
            margin-bottom: 0.5rem;
          }
          .customer-label {
            font-weight: 700;
          }
          .customer-details {
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            margin: 1rem 0;
          }
          th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding: 6px 4px;
          }
          td {
            padding: 6px 4px;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .totals-container {
            display: flex;
            justify-content: flex-end;
            margin-top: 0.75rem;
          }
          .totals-table {
            min-width: 320px;
            font-size: 14px;
          }
          .totals-table td {
            padding: 4px 8px;
          }
          .total-row td {
            padding: 6px 8px;
            font-weight: 800;
            border-top: 1px solid #000;
          }
          .footer {
            margin-top: 1rem;
            font-size: 12px;
            text-align: center;
          }
          button {
            padding: 8px 16px;
            margin: 5px;
            cursor: pointer;
          }
          @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 0; }
            html, body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="no-print">
            <button onclick="window.close()">Close</button>
            <button onclick="window.print()">Print</button>
          </div>

          <div class="header">
            <div>
              <div class="store-name">Thangam Medicals</div>
              <div class="store-subtitle">Pharmacy & General Stores</div>
            </div>
            <div class="bill-info">
              <div><strong>Bill No:</strong> ${bill.billNumber || bill._id}</div>
              <div><strong>Date:</strong> ${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}</div>
            </div>
          </div>

          <div class="customer-info">
            <div class="customer-label">Customer</div>
            <div>${bill.customerId?.name || '-'}</div>
            ${bill.customerId?.customerId ? `<div class="customer-details">ID: ${bill.customerId.customerId}</div>` : ''}
            ${bill.customerId?.phone ? `<div class="customer-details">${bill.customerId.phone}</div>` : ''}
            ${bill.customerId?.email ? `<div class="customer-details">${bill.customerId.email}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th class="text-right">MRP</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Disc%</th>
                <th class="text-right">GST%</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals-container">
            <table class="totals-table">
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td class="text-right">${currency(bill.subtotal)}</td>
                </tr>
                <tr>
                  <td>Discount</td>
                  <td class="text-right">${currency(bill.totalDiscount)}</td>
                </tr>
                <tr>
                  <td>GST</td>
                  <td class="text-right">${currency(bill.totalGst)}</td>
                </tr>
                <tr class="total-row">
                  <td>Grand Total</td>
                  <td class="text-right">${currency(bill.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            Thank you for your purchase!
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  // View receipt details
  const viewReceipt = async (billId) => {
    try {
      const { data } = await api.get(`/bills/${billId}`);
      setSelectedBill(data);
      setShowReceiptModal(true);
    } catch (e) {
      toast.error('Failed to load bill details');
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (bill) => {
    setBillToDelete(bill);
    setShowDeleteConfirm(true);
  };

  // Confirm delete bill
  const confirmDeleteBill = async () => {
    if (!billToDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`/bills/${billToDelete._id}`);
      toast.success('Receipt deleted successfully');
      setShowDeleteConfirm(false);
      setBillToDelete(null);
      // Refresh bills list
      fetchAllBills();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete receipt');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={Style.page}>
      <div className={Style.headerRow}>
        <h2 className={Style.title}>Billing</h2>
        <button 
          className="btn btn-outline-primary"
          onClick={() => {
            setShowAllReceipts(true);
            setBillsSearch('');
            setBillsPage(0);
          }}
        >
          View All Receipts
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', height: 'calc(100vh - 180px)' }}>
        {/* Left Section - 70% */}
        <div style={{ flex: '0 0 70%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search Bar */}
          <div className={Style.toolbar}>
            <div className={Style.searchWrap}>
              <SearchIcon />
              <input
                className={Style.searchInput}
                type="text"
                placeholder="Search medicines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {error && <div style={{ color: 'var(--status-danger)', marginTop: '0.75rem' }}>{error}</div>}

          {/* Table */}
          {loading ? (
            <Loader />
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className={Style.tableWrap}>
              <table className={Style.table}>
                <thead className={Style.thead}>
                  <tr>
                    <th className={Style.th} scope="col">Medicine Name</th>
                    <th className={`${Style.th} ${Style.center}`} scope="col">Stock</th>
                    {/* <th className={`${Style.th} ${Style.center}`} scope="col">MRP</th> */}
                    <th className={`${Style.th} ${Style.center}`} scope="col">GST %</th>
                    <th className={`${Style.th} ${Style.center}`} scope="col">Discount %</th>
                    <th className={`${Style.th} ${Style.center}`} scope="col">Batches</th>
                    <th className={`${Style.th} ${Style.center}`} scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.length === 0 ? (
                    <tr><td className={Style.td} colSpan={7}>No medicines found.</td></tr>
                  ) : (
                    medicines.map((m) => {
                      const stock = stockMap[String(m._id)] || 0;
                      const stats = statsMap[String(m._id)] || {};
                      const batchCount = stats.totalBatches || 0;
                      
                      return (
                        <tr key={m._id}>
                          <td className={Style.td}>{m.name}</td>
                          <td className={`${Style.td} ${Style.center}`}>{stock}</td>
                          {/* <td className={`${Style.td} ${Style.center}`}>-</td> */}
                          <td className={`${Style.td} ${Style.center}`}>{typeof m.gstPercent === 'number' ? `${m.gstPercent}%` : '-'}</td>
                          <td className={`${Style.td} ${Style.center}`}>{typeof m.discountPercent === 'number' ? `${m.discountPercent}%` : '-'}</td>
                          <td className={`${Style.td} ${Style.center}`}>{batchCount}</td>
                          <td className={`${Style.td} ${Style.center}`}>
                            <button
                              onClick={() => handleAddClick(m)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--color-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >{isMedicineInCart(m._id) ? 'Edit' : 'Add'}</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {medicines.length > 0 && (
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
            </div>
          )}
        </div>

        {/* Right Section - 30% - Cart */}
        <div style={{ flex: '0 0 30%', background: '#f8f9fa', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <h5 style={{ marginBottom: '1rem' }}>Cart Summary</h5>
          
          {/* Customer Search */}
          <div style={{ marginBottom: '1rem', position: 'relative' }}>
            <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Customer</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="customer-search-input"
                type="text"
                className="form-control form-control-sm"
                placeholder="Search customer by name..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onFocus={() => customerSearchResults.length > 0 && setShowCustomerDropdown(true)}
              />
              {selectedCustomer && (
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleClearCustomer}
                  title="Clear selection"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Dropdown */}
            {showCustomerDropdown && (
              <div 
                id="customer-search-dropdown"
                style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                marginTop: '2px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {searchingCustomers ? (
                  <div style={{ padding: '0.5rem', textAlign: 'center', color: '#6c757d' }}>
                    Searching...
                  </div>
                ) : (
                  <>
                    {/* New Customer Option */}
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #dee2e6',
                        background: '#e7f3ff',
                        fontWeight: 600,
                        color: '#0d6efd'
                      }}
                      onClick={handleNewCustomer}
                    >
                      + New Customer: "{customerSearch}"
                    </div>
                    
                    {/* Existing Customers */}
                    {customerSearchResults.length === 0 ? (
                      <div style={{ padding: '0.5rem', textAlign: 'center', color: '#6c757d' }}>
                        No customers found
                      </div>
                    ) : (
                      customerSearchResults.map((customer) => (
                        <div
                          key={customer._id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                          onClick={() => handleSelectCustomer(customer)}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <div style={{ fontWeight: 600 }}>{customer.name}</div>
                          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                            {customer.customerId} {customer.phone && `• ${customer.phone}`}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Checkboxes */}
          <div style={{ marginBottom: '1rem' }}>
            <div className="form-check">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="printReceipt" 
                checked={printReceipt}
                onChange={(e) => setPrintReceipt(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="printReceipt">
                Print Receipt
              </label>
            </div>
            <div className="form-check">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="sendSMS" 
                checked={sendSMS}
                onChange={(e) => handleSMSCheckboxChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="sendSMS">
                Send SMS {sendSMS && selectedCustomer && `(${selectedCustomer.name})`}
              </label>
            </div>
          </div>

          {/* Cart Items */}
          <div style={{ marginBottom: '1rem' }}>
            {cart.length === 0 ? (
              <p className="text-muted">No items in cart</p>
            ) : (
              cart.map((item, index) => (
                <div key={index} style={{ background: 'white', padding: '0.75rem', marginBottom: '0.5rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{item.medicineName}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Batch: {item.batchNo}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Qty: {item.quantity} × {fmtINR(item.mrp)}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        GST: {item.gstPercent}% | Discount: {item.discountPercent}%
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(index)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#dc3545',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '0',
                        lineHeight: 1
                      }}
                      title="Remove"
                    >×</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          {cart.length > 0 && (
            <div style={{ borderTop: '2px solid #dee2e6', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                <span>Subtotal:</span>
                <span>{fmtINR(cartTotals.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem', color: '#28a745' }}>
                <span>Discount:</span>
                <span>- {fmtINR(cartTotals.totalDiscount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#007bff' }}>
                <span>GST:</span>
                <span>+ {fmtINR(cartTotals.totalGST)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', borderTop: '1px solid #dee2e6', paddingTop: '0.5rem' }}>
                <span>Total:</span>
                <span>{fmtINR(cartTotals.grandTotal)}</span>
              </div>
              <button 
                className="btn btn-primary w-100 mt-3"
                onClick={handlePrintReceipt}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Generate Receipt'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Batch Selection Modal */}
      {showBatchModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {isMedicineInCart(selectedMedicine?._id) ? 'Edit' : 'Select'} Batches - {selectedMedicine?.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowBatchModal(false)}></button>
              </div>
              <div className="modal-body">
                {loadingBatches ? (
                  <Loader />
                ) : batches.length === 0 ? (
                  <p className="text-muted">No batches available with stock</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Batch No</th>
                          <th>Available Stock</th>
                          <th>MRP</th>
                          <th>Expiry</th>
                          <th>Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((batch) => (
                          <tr key={batch._id}>
                            <td>{batch.batchNo || '-'}</td>
                            <td><strong>{batch.quantity}</strong> (Max)</td>
                            <td>{batch.mrp ? fmtINR(batch.mrp) : '-'}</td>
                            <td>{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '-'}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                min="0"
                                max={batch.quantity}
                                value={batchQuantities[batch._id] || ''}
                                onChange={(e) => handleBatchQuantityChange(batch._id, e.target.value)}
                                placeholder="0"
                                style={{ width: '100px' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddToCart} disabled={loadingBatches}>
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View All Receipts Modal */}
      {showAllReceipts && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">All Receipts</h5>
                <button type="button" className="btn-close" onClick={() => setShowAllReceipts(false)}></button>
              </div>
              <div className="modal-body">
                {/* Search Controls */}
                <div className="row mb-3">
                  <div className="col-md-3">
                    <label className="form-label">Search By:</label>
                    <select 
                      className="form-select"
                      value={billsSearchType}
                      onChange={(e) => {
                        setBillsSearchType(e.target.value);
                        setBillsSearch('');
                        setBillsPage(0);
                      }}
                    >
                      <option value="billId">Bill ID</option>
                      <option value="customerId">Customer ID</option>
                    </select>
                  </div>
                  <div className="col-md-9">
                    <label className="form-label">
                      {billsSearchType === 'billId' ? 'Search by Bill Number' : 'Search by Customer ID'}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={billsSearchType === 'billId' ? 'Enter bill number...' : 'Enter customer ID...'}
                      value={billsSearch}
                      onChange={(e) => {
                        setBillsSearch(e.target.value);
                        setBillsPage(0);
                      }}
                    />
                  </div>
                </div>

                {loadingBills ? (
                  <Loader />
                ) : allBills.length === 0 ? (
                  <p className="text-muted">No receipts found</p>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Bill No</th>
                            <th>Customer ID</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allBills.map((bill) => (
                            <tr key={bill._id}>
                              <td><strong>{bill.billNumber}</strong></td>
                              <td>{bill.customerId?.customerId || '-'}</td>
                              <td>{new Date(bill.createdAt).toLocaleString()}</td>
                              <td>{bill.items?.length || 0}</td>
                              <td><strong>{fmtINR(bill.grandTotal)}</strong></td>
                              <td>
                                <button
                                  className="btn btn-sm btn-primary me-2"
                                  onClick={() => viewReceipt(bill._id)}
                                >
                                  View
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDeleteClick(bill)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {billsTotalCount > billsPageSize && (
                      <div className={Style.paginationWrap}>
                        <ReactPaginate
                          breakLabel="…"
                          nextLabel=">"
                          onPageChange={(ev) => setBillsPage(ev.selected)}
                          pageRangeDisplayed={3}
                          marginPagesDisplayed={1}
                          pageCount={Math.ceil(billsTotalCount / billsPageSize)}
                          previousLabel="<"
                          renderOnZeroPageCount={null}
                          forcePage={billsPage}
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
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAllReceipts(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Detail Modal */}
      {showReceiptModal && selectedBill && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Receipt Details - {selectedBill.billNumber}</h5>
                <button type="button" className="btn-close" onClick={() => setShowReceiptModal(false)}></button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem' }}>
                  <p><strong>Bill No:</strong> {selectedBill.billNumber}</p>
                  <p><strong>Customer ID:</strong> {selectedBill.customerId?.customerId || '-'}</p>
                  {selectedBill.customerId?.name && selectedBill.customerId.name !== 'Walk-in Customer' && (
                    <p><strong>Customer Name:</strong> {selectedBill.customerId.name}</p>
                  )}
                  <p><strong>Date:</strong> {new Date(selectedBill.createdAt).toLocaleString()}</p>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Medicine</th>
                        <th>Batch</th>
                        <th>MRP</th>
                        <th>Qty</th>
                        <th>Disc%</th>
                        <th>GST%</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBill.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{item.productName}</td>
                          <td>{item.batchNo || '-'}</td>
                          <td>{fmtINR(item.mrp)}</td>
                          <td>{item.quantity}</td>
                          <td>{item.discountPct}%</td>
                          <td>{item.gstPct}%</td>
                          <td>{fmtINR(item.lineAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                  <table style={{ marginLeft: 'auto', minWidth: '300px' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 8px' }}>Subtotal:</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtINR(selectedBill.subtotal)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 8px' }}>Discount:</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>- {fmtINR(selectedBill.totalDiscount)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 8px' }}>GST:</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>+ {fmtINR(selectedBill.totalGst)}</td>
                      </tr>
                      <tr style={{ borderTop: '2px solid #000' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>Grand Total:</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{fmtINR(selectedBill.grandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReceiptModal(false)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={() => printBill(selectedBill)}>Print Receipt</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS Customer Details Modal */}
      {showSMSModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Phone Number for SMS</h5>
                <button type="button" className="btn-close" onClick={() => {
                  setShowSMSModal(false);
                  setSendSMS(false);
                }}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  Customer: <strong>{selectedCustomer?.name} ({selectedCustomer?.customerId})</strong>
                </p>
                <p className="text-muted mb-3">Please provide phone number to send SMS notification.</p>
                <div className="mb-3">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Enter phone number"
                    value={smsCustomerPhone}
                    onChange={(e) => setSmsCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowSMSModal(false);
                    setSendSMS(false);
                    setSmsCustomerPhone('');
                  }}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSaveSMSCustomer}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && billToDelete && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => {
                  setShowDeleteConfirm(false);
                  setBillToDelete(null);
                }}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this receipt?</p>
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
                  <p className="mb-1"><strong>Bill No:</strong> {billToDelete.billNumber}</p>
                  <p className="mb-1"><strong>Customer ID:</strong> {billToDelete.customerId?.customerId || '-'}</p>
                  <p className="mb-1"><strong>Total:</strong> {fmtINR(billToDelete.grandTotal)}</p>
                  <p className="mb-0"><strong>Date:</strong> {new Date(billToDelete.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-danger mt-3 mb-0">
                  <small><strong>Warning:</strong> This action cannot be undone. The bill will be permanently deleted.</small>
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setBillToDelete(null);
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmDeleteBill}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
