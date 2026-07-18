import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout Panels
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import SalesHistory from './pages/SalesHistory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Protected Route Wrapper to enforce security and roles check
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '12px', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Securing retail POS gateway...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = profile?.role || 'Cashier';
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Cashier role default landing screen is POS Billing
    if (role === 'Cashier') {
      return <Navigate to="/billing" replace />;
    }
    // Fallback default
    return <Navigate to="/billing" replace />;
  }

  return children;
};

export default function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Secured App Routes */}
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <div className="app-container">
                {/* Desktop Left Sidebar */}
                <Sidebar />

                {/* Right Side Content Port */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
                  <Navbar />
                  
                  <main style={{ flex: 1, overflowY: 'auto' }}>
                    <Routes>
                      {/* Dashboard (Admin & Manager) */}
                      <Route 
                        path="/" 
                        element={
                          <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                            <Dashboard />
                          </ProtectedRoute>
                        } 
                      />

                      {/* POS Billing Screen (All roles) */}
                      <Route path="/billing" element={<Billing />} />

                      {/* Stock Inventory (Admin & Manager) */}
                      <Route 
                        path="/inventory" 
                        element={
                          <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                            <Inventory />
                          </ProtectedRoute>
                        } 
                      />

                      {/* Customers list (All roles) */}
                      <Route path="/customers" element={<Customers />} />

                      {/* Sales Ledger (All roles) */}
                      <Route path="/sales" element={<SalesHistory />} />

                      {/* Reports center (Admin & Manager) */}
                      <Route 
                        path="/reports" 
                        element={
                          <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                            <Reports />
                          </ProtectedRoute>
                        } 
                      />

                      {/* Store settings (Admin only) */}
                      <Route 
                        path="/settings" 
                        element={
                          <ProtectedRoute allowedRoles={['Admin']}>
                            <Settings />
                          </ProtectedRoute>
                        } 
                      />

                      {/* Wildcard Fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>

                  {/* Mobile Bottom Navigation Bar */}
                  <BottomNav />
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
