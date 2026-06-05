import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

const featureLabels = {
  tableOrdering: 'Table Ordering',
  roomOrdering: 'Room Ordering',
  selfCheckout: 'Self Checkout',
  kitchenPanel: 'Kitchen Panel',
  customerDataCollection: 'Customer Data',
  crm: 'CRM',
  analytics: 'Analytics',
  qrGenerator: 'QR Generator'
};

export default function SuperAdminRestaurantPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestaurant();
  }, [id]);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      const [restaurantData, ordersData] = await Promise.all([
        api.superAdmin.getRestaurant(id),
        api.superAdmin.getRestaurantOrders(id, { limit: 10 }).catch(() => [])
      ]);
      setRestaurant(restaurantData);
      setOrders(ordersData);
    } catch (err) {
      if (err.status === 401 || err.status === 403) navigate('/superadmin/login');
      else alert(err.message || 'Restaurant not found');
    } finally {
      setLoading(false);
    }
  };

  const saveRestaurant = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.superAdmin.updateRestaurant(id, {
        name: restaurant.name,
        slug: restaurant.slug,
        email: restaurant.email,
        packageLevel: restaurant.package,
        features: restaurant.features
      });
      await api.superAdmin.updatePlan(id, {
        ...(restaurant.plan || {}),
        name: restaurant.package
      });
      alert('Restaurant saved');
      loadRestaurant();
    } catch (err) {
      alert(err.message || 'Unable to save restaurant');
    } finally {
      setSaving(false);
    }
  };

  const setFeature = (feature, enabled) => {
    setRestaurant({
      ...restaurant,
      features: {
        ...(restaurant.features || {}),
        [feature]: enabled
      }
    });
  };

  if (loading) return <div className="min-h-screen bg-[#f7f9fb] p-6 text-slate-500">Loading restaurant...</div>;
  if (!restaurant) return null;

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/superadmin')} className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900">{restaurant.name}</h1>
              <p className="text-xs text-slate-400">/menu/{restaurant.slug} • {restaurant.username}</p>
            </div>
          </div>
          <a href={`/menu/${restaurant.slug}`} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-lg bg-[#003b1b] text-white text-xs font-bold flex items-center justify-center">Preview Menu</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={saveRestaurant} className="lg:col-span-2 bg-white rounded-lg border border-slate-100 shadow-sm p-5 md:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Restaurant Settings</h2>
            <p className="text-xs text-slate-400 mt-1">Separate page for account, plan, and feature controls.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Business Name" value={restaurant.name || ''} onChange={(value) => setRestaurant({ ...restaurant, name: value })} />
            <Field label="Owner Email" type="email" value={restaurant.email || ''} onChange={(value) => setRestaurant({ ...restaurant, email: value })} />
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-1">Subscription Package</label>
              <select className="w-full h-11 px-3 border border-slate-200 rounded-lg outline-none text-sm bg-white" value={restaurant.package || 'Starter'} onChange={(e) => setRestaurant({ ...restaurant, package: e.target.value })}>
                <option value="Starter">Starter</option>
                <option value="Professional">Professional</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <Field label="Slug" value={restaurant.slug || ''} onChange={(value) => setRestaurant({ ...restaurant, slug: value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Feature Access</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(featureLabels).map(([feature, label]) => (
                <label key={feature} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                  <span>{label}</span>
                  <input type="checkbox" checked={!!restaurant.features?.[feature]} onChange={(e) => setFeature(feature, e.target.checked)} />
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={() => navigate('/superadmin')} className="h-11 px-5 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold">Cancel</button>
            <button type="submit" disabled={saving} className="h-11 px-5 rounded-lg bg-[#003b1b] text-white text-sm font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save Restaurant'}</button>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="bg-white rounded-lg border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Account Snapshot</h2>
            <div className="space-y-3 text-xs">
              <Row label="Status" value={restaurant.isActive ? 'Active' : 'Suspended'} />
              <Row label="Plan" value={restaurant.package} />
              <Row label="Onboarded" value={restaurant.isOnboarded ? 'Yes' : 'No'} />
              <Row label="Created" value={restaurant.createdAt ? new Date(restaurant.createdAt).toLocaleDateString() : '-'} />
            </div>
          </section>

          <section className="bg-white rounded-lg border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {orders.length === 0 ? <p className="text-xs text-slate-400">No recent orders.</p> : orders.map((order) => (
                <div key={order._id} className="rounded-lg bg-slate-50 p-3 text-xs">
                  <div className="flex justify-between font-bold text-slate-700"><span>{order.orderNumber}</span><span>₹{order.totalAmount}</span></div>
                  <p className="text-slate-400 mt-1">{order.tableName} • {order.status}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-slate-700 text-sm font-semibold mb-1">{label}</label>
      <input type={type} className="w-full h-11 px-3 border border-slate-200 rounded-lg outline-none text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0">
      <span className="text-slate-400">{label}</span>
      <strong className="text-slate-700 text-right">{value}</strong>
    </div>
  );
}
