import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { api } from '../api';

const customerDict = {
  en: {
    menu: "Explore Culinary Selections",
    search: "Search food items...",
    cart: "My Basket",
    callWaiter: "Call Waiter",
    googleReview: "Google Review",
    share: "Share Menu",
    myOrders: "My Orders",
    addToCart: "Add item to Cart",
    placeOrder: "Submit & Place Order",
    done: "Done",
    close: "Close",
    specialInstructions: "Special Instructions (Optional)",
    instructionsPlaceholder: "e.g. Make it less spicy, no onions, extra ice...",
    subtotal: "Subtotal amount:",
    viewCart: "View Cart Drawer",
    itemsAdded: "Items Added",
    trackingTitle: "Track Your Order",
    currentStatus: "Current Status",
    cookingTimeline: "Cooking Timeline",
    summary: "Summary",
    totalBill: "Total bill:",
    backToMenu: "Back to Menu",
    addMore: "Add More Items / Order More",
    myPastOrders: "My Past Orders",
    noPastOrders: "You haven't placed any orders in this session yet.",
    orderPlaced: "Order Placed!",
    statusNew: "Received by restaurant",
    statusAccepted: "Confirmed by restaurant",
    statusPreparing: "Chef is preparing your ingredients",
    statusReady: "Meals cooked & prepared",
    statusServed: "Delivered to your table",
    orderNo: "Order No:",
    payment: "Payment Status:",
    paid: "Paid",
    unpaid: "Unpaid",
    selectSize: "Select Size / Variant",
    addSize: "Add Size to Basket",
    totalAmount: "Total Amount"
  },
  hi: {
    menu: "मेन्यू की खोज करें",
    search: "खाद्य पदार्थ खोजें...",
    cart: "मेरी टोकरी",
    callWaiter: "वेटर बुलाएं",
    googleReview: "गूगल समीक्षा",
    share: "मेन्यू साझा करें",
    myOrders: "मेरे ऑर्डर्स",
    addToCart: "टोकरी में जोड़ें",
    placeOrder: "ऑर्डर सबमिट करें",
    done: "पूर्ण",
    close: "बंद करें",
    specialInstructions: "विशेष निर्देश (वैकल्पिक)",
    instructionsPlaceholder: "जैसे - कम तीखा करें, प्याज न डालें, अधिक बर्फ...",
    subtotal: "कुल राशि:",
    viewCart: "टोकरी देखें",
    itemsAdded: "आइटम जोड़े गए",
    trackingTitle: "अपना ऑर्डर ट्रैक करें",
    currentStatus: "वर्तमान स्थिति",
    cookingTimeline: "तैयारी की समयरेखा",
    summary: "सारांश",
    totalBill: "कुल बिल:",
    backToMenu: "मेन्यू पर वापस जाएं",
    addMore: "और आइटम जोड़ें / ऑर्डर करें",
    myPastOrders: "मेरे पिछले ऑर्डर्स",
    noPastOrders: "आपने इस सत्र में अभी तक कोई ऑर्डर नहीं दिया है।",
    orderPlaced: "ऑर्डर दिया गया!",
    statusNew: "रेस्टोरेंट को प्राप्त हुआ",
    statusAccepted: "रेस्टोरेंट द्वारा स्वीकृत",
    statusPreparing: "शेफ आपकी सामग्री तैयार कर रहे हैं",
    statusReady: "भोजन तैयार है",
    statusServed: "आपकी टेबल पर परोसा गया",
    orderNo: "ऑर्डर संख्या:",
    payment: "भुगतान की स्थिति:",
    paid: "भुगतान किया",
    unpaid: "बकाया",
    selectSize: "आकार / प्रकार चुनें",
    addSize: "आकार जोड़ें",
    totalAmount: "कुल मूल्य"
  }
};

export default function CustomerMenu() {
  const { slug, orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Query params
  const tableName = searchParams.get('table') || searchParams.get('room') || 'Table 3';
  const tableType = searchParams.get('room') ? 'Room' : 'Table';

  // Loaded Profile Data
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');

  // Customer UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // Detailed popup
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showPwaBanner, setShowPwaBanner] = useState(true);
  const [customerInfo, setCustomerInfo] = useState({
    name: '', mobile: '', email: '', dateOfBirth: '', anniversaryDate: ''
  });
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  // New States for Advanced features
  const [variantSelectorItem, setVariantSelectorItem] = useState(null);
  const [lang, setLang] = useState(localStorage.getItem('customer_lang') || 'en');
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const t = customerDict[lang] || customerDict.en;

  // Tracking state
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const socketRef = useRef(null);

  // Prune local logs and load menu
  useEffect(() => {
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    const placedOrders = JSON.parse(localStorage.getItem('placed_order_ids') || '[]');
    const freshOrders = placedOrders.filter(o => o.timestamp > twelveHoursAgo);
    localStorage.setItem('placed_order_ids', JSON.stringify(freshOrders));
    fetchMenu();
  }, [slug]);

  useEffect(() => {
    if (orderId) {
      fetchTrackingOrder();
    }
  }, [orderId]);

  // Inject dynamic brand color
  useEffect(() => {
    if (restaurant?.brandColor) {
      document.documentElement.style.setProperty('--primary-color', restaurant.brandColor);
      document.documentElement.style.setProperty('--primary-color-hover', `${restaurant.brandColor}E5`); // Subtle transparency
    }
  }, [restaurant]);

  const fetchMenu = async () => {
    try {
      const data = await api.customer.getMenu(slug);
      setRestaurant(data.restaurant);
      setCategories(data.categories);
      setMenuItems(data.items);
      
      // Seed browser document page title white-labeled
      if (data.restaurant.brandingSettings?.pageTitle) {
        document.title = data.restaurant.brandingSettings.pageTitle;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrackingOrder = async () => {
    try {
      setTrackingLoading(true);
      const res = await api.customer.getOrderStatus(orderId);
      setTrackingOrder(res.order);
      setRestaurant(res.restaurant);

      // Connect tracking socket
      connectTrackingSocket(res.order._id);
    } catch (err) {
      console.error(err);
    } finally {
      setTrackingLoading(false);
    }
  };

  const connectTrackingSocket = (orderId) => {
    if (socketRef.current) socketRef.current.disconnect();
    socketRef.current = io('http://localhost:5000');
    
    socketRef.current.emit('joinOrder', orderId.toString());

    socketRef.current.on('orderStatusChanged', (updatedOrder) => {
      setTrackingOrder(updatedOrder);
      if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Ready') {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    });
  };

  const fetchMyOrders = async () => {
    try {
      setMyOrdersLoading(true);
      const placedOrders = JSON.parse(localStorage.getItem('placed_order_ids') || '[]');
      const ids = placedOrders.map(o => o.id).join(',');
      if (ids) {
        const data = await api.customer.getOrdersBatch(ids);
        setMyOrders(data);
      } else {
        setMyOrders([]);
      }
    } catch (err) {
      console.error('Error fetching placed orders:', err);
    } finally {
      setMyOrdersLoading(false);
    }
  };

  // --- Cart Actions ---
  const handleAddToCart = (item, variantName) => {
    if (item.hasVariants && !variantName) {
      setVariantSelectorItem(item);
      return;
    }
    const price = variantName
      ? (item.variants?.find(v => v.name === variantName)?.price || item.price)
      : item.price;

    setCart((prev) => {
      const cartId = `${item._id}_${variantName || ''}`;
      const existing = prev.find(i => i.cartId === cartId);
      if (existing) {
        return prev.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, variantName, price, cartId, quantity: 1 }];
    });
  };

  const handleDecreaseQuantity = (item, variantName) => {
    const cartId = `${item._id}_${variantName || ''}`;
    setCart((prev) => {
      const existing = prev.find(i => i.cartId === cartId);
      if (existing?.quantity === 1) {
        return prev.filter(i => i.cartId !== cartId);
      }
      return prev.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const getItemQuantityInCart = (itemId) => {
    return cart.filter(i => i._id === itemId).reduce((sum, i) => sum + i.quantity, 0);
  };

  const getCartTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getCartTotalCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    const customerSettings = restaurant?.customerDataSettings;
    if (restaurant?.features?.customerDataCollection && customerSettings?.enabled) {
      const missing = Object.entries(customerSettings.fields || {})
        .filter(([, config]) => config.enabled && config.required)
        .find(([field]) => !customerInfo[field]);
      if (missing) {
        alert(`${missing[0]} is required to place this order`);
        return;
      }
    }
    try {
      const payload = {
        slug,
        tableOrRoomName: tableName,
        tableOrRoomType: tableType,
        items: cart.map(i => ({
          menuItemId: i._id,
          quantity: i.quantity,
          variantName: i.variantName || '',
          specialInstructions: ''
        })),
        customer: customerInfo,
        specialInstructions
      };

      const res = await api.customer.placeOrder(payload);
      
      // Save order to session log
      const placedOrders = JSON.parse(localStorage.getItem('placed_order_ids') || '[]');
      placedOrders.push({ id: res._id, timestamp: Date.now() });
      localStorage.setItem('placed_order_ids', JSON.stringify(placedOrders));

      // Trigger celebrate effects
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      
      // Clear cart & variables
      setCart([]);
      setSpecialInstructions('');
      setIsCartOpen(false);

      // Route to tracking page
      navigate(`/menu/${slug}/order/${res._id}?table=${encodeURIComponent(tableName)}`);
    } catch (err) {
      alert(err.message || 'Error submitting order');
    }
  };

  // Filter items matching search and categories selection
  const getFilteredItems = () => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchesCategory = true;
      if (activeCategory !== 'All') {
        const cat = categories.find(c => c.name === activeCategory);
        matchesCategory = cat ? String(item.categoryId) === String(cat._id) : true;
      }

      return matchesSearch && matchesCategory;
    });
  };

  // Share handlers
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Menu link copied to clipboard!');
  };

  const handleCallWaiter = async () => {
    try {
      await api.customer.callWaiter(slug, tableName);
      alert('Waiter has been notified! Someone will assist you shortly.');
    } catch (err) {
      alert('Failed to alert service staff: ' + err.message);
    }
  };

  const configuredActions = () => {
    const defaults = [
      { type: 'callWaiter', label: 'Call Waiter', icon: 'notifications_active', enabled: true },
      { type: 'shareMenu', label: 'Share', icon: 'share', enabled: true },
      { type: 'googleReview', label: 'Review', icon: 'reviews', url: restaurant?.reviewLink, enabled: !!restaurant?.reviewLink },
      { type: 'instagram', label: 'Instagram', icon: 'photo_camera', url: restaurant?.socialLinks?.instagram, enabled: !!restaurant?.socialLinks?.instagram },
      { type: 'whatsapp', label: 'WhatsApp', icon: 'forum', url: restaurant?.socialLinks?.whatsapp ? `https://wa.me/${restaurant.socialLinks.whatsapp.replace(/\D/g, '')}` : '', enabled: !!restaurant?.socialLinks?.whatsapp },
      { type: 'call', label: 'Call', icon: 'call', url: restaurant?.phone ? `tel:${restaurant.phone}` : '', enabled: !!restaurant?.phone },
      { type: 'website', label: 'Website', icon: 'language', url: restaurant?.socialLinks?.website, enabled: !!restaurant?.socialLinks?.website }
    ];
    const actions = restaurant?.actionButtons?.length ? restaurant.actionButtons : defaults;
    return actions.filter((action) => action.enabled).sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const runAction = (action) => {
    if (action.type === 'callWaiter') {
      handleCallWaiter();
      setIsActionMenuOpen(false);
      return;
    }
    if (action.type === 'shareMenu') {
      setIsShareOpen(true);
      setIsActionMenuOpen(false);
      return;
    }
    if (action.type === 'addToHomeScreen') {
      setShowPwaBanner(true);
      setIsActionMenuOpen(false);
      return;
    }
    if (action.url) window.open(action.url, '_blank', 'noopener,noreferrer');
  };

  // Render Tracking Page View
  if (orderId) {
    if (trackingLoading) {
      return (
        <div className="bg-[#f7f9fb] min-h-screen flex items-center justify-center text-xs">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto"></div>
            <p className="text-slate-400 font-semibold">Updating order status timeline...</p>
          </div>
        </div>
      );
    }

    if (!trackingOrder) {
      return (
        <div className="bg-[#f7f9fb] min-h-screen flex items-center justify-center p-6 text-center text-xs">
          <div>
            <span className="material-symbols-outlined text-slate-300 text-5xl">receipt</span>
            <p className="text-slate-400 font-semibold mt-4">Order record not found.</p>
            <button 
              onClick={() => navigate(`/menu/${slug}?table=${encodeURIComponent(tableName)}`)}
              className="mt-4 px-6 py-2.5 rounded-full text-white font-bold"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      );
    }

    // Render Timeline checks
    const statusSteps = ['New', 'Accepted', 'Preparing', 'Ready', 'Served', 'Completed'];
    const currentStepIdx = statusSteps.indexOf(trackingOrder.status);

    return (
      <div className="bg-[#f7f9fb] min-h-screen pb-12 flex flex-col font-body-md text-[#191c1e] text-left">
        {/* Tracking Header */}
        <header className="bg-white border-b border-slate-200 py-5 px-6 shadow-sm sticky top-0 z-30">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button 
              onClick={() => navigate(`/menu/${slug}?table=${encodeURIComponent(tableName)}`)}
              className="material-symbols-outlined text-slate-400 hover:text-slate-600"
            >
              arrow_back_ios
            </button>
            <div>
              <h1 className="font-bold text-sm text-slate-800">Track Your Order</h1>
              <span className="text-[10px] text-slate-400 font-semibold block">{trackingOrder.orderNumber}</span>
            </div>
          </div>
        </header>

        <main className="max-w-md mx-auto w-full px-4 mt-6 flex-grow space-y-6">
          {/* Status highlight */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Current Status</span>
            <h2 className="text-2xl font-black mt-1" style={{ color: 'var(--primary-color)' }}>
              {trackingOrder.status === 'New' ? 'Order Placed!' :
               trackingOrder.status === 'Accepted' ? 'Accepted by Staff' :
               trackingOrder.status === 'Preparing' ? 'Kitchen is Cooking' :
               trackingOrder.status === 'Ready' ? 'Food is Ready!' : 'Served & Enjoy!'}
            </h2>
            <p className="text-[10px] text-slate-400 mt-1">We are preparing your hot, delicious meals at node {trackingOrder.tableName}.</p>
          </div>

          {/* CM-06: Status Timeline Bar */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Cooking Timeline</h3>
            <div className="relative pl-6 space-y-6">
              {/* Vertical link line */}
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100"></div>

              {[
                { label: 'Order Placed', desc: 'Received by restaurant', match: ['New', 'Accepted', 'Preparing', 'Ready', 'Served', 'Completed'] },
                { label: 'Accepted', desc: 'Confirmed by restaurant', match: ['Accepted', 'Preparing', 'Ready', 'Served', 'Completed'] },
                { label: 'Preparing', desc: 'Chef is preparing your ingredients', match: ['Preparing', 'Ready', 'Served', 'Completed'] },
                { label: 'Ready', desc: 'Meals cooked & prepared', match: ['Ready', 'Served', 'Completed'] },
                { label: 'Served', desc: 'Delivered to your table', match: ['Served', 'Completed'] }
              ].map((step, idx) => {
                const isDone = step.match.includes(trackingOrder.status);
                return (
                  <div key={idx} className="relative flex gap-4 items-start text-xs">
                    <div className={`absolute -left-5 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                      isDone 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      {isDone ? <span className="material-symbols-outlined text-[12px] font-bold">check</span> : null}
                    </div>
                    <div>
                      <span className={`font-bold block ${isDone ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{step.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Item invoice details */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Summary</h3>
            <div className="space-y-2.5 text-xs text-slate-600">
              {trackingOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span>{it.name} <strong className="text-slate-400 font-medium">x{it.quantity}</strong></span>
                  <span className="font-bold text-slate-800">₹{it.price * it.quantity}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-[#003b1b]">
                <span>Total bill:</span>
                <span>₹{trackingOrder.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Back button */}
          <button 
            onClick={() => navigate(`/menu/${slug}?table=${encodeURIComponent(tableName)}`)}
            className="w-full py-4 text-center text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Add More Items / Order More
          </button>
        </main>
      </div>
    );
  }

  // --- Render Normal Diner Menu View ---
  return (
    <div className="bg-[#f7f9fb] min-h-screen pb-32 flex flex-col font-body-md text-[#191c1e] text-left">
      
      {/* Top Banner Indicator */}
      <div className="fixed top-0 left-0 w-full z-[60] flex justify-center pt-2 pointer-events-none">
        <div className="bg-emerald-50 border border-emerald-200/50 text-[#006C49] px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 pointer-events-auto scale-90 md:scale-100">
          <span className="material-symbols-outlined text-[18px]">location_on</span>
          <span className="font-bold text-xs uppercase tracking-wide">
            {tableName} — {restaurant?.name || 'Spice Garden'}
          </span>
        </div>
      </div>

      {/* Header View (CM-01) */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg shadow-sm border-b border-slate-100 pt-8">
        <div className="flex justify-between items-center px-4 py-4 mt-2">
          <div className="flex items-center gap-3">
            {restaurant?.logo ? (
              <img 
                src={restaurant.logo.startsWith('http') ? restaurant.logo : `http://localhost:5000${restaurant.logo}`} 
                alt="Logo" 
                className="w-9 h-9 rounded-full object-cover border border-slate-200" 
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#003b1b] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">restaurant</span>
              </div>
            )}
            <h1 className="font-bold text-lg text-slate-800">{restaurant?.name || 'Spice Garden'}</h1>
          </div>
          
          <div className="flex items-center gap-1.5 text-slate-500">
            <button
              onClick={() => {
                const nextLang = lang === 'en' ? 'hi' : 'en';
                setLang(nextLang);
                localStorage.setItem('customer_lang', nextLang);
              }}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold rounded-lg text-[9px] cursor-pointer transition-all uppercase shrink-0"
            >
              {lang === 'en' ? 'हिन्दी' : 'EN'}
            </button>
            <button
              onClick={() => {
                setIsMyOrdersOpen(true);
                fetchMyOrders();
              }}
              className="material-symbols-outlined hover:bg-slate-50 p-1.5 rounded-full cursor-pointer"
              title={t.myOrders}
            >
              receipt_long
            </button>
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="material-symbols-outlined hover:bg-slate-50 p-1.5 rounded-full cursor-pointer"
            >
              search
            </button>
            <button 
              onClick={() => setIsShareOpen(true)}
              className="material-symbols-outlined hover:bg-slate-50 p-1.5 rounded-full cursor-pointer"
            >
              share
            </button>
          </div>
        </div>

        {/* Categories Pills scroll horizontal */}
        <div className="flex overflow-x-auto hide-scrollbar px-4 py-3 gap-2 border-t border-slate-100">
          <button 
            onClick={() => setActiveCategory('All')}
            className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'All'
                ? 'bg-[#003b1b] text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200/50'
            }`}
            style={activeCategory === 'All' ? { backgroundColor: 'var(--primary-color)' } : {}}
          >
            All
          </button>
          {categories.map((c) => (
            <button 
              key={c._id}
              onClick={() => setActiveCategory(c.name)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeCategory === c.name
                  ? 'bg-[#003b1b] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200/50'
              }`}
              style={activeCategory === c.name ? { backgroundColor: 'var(--primary-color)' } : {}}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Diner browse area */}
      <main className="pt-36 flex-grow max-w-md mx-auto w-full px-4">
        
        {/* Optional Hero special banner */}
        <section className="mb-6 mt-4">
          <div className="relative h-[160px] w-full rounded-2xl overflow-hidden shadow-md">
            <img 
              alt="Hero special" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuByQdNC6oShFUireDMk0SfWLVHN3K3LF-JowzBfgoR4qdymOMH1a-PjolDSTCzUsFb3w4OhlqojsEPENcrhkHBmrAwYZexvfvybD0jXtLqPjkm0F6riMJBK25ZRl0pyz-zxuQoER792PFuojiuYeIogPsiwpQxTE-vN8cida7jOneYC7wU0N7uheU13tN0HQlnnGaWMFJADjDFx2Rgxwkwt76YbsiLm3Jr2-HyXo0ISbjGKBLcguAkvv9tG6xezUl__HLkwWCm4YQY1" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4 text-left">
              <span className="text-white/80 text-[8px] font-bold tracking-wider uppercase">Today's Special Sensation</span>
              <h2 className="text-white text-lg font-bold leading-tight">{restaurant?.brandingSettings?.tagline || 'Indian Culinary Excellence'}</h2>
            </div>
          </div>
        </section>

        {/* Menu grid layout */}
        <section className="space-y-4">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Explore Culinary Selections</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {getFilteredItems().length === 0 ? (
              <p className="col-span-2 text-center text-slate-400 text-xs py-8">No menu items found matching filters.</p>
            ) : (
              getFilteredItems().map((item) => {
                const qty = getItemQuantityInCart(item._id);
                return (
                  <div 
                    key={item._id}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0px_4px_20px_rgba(15,23,42,0.06)] flex flex-col transition-all active:scale-[0.98]"
                  >
                    {/* Image area */}
                    <div 
                      onClick={() => setSelectedItem(item)}
                      className="h-28 bg-slate-50 overflow-hidden relative cursor-pointer"
                    >
              {item.image ? (
                        <img 
                          src={item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <span className="material-symbols-outlined text-2xl">fastfood</span>
                        </div>
                      )}
                      
                      {/* Tags */}
                      <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border border-slate-200 flex items-center justify-center p-0.5 rounded bg-white">
                        <div className={`w-full h-full rounded-full ${item.tags.includes('Veg') ? 'bg-emerald-600' : 'bg-red-500'}`}></div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-3 flex flex-col flex-grow text-xs text-left">
                      <h4 onClick={() => setSelectedItem(item)} className="font-bold text-slate-800 truncate cursor-pointer">{item.name}</h4>
                      <p className="text-slate-400 line-clamp-1 mt-0.5 h-4">{item.description}</p>
                      
                      {/* Footer price + +/- adder button targets */}
                      <div className="mt-auto pt-3 flex justify-between items-center">
                        <span className="font-bold text-slate-800">
                          {item.hasVariants && item.variants && item.variants.length > 0
                            ? `₹${Math.min(...item.variants.map(v => v.price))}+`
                            : `₹${item.price}`}
                        </span>
                        
                        {item.hasVariants ? (
                          qty > 0 ? (
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-bold text-[#006C49] cursor-pointer hover:bg-emerald-100/70 transition-all"
                            >
                              {qty} Added
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="w-7 h-7 rounded-lg text-white flex items-center justify-center shadow cursor-pointer active:scale-90 transition-transform font-bold"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                            >
                              +
                            </button>
                          )
                        ) : (
                          qty > 0 ? (
                            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded-lg text-xs font-bold text-[#006C49]">
                              <button onClick={() => handleDecreaseQuantity(item)} className="w-5 h-5 flex items-center justify-center cursor-pointer">-</button>
                              <span>{qty}</span>
                              <button onClick={() => handleAddToCart(item)} className="w-5 h-5 flex items-center justify-center cursor-pointer">+</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleAddToCart(item)}
                              className="w-7 h-7 rounded-lg text-white flex items-center justify-center shadow cursor-pointer active:scale-90 transition-transform font-bold"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                            >
                              +
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Social branding footer links (CM-01 / CM-03) */}
        <footer className="mt-12 mb-8 text-center text-xs space-y-4">
          <p className="text-slate-400 font-semibold">Connect with us</p>
          <div className="flex justify-center gap-4">
            {restaurant?.brandingSettings?.showGoogleReview && restaurant.reviewLink && (
              <a 
                href={restaurant.reviewLink} 
                target="_blank" 
                rel="noreferrer" 
                className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center shadow-sm"
              >
                <span className="material-symbols-outlined text-slate-500">reviews</span>
              </a>
            )}
            {restaurant?.brandingSettings?.showInstagram && restaurant.socialLinks?.instagram && (
              <a 
                href={restaurant.socialLinks.instagram} 
                target="_blank" 
                rel="noreferrer" 
                className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center shadow-sm"
              >
                <span className="material-symbols-outlined text-slate-500 font-bold">photo_camera</span>
              </a>
            )}
            {restaurant?.brandingSettings?.showWhatsapp && restaurant.socialLinks?.whatsapp && (
              <a 
                href={`https://wa.me/${restaurant.socialLinks.whatsapp.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noreferrer" 
                className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center shadow-sm"
              >
                <span className="material-symbols-outlined text-slate-500">forum</span>
              </a>
            )}
          </div>
          <p className="text-[10px] text-slate-400/80 uppercase font-semibold tracking-wider pt-4 border-t border-slate-100">
            {restaurant?.brandingSettings?.footerText || 'Thank you for visiting!'}
          </p>
        </footer>
      </main>

      {/* Floating Bottom Cart Drawer Pill (CM-01) */}
      <div className="fixed right-4 bottom-24 z-40 flex flex-col items-end gap-2">
        {isActionMenuOpen && configuredActions().map((action) => (
          <button
            key={action.type}
            onClick={() => runAction(action)}
            className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-lg"
          >
            <span>{action.label}</span>
            <span className="material-symbols-outlined text-[18px]">{action.icon || 'bolt'}</span>
          </button>
        ))}
        <button
          onClick={() => setIsActionMenuOpen((v) => !v)}
          className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <span className="material-symbols-outlined">{isActionMenuOpen ? 'close' : 'apps'}</span>
        </button>
      </div>

      {/* Floating Bottom Cart Drawer Pill (CM-01) */}
      {getCartTotalCount() > 0 && (
        <div className="fixed bottom-4 left-0 w-full px-4 z-40 pointer-events-none animate-slideUp">
          <div className="max-w-md mx-auto w-full pointer-events-auto">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-full text-white py-4 px-6 rounded-2xl flex justify-between items-center shadow-xl active:scale-[0.98] transition-all cursor-pointer font-bold text-xs"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <div className="flex flex-col items-start">
                <span className="text-[9px] uppercase tracking-wider opacity-80">{getCartTotalCount()} Items Added</span>
                <span className="text-sm">View Cart Drawer</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <span>₹{getCartTotalAmount()}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward_ios</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* CM-03: Detailed Item Popup Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-end justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative text-left">
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute right-4 top-4 text-white bg-slate-900/40 rounded-full w-8 h-8 flex items-center justify-center border border-white/20 z-10"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            
            <div className="h-60 bg-slate-100 relative">
              {selectedItem.image ? (
                <img 
                  src={selectedItem.image.startsWith('http') ? selectedItem.image : `http://localhost:5000${selectedItem.image}`} 
                  alt={selectedItem.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <span className="material-symbols-outlined text-4xl">fastfood</span>
                </div>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-bold mb-2 ${
                  selectedItem.tags.includes('Veg') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                }`}>
                  {selectedItem.tags[0]}
                </span>
                <h2 className="text-xl font-bold text-slate-800">{selectedItem.name}</h2>
                <span className="text-lg font-bold text-slate-800 block mt-1">
                  {selectedItem.hasVariants && selectedItem.variants && selectedItem.variants.length > 0 
                    ? `₹${Math.min(...selectedItem.variants.map(v => v.price))}+` 
                    : `₹${selectedItem.price}`}
                </span>
              </div>

              <p className="text-slate-500 text-xs leading-relaxed">{selectedItem.description || 'Delicately cooked by our master chefs matching custom traditional guidelines.'}</p>

              <button 
                onClick={() => {
                  handleAddToCart(selectedItem);
                  setSelectedItem(null);
                }}
                className="w-full h-12 text-white font-bold rounded-xl cursor-pointer"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {selectedItem.hasVariants ? t.selectSize : t.addToCart}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CM-04: Cart Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-end justify-center p-0">
          <div className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl overflow-hidden relative text-left flex flex-col max-h-[90%]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-800">{t.cart}</h2>
                <span className="text-[10px] text-slate-400 block mt-0.5">Submitting to {tableName}</span>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="material-symbols-outlined text-slate-400 hover:text-slate-600"
              >
                close
              </button>
            </div>

            {/* Cart content scrollable area */}
            <div className="p-5 flex-grow overflow-y-auto space-y-4">
              <div className="divide-y divide-slate-100">
                {cart.map((it) => (
                  <div key={it.cartId} className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {it.name} {it.variantName ? <strong className="text-emerald-600 font-extrabold">({it.variantName})</strong> : null}
                      </span>
                      <span className="text-slate-400 block mt-0.5">₹{it.price} each</span>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg font-bold">
                      <button onClick={() => handleDecreaseQuantity(it, it.variantName)} className="text-slate-500 hover:text-slate-700 cursor-pointer">-</button>
                      <span className="text-slate-800">{it.quantity}</span>
                      <button onClick={() => handleAddToCart(it, it.variantName)} className="text-slate-500 hover:text-slate-700 cursor-pointer">+</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cooking request note */}
              {restaurant?.features?.customerDataCollection && restaurant?.customerDataSettings?.enabled && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h3 className="text-xs font-bold text-slate-700">Your Details</h3>
                  {Object.entries(restaurant.customerDataSettings.fields || {}).filter(([, config]) => config.enabled).map(([field, config]) => (
                    <div key={field}>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {field.replace(/([A-Z])/g, ' $1')} {config.required ? '*' : ''}
                      </label>
                      <input
                        type={field.includes('Date') ? 'date' : field === 'email' ? 'email' : 'text'}
                        value={customerInfo[field] || ''}
                        onChange={(event) => setCustomerInfo({ ...customerInfo, [field]: event.target.value })}
                        required={config.required}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-1 focus:ring-[#003b1b]"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Cooking request note */}
              <div className="space-y-1.5 pt-4">
                <label className="block text-slate-600 text-xs font-semibold">{t.specialInstructions}</label>
                <textarea 
                  rows="2"
                  className="w-full p-3 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#003b1b]"
                  placeholder={t.instructionsPlaceholder}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>
            </div>

            {/* Sticky checkout total footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex justify-between font-bold text-xs text-slate-700">
                <span>{t.subtotal}</span>
                <span>₹{getCartTotalAmount()}</span>
              </div>
              <button 
                onClick={handlePlaceOrder}
                className="w-full h-12 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {t.placeOrder} (₹{getCartTotalAmount()})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CM-02: Search Results Drawer/Screen */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-white z-[70] flex flex-col text-left">
          <header className="px-4 py-4 border-b border-slate-100 flex items-center gap-3">
            <button 
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="material-symbols-outlined text-slate-400 hover:text-slate-600"
            >
              arrow_back_ios
            </button>
            <div className="flex-grow flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
              <span className="material-symbols-outlined text-slate-400 text-sm mr-2">search</span>
              <input 
                type="text" 
                className="bg-transparent border-none outline-none focus:ring-0 w-full"
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </header>

          <div className="p-4 flex-grow overflow-y-auto space-y-4 max-w-md mx-auto w-full">
            <h3 className="font-bold text-slate-800 text-xs mb-2">Search Results ({getFilteredItems().length})</h3>
            <div className="grid grid-cols-2 gap-4">
              {getFilteredItems().map(item => {
                const qty = getItemQuantityInCart(item._id);
                return (
                  <div key={item._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col text-xs">
                    <div className="h-24 bg-slate-100 overflow-hidden relative">
                      {item.image && <img src={item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`} alt={item.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-3 flex flex-col flex-grow">
                      <h4 className="font-semibold text-slate-800 truncate">{item.name}</h4>
                      <div className="mt-auto pt-2 flex justify-between items-center">
                        <span className="font-bold text-slate-800">
                          {item.hasVariants && item.variants && item.variants.length > 0 
                            ? `₹${Math.min(...item.variants.map(v => v.price))}+` 
                            : `₹${item.price}`}
                        </span>
                        
                        {item.hasVariants ? (
                          qty > 0 ? (
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[9px] font-bold text-[#006C49] cursor-pointer hover:bg-emerald-100/70"
                            >
                              {qty} Added
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleAddToCart(item)}
                              className="w-6 h-6 rounded flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                            >
                              +
                            </button>
                          )
                        ) : (
                          qty > 0 ? (
                            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded text-[10px] font-bold text-[#006C49]">
                              <button onClick={() => handleDecreaseQuantity(item)}>-</button>
                              <span>{qty}</span>
                              <button onClick={() => handleAddToCart(item)}>+</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleAddToCart(item)}
                              className="w-6 h-6 rounded flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                            >
                              +
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CM-08: Menu Share screen overlay */}
      {isShareOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative text-center">
            <button 
              onClick={() => setIsShareOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-sm font-bold text-slate-800 mb-2">{t.share}</h2>
            <p className="text-[10px] text-slate-400 mb-6">Let your friends scan and browse our menu instantly.</p>

            <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl inline-block shadow-inner mb-6">
              {/* Dynamic generated share QR code */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`} 
                alt="Share QR" 
                className="w-36 h-36 bg-white p-1 rounded-xl shadow border border-slate-100" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <button 
                onClick={handleCopyLink}
                className="h-11 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Copy Link
              </button>
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(`Hey, check out Spice Garden's delicious menu! Order directly here: ${window.location.href}`)}`}
                target="_blank"
                rel="noreferrer"
                className="h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center cursor-pointer shadow-md"
              >
                WhatsApp Share
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Variant Selector Popup Modal */}
      {variantSelectorItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-[80] flex items-end justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md shadow-2xl p-5 relative text-left">
            <button
              onClick={() => setVariantSelectorItem(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-sm font-bold text-slate-800 mb-1">{t.selectSize}</h2>
            <p className="text-[10px] text-slate-400 mb-4">{variantSelectorItem.name}</p>

            <div className="space-y-2 mb-6">
              {variantSelectorItem.variants.map((v) => {
                const cartId = `${variantSelectorItem._id}_${v.name}`;
                const itemQty = cart.find(ci => ci.cartId === cartId)?.quantity || 0;
                return (
                  <div key={v.name} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-semibold text-slate-800 text-xs">{v.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">₹{v.price}</span>
                    </div>
                    
                    {itemQty > 0 ? (
                      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded-lg text-xs font-bold text-[#006C49]">
                        <button onClick={() => handleDecreaseQuantity(variantSelectorItem, v.name)} className="w-5 h-5 flex items-center justify-center cursor-pointer">-</button>
                        <span>{itemQty}</span>
                        <button onClick={() => handleAddToCart(variantSelectorItem, v.name)} className="w-5 h-5 flex items-center justify-center cursor-pointer">+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(variantSelectorItem, v.name)}
                        className="px-3 py-1.5 bg-[#003b1b] hover:bg-[#166534] text-white font-bold rounded-lg text-[10px] cursor-pointer shadow-sm"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        {t.addToCart}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={() => setVariantSelectorItem(null)}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              {t.done}
            </button>
          </div>
        </div>
      )}

      {/* CM-07: My Orders Drawer Overlay */}
      {isMyOrdersOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-end justify-center p-0">
          <div className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl overflow-hidden relative text-left flex flex-col max-h-[90%]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-800">{t.myPastOrders}</h2>
                <p className="text-[10px] text-slate-400 block mt-0.5">Session orders placed within past 12 hrs</p>
              </div>
              <button 
                onClick={() => setIsMyOrdersOpen(false)}
                className="material-symbols-outlined text-slate-400 hover:text-slate-600"
              >
                close
              </button>
            </div>

            {/* Content area */}
            <div className="p-5 flex-grow overflow-y-auto space-y-4">
              {myOrdersLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto"></div>
                </div>
              ) : myOrders.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <span className="material-symbols-outlined text-slate-300 text-5xl">receipt_long</span>
                  <p className="text-slate-400 text-xs">{t.noPastOrders}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((ord) => (
                    <div key={ord._id} className="border border-slate-150 rounded-2xl p-4 bg-slate-50/30 space-y-3 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">{ord.orderNumber}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          ord.status === 'New' ? 'bg-amber-100 text-amber-600' :
                          ord.status === 'Accepted' ? 'bg-blue-100 text-blue-600' :
                          ord.status === 'Preparing' ? 'bg-indigo-100 text-indigo-600' :
                          ord.status === 'Ready' ? 'bg-emerald-100 text-emerald-600' :
                          ord.status === 'Completed' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'
                        }`}>
                          {ord.status}
                        </span>
                      </div>
                      
                      {/* Items summary */}
                      <div className="space-y-1">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-600 font-mono">
                            <span>{it.name} {it.variantName ? <strong className="text-emerald-600 font-bold">({it.variantName})</strong> : null} (x{it.quantity})</span>
                            <span>₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-slate-400">{t.payment}</span>
                          <span className={`px-1.5 py-0.25 rounded text-[8px] font-black uppercase tracking-wider ${
                            ord.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-500 border border-red-200'
                          }`}>
                            {ord.paymentStatus === 'Paid' ? t.paid : t.unpaid}
                          </span>
                        </div>
                        <div className="font-extrabold text-[#003b1b] text-sm">
                          ₹{ord.totalAmount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setIsMyOrdersOpen(false)}
                className="w-full h-11 bg-[#003b1b] hover:bg-[#166534] text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
