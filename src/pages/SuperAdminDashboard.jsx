import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, removeSuperAdminToken, setRestaurantToken } from '../api';

const defaultFeatures = {
  tableOrdering: true,
  roomOrdering: true,
  selfCheckout: true,
  kitchenPanel: true,
  customerDataCollection: false,
  crm: true,
  analytics: true,
  qrGenerator: true
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({ totalRestaurants: 0, activeRestaurants: 0, suspendedRestaurants: 0, totalOrders: 0, totalRevenue: 0 });
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);
  const [newCreds, setNewCreds] = useState(null);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', email: '', mobile: '', packageLevel: 'Starter', features: defaultFeatures });
  const navigate = useNavigate();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, restaurantsData] = await Promise.all([
        api.superAdmin.getDashboard(),
        api.superAdmin.getRestaurants()
      ]);
      setStats(statsData);
      setRestaurants(restaurantsData);
    } catch (err) {
      if (err.status === 401 || err.status === 403) navigate('/superadmin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeSuperAdminToken();
    navigate('/superadmin/login');
  };

  const handleAddRestaurant = async (event) => {
    event.preventDefault();
    setError('');
    setFormLoading(true);
    try {
      const result = await api.superAdmin.createRestaurant(formData);
      setNewCreds(result.credentials);
      setIsAddModalOpen(false);
      setIsCredsModalOpen(true);
      setFormData({ name: '', slug: '', email: '', mobile: '', packageLevel: 'Starter', features: defaultFeatures });
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create restaurant');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await api.superAdmin.toggleActive(id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error toggling account status');
    }
  };

  const handleLoginAsAdmin = async (restaurantId) => {
    try {
      const data = await api.superAdmin.impersonate(restaurantId);
      setRestaurantToken(data.token);
      localStorage.setItem('restaurant_id', data.restaurantId);
      localStorage.setItem('restaurant_slug', data.restaurantSlug);
      window.open('/admin', '_blank');
    } catch (err) {
      alert(err.message || 'Failed to login as admin');
    }
  };

  const filteredRestaurants = restaurants.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.slug.toLowerCase().includes(search.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'active') return matchSearch && r.isActive;
    if (activeTab === 'suspended') return matchSearch && !r.isActive;
    return matchSearch;
  });

  const navTabs = [
    { id: 'all', label: 'All Restaurants', icon: 'store' },
    { id: 'active', label: 'Active', icon: 'check_circle' },
    { id: 'suspended', label: 'Suspended', icon: 'block' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] md:flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-[240px] bg-white border-r border-slate-100 z-40 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-6 py-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 bg-[#003b1b] rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[20px]">restaurant_menu</span>
          </div>
          <span className="text-[#003b1b] font-bold text-lg tracking-tight">MenuOS Admin</span>
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all text-left ${
                activeTab === tab.id
                  ? 'bg-[#003b1b]/10 text-[#003b1b] border-r-4 border-r-[#003b1b]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined mr-3 text-[22px]">{tab.icon}</span>
              {tab.label}
              {tab.id === 'active' && (
                <span className="ml-auto bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.activeRestaurants}</span>
              )}
              {tab.id === 'suspended' && (
                <span className="ml-auto bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.suspendedRestaurants}</span>
              )}
              {tab.id === 'all' && (
                <span className="ml-auto bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.totalRestaurants}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all">
            <span className="material-symbols-outlined mr-3 text-[22px]">logout</span>
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="w-full md:ml-[240px] p-4 md:p-8 text-left">
        {/* Top header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600">
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
              <p className="text-slate-500 text-sm mt-1">Restaurants, subscriptions, status, and feature control.</p>
            </div>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="h-11 flex items-center justify-center bg-[#003b1b] hover:bg-[#166534] text-white px-5 py-3 rounded-lg font-semibold text-sm shadow-sm">
            <span className="material-symbols-outlined mr-2 text-[20px]">add_circle</span>
            Add Restaurant
          </button>
        </header>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading platform...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
              <Stat icon="store" label="Restaurants" value={stats.totalRestaurants} />
              <Stat icon="check_circle" label="Active" value={stats.activeRestaurants} />
              <Stat icon="shopping_bag" label="Orders" value={stats.totalOrders} />
              <Stat icon="payments" label="Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString()}`} />
            </div>

            <section className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-bold text-slate-800">
                  {activeTab === 'all' ? 'All Restaurants' : activeTab === 'active' ? 'Active Restaurants' : 'Suspended Restaurants'}
                </h2>
                <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  <span className="material-symbols-outlined text-slate-400 text-[20px] mr-2">search</span>
                  <input className="bg-transparent border-none outline-none focus:ring-0 text-sm w-full md:w-56 text-slate-800" placeholder="Search restaurants..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <RestaurantTable
                  restaurants={filteredRestaurants}
                  onOpen={(id) => navigate(`/superadmin/restaurants/${id}`)}
                  onToggle={handleToggleActive}
                  onLoginAs={handleLoginAsAdmin}
                />
              </div>

              <div className="lg:hidden divide-y divide-slate-100">
                {filteredRestaurants.map((restaurant) => (
                  <RestaurantCard
                    key={restaurant._id}
                    restaurant={restaurant}
                    onOpen={() => navigate(`/superadmin/restaurants/${restaurant._id}`)}
                    onToggle={() => handleToggleActive(restaurant._id)}
                    onLoginAs={() => handleLoginAsAdmin(restaurant._id)}
                  />
                ))}
                {filteredRestaurants.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No restaurants found.</p>}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Add Restaurant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-xl p-5 md:p-6 relative max-h-[92vh] overflow-y-auto">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Create New Restaurant</h2>
            <p className="text-slate-400 text-xs mb-6">Owner credentials will be generated automatically.</p>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}

            <form onSubmit={handleAddRestaurant} className="space-y-4">
              <Field label="Business Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} required />
              <Field label="Slug / URL Slug" value={formData.slug} onChange={(v) => setFormData({ ...formData, slug: v.toLowerCase().replace(/[^a-z0-9-_]/g, '') })} required />
              <Field label="Owner Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} required />
              <Field label="Mobile Number" type="tel" value={formData.mobile} onChange={(v) => setFormData({ ...formData, mobile: v })} />
              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-1">Subscription Package</label>
                <select className="w-full h-11 px-3 border border-slate-200 rounded-lg outline-none text-sm bg-white" value={formData.packageLevel} onChange={(e) => setFormData({ ...formData, packageLevel: e.target.value })}>
                  <option value="Starter">Starter</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <span className="block text-slate-700 text-sm font-semibold mb-2">Enable Features</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.keys(defaultFeatures).map((feature) => (
                    <label key={feature} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/50">
                      <input type="checkbox" checked={!!formData.features[feature]} onChange={(e) => setFormData({ ...formData, features: { ...formData.features, [feature]: e.target.checked } })} />
                      {feature.replace(/([A-Z])/g, ' $1')}
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-11 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 h-11 bg-[#003b1b] text-white font-semibold text-sm rounded-lg disabled:opacity-50">{formLoading ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {isCredsModalOpen && newCreds && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md shadow-xl p-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[28px]">lock_open</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Account Created</h2>
            <div className="bg-slate-50 p-4 rounded-lg text-left space-y-2 border border-slate-200/50 my-5">
              <p><span className="text-xs text-slate-400 font-semibold uppercase block">Username</span><span className="text-sm font-bold">{newCreds.username}</span></p>
              <p className="border-t border-slate-200/60 pt-2"><span className="text-xs text-slate-400 font-semibold uppercase block">Password</span><span className="text-sm font-bold">{newCreds.password}</span></p>
            </div>
            <button onClick={() => setIsCredsModalOpen(false)} className="w-full h-11 bg-[#003b1b] text-white font-semibold text-sm rounded-lg">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-lg border border-slate-100 shadow-sm">
      <div className="p-2 md:p-3 bg-[#003b1b]/10 rounded-lg w-fit mb-3">
        <span className="material-symbols-outlined text-[#003b1b] text-[22px]">{icon}</span>
      </div>
      <h3 className="text-slate-500 text-xs md:text-sm font-semibold">{label}</h3>
      <p className="text-xl md:text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="block text-slate-700 text-sm font-semibold mb-1">{label}</label>
      <input type={type} className="w-full h-11 px-3 border border-slate-200 rounded-lg outline-none text-sm" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

function RestaurantTable({ restaurants, onOpen, onToggle, onLoginAs }) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          {['Restaurant', 'Slug/URL', 'Contact', 'Credentials', 'Plan', 'Status', 'Actions'].map((h) => (
            <th key={h} className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {restaurants.map((r) => (
          <tr key={r._id} className="hover:bg-slate-50/50">
            <td className="px-4 py-4"><RestaurantIdentity restaurant={r} /></td>
            <td className="px-4 py-4 text-sm text-slate-600 font-medium">/menu/{r.slug}</td>
            <td className="px-4 py-4 text-xs text-slate-500">
              <div>{r.email || 'N/A'}</div>
              {r.mobile && <div className="text-slate-400">{r.mobile}</div>}
            </td>
            <td className="px-4 py-4 text-xs">
              <div className="font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 space-y-1">
                <div><span className="text-slate-400">user: </span><span className="font-bold text-slate-700">{r.username}</span></div>
                {r.plainPassword && <div><span className="text-slate-400">pass: </span><span className="font-bold text-slate-700">{r.plainPassword}</span></div>}
              </div>
            </td>
            <td className="px-4 py-4"><PlanBadge plan={r.package} /></td>
            <td className="px-4 py-4"><StatusBadge active={r.isActive} /></td>
            <td className="px-4 py-4">
              <div className="flex items-center gap-2 text-slate-500">
                <button onClick={() => onLoginAs(r._id)} title="Login as Admin" className="flex items-center gap-1 bg-[#003b1b]/10 text-[#003b1b] hover:bg-[#003b1b] hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-colors">
                  <span className="material-symbols-outlined text-[14px]">login</span>
                  Login
                </button>
                <button onClick={() => onOpen(r._id)} className="hover:text-[#003b1b]" title="Settings">
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                </button>
                <button onClick={() => onToggle(r._id)} className={r.isActive ? 'hover:text-red-500' : 'hover:text-emerald-500'} title={r.isActive ? 'Suspend' : 'Activate'}>
                  <span className="material-symbols-outlined text-[20px]">{r.isActive ? 'block' : 'check_circle'}</span>
                </button>
              </div>
            </td>
          </tr>
        ))}
        {restaurants.length === 0 && (
          <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No restaurants found.</td></tr>
        )}
      </tbody>
    </table>
  );
}

function RestaurantCard({ restaurant, onOpen, onToggle, onLoginAs }) {
  const [showCreds, setShowCreds] = useState(false);
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <RestaurantIdentity restaurant={restaurant} />
        <StatusBadge active={restaurant.isActive} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div><span className="text-slate-400 block">Plan</span><PlanBadge plan={restaurant.package} /></div>
        <div><span className="text-slate-400 block">URL</span><span className="font-semibold text-slate-700">/menu/{restaurant.slug}</span></div>
        {restaurant.email && <div><span className="text-slate-400 block">Email</span><span className="font-semibold text-slate-700">{restaurant.email}</span></div>}
        {restaurant.mobile && <div><span className="text-slate-400 block">Mobile</span><span className="font-semibold text-slate-700">{restaurant.mobile}</span></div>}
      </div>

      <button onClick={() => setShowCreds(!showCreds)} className="mt-3 text-xs text-[#003b1b] font-bold flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">{showCreds ? 'visibility_off' : 'visibility'}</span>
        {showCreds ? 'Hide' : 'Show'} Credentials
      </button>
      {showCreds && (
        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono space-y-1">
          <div><span className="text-slate-400">Username: </span><span className="font-bold">{restaurant.username}</span></div>
          {restaurant.plainPassword && <div><span className="text-slate-400">Password: </span><span className="font-bold">{restaurant.plainPassword}</span></div>}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={onLoginAs} className="flex-1 h-10 rounded-lg bg-[#003b1b] text-white text-xs font-bold flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[16px]">login</span>
          Login as Admin
        </button>
        <button onClick={onOpen} className="h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>
        <button onClick={onToggle} className="h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">{restaurant.isActive ? 'Suspend' : 'Activate'}</button>
      </div>
    </div>
  );
}

function RestaurantIdentity({ restaurant }) {
  return (
    <div className="flex items-center min-w-0">
      {restaurant.logo ? (
        <img alt="Logo" className="w-10 h-10 rounded-full object-cover mr-3 border border-slate-200" src={restaurant.logo.startsWith('http') ? restaurant.logo : `http://localhost:5000${restaurant.logo}`} />
      ) : (
        <div className="w-10 h-10 rounded-full bg-slate-100 text-[#003b1b] flex items-center justify-center mr-3 font-bold text-xs">{restaurant.name.slice(0, 2).toUpperCase()}</div>
      )}
      <div className="min-w-0">
        <span className="font-semibold text-sm text-slate-800 block truncate">{restaurant.name}</span>
        <span className="text-slate-400 text-xs font-medium truncate block">{restaurant.username}</span>
      </div>
    </div>
  );
}

function PlanBadge({ plan }) {
  return <span className="inline-flex bg-[#003b1b]/10 text-[#003b1b] px-3 py-1 rounded-full text-xs font-bold">{plan}</span>;
}

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center text-xs font-bold ${active ? 'text-emerald-600' : 'text-red-500'}`}>
      <span className={`w-2 h-2 rounded-full mr-2 ${active ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
      {active ? 'Active' : 'Suspended'}
    </span>
  );
}
