import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const RequireRestaurantAuth = ({ children }) => {
  return getRestaurantToken() ? children : <Navigate to="/admin/login" replace />;
};

const RequireSuperAdminAuth = ({ children }) => {
  return getSuperAdminToken() ? children : <Navigate to="/superadmin/login" replace />;
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

        {/* Kitchen Panel View */}
        <Route path="/kitchen/:slug" element={<RequireRestaurantAuth><KitchenPanel /></RequireRestaurantAuth>} />

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
