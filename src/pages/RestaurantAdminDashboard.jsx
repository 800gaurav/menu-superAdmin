import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { api, removeRestaurantToken } from '../api';
import BillPrint from './BillPrint';

// Tab Component Imports
import OverviewTab from '../components/dashboard/OverviewTab';
import OrdersTab from '../components/dashboard/OrdersTab';
import BillingTab from '../components/dashboard/BillingTab';
import MenuTab from '../components/dashboard/MenuTab';
import TablesTab from '../components/dashboard/TablesTab';
import CrmTab from '../components/dashboard/CrmTab';
import SettingsTab from '../components/dashboard/SettingsTab';

// Modal Component Imports
import OrderInvoiceModal from '../components/dashboard/OrderInvoiceModal';
import CategoryModal from '../components/dashboard/CategoryModal';
import MenuItemModal from '../components/dashboard/MenuItemModal';
import TableModal from '../components/dashboard/TableModal';
import BulkPriceModal from '../components/dashboard/BulkPriceModal';

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

  // Billing & Cashier Panel States
  const [billingOrders, setBillingOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [billingSummary, setBillingSummary] = useState({ count: 0, revenue: 0, averageValue: 0 });
  const [billingTableFilter, setBillingTableFilter] = useState('');
  const [historyTab, setHistoryTab] = useState('all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);

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
    name: '', description: '', price: '', categoryId: '', tags: ['Veg'], badges: [], image: '', id: null,
    hasVariants: false, variants: []
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
    const isFirstLoad = !loadedTabs.current.has(tab);
    try {
      if (isFirstLoad) {
        setTabLoading(true);
      }
      if (tab === 'overview') {
        const statsData = await api.restaurant.getStats();
        setStats(statsData);
      } else if (tab === 'orders') {
        const data = await api.orders.getOrders();
        setOrders(data);
      } else if (tab === 'billing') {
        const [activeList, historyList, summaryStats, tablesList] = await Promise.all([
          api.counter.getOrders(),
          api.orders.getOrders({ limit: 200 }),
          api.counter.getSalesSummary(),
          api.tables.getTables().catch(() => [])
        ]);
        setBillingOrders(activeList);
        setHistoryOrders(historyList);
        setBillingSummary(summaryStats);
        setTables(tablesList);
      } else if (tab === 'menu') {
        const [cats, items] = await Promise.all([api.menu.getCategories(), api.menu.getItems()]);
        setCategories(cats);
        setMenuItems(items);
      } else if (tab === 'tables') {
        const data = await api.tables.getTables();
        setTables(data);
      } else if (tab === 'crm') {
        const [customersData, analytics] = await Promise.all([
          api.crm.getCustomers().catch(() => []),
          api.analytics.getDashboard(30).catch(() => null)
        ]);
        setCustomers(customersData);
        setAdvancedAnalytics(analytics);
      } else if (tab === 'settings') {
        const profile = await api.restaurant.getProfile();
        setRestaurant(prev => prev ? { ...prev, ...profile } : profile);
      }
      loadedTabs.current.add(tab);
    } catch (err) {
      console.error(err);
    } finally {
      if (isFirstLoad) {
        setTabLoading(false);
      }
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

  const refreshBillingSummary = async () => {
    try {
      const statsSummary = await api.counter.getSalesSummary();
      setBillingSummary(statsSummary);
    } catch (err) {
      console.error(err);
    }
  };

  const connectSocket = (restaurantId) => {
    socketRef.current = io('http://localhost:5000');
    
    socketRef.current.emit('joinRestaurant', restaurantId);

    socketRef.current.on('orderCreated', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
      
      setBillingOrders((prev) => {
        if (newOrder.status !== 'Completed' && newOrder.status !== 'Cancelled') {
          const exists = prev.some(o => o._id === newOrder._id);
          if (exists) return prev.map(o => o._id === newOrder._id ? newOrder : o);
          return [newOrder, ...prev].sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt));
        }
        return prev;
      });

      setHistoryOrders((prev) => {
        const exists = prev.some(o => o._id === newOrder._id);
        if (exists) return prev.map(o => o._id === newOrder._id ? newOrder : o);
        return [newOrder, ...prev].slice(0, 200);
      });

      playNotificationSound();
      refreshStats();
      refreshBillingSummary();
    });

    socketRef.current.on('orderUpdated', (updatedOrder) => {
      setOrders((prev) => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      
      setBillingOrders((prev) => {
        if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Cancelled') {
          return prev.filter(o => o._id !== updatedOrder._id);
        } else {
          const exists = prev.some(o => o._id === updatedOrder._id);
          if (exists) {
            return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o)
                       .sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt));
          } else {
            return [updatedOrder, ...prev].sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt));
          }
        }
      });

      setHistoryOrders((prev) => {
        const exists = prev.some(o => o._id === updatedOrder._id);
        if (exists) {
          return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
        } else {
          return [updatedOrder, ...prev].slice(0, 200);
        }
      });

      refreshStats();
      refreshBillingSummary();
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
      const payload = {
        ...itemFormData,
        price: itemFormData.hasVariants ? undefined : parseFloat(itemFormData.price || 0),
        variants: itemFormData.hasVariants
          ? itemFormData.variants.map(v => ({ name: v.name, price: parseFloat(v.price || 0) }))
          : []
      };
      if (itemFormData.id) {
        await api.menu.updateItem(itemFormData.id, payload);
      } else {
        await api.menu.createItem(payload);
      }
      setIsItemModalOpen(false);
      setItemFormData({ name: '', description: '', price: '', categoryId: '', tags: ['Veg'], badges: [], image: '', id: null, hasVariants: false, variants: [] });
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

  // --- Integrated Counter Billing Handlers ---
  const handleSettleBillingOrder = async (orderId) => {
    if (!window.confirm('Settle billing for this order and mark as Completed?')) return;
    try {
      await api.counter.completeOrder(orderId);
      setBillingOrders((prev) => prev.filter(o => o._id !== orderId));
      refreshBillingSummary();
      // Refresh the history list too to show the newly completed order
      const historyList = await api.orders.getOrders({ limit: 200 });
      setHistoryOrders(historyList);
    } catch (err) {
      alert('Failed to settle order: ' + err.message);
    }
  };

  const handleOpenPrintBilling = (order) => {
    setSelectedPrintOrder(order);
    setIsPrintModalOpen(true);
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

  const handleUpdatePaymentStatus = async (orderId, newPaymentStatus) => {
    try {
      await api.orders.updatePaymentStatus(orderId, newPaymentStatus);
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: newPaymentStatus });
      }
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, paymentStatus: newPaymentStatus } : o));
      setBillingOrders(prev => prev.map(o => o._id === orderId ? { ...o, paymentStatus: newPaymentStatus } : o));
      setHistoryOrders(prev => prev.map(o => o._id === orderId ? { ...o, paymentStatus: newPaymentStatus } : o));
    } catch (err) {
      alert('Failed to update payment status: ' + err.message);
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

  return (
    <div className="bg-[#f3f4f6] text-[#191c1e] min-h-screen w-full md:flex font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`bg-[#0d1321] w-[220px] flex flex-col fixed h-full shadow-2xl z-40 text-left border-r border-slate-800/80 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {/* Header Block */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-slate-800/80 bg-[#090d16]">
          <div className="flex items-center space-x-2.5">
            {restaurant?.logo ? (
              <img 
                src={restaurant.logo.startsWith('http') ? restaurant.logo : `http://localhost:5000${restaurant.logo}`} 
                alt="Logo" 
                className="w-8 h-8 rounded-lg object-cover border border-slate-700/60 ring-2 ring-emerald-500/20" 
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#003b1b] to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950/40">
                <span className="material-symbols-outlined text-white text-[16px]">restaurant</span>
              </div>
            )}
            <div className="min-w-0">
              <span className="font-extrabold text-xs text-white tracking-wide block truncate">{restaurant?.name || 'My Restaurant'}</span>
              <span className="inline-flex items-center px-1.5 py-0.25 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-50/10 text-emerald-400 border border-emerald-500/25 mt-0.5">
                {restaurant?.package || 'Free'} Plan
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
            {[
              { id: 'overview', label: 'Analytics & Stats', icon: 'dashboard' },
              { id: 'orders', label: 'Live Orders', icon: 'receipt_long', badge: stats.activeOrdersCount },
              { id: 'billing', label: 'Counter Billing', icon: 'point_of_sale', badge: billingOrders.filter(o => o.billRequested).length },
              { id: 'menu', label: 'Menu & Food', icon: 'menu_book' },
              { id: 'tables', label: 'Tables & QRs', icon: 'qr_code_2' },
              { id: 'crm', label: 'Customer CRM', icon: 'contacts' },
              { id: 'settings', label: 'Branding Setup', icon: 'palette' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 text-[11px] font-semibold transition-all duration-200 cursor-pointer text-left rounded-lg group relative ${
                      isActive
                        ? 'text-white shadow-lg shadow-black/10 font-bold'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
                    }`}
                    style={isActive ? { backgroundColor: restaurant?.brandColor || '#003b1b' } : {}}
                  >
                    <div className="flex items-center">
                      <span className={`material-symbols-outlined mr-2.5 text-[18px] transition-transform duration-200 ${isActive ? 'scale-105 text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge > 0 && (
                      <span className={`ml-2 px-1.5 py-0.25 rounded-full text-[8px] font-black transition-colors ${isActive ? 'bg-white text-slate-900' : 'bg-rose-500 text-white animate-pulse'}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Action Panel Links */}
        <div className="p-3 border-t border-slate-800/80 space-y-1.5 bg-[#090d16]">
          <span className="px-2 text-[8px] uppercase tracking-widest font-black text-slate-500 block mb-1">Live Views</span>
          
          {/* Kitchen panel link */}
          <a 
            href={`/kitchen/${restaurant?.slug}`} 
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center gap-2.5 px-3 py-2 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-lg hover:bg-emerald-900/40 hover:text-emerald-300 transition-all text-[10px] font-bold"
          >
            <span className="material-symbols-outlined text-[16px]">chef_hat</span>
            <span>Kitchen View</span>
            <span className="material-symbols-outlined text-[10px] ml-auto opacity-60">open_in_new</span>
          </a>

          {/* Waiter panel link */}
          <a 
            href={`/waiter/${restaurant?.slug}`} 
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center gap-2.5 px-3 py-2 bg-amber-950/40 text-amber-400 border border-amber-900/30 rounded-lg hover:bg-amber-900/40 hover:text-amber-300 transition-all text-[10px] font-bold"
          >
            <span className="material-symbols-outlined text-[16px]">hail</span>
            <span>Waiter View</span>
            <span className="material-symbols-outlined text-[10px] ml-auto opacity-60">open_in_new</span>
          </a>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 bg-rose-950/30 border border-rose-900/20 rounded-lg hover:bg-rose-900/50 hover:text-rose-300 transition-all text-[10px] font-extrabold cursor-pointer mt-2"
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
            <span className="font-extrabold text-slate-800 text-sm">{restaurant?.name || 'Dashboard'}</span>
          </div>
          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200">{restaurant?.package}</span>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div>
            <p className="text-slate-400 text-sm mt-4">Loading operational details...</p>
          </div>
        ) : (
          <>
            {/* Conditional Tab Rendering */}
            {activeTab === 'overview' && (
              <OverviewTab stats={stats} restaurant={restaurant} />
            )}

            {activeTab === 'orders' && (
              <OrdersTab
                orders={orders}
                orderSearch={orderSearch}
                setOrderSearch={setOrderSearch}
                orderStatusFilter={orderStatusFilter}
                setOrderStatusFilter={setOrderStatusFilter}
                handleUpdateOrderStatus={handleUpdateOrderStatus}
                setSelectedOrder={setSelectedOrder}
                setIsOrderModalOpen={setIsOrderModalOpen}
                tabLoading={tabLoading}
                api={api}
              />
            )}

            {activeTab === 'billing' && (
              <BillingTab
                billingOrders={billingOrders}
                historyOrders={historyOrders}
                billingSummary={billingSummary}
                tables={tables}
                orderSearch={orderSearch}
                setOrderSearch={setOrderSearch}
                billingTableFilter={billingTableFilter}
                setBillingTableFilter={setBillingTableFilter}
                historyTab={historyTab}
                setHistoryTab={setHistoryTab}
                handleOpenPrintBilling={handleOpenPrintBilling}
                handleSettleBillingOrder={handleSettleBillingOrder}
                fetchTabData={fetchTabData}
                tabLoading={tabLoading}
              />
            )}

            {activeTab === 'menu' && (
              <MenuTab
                categories={categories}
                menuItems={menuItems}
                tabLoading={tabLoading}
                setIsBulkModalOpen={setIsBulkModalOpen}
                setIsCategoryModalOpen={setIsCategoryModalOpen}
                setIsItemModalOpen={setIsItemModalOpen}
                setCatFormData={setCatFormData}
                setItemFormData={setItemFormData}
                handleToggleStock={handleToggleStock}
                handleDuplicateItem={handleDuplicateItem}
                handleDeleteItem={handleDeleteItem}
                handleDeleteCategory={handleDeleteCategory}
              />
            )}

            {activeTab === 'tables' && (
              <TablesTab
                tables={tables}
                tabLoading={tabLoading}
                setIsTableModalOpen={setIsTableModalOpen}
                setTableFormData={setTableFormData}
                handleToggleTableActive={handleToggleTableActive}
                handleDeleteTable={handleDeleteTable}
                api={api}
              />
            )}

            {activeTab === 'crm' && (
              <CrmTab
                customers={customers}
                advancedAnalytics={advancedAnalytics}
                tabLoading={tabLoading}
                api={api}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                restaurant={restaurant}
                setRestaurant={setRestaurant}
                handleSaveBranding={handleSaveBranding}
                handleSaveCustomerDataSettings={handleSaveCustomerDataSettings}
                handleSaveActionButtons={handleSaveActionButtons}
                setCustomerField={setCustomerField}
                handleUploadLogo={handleUploadLogo}
              />
            )}
          </>
        )}
      </main>

      {/* Operational Overlays & Modals */}
      <OrderInvoiceModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        selectedOrder={selectedOrder}
        onUpdatePaymentStatus={handleUpdatePaymentStatus}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        catFormData={catFormData}
        setCatFormData={setCatFormData}
        handleSaveCategory={handleSaveCategory}
      />

      <MenuItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        itemFormData={itemFormData}
        setItemFormData={setItemFormData}
        categories={categories}
        handleSaveItem={handleSaveItem}
        handleUploadItemImageForm={handleUploadItemImageForm}
      />

      <TableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        tableFormData={tableFormData}
        setTableFormData={setTableFormData}
        handleSaveTable={handleSaveTable}
      />

      <BulkPriceModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        bulkPriceData={bulkPriceData}
        setBulkPriceData={setBulkPriceData}
        handleBulkPrice={handleBulkPrice}
      />

      {/* Thermal Receipt Print Modal */}
      {isPrintModalOpen && selectedPrintOrder && (
        <BillPrint 
          order={selectedPrintOrder} 
          onClose={() => setIsPrintModalOpen(false)} 
        />
      )}
    </div>
  );
}
