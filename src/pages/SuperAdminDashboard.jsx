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
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Plans Modals & Forms
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    price: 0,
    billingCycle: 'monthly',
    features: {
      tableOrdering: true,
      roomOrdering: true,
      selfCheckout: true,
      kitchenPanel: true,
      counterPanel: true,
      waiterPanel: true,
      customerLogin: false,
      qrGenerator: true,
      analytics: true,
      maxTables: 20,
      maxMenuItems: 100,
      maxCategories: 15
    },
    id: null
  });

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
      const [statsData, restaurantsData, plansData] = await Promise.all([
        api.superAdmin.getDashboard(),
        api.superAdmin.getRestaurants(),
        api.superAdmin.getPlans().catch(() => [])
      ]);
      setStats(statsData);
      setRestaurants(restaurantsData);
      setPlans(plansData);
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

  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      if (planFormData.id) {
        await api.superAdmin.updatePlanDetails(planFormData.id, planFormData);
      } else {
        await api.superAdmin.createPlan(planFormData);
      }
      setIsPlanModalOpen(false);
      setPlanFormData({
        name: '', price: 0, billingCycle: 'monthly',
        features: { tableOrdering: true, roomOrdering: true, selfCheckout: true, kitchenPanel: true, counterPanel: true, waiterPanel: true, customerLogin: false, qrGenerator: true, analytics: true, maxTables: 20, maxMenuItems: 100, maxCategories: 15 },
        id: null
      });
      const plansList = await api.superAdmin.getPlans();
      setPlans(plansList);
    } catch (err) {
      alert(err.message || 'Error saving subscription plan');
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) return;
    try {
      await api.superAdmin.deletePlan(id);
      setPlans(plans.filter(p => p._id !== id));
    } catch (err) {
      alert(err.message || 'Error deleting plan');
    }
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
    { id: 'plans', label: 'Subscription Plans', icon: 'credit_card' }
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#191c1e] md:flex font-sans text-xs">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar Navigation (Dark Midnight Blue Theme) */}
      <aside className={`bg-[#0d1321] w-[220px] flex flex-col fixed h-full shadow-2xl z-40 text-left border-r border-slate-800/80 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {/* Header Block */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-slate-800/80 bg-[#090d16]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#003b1b] to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <span className="material-symbols-outlined text-white text-[16px]">restaurant_menu</span>
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-xs text-white tracking-wide block truncate">MenuOS Admin</span>
              <span className="inline-flex items-center px-1.5 py-0.25 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-50/10 text-emerald-400 border border-emerald-500/25 mt-0.5">
                Super User
              </span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 mt-4 overflow-y-auto px-2 space-y-0.5 hide-scrollbar">
          <span className="px-2.5 text-[9px] uppercase tracking-widest font-black text-slate-500/80 block mb-1.5">Workspace</span>
          <ul className="flex flex-col space-y-0.5">
            {navTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 text-[11px] font-semibold transition-all duration-200 cursor-pointer text-left rounded-lg group relative ${
                      isActive
                        ? 'text-white shadow-lg bg-[#003b1b] font-bold shadow-black/10'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className={`material-symbols-outlined mr-2.5 text-[18px] transition-transform duration-200 ${isActive ? 'scale-105 text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </div>
                    {tab.id === 'active' && (
                      <span className={`ml-2 px-1.5 py-0.25 rounded-full text-[8px] font-black ${isActive ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}>{stats.activeRestaurants}</span>
                    )}
                    {tab.id === 'suspended' && (
                      <span className={`ml-2 px-1.5 py-0.25 rounded-full text-[8px] font-black ${isActive ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}>{stats.suspendedRestaurants}</span>
                    )}
                    {tab.id === 'all' && (
                      <span className={`ml-2 px-1.5 py-0.25 rounded-full text-[8px] font-black ${isActive ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}>{stats.totalRestaurants}</span>
                    )}
                    {tab.id === 'plans' && (
                      <span className={`ml-2 px-1.5 py-0.25 rounded-full text-[8px] font-black ${isActive ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}>{plans.length}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Action Panel Links */}
        <div className="p-3 border-t border-slate-800/80 bg-[#090d16]">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 bg-rose-950/30 border border-rose-900/20 rounded-lg hover:bg-rose-900/50 hover:text-rose-300 transition-all text-[10px] font-extrabold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="w-full md:flex-1 md:ml-[220px] p-3 md:p-6 min-w-0 text-left bg-slate-50">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between p-3 bg-white border border-slate-200 rounded-2xl mb-5 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 shadow-sm transition-colors hover:bg-slate-100 cursor-pointer">
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <span className="font-extrabold text-slate-800 text-sm">Super Admin</span>
          </div>
          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200">Management</span>
        </div>

        {/* Top Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 font-sans">Super Admin Dashboard</h1>
            <p className="text-[10px] text-slate-400 mt-1">Restaurants, plans subscriptions, status control, and platform features access.</p>
          </div>
          
          {/* Conditional Add Restaurant Button */}
          {(activeTab === 'all' || activeTab === 'active' || activeTab === 'suspended') && (
            <button 
              onClick={() => setIsAddModalOpen(true)} 
              className="h-8 flex items-center justify-center bg-[#003b1b] hover:bg-[#166534] text-white px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined mr-1.5 text-[16px]">add_circle</span>
              Add Restaurant
            </button>
          )}
        </header>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div>
            <p className="text-slate-400 text-sm mt-4">Loading platform operational data...</p>
          </div>
        ) : (
          <>
            {/* Conditional Stats Grid: Hidden in Plans Tab */}
            {(activeTab === 'all' || activeTab === 'active' || activeTab === 'suspended') && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                <Stat icon="store" label="Total Restaurants" value={stats.totalRestaurants} />
                <Stat icon="check_circle" label="Active Subscriptions" value={stats.activeRestaurants} />
                <Stat icon="shopping_bag" label="Total Placed Orders" value={stats.totalOrders} />
                <Stat icon="payments" label="Gross Plat Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString()}`} />
              </div>
            )}

            {/* TAB: Subscription Plans */}
            {activeTab === 'plans' ? (
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-left">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800">Subscription Packages</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Manage pricing configurations and resource limits for the platform plans.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setPlanFormData({
                        name: '', price: 0, billingCycle: 'monthly',
                        features: { tableOrdering: true, roomOrdering: true, selfCheckout: true, kitchenPanel: true, counterPanel: true, waiterPanel: true, customerLogin: false, qrGenerator: true, analytics: true, maxTables: 20, maxMenuItems: 100, maxCategories: 15 },
                        id: null
                      });
                      setIsPlanModalOpen(true);
                    }}
                    className="h-8 px-3 bg-[#003b1b] hover:bg-[#166534] text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">add_circle</span>
                    Create Plan
                  </button>
                </div>
                
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <tr>
                        <th className="p-3 pl-4">Plan Name</th>
                        <th className="p-3">Billing Rate</th>
                        <th className="p-3">Resource Limits</th>
                        <th className="p-3">Feature Set</th>
                        <th className="p-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {plans.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 pl-4">
                            <span className="font-extrabold text-sm text-slate-800 block">{p.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{p.billingCycle} cycle</span>
                          </td>
                          <td className="p-3 text-sm font-extrabold text-slate-900">
                            ₹{p.price} <span className="text-[10px] text-slate-400 font-medium">/ month</span>
                          </td>
                          <td className="p-3 space-y-0.5 text-[10px]">
                            <div><span className="text-slate-400">Tables: </span><span className="font-bold text-slate-700">{p.features?.maxTables || 0}</span></div>
                            <div><span className="text-slate-400">Items: </span><span className="font-bold text-slate-700">{p.features?.maxMenuItems || 0}</span></div>
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {p.features?.tableOrdering && <span className="px-1.5 py-0.25 rounded bg-emerald-50 text-emerald-600 text-[8px] font-black border border-emerald-200/50">Table Order</span>}
                              {p.features?.roomOrdering && <span className="px-1.5 py-0.25 rounded bg-emerald-50 text-emerald-600 text-[8px] font-black border border-emerald-200/50">Room Order</span>}
                              {p.features?.kitchenPanel && <span className="px-1.5 py-0.25 rounded bg-indigo-50 text-indigo-600 text-[8px] font-black border border-indigo-200/50">KDS Board</span>}
                              {p.features?.counterPanel && <span className="px-1.5 py-0.25 rounded bg-blue-50 text-blue-600 text-[8px] font-black border border-blue-200/50">Counter Bill</span>}
                              {p.features?.waiterPanel && <span className="px-1.5 py-0.25 rounded bg-amber-50 text-amber-600 text-[8px] font-black border border-amber-200/50">Waiter Numpad</span>}
                              {p.features?.qrGenerator && <span className="px-1.5 py-0.25 rounded bg-purple-50 text-purple-600 text-[8px] font-black border border-purple-200/50">QR Studio</span>}
                            </div>
                          </td>
                          <td className="p-3 pr-4 text-right space-x-2 text-slate-400">
                            <button 
                              onClick={() => {
                                setPlanFormData({
                                  name: p.name,
                                  price: p.price,
                                  billingCycle: p.billingCycle || 'monthly',
                                  features: { ...p.features },
                                  id: p._id
                                });
                                setIsPlanModalOpen(true);
                              }}
                              className="hover:text-[#003b1b] cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button 
                              onClick={() => handleDeletePlan(p._id)}
                              className="hover:text-red-500 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              /* TAB: Restaurant listing */
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-left">
                <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-extrabold text-slate-800">
                    {activeTab === 'all' ? 'All Restaurants' : activeTab === 'active' ? 'Active Restaurants' : 'Suspended Restaurants'}
                  </h2>
                  <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-64">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] mr-2">search</span>
                    <input className="bg-transparent border-none outline-none focus:ring-0 text-xs w-full text-slate-800" placeholder="Search restaurants..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  {filteredRestaurants.length === 0 && <p className="p-6 text-center text-xs text-slate-400">No restaurants found.</p>}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Add Restaurant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5 relative max-h-[92vh] overflow-y-auto text-left">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-base font-bold text-slate-900 mb-1">Create New Restaurant</h2>
            <p className="text-slate-400 text-[10px] mb-4">Owner credentials will be generated automatically.</p>
            {error && <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">{error}</div>}

            <form onSubmit={handleAddRestaurant} className="space-y-3">
              <Field label="Business Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} required />
              <Field label="Slug / URL Slug" value={formData.slug} onChange={(v) => setFormData({ ...formData, slug: v.toLowerCase().replace(/[^a-z0-9-_]/g, '') })} required />
              <Field label="Owner Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} required />
              <Field label="Mobile Number" type="tel" value={formData.mobile} onChange={(v) => setFormData({ ...formData, mobile: v })} />
              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">Subscription Package</label>
                <select className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none text-xs bg-white focus:ring-1 focus:ring-[#003b1b]" value={formData.packageLevel} onChange={(e) => setFormData({ ...formData, packageLevel: e.target.value })}>
                  <option value="Starter">Starter</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <span className="block text-slate-700 text-xs font-semibold mb-2">Enable Features</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {Object.keys(defaultFeatures).map((feature) => (
                    <label key={feature} className="flex items-center gap-1.5 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/50 cursor-pointer">
                      <input type="checkbox" className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5" checked={!!formData.features[feature]} onChange={(e) => setFormData({ ...formData, features: { ...formData.features, [feature]: e.target.checked } })} />
                      {feature.replace(/([A-Z])/g, ' $1')}
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 h-10 bg-[#003b1b] text-white font-semibold text-xs rounded-lg disabled:opacity-50 cursor-pointer hover:bg-[#166534] transition-colors">{formLoading ? 'Creating...' : 'Create Restaurant'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {isCredsModalOpen && newCreds && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-5 text-center text-xs">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">lock_open</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Account Created</h2>
            <div className="bg-slate-50 p-3 rounded-lg text-left space-y-2 border border-slate-200/50 my-4 font-mono">
              <p><span className="text-[9px] text-slate-400 font-semibold uppercase block">Username</span><span className="text-xs font-bold text-slate-800">{newCreds.username}</span></p>
              <p className="border-t border-slate-200/60 pt-2"><span className="text-[9px] text-slate-400 font-semibold uppercase block">Password</span><span className="text-xs font-bold text-slate-800">{newCreds.password}</span></p>
            </div>
            <button onClick={() => setIsCredsModalOpen(false)} className="w-full h-10 bg-[#003b1b] text-white font-semibold text-xs rounded-lg cursor-pointer">Done</button>
          </div>
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-5 relative max-h-[92vh] overflow-y-auto text-left text-xs">
            <button 
              onClick={() => setIsPlanModalOpen(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              {planFormData.id ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
            </h2>
            <p className="text-slate-400 text-[10px] mb-4">Configure access rights and tenant resource limits.</p>

            <form onSubmit={handleSavePlan} className="space-y-4 font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <Field 
                  label="Plan Name" 
                  value={planFormData.name} 
                  onChange={(v) => setPlanFormData({ ...planFormData, name: v })} 
                  required 
                />
                <Field 
                  label="Price (INR / Month)" 
                  type="number"
                  value={planFormData.price} 
                  onChange={(v) => setPlanFormData({ ...planFormData, price: Number(v) })} 
                  required 
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">Billing Cycle</label>
                <select 
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none text-xs bg-white focus:ring-1 focus:ring-[#003b1b]" 
                  value={planFormData.billingCycle} 
                  onChange={(e) => setPlanFormData({ ...planFormData, billingCycle: e.target.value })}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="block text-slate-700 text-xs font-semibold mb-2">Resource Thresholds</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Max Tables</label>
                    <input 
                      type="number" 
                      className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none bg-white text-xs"
                      value={planFormData.features.maxTables}
                      onChange={(e) => setPlanFormData({ 
                        ...planFormData, 
                        features: { ...planFormData.features, maxTables: Number(e.target.value) } 
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Max Menu Items</label>
                    <input 
                      type="number" 
                      className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none bg-white text-xs"
                      value={planFormData.features.maxMenuItems}
                      onChange={(e) => setPlanFormData({ 
                        ...planFormData, 
                        features: { ...planFormData.features, maxMenuItems: Number(e.target.value) } 
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-[10px]">Max Categories</label>
                    <input 
                      type="number" 
                      className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none bg-white text-xs"
                      value={planFormData.features.maxCategories}
                      onChange={(e) => setPlanFormData({ 
                        ...planFormData, 
                        features: { ...planFormData.features, maxCategories: Number(e.target.value) } 
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="block text-slate-700 text-xs font-semibold mb-2">Feature Toggles</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {[
                    { id: 'tableOrdering', label: 'Table Ordering' },
                    { id: 'roomOrdering', label: 'Room Ordering' },
                    { id: 'selfCheckout', label: 'Diner Checkout' },
                    { id: 'kitchenPanel', label: 'Kitchen KDS Board' },
                    { id: 'counterPanel', label: 'Counter Billing' },
                    { id: 'waiterPanel', label: 'Waiter Pager Numpad' },
                    { id: 'customerLogin', label: 'Customer Login' },
                    { id: 'qrGenerator', label: 'Advanced QR Studio' },
                    { id: 'analytics', label: 'Analytics Modules' }
                  ].map(f => (
                    <label key={f.id} className="flex items-center gap-1.5 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                        checked={!!planFormData.features[f.id]} 
                        onChange={(e) => setPlanFormData({ 
                          ...planFormData, 
                          features: { ...planFormData.features, [f.id]: e.target.checked } 
                        })} 
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPlanModalOpen(false)} 
                  className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 h-10 bg-[#003b1b] hover:bg-[#166534] text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                >
                  {planFormData.id ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left text-xs">
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 bg-[#003b1b]/10 text-[#003b1b] rounded-lg">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <span className="text-[9px] uppercase font-bold text-slate-400">Total</span>
      </div>
      <span className="text-xs text-slate-400 font-semibold block">{label}</span>
      <p className="text-lg font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="block text-slate-700 text-xs font-semibold mb-1">{label}</label>
      <input type={type} className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none text-xs bg-white focus:ring-1 focus:ring-[#003b1b]" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

function RestaurantTable({ restaurants, onOpen, onToggle, onLoginAs }) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
          {['Restaurant', 'Slug/URL', 'Contact', 'Credentials', 'Plan', 'Status', 'Actions'].map((h) => (
            <th key={h} className="p-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
        {restaurants.map((r) => (
          <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
            <td className="p-3"><RestaurantIdentity restaurant={r} /></td>
            <td className="p-3 text-xs text-slate-600 font-medium">/menu/{r.slug}</td>
            <td className="p-3 text-[11px] text-slate-500">
              <div>{r.email || 'N/A'}</div>
              {r.mobile && <div className="text-slate-400 mt-0.5">{r.mobile}</div>}
            </td>
            <td className="p-3 text-[11px]">
              <div className="font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 space-y-0.5 w-fit">
                <div><span className="text-slate-400">user: </span><span className="font-bold text-slate-700">{r.username}</span></div>
                {r.plainPassword && <div><span className="text-slate-400">pass: </span><span className="font-bold text-slate-700">{r.plainPassword}</span></div>}
              </div>
            </td>
            <td className="p-3"><PlanBadge plan={r.package} /></td>
            <td className="p-3"><StatusBadge active={r.isActive} /></td>
            <td className="p-3">
              <div className="flex items-center gap-2 text-slate-400">
                <button onClick={() => onLoginAs(r._id)} title="Login as Admin" className="flex items-center gap-1 bg-[#003b1b]/10 text-[#003b1b] hover:bg-[#003b1b] hover:text-white px-2 py-1 rounded text-[9px] font-bold transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[12px]">login</span>
                  Login
                </button>
                <button onClick={() => onOpen(r._id)} className="hover:text-[#003b1b] cursor-pointer" title="Settings">
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </button>
                <button onClick={() => onToggle(r._id)} className={`${r.isActive ? 'hover:text-red-500' : 'hover:text-emerald-500'} cursor-pointer`} title={r.isActive ? 'Suspend' : 'Activate'}>
                  <span className="material-symbols-outlined text-[18px]">{r.isActive ? 'block' : 'check_circle'}</span>
                </button>
              </div>
            </td>
          </tr>
        ))}
        {restaurants.length === 0 && (
          <tr><td colSpan={7} className="p-6 text-center text-xs text-slate-400">No restaurants found.</td></tr>
        )}
      </tbody>
    </table>
  );
}

function RestaurantCard({ restaurant, onOpen, onToggle, onLoginAs }) {
  const [showCreds, setShowCreds] = useState(false);
  return (
    <div className="p-4 text-xs">
      <div className="flex items-start justify-between gap-3">
        <RestaurantIdentity restaurant={restaurant} />
        <StatusBadge active={restaurant.isActive} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-slate-600">
        <div><span className="text-slate-400 block text-[10px]">Plan</span><PlanBadge plan={restaurant.package} /></div>
        <div><span className="text-slate-400 block text-[10px]">URL</span><span className="font-semibold text-slate-700">/menu/{restaurant.slug}</span></div>
        {restaurant.email && <div><span className="text-slate-400 block text-[10px]">Email</span><span className="font-semibold text-slate-700">{restaurant.email}</span></div>}
        {restaurant.mobile && <div><span className="text-slate-400 block text-[10px]">Mobile</span><span className="font-semibold text-slate-700">{restaurant.mobile}</span></div>}
      </div>

      <button onClick={() => setShowCreds(!showCreds)} className="mt-3 text-[10px] text-[#003b1b] font-bold flex items-center gap-1 cursor-pointer">
        <span className="material-symbols-outlined text-[14px]">{showCreds ? 'visibility_off' : 'visibility'}</span>
        {showCreds ? 'Hide' : 'Show'} Credentials
      </button>
      {showCreds && (
        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono space-y-1">
          <div><span className="text-slate-400">Username: </span><span className="font-bold">{restaurant.username}</span></div>
          {restaurant.plainPassword && <div><span className="text-slate-400">Password: </span><span className="font-bold">{restaurant.plainPassword}</span></div>}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={onLoginAs} className="flex-1 h-9 rounded-lg bg-[#003b1b] hover:bg-[#166534] text-white font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-[14px]">login</span>
          Login as Admin
        </button>
        <button onClick={onOpen} className="h-9 px-3 rounded-lg border border-slate-200 text-slate-600 cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>
        <button onClick={onToggle} className="h-9 px-3 rounded-lg border border-slate-200 text-slate-600 cursor-pointer">{restaurant.isActive ? 'Suspend' : 'Activate'}</button>
      </div>
    </div>
  );
}

function RestaurantIdentity({ restaurant }) {
  return (
    <div className="flex items-center min-w-0">
      {restaurant.logo ? (
        <img alt="Logo" className="w-8 h-8 rounded-full object-cover mr-2.5 border border-slate-200" src={restaurant.logo.startsWith('http') ? restaurant.logo : `http://localhost:5000${restaurant.logo}`} />
      ) : (
        <div className="w-8 h-8 rounded-full bg-slate-100 text-[#003b1b] flex items-center justify-center mr-2.5 font-bold text-xs">{restaurant.name.slice(0, 2).toUpperCase()}</div>
      )}
      <div className="min-w-0 text-left">
        <span className="font-bold text-slate-800 block truncate text-xs">{restaurant.name}</span>
        <span className="text-slate-400 text-[10px] font-medium truncate block mt-0.5">{restaurant.username}</span>
      </div>
    </div>
  );
}

function PlanBadge({ plan }) {
  return <span className="inline-flex bg-[#003b1b]/10 text-[#003b1b] px-2 py-0.5 rounded-full text-[10px] font-bold">{plan}</span>;
}

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-bold ${active ? 'text-emerald-600' : 'text-red-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${active ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
      {active ? 'Active' : 'Suspended'}
    </span>
  );
}
