import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { getRestaurantToken, getSuperAdminToken } from './api';

// Import Pages
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminRestaurantPage from './pages/SuperAdminRestaurantPage';
import RestaurantAdminLogin from './pages/RestaurantAdminLogin';
import OnboardingWizard from './pages/OnboardingWizard';
import RestaurantAdminDashboard from './pages/RestaurantAdminDashboard';
import CustomerMenu from './pages/CustomerMenu';
import KitchenPanel from './pages/KitchenPanel';
import WaiterLogin from './pages/WaiterLogin';
import WaiterDashboard from './pages/WaiterDashboard';
import WaiterMenu from './pages/WaiterMenu';
import CounterPanel from './pages/CounterPanel';
import QRGenerator from './pages/QRGenerator';

const RequireRestaurantAuth = ({ children }) => {
  return getRestaurantToken() ? children : <Navigate to="/admin/login" replace />;
};

const RequireSuperAdminAuth = ({ children }) => {
  return getSuperAdminToken() ? children : <Navigate to="/superadmin/login" replace />;
};

const RequireWaiterAuth = ({ children }) => {
  const { slug } = useParams();
  return localStorage.getItem('waiter_token') ? children : <Navigate to={`/waiter/${slug}/login`} replace />;
};

const RequireCounterAuth = ({ children }) => {
  const token = getRestaurantToken() || localStorage.getItem('waiter_token');
  return token ? children : <Navigate to="/admin/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Super Admin Routes */}
        <Route path="/superadmin/login" element={<SuperAdminLogin />} />
        <Route path="/superadmin" element={<RequireSuperAdminAuth><SuperAdminDashboard /></RequireSuperAdminAuth>} />
        <Route path="/superadmin/restaurants/:id" element={<RequireSuperAdminAuth><SuperAdminRestaurantPage /></RequireSuperAdminAuth>} />

        {/* Restaurant Admin Routes */}
        <Route path="/admin/login" element={<RestaurantAdminLogin />} />
        <Route path="/admin/wizard" element={<RequireRestaurantAuth><OnboardingWizard /></RequireRestaurantAuth>} />
        <Route path="/admin" element={<RequireRestaurantAuth><RestaurantAdminDashboard /></RequireRestaurantAuth>} />
        <Route path="/admin/qr-generator" element={<RequireRestaurantAuth><QRGenerator /></RequireRestaurantAuth>} />

        {/* Counter Billing Panel */}
        <Route path="/counter/:slug" element={<RequireCounterAuth><CounterPanel /></RequireCounterAuth>} />

        {/* Kitchen Panel View */}
        <Route path="/kitchen/:slug" element={<RequireRestaurantAuth><KitchenPanel /></RequireRestaurantAuth>} />

        {/* Waiter Panel Routes */}
        <Route path="/waiter/:slug/login" element={<WaiterLogin />} />
        <Route path="/waiter/:slug" element={<RequireWaiterAuth><WaiterDashboard /></RequireWaiterAuth>} />
        <Route path="/waiter/:slug/menu" element={<RequireWaiterAuth><WaiterMenu /></RequireWaiterAuth>} />

        {/* Customer Facing PWA Menu Routes */}
        <Route path="/menu/:slug" element={<CustomerMenu />} />
        <Route path="/menu/:slug/order/:orderId" element={<CustomerMenu />} />

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
