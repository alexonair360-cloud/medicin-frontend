import React, { useState, Suspense, lazy } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Signin from "./authentication/Signin.jsx";
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Navbar from "./components/Navbar.jsx";
import BillingPage from './pages/billing/BillingPage.jsx';
import BillingPrint from './pages/billing/BillingPrint.jsx';
import Medicine from "./pages/medicine/Medicine.jsx";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from './components/Modal.jsx';
import { clearAuthToken } from './api/ApiClient.js';
import { useNavigate } from 'react-router-dom';
import Loader from './components/ui/Loader.jsx';
const VendorsPage = lazy(() => import('./pages/vendors/VendorsPage'));
const VendorOrdersPage = lazy(() => import('./pages/vendors/VendorOrdersPage.jsx'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage.jsx'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage.jsx'));
const AddBatch = lazy(() => import('./pages/inventory/AddBatch.jsx'));
const BatchesPage = lazy(() => import('./pages/inventory/BatchesPage.jsx'));

const Billing = () => <div className="container py-4"><h2>Billing</h2></div>;

const App = () => {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const showNavbar = location.pathname !== '/';

  const onLogoutConfirm = () => {
    clearAuthToken();
    setLogoutOpen(false);
    navigate('/');
  };

  return (
    <div>
      {showNavbar && <Navbar onRequestLogout={() => setLogoutOpen(true)} />}
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
      <Suspense fallback={<Loader fullscreen />}> 
      <Routes>
        <Route path="/" element={<Signin />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medicines"
          element={
            <ProtectedRoute>
              <Medicine />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medicines/:medicineId/batches"
          element={<ProtectedRoute><BatchesPage /></ProtectedRoute>}
        />
        <Route
          path="/inventory/add-batch"
          element={
            <ProtectedRoute>
              <AddBatch />
            </ProtectedRoute>
          }
        />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/customers/:customerId/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
        <Route path="/customers/:customerId/billing/:billId/print" element={<ProtectedRoute><BillingPrint /></ProtectedRoute>} />
        <Route 
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomersPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/vendors" 
          element={
            <ProtectedRoute>
              <VendorsPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/vendors/:vendorId/orders"
          element={
            <ProtectedRoute>
              <VendorOrdersPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      </Suspense>

      <Modal
        title="Logout"
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        footer={(
          <>
            <button className="btn btn-outline-primary" onClick={() => setLogoutOpen(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={onLogoutConfirm}>Logout</button>
          </>
        )}
      >
        <p>Are you sure you want to logout?</p>
      </Modal>
    </div>
  );
}
export default App;