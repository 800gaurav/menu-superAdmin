import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { api, removeRestaurantToken } from '../api';

export default function RestaurantAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState({
    totalTables: 0,
    todayOrdersCount: 0,
    todayRevenue: 0,
    activeOrdersCount: 0
  });

  // State Lists
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [advancedAnalytics, setAdvancedAnalytics] = useState(null);

  // Filter states
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  
  // Modals / Modifiers
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Forms Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catFormData, setCatFormData] = useState({ name: '', icon: '🍔', isHidden: false, id: null });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemFormData, setItemFormData] = useState({
    name: '', description: '', price: '', categoryId: '', tags: ['Veg'], badges: [], image: '', id: null
  });

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableFormData, setTableFormData] = useState({ name: '', type: 'Table', id: null });

  const [bulkPriceData, setBulkPriceData] = useState({ value: '', type: 'percentage' });
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loadedTabs = useRef(new Set());
  const socketRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [profile, statsData] = await Promise.all([
        api.restaurant.getProfile(),
        api.restaurant.getStats()
      ]);
      setRestaurant({
        brandColor: '#003b1b',
        brandingSettings: {},
        socialLinks: {},
        actionButtons: [],
        customerDataSettings: { enabled: false, fields: {} },
        ...profile
      });
      setStats(statsData);
      loadedTabs.current.add('overview');
      loadedTabs.current.add('settings');
      connectSocket(profile._id);
    } catch (err) {
      console.error(err);
      if (err.status === 401 || err.status === 403) navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async (tab) => {
    if (loadedTabs.current.has(tab)) return;
    try {
      setTabLoading(true);
      if (tab === 'orders') {
        const data = await api.orders.getOrders();
        setOrders(data);
      } else if (tab === 'menu') {
        const [cats, items] = await Promise.all([api.menu.getCategories(), api.menu.getItems()]);
        setCategories(cats);
        setMenuItems(items);
      } else if (tab === 'tables') {
        const data = await api.tables.getTables();
        setTables(data);
      } else if (tab === 'crm') {
        const [customers, analytics] = await Promise.all([
          api.crm.getCustomers().catch(() => []),
          api.analytics.getDashboard(30).catch(() => null)
        ]);
        setCustomers(customers);
        setAdvancedAnalytics(analytics);
      } else if (tab === 'settings') {
        // restaurant profile already loaded in fetchInitialData, nothing extra needed
      }
      loadedTabs.current.add(tab);
    } catch (err) {
      console.error(err);
    } finally {
      setTabLoading(false);
    }
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 150);
    } catch (e) {
      console.error('Audio synthesizer error:', e);
    }
  };

  const connectSocket = (restaurantId) => {
    socketRef.current = io('http://localhost:5000');
    
    socketRef.current.emit('joinRestaurant', restaurantId);

    socketRef.current.on('orderCreated', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
      playNotificationSound();
      refreshStats();
    });

    socketRef.current.on('orderUpdated', (updatedOrder) => {
      setOrders((prev) => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      refreshStats();
    });
  };

  const refreshStats = async () => {
    try {
      const statsData = await api.restaurant.getStats();
      setStats(statsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    removeRestaurantToken();
    navigate('/admin/login');
  };

  // --- Category Handlers ---
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (catFormData.id) {
        await api.menu.updateCategory(catFormData.id, catFormData);
      } else {
        await api.menu.createCategory(catFormData);
      }
      setIsCategoryModalOpen(false);
      setCatFormData({ name: '', icon: '🍔', isHidden: false, id: null });
      const data = await api.menu.getCategories();
      setCategories(data);
    } catch (err) {
      alert(err.message || 'Error saving category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete category? All menu items under this category will also be deleted!')) return;
    try {
      await api.menu.deleteCategory(id);
      setCategories(categories.filter(c => c._id !== id));
      setMenuItems(menuItems.filter(i => i.categoryId !== id));
    } catch (err) {
      alert(err.message || 'Error deleting category');
    }
  };

  // --- MenuItem Handlers ---
  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...itemFormData, price: parseFloat(itemFormData.price) };
      if (itemFormData.id) {
        await api.menu.updateItem(itemFormData.id, payload);
      } else {
        await api.menu.createItem(payload);
      }
      setIsItemModalOpen(false);
      setItemFormData({ name: '', description: '', price: '', categoryId: '', tags: ['Veg'], badges: [], image: '', id: null });
      const data = await api.menu.getItems();
      setMenuItems(data);
    } catch (err) {
      alert(err.message || 'Error saving item');
    }
  };

  const handleToggleStock = async (id) => {
    try {
      await api.menu.toggleStock(id);
      setMenuItems(menuItems.map(i => i._id === id ? { ...i, inStock: !i.inStock } : i));
    } catch (err) {
      alert('Error changing item stock state');
    }
  };

  const handleDuplicateItem = async (id) => {
    try {
      await api.menu.duplicateItem(id);
      const data = await api.menu.getItems();
      setMenuItems(data);
    } catch (err) {
      alert('Error duplicating item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.menu.deleteItem(id);
      setMenuItems(menuItems.filter(i => i._id !== id));
    } catch (err) {
      alert('Error deleting item');
    }
  };

  const handleBulkPrice = async (e) => {
    e.preventDefault();
    const itemIds = menuItems.map(i => i._id);
    try {
      await api.menu.bulkPriceUpdate(itemIds, bulkPriceData.type, parseFloat(bulkPriceData.value));
      setIsBulkModalOpen(false);
      setBulkPriceData({ value: '', type: 'percentage' });
      const data = await api.menu.getItems();
      setMenuItems(data);
    } catch (err) {
      alert('Error running bulk price updates: ' + err.message);
    }
  };

  // --- Table Handlers ---
  const handleSaveTable = async (e) => {
    e.preventDefault();
    try {
      if (tableFormData.id) {
        await api.tables.updateTable(tableFormData.id, tableFormData);
      } else {
        await api.tables.createTable(tableFormData);
      }
      setIsTableModalOpen(false);
      setTableFormData({ name: '', type: 'Table', id: null });
      const data = await api.tables.getTables();
      setTables(data);
    } catch (err) {
      alert(err.message || 'Error saving table/room');
    }
  };

  const handleToggleTableActive = async (tableObj) => {
    try {
      await api.tables.updateTable(tableObj._id, { isActive: !tableObj.isActive });
      setTables(tables.map(t => t._id === tableObj._id ? { ...t, isActive: !t.isActive } : t));
    } catch (err) {
      alert('Error toggling table active state');
    }
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm('Delete table? Diners scanning this QR will no longer be able to access the menu.')) return;
    try {
      await api.tables.deleteTable(id);
      setTables(tables.filter(t => t._id !== id));
    } catch (err) {
      alert('Error deleting table');
    }
  };

  // --- Orders status update ---
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.orders.updateStatus(orderId, newStatus);
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      alert('Failed to update order status');
    }
  };

  // Dynamic branding preview handler
  const handleSaveBranding = async (e) => {
    e.preventDefault();
    try {
      await api.restaurant.updateProfile({
        brandColor: restaurant.brandColor,
        googleMapsLink: restaurant.googleMapsLink,
        reviewLink: restaurant.reviewLink,
        socialLinks: restaurant.socialLinks
      });
      await api.restaurant.updateBranding(restaurant.brandingSettings);
      alert('Branding and Settings saved successfully');
    } catch (err) {
      alert('Error saving brand configs: ' + err.message);
    }
  };

  const handleSaveCustomerDataSettings = async () => {
    try {
      const settings = restaurant.customerDataSettings || {};
      await api.restaurant.updateCustomerDataSettings(settings);
      alert('Customer data settings saved');
    } catch (err) {
      alert(err.message || 'Error saving customer data settings');
    }
  };

  const handleSaveActionButtons = async () => {
    try {
      await api.restaurant.updateActionButtons(restaurant.actionButtons || []);
      alert('Action buttons saved');
    } catch (err) {
      alert(err.message || 'Error saving action buttons');
    }
  };

  const setCustomerField = (field, patch) => {
    setRestaurant({
      ...restaurant,
      customerDataSettings: {
        ...(restaurant.customerDataSettings || {}),
        fields: {
          ...(restaurant.customerDataSettings?.fields || {}),
          [field]: {
            ...(restaurant.customerDataSettings?.fields?.[field] || {}),
            ...patch
          }
        }
      }
    });
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await api.restaurant.uploadLogo(formData);
      setRestaurant({ ...restaurant, logo: res.logoUrl });
    } catch (err) {
      alert('Error uploading logo');
    }
  };

  const handleUploadItemImageForm = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.restaurant.uploadImage(formData);
      setItemFormData({ ...itemFormData, image: res.imageUrl });
    } catch (err) {
      alert('Error uploading image');
    }
  };

  const getFilteredOrders = () => {
    return orders.filter(o => {
      const matchesSearch = o.tableName.toLowerCase().includes(orderSearch.toLowerCase()) || 
        (o.orderNumber && o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()));
      const matchesStatus = orderStatusFilter ? o.status === orderStatusFilter : true;
      return matchesSearch && matchesStatus;
    });
  };

  return (
    <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen w-full md:flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`bg-white w-[240px] flex flex-col fixed h-full shadow-sm z-40 text-left border-r border-slate-100 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-4 py-4 md:px-6 md:py-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-3">
          {restaurant?.logo ? (
            <img 
              src={restaurant.logo.startsWith('http') ? restaurant.logo : `http://localhost:5000${restaurant.logo}`} 
              alt="Logo" 
              className="w-9 h-9 rounded-full object-cover border border-slate-200" 
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[#003b1b] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]">restaurant</span>
            </div>
          )}
          <div>
            <span className="font-bold text-sm text-[#003b1b] tracking-tight block">{restaurant?.name || 'My Restaurant'}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">{restaurant?.package} Plan</span>
          </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        
        <nav className="flex-1 mt-4 overflow-y-auto">
          <ul className="flex flex-col space-y-1 px-2 md:px-0">
            {[
              { id: 'overview', label: 'Analytics', icon: 'dashboard' },
              { id: 'orders', label: 'Live Orders', icon: 'receipt_long' },
              { id: 'menu', label: 'Menu & Food', icon: 'menu_book' },
              { id: 'tables', label: 'Tables & QRs', icon: 'qr_code_2' },
              { id: 'crm', label: 'CRM', icon: 'contacts' },
              { id: 'settings', label: 'Branding Setup', icon: 'palette' }
            ].map(tab => (
              <li key={tab.id}>
                <button
                  onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); fetchTabData(tab.id); }}
                  className={`w-full flex items-center px-6 py-3.5 text-sm font-semibold transition-all cursor-pointer text-left ${
                    activeTab === tab.id
                      ? 'bg-[#003b1b]/80 text-white border-r-4 border-r-[#003b1b] shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined mr-3 text-[22px]">{tab.icon}</span>
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          {/* Kitchen panel link */}
          <a 
            href={`/kitchen/${restaurant?.slug}`} 
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-[#006C49] rounded-xl hover:bg-emerald-100 transition-colors text-xs font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">chef_hat</span>
            Open Kitchen View
          </a>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-xs font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="w-full md:flex-1 md:ml-[240px] p-4 md:p-8 min-w-0 text-left">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 mb-4">
          <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 shadow-sm">
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
          <span className="font-bold text-slate-800 text-sm">{restaurant?.name || 'Dashboard'}</span>
        </div>
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div>
            <p className="text-slate-400 text-sm mt-4">Loading operational details...</p>
          </div>
        ) : (
          <>
            
            {/* TABS 1: ANALYTICS OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fadeIn">
                <header>
                  <h1 className="text-2xl font-bold text-slate-800">Operational Analytics</h1>
                  <p className="text-xs text-slate-400 mt-1">Live performance indicator metrics for your business today.</p>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <span className="material-symbols-outlined">payments</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Completed</span>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold block">Today's Net Revenue</span>
                    <p className="text-2xl font-bold text-slate-800 mt-1">₹{stats.todayRevenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-[#003b1b]/10 text-[#003b1b] rounded-lg">
                        <span className="material-symbols-outlined">shopping_basket</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Count</span>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold block">Today's Orders Count</span>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats.todayOrdersCount}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <span className="material-symbols-outlined">hourglass_empty</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-amber-600">Pending / Active</span>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold block">Active Orders in Kitchen</span>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats.activeOrdersCount}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <span className="material-symbols-outlined">table_restaurant</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">QRs Enabled</span>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold block">Total Table / Rooms</span>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalTables}</p>
                  </div>
                </div>

                {/* Main section */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-4xl">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
                    <h3 className="font-bold text-slate-800 text-sm">Onboarding Snapshot</h3>
                    <a 
                      href={`/menu/${restaurant?.slug}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs font-bold text-[#006C49] flex items-center gap-1 hover:underline"
                    >
                      Preview Customer Menu
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    </a>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border border-slate-100 p-6 bg-slate-50/50 rounded-2xl">
                    <div className="space-y-2">
                      <span className="block text-slate-400 font-semibold">White-Label Branding Config</span>
                      <p className="text-slate-600"><strong className="text-slate-800">Slug:</strong> /menu/{restaurant?.slug}</p>
                      <p className="text-slate-600"><strong className="text-slate-800">Brand Theme Picker:</strong> <span className="inline-block w-3.5 h-3.5 rounded border border-white" style={{ backgroundColor: restaurant?.brandColor }}></span> {restaurant?.brandColor}</p>
                      <p className="text-slate-600"><strong className="text-slate-800">Tagline:</strong> {restaurant?.brandingSettings?.tagline}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="block text-slate-400 font-semibold">Toggles & Privileges</span>
                      <p className="text-slate-600"><strong className="text-slate-800">Table Ordering:</strong> {restaurant?.features?.tableOrdering ? '✅ ENABLED' : '❌ DISABLED'}</p>
                      <p className="text-slate-600"><strong className="text-slate-800">Room Ordering:</strong> {restaurant?.features?.roomOrdering ? '✅ ENABLED' : '❌ DISABLED'}</p>
                      <p className="text-slate-600"><strong className="text-slate-800">Customer Self-Checkout:</strong> {restaurant?.features?.selfCheckout ? '✅ ENABLED' : '❌ DISABLED'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ORDERS MANAGEMENT */}
            {activeTab === 'orders' && (
              <div className="space-y-6 animate-fadeIn">
                {tabLoading ? (
                  <div className="text-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div></div>
                ) : (<>
                <header className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Operational Order Board</h1>
                    <p className="text-xs text-slate-400 mt-1">Incoming orders auto-sync in real time. Kitchen sound notifications enabled.</p>
                  </div>
                  <a 
                    href={api.orders.exportCsvUrl()} 
                    download
                    className="flex items-center gap-1.5 bg-[#003b1b] hover:bg-[#166534] text-white px-4 py-2 rounded-xl text-xs font-bold shadow cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Export CSV History
                  </a>
                </header>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-xs">
                  <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-full sm:w-64">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] mr-2">search</span>
                    <input 
                      type="text" 
                      className="bg-transparent border-none outline-none focus:ring-0 w-full"
                      placeholder="Search table or order number..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="h-10 px-3 border border-slate-200 rounded-lg bg-white outline-none"
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="New">New</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Ready">Ready / Served</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Orders grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {getFilteredOrders().length === 0 ? (
                    <div className="md:col-span-3 text-center py-12 bg-white rounded-xl border border-slate-100">
                      <p className="text-slate-400 text-sm">No matching orders found.</p>
                    </div>
                  ) : (
                    getFilteredOrders().map((ord) => (
                      <div 
                        key={ord._id} 
                        className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${
                          ord.status === 'New' ? 'ring-2 ring-amber-500' : ''
                        }`}
                      >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                          <div>
                            <span className="font-bold text-slate-800 text-sm">{ord.tableName}</span>
                            <span className="text-[10px] text-slate-400 block font-semibold">{ord.orderNumber}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ord.status === 'New' ? 'bg-amber-100 text-amber-600' :
                            ord.status === 'Accepted' ? 'bg-blue-100 text-blue-600' :
                            ord.status === 'Preparing' ? 'bg-indigo-100 text-indigo-600' :
                            ord.status === 'Ready' ? 'bg-emerald-100 text-emerald-600' :
                            ord.status === 'Completed' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'
                          }`}>
                            {ord.status}
                          </span>
                        </div>

                        {/* Items list */}
                        <div className="p-4 flex-grow space-y-2">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs">
                              <span className="font-semibold text-slate-700">{it.name} <strong className="text-slate-400 font-medium">x{it.quantity}</strong></span>
                              <span className="font-bold text-slate-800">₹{it.price * it.quantity}</span>
                            </div>
                          ))}
                          {ord.specialInstructions && (
                            <div className="mt-2 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100 text-[10px] text-amber-700 font-medium italic">
                              Instructions: {ord.specialInstructions}
                            </div>
                          )}
                        </div>

                        {/* Footer details */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/20 flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-semibold">Total: <strong className="text-slate-800 font-bold">₹{ord.totalAmount}</strong></span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Status buttons */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50/40 grid grid-cols-2 gap-2">
                          {ord.status === 'New' && (
                            <>
                              <button 
                                onClick={() => handleUpdateOrderStatus(ord._id, 'Cancelled')}
                                className="h-9 rounded-lg border border-red-200 text-red-500 text-xs font-bold cursor-pointer hover:bg-red-50"
                              >
                                Reject
                              </button>
                              <button 
                                onClick={() => handleUpdateOrderStatus(ord._id, 'Accepted')}
                                className="h-9 bg-[#003b1b] hover:bg-[#166534] text-white text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Accept
                              </button>
                            </>
                          )}
                          {ord.status === 'Accepted' && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(ord._id, 'Preparing')}
                              className="col-span-2 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Start Preparing
                            </button>
                          )}
                          {ord.status === 'Preparing' && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(ord._id, 'Ready')}
                              className="col-span-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Mark Ready
                            </button>
                          )}
                          {ord.status === 'Ready' && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(ord._id, 'Completed')}
                              className="col-span-2 h-9 bg-[#003b1b] hover:bg-[#166534] text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Deliver / Complete
                            </button>
                          )}
                          {(ord.status === 'Completed' || ord.status === 'Cancelled') && (
                            <button 
                              onClick={() => {
                                setSelectedOrder(ord);
                                setIsOrderModalOpen(true);
                              }}
                              className="col-span-2 h-9 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold cursor-pointer hover:bg-slate-50"
                            >
                              View Invoice
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>)}
              </div>
            )}

            {/* TAB 3: MENU & FOOD ITEMS */}
            {activeTab === 'menu' && (
              <div className="space-y-8 animate-fadeIn">
                {tabLoading ? (
                  <div className="text-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div></div>
                ) : (<>
                <header className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Menu & Categories</h1>
                    <p className="text-xs text-slate-400 mt-1">Setup categories, add new items, duplicate existing meals, or trigger bulk price modifiers.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:flex gap-2">
                    <button 
                      onClick={() => setIsBulkModalOpen(true)}
                      className="bg-amber-50 hover:bg-amber-100 text-[#fda417] border border-amber-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Bulk Price Editor
                    </button>
                    <button 
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Add Category
                    </button>
                    <button 
                      onClick={() => setIsItemModalOpen(true)}
                      className="bg-[#003b1b] hover:bg-[#166534] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
                    >
                      Add Menu Item
                    </button>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Category sidebar column */}
                  <div className="space-y-4">
                    <span className="block text-slate-700 text-xs font-bold mb-2">Food Categories</span>
                    <div className="space-y-2">
                      {categories.map(c => (
                        <div key={c._id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                          <div className="flex items-center gap-2.5 text-xs">
                            <span className="text-lg">{c.icon || '🍛'}</span>
                            <span className={`font-semibold ${c.isHidden ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{c.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setCatFormData({ name: c.name, icon: c.icon || '🍔', isHidden: c.isHidden, id: c._id });
                                setIsCategoryModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteCategory(c._id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Items column */}
                  <div className="md:col-span-2 space-y-4">
                    <span className="block text-slate-700 text-xs font-bold mb-2">Food Items List</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {menuItems.map(item => {
                        const cat = categories.find(c => String(c._id) === String(item.categoryId));
                        return (
                          <div key={item._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group">
                            {/* Tags layer */}
                            <div className="absolute top-2 left-2 flex gap-1 z-10">
                              {item.tags.map(t => (
                                <span key={t} className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                  t === 'Veg' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'
                                }`}>
                                  {t}
                                </span>
                              ))}
                            </div>

                            {/* Badge */}
                            {item.badges.length > 0 && (
                              <div className="absolute top-2 right-0 bg-[#fda417] text-white text-[8px] font-bold px-2 py-0.5 rounded-l-full z-10 shadow-sm">
                                {item.badges[0].toUpperCase()}
                              </div>
                            )}

                            {/* Image area */}
                            <div className="h-32 bg-slate-50 overflow-hidden relative">
                              {item.image ? (
                                <img 
                                  src={item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <span className="material-symbols-outlined text-3xl">fastfood</span>
                                </div>
                              )}
                              {/* Stock banner */}
                              {!item.inStock && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold uppercase tracking-wider">Out of Stock</span>
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="p-4 flex-grow text-xs text-left">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                                <span className="font-bold text-[#003b1b] text-sm">₹{item.price}</span>
                              </div>
                              <p className="text-slate-400 mt-0.5 truncate">{cat ? cat.name : 'Unknown Category'}</p>
                              <p className="text-slate-500 mt-2 line-clamp-2 leading-relaxed h-8">{item.description || 'No description provided.'}</p>
                            </div>

                            {/* Action row */}
                            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
                              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-600">
                                <input 
                                  type="checkbox"
                                  className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                                  checked={item.inStock}
                                  onChange={() => handleToggleStock(item._id)}
                                />
                                In Stock
                              </label>
                              <div className="flex gap-2 text-slate-400">
                                <button onClick={() => handleDuplicateItem(item._id)} className="hover:text-[#003b1b] cursor-pointer" title="Duplicate"><span className="material-symbols-outlined text-[18px]">content_copy</span></button>
                                <button 
                                  onClick={() => {
                                    setItemFormData({
                                      name: item.name,
                                      description: item.description,
                                      price: item.price.toString(),
                                      categoryId: item.categoryId,
                                      tags: item.tags,
                                      badges: item.badges,
                                      image: item.image,
                                      id: item._id
                                    });
                                    setIsItemModalOpen(true);
                                  }}
                                  className="hover:text-[#003b1b] cursor-pointer"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button onClick={() => handleDeleteItem(item._id)} className="hover:text-red-500 cursor-pointer" title="Delete"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>)}
              </div>
            )}

            {/* TAB 4: TABLES & QR MANAGEMENT */}
            {activeTab === 'tables' && (
              <div className="space-y-6 animate-fadeIn">
                {tabLoading ? (
                  <div className="text-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div></div>
                ) : (<>
                <header className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Table & QR Management</h1>
                    <p className="text-xs text-slate-400 mt-1">Configure layout, toggle active nodes, or instantly download white-label high-fidelity print QRs.</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={api.tables.downloadZipUrl()} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm">
                      ZIP Download
                    </a>
                    <button 
                      onClick={() => setIsTableModalOpen(true)}
                      className="bg-[#003b1b] hover:bg-[#166534] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
                    >
                      Add QR Target
                    </button>
                  </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {tables.map(t => (
                    <div 
                      key={t._id} 
                      className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col items-center relative transition-shadow hover:shadow-md ${
                        !t.isActive ? 'opacity-65' : ''
                      }`}
                    >
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {t.type}
                      </span>
                      
                      <div className="absolute top-2 right-2 text-slate-400 flex gap-1">
                        <button 
                          onClick={() => {
                            setTableFormData({ name: t.name, type: t.type, id: t._id });
                            setIsTableModalOpen(true);
                          }}
                          className="hover:text-[#003b1b]"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDeleteTable(t._id)} className="hover:text-red-500">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>

                      <span className="font-bold text-slate-800 text-sm mb-3 mt-4">{t.name}</span>
                      
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-center w-36 h-36 relative">
                        {t.qrCodeData ? (
                          <img src={t.qrCodeData} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-slate-300 text-5xl animate-pulse">qr_code_2</span>
                        )}
                        {!t.isActive && (
                          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold uppercase tracking-wider">Inactive</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-4 text-xs font-bold">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 font-semibold">
                          <input 
                            type="checkbox"
                            className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                            checked={t.isActive}
                            onChange={() => handleToggleTableActive(t)}
                          />
                          Active
                        </label>
                        {t.qrCodeData && (
                          <a 
                            href={t.qrCodeData} 
                            download={`${t.name}_QR.png`}
                            className="text-emerald-600 hover:underline flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-[14px]">download</span>
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>)}
              </div>
            )}

            {/* TAB 5: CRM */}
            {activeTab === 'crm' && (
              <div className="space-y-6 animate-fadeIn">
                {tabLoading ? (
                  <div className="text-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div></div>
                ) : (<>
                <header className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Customer CRM</h1>
                    <p className="text-xs text-slate-400 mt-1">Customer profiles, visits, birthdays, anniversaries, retention, and export-ready history.</p>
                  </div>
                  <a href={api.crm.exportCsvUrl()} className="bg-[#003b1b] text-white px-4 py-2.5 rounded-xl text-xs font-bold">Export CSV</a>
                </header>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs text-slate-400 font-bold">Customers</span>
                    <p className="text-2xl font-black mt-1">{customers.length}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs text-slate-400 font-bold">Returning</span>
                    <p className="text-2xl font-black mt-1">{advancedAnalytics?.customerRetention?.returning || 0}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs text-slate-400 font-bold">Birthdays Tracked</span>
                    <p className="text-2xl font-black mt-1">{customers.filter(c => c.dateOfBirth).length}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs text-slate-400 font-bold">Anniversaries</span>
                    <p className="text-2xl font-black mt-1">{customers.filter(c => c.anniversaryDate).length}</p>
                  </div>
                </div>

                <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase">
                      <tr><th className="p-4">Customer</th><th className="p-4">Contact</th><th className="p-4">Visits</th><th className="p-4">Spend</th><th className="p-4">Last Visit</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customers.map((c) => (
                        <tr key={c._id}>
                          <td className="p-4 font-bold text-slate-800">{c.name || 'Guest'}</td>
                          <td className="p-4 text-slate-500">{c.mobile || c.email || 'N/A'}</td>
                          <td className="p-4">{c.visitCount || 0}</td>
                          <td className="p-4">₹{c.totalSpend || 0}</td>
                          <td className="p-4 text-slate-400">{c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </>)}
              </div>
            )}

            {/* TAB 6: BRANDING & WHITE LABEL SETTINGS */}
            {activeTab === 'settings' && restaurant && (
              <div className="space-y-6 animate-fadeIn max-w-4xl">
                <header>
                  <h1 className="text-2xl font-bold text-slate-800">White-Label Branding Setup</h1>
                  <p className="text-xs text-slate-400 mt-1">Apply your visual styles, pick color accents, adjust social feeds, and preview changes instantly.</p>
                </header>

                <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm text-xs">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Customer Data Collection</h2>
                      <p className="text-slate-400 mt-1">Choose fields shown before checkout. Super Admin must enable this feature first.</p>
                    </div>
                    <label className="flex items-center gap-2 font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!restaurant.customerDataSettings?.enabled}
                        onChange={(e) => setRestaurant({
                          ...restaurant,
                          customerDataSettings: { ...(restaurant.customerDataSettings || {}), enabled: e.target.checked }
                        })}
                        disabled={!restaurant.features?.customerDataCollection}
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {['name', 'mobile', 'email', 'dateOfBirth', 'anniversaryDate'].map((field) => (
                      <div key={field} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="font-bold capitalize text-slate-700">{field.replace(/([A-Z])/g, ' $1')}</p>
                        <label className="mt-3 flex items-center gap-2 text-slate-500">
                          <input type="checkbox" checked={!!restaurant.customerDataSettings?.fields?.[field]?.enabled} onChange={(e) => setCustomerField(field, { enabled: e.target.checked })} />
                          Collect
                        </label>
                        <label className="mt-2 flex items-center gap-2 text-slate-500">
                          <input type="checkbox" checked={!!restaurant.customerDataSettings?.fields?.[field]?.required} onChange={(e) => setCustomerField(field, { required: e.target.checked })} />
                          Required
                        </label>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleSaveCustomerDataSettings} className="mt-4 h-10 rounded-xl bg-[#003b1b] px-4 text-xs font-bold text-white">Save Customer Settings</button>
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm text-xs">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Smart Floating Actions</h2>
                      <p className="text-slate-400 mt-1">Configure customer menu quick actions and ordering.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRestaurant({
                        ...restaurant,
                        actionButtons: [
                          ...(restaurant.actionButtons || []),
                          { type: 'shareMenu', label: 'Share', icon: 'share', enabled: true, order: (restaurant.actionButtons || []).length }
                        ]
                      })}
                      className="h-9 rounded-xl border border-slate-200 px-3 font-bold text-slate-600"
                    >
                      Add Action
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(restaurant.actionButtons || []).map((action, index) => (
                      <div key={`${action.type}-${index}`} className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <select value={action.type} onChange={(e) => {
                          const next = [...(restaurant.actionButtons || [])];
                          next[index] = { ...action, type: e.target.value };
                          setRestaurant({ ...restaurant, actionButtons: next });
                        }} className="h-10 rounded-lg border border-slate-200 bg-white px-2">
                          {['googleReview', 'instagram', 'facebook', 'whatsapp', 'call', 'website', 'shareMenu', 'addToHomeScreen', 'feedback', 'loyalty'].map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <input value={action.label || ''} onChange={(e) => {
                          const next = [...(restaurant.actionButtons || [])];
                          next[index] = { ...action, label: e.target.value };
                          setRestaurant({ ...restaurant, actionButtons: next });
                        }} placeholder="Label" className="h-10 rounded-lg border border-slate-200 px-3" />
                        <input value={action.url || ''} onChange={(e) => {
                          const next = [...(restaurant.actionButtons || [])];
                          next[index] = { ...action, url: e.target.value };
                          setRestaurant({ ...restaurant, actionButtons: next });
                        }} placeholder="URL or tel link" className="h-10 rounded-lg border border-slate-200 px-3" />
                        <input type="number" value={action.order || 0} onChange={(e) => {
                          const next = [...(restaurant.actionButtons || [])];
                          next[index] = { ...action, order: Number(e.target.value) };
                          setRestaurant({ ...restaurant, actionButtons: next });
                        }} className="h-10 rounded-lg border border-slate-200 px-3" />
                        <label className="flex items-center gap-2 font-bold text-slate-500">
                          <input type="checkbox" checked={!!action.enabled} onChange={(e) => {
                            const next = [...(restaurant.actionButtons || [])];
                            next[index] = { ...action, enabled: e.target.checked };
                            setRestaurant({ ...restaurant, actionButtons: next });
                          }} />
                          Enabled
                        </label>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleSaveActionButtons} className="mt-4 h-10 rounded-xl bg-[#003b1b] px-4 text-xs font-bold text-white">Save Action Buttons</button>
                </section>

                <form onSubmit={handleSaveBranding} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Branding setups */}
                  <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5 text-xs text-left">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-4">Branding & Color Accents</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Brand Theme Accent Color</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            className="w-10 h-10 border border-slate-200 rounded-lg p-0.5 cursor-pointer bg-white"
                            value={restaurant.brandColor}
                            onChange={(e) => setRestaurant({ ...restaurant, brandColor: e.target.value })}
                          />
                          <span className="font-mono uppercase text-slate-500 font-bold">{restaurant.brandColor}</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Logo Artwork</label>
                        <div className="flex items-center gap-3">
                          <label className="bg-[#003b1b] text-white px-3.5 py-2 rounded-lg cursor-pointer font-semibold shadow-sm hover:bg-[#166534] transition-colors">
                            Change Logo
                            <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                          </label>
                          {restaurant.logo && <span className="text-[10px] text-emerald-600 font-semibold">Loaded</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Tagline Slogan</label>
                        <input 
                          type="text" 
                          className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                          value={restaurant.brandingSettings?.tagline || ''}
                          onChange={(e) => setRestaurant({
                            ...restaurant,
                            brandingSettings: { ...restaurant.brandingSettings, tagline: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">PWA Installation App Name</label>
                        <input 
                          type="text" 
                          className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                          value={restaurant.brandingSettings?.pwaName || ''}
                          onChange={(e) => setRestaurant({
                            ...restaurant,
                            brandingSettings: { ...restaurant.brandingSettings, pwaName: e.target.value }
                          })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Browser Page Title</label>
                        <input 
                          type="text" 
                          className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                          value={restaurant.brandingSettings?.pageTitle || ''}
                          onChange={(e) => setRestaurant({
                            ...restaurant,
                            brandingSettings: { ...restaurant.brandingSettings, pageTitle: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Footer Copyright / Credits</label>
                        <input 
                          type="text" 
                          className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                          value={restaurant.brandingSettings?.footerText || ''}
                          onChange={(e) => setRestaurant({
                            ...restaurant,
                            brandingSettings: { ...restaurant.brandingSettings, footerText: e.target.value }
                          })}
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm">Socials & Direct Google Reviews</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Google Direct Review Link</label>
                          <input 
                            type="url" 
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                            value={restaurant.reviewLink || ''}
                            onChange={(e) => setRestaurant({ ...restaurant, reviewLink: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Instagram Profile</label>
                          <input 
                            type="url" 
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                            value={restaurant.socialLinks?.instagram || ''}
                            onChange={(e) => setRestaurant({
                              ...restaurant,
                              socialLinks: { ...restaurant.socialLinks, instagram: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Facebook Fanpage</label>
                          <input 
                            type="url" 
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                            value={restaurant.socialLinks?.facebook || ''}
                            onChange={(e) => setRestaurant({
                              ...restaurant,
                              socialLinks: { ...restaurant.socialLinks, facebook: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">WhatsApp Chat API Number</label>
                          <input 
                            type="text" 
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                            value={restaurant.socialLinks?.whatsapp || ''}
                            onChange={(e) => setRestaurant({
                              ...restaurant,
                              socialLinks: { ...restaurant.socialLinks, whatsapp: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      <div className="pt-2 grid grid-cols-2 gap-3 text-xs text-slate-500">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input 
                            type="checkbox"
                            className="rounded text-[#003b1b] focus:ring-[#003b1b]"
                            checked={restaurant.brandingSettings?.showGoogleReview}
                            onChange={(e) => setRestaurant({
                              ...restaurant,
                              brandingSettings: { ...restaurant.brandingSettings, showGoogleReview: e.target.checked }
                            })}
                          />
                          Display Google Review Badge
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input 
                            type="checkbox"
                            className="rounded text-[#003b1b] focus:ring-[#003b1b]"
                            checked={restaurant.brandingSettings?.showInstagram}
                            onChange={(e) => setRestaurant({
                              ...restaurant,
                              brandingSettings: { ...restaurant.brandingSettings, showInstagram: e.target.checked }
                            })}
                          />
                          Display Instagram Link
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input 
                            type="checkbox"
                            className="rounded text-[#003b1b] focus:ring-[#003b1b]"
                            checked={restaurant.brandingSettings?.showFacebook}
                            onChange={(e) => setRestaurant({
                              ...restaurant,
                              brandingSettings: { ...restaurant.brandingSettings, showFacebook: e.target.checked }
                            })}
                          />
                          Display Facebook Link
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input 
                            type="checkbox"
                            className="rounded text-[#003b1b] focus:ring-[#003b1b]"
                            checked={restaurant.brandingSettings?.showWhatsapp}
                            onChange={(e) => setRestaurant({
                              ...restaurant,
                              brandingSettings: { ...restaurant.brandingSettings, showWhatsapp: e.target.checked }
                            })}
                          />
                          Display WhatsApp Button
                        </label>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full h-11 bg-[#003b1b] hover:bg-[#166534] text-white font-bold rounded-xl cursor-pointer"
                    >
                      Save Branding Layout
                    </button>
                  </div>

                  {/* Brand Preview sidebar */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col items-center">
                    <span className="block text-slate-700 text-xs font-bold mb-4">Mobile Live Preview</span>
                    <div className="w-64 h-[450px] border-8 border-slate-800 rounded-[32px] overflow-hidden flex flex-col bg-[#F8FAFC] shadow-inner relative text-xs">
                      {/* Header preview */}
                      <div className="bg-white px-3 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm pt-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#003b1b] text-white flex items-center justify-center overflow-hidden">
                            {restaurant.logo ? (
                              <img src={restaurant.logo.startsWith('http') ? restaurant.logo : `http://localhost:5000${restaurant.logo}`} alt="L" className="w-full h-full object-cover" />
                            ) : (
                              'S'
                            )}
                          </div>
                          <span className="font-bold text-slate-800 truncate max-w-[100px]">{restaurant.name}</span>
                        </div>
                        <span className="material-symbols-outlined text-slate-400 text-sm">shopping_cart</span>
                      </div>

                      {/* Sticky preview variables */}
                      <div className="p-4 flex-grow space-y-4">
                        <div className="h-20 w-full bg-slate-200 rounded-xl relative overflow-hidden">
                          <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-2 text-left">
                            <span className="text-white font-bold leading-tight">Today's Special</span>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 flex gap-2">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
                          <div className="text-left flex-grow">
                            <span className="font-bold text-slate-800 block text-[10px]">Paneer Tikka</span>
                            <span className="text-[10px] font-bold mt-1 block" style={{ color: restaurant.brandColor }}>₹325</span>
                          </div>
                          <button 
                            type="button"
                            className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px]" 
                            style={{ backgroundColor: restaurant.brandColor }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Bottom cart preview */}
                      <div className="p-3 bg-white border-t border-slate-100">
                        <div className="py-2.5 px-3 rounded-xl text-white flex justify-between items-center" style={{ backgroundColor: restaurant.brandColor }}>
                          <span className="font-bold text-[10px]">View Cart</span>
                          <span className="font-bold text-[10px]">₹325</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

          </>
        )}
      </main>

      {/* RA-14: Order detail view modal */}
      {isOrderModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-6 relative">
            <button 
              onClick={() => setIsOrderModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Order Invoice Detail</h2>
            <p className="text-slate-400 text-xs mb-4">Reference: {selectedOrder.orderNumber}</p>

            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3 text-xs mb-6">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Diner Node:</span>
                <span>{selectedOrder.tableName}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Created time:</span>
                <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Status:</span>
                <span className="font-bold uppercase text-[#003b1b]">{selectedOrder.status}</span>
              </div>
              
              <div className="border-t border-slate-200/60 pt-3 space-y-2">
                <span className="font-bold text-slate-800 block mb-1">Itemized Summary</span>
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.name} (x{it.quantity})</span>
                    <span>₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200/60 pt-3 flex justify-between font-bold text-sm text-[#003b1b]">
                <span>Total Bill Amount:</span>
                <span>₹{selectedOrder.totalAmount}</span>
              </div>
            </div>

            <button 
              onClick={() => setIsOrderModalOpen(false)}
              className="w-full h-11 bg-[#003b1b] hover:bg-[#166534] text-white font-bold text-sm rounded-xl cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* Categories Add/Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden p-6 relative">
            <button 
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{catFormData.id ? 'Edit Category' : 'Create Category'}</h2>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Category Name</label>
                <input 
                  type="text" 
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Emoji Icon</label>
                <select 
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b]"
                  value={catFormData.icon}
                  onChange={(e) => setCatFormData({ ...catFormData, icon: e.target.value })}
                >
                  <option value="🥗">🥗 Salad</option>
                  <option value="🍛">🍛 Curry / Rice</option>
                  <option value="🥤">🥤 Beverages</option>
                  <option value="🍨">🍨 Desserts</option>
                  <option value="🍞">🍞 Breads</option>
                  <option value="🍕">🍕 Pizza / Fast Food</option>
                  <option value="🍲">🍲 Soup</option>
                </select>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-600 pt-2">
                <input 
                  type="checkbox"
                  className="rounded text-[#003b1b] focus:ring-[#003b1b]"
                  checked={catFormData.isHidden}
                  onChange={(e) => setCatFormData({ ...catFormData, isHidden: e.target.checked })}
                />
                Temporarily Hide Category (e.g. at dinner time)
              </label>

              <button 
                type="submit"
                className="w-full h-11 bg-[#003b1b] text-white font-bold rounded-xl mt-4 cursor-pointer"
              >
                {catFormData.id ? 'Save changes' : 'Create Category'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RA-10: Menu Item Add/Edit Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden p-6 relative">
            <button 
              onClick={() => setIsItemModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{itemFormData.id ? 'Edit Menu Item' : 'Add Menu Item'}</h2>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Item Name</label>
                  <input 
                    type="text" 
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-[#003b1b]"
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-[#003b1b]"
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Category</label>
                  <select 
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b]"
                    value={itemFormData.categoryId}
                    onChange={(e) => setItemFormData({ ...itemFormData, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Tags</label>
                  <select 
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b]"
                    value={itemFormData.tags[0]}
                    onChange={(e) => setItemFormData({ ...itemFormData, tags: [e.target.value] })}
                  >
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Food Description</label>
                <textarea 
                  rows="3"
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-[#003b1b]"
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Badges / Highlights</label>
                  <select 
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b]"
                    value={itemFormData.badges[0] || ''}
                    onChange={(e) => setItemFormData({ ...itemFormData, badges: e.target.value ? [e.target.value] : [] })}
                  >
                    <option value="">None</option>
                    <option value="Best Seller">Best Seller</option>
                    <option value="Chef's Special">Chef's Special</option>
                    <option value="New">New</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Food Photo</label>
                  <div className="flex items-center gap-2">
                    <label className="bg-[#003b1b] text-white px-3.5 py-2 rounded-lg cursor-pointer font-semibold hover:bg-[#166534]">
                      Choose Artwork
                      <input type="file" accept="image/*" onChange={handleUploadItemImageForm} className="hidden" />
                    </label>
                    {itemFormData.image && <span className="text-emerald-600 font-bold">Uploaded</span>}
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full h-11 bg-[#003b1b] text-white font-bold rounded-xl mt-4 cursor-pointer"
              >
                {itemFormData.id ? 'Save Item' : 'Add Item'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Table Add/Edit Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden p-6 relative">
            <button 
              onClick={() => setIsTableModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{tableFormData.id ? 'Edit Table/Room' : 'Create Table/Room'}</h2>

            <form onSubmit={handleSaveTable} className="space-y-4 text-xs text-left">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Name / Identifier Number</label>
                <input 
                  type="text" 
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                  placeholder="e.g. Table 5 or Room 102"
                  value={tableFormData.name}
                  onChange={(e) => setTableFormData({ ...tableFormData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Identifier Type</label>
                <select 
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b]"
                  value={tableFormData.type}
                  onChange={(e) => setTableFormData({ ...tableFormData, type: e.target.value })}
                >
                  <option value="Table">Table</option>
                  <option value="Room">Room (Hotel Use)</option>
                  <option value="DirectMenu">Direct Menu</option>
                  <option value="Reception">Reception</option>
                  <option value="Takeaway">Takeaway</option>
                  <option value="SocialMedia">Social Media</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full h-11 bg-[#003b1b] text-white font-bold rounded-xl mt-4 cursor-pointer"
              >
                {tableFormData.id ? 'Save changes' : 'Generate QR Code'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Price Update Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden p-6 relative">
            <button 
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Bulk Pricing Modifier</h2>
            <p className="text-slate-400 text-[10px] mb-4">Modify prices of all menu items instantly at once.</p>

            <form onSubmit={handleBulkPrice} className="space-y-4 text-xs text-left">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Modifier Action</label>
                <select 
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b]"
                  value={bulkPriceData.type}
                  onChange={(e) => setBulkPriceData({ ...bulkPriceData, type: e.target.value })}
                >
                  <option value="percentage">Add/Subtract by Percentage (%)</option>
                  <option value="fixed_add">Add/Subtract by Flat Value (₹)</option>
                  <option value="fixed_set">Set All Items to a Single Price (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Value (Use negative sign to decrease)</label>
                <input 
                  type="number" 
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b]"
                  placeholder="e.g. 10 or -5"
                  value={bulkPriceData.value}
                  onChange={(e) => setBulkPriceData({ ...bulkPriceData, value: e.target.value })}
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl mt-4 cursor-pointer"
              >
                Apply Modifiers Now
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
