import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

const waiterMenuDict = {
  en: {
    title: "Waiter Menu Order",
    live: "Live Connection",
    loading: "Loading dishes...",
    noItems: "No items found in this category.",
    cartTotal: "Cart Total",
    tax: "tax",
    review: "Review Order",
    items: "items",
    summary: "Order Summary",
    instructionsPlaceholder: "Add cooking / chef instructions...",
    subtotal: "Subtotal",
    taxLabel: "Tax (GST 5%)",
    grandTotal: "Grand Total",
    sendKitchen: "Send Order to Kitchen",
    orderSuccess: "Order placed successfully!",
    failedOrder: "Failed to place order",
    add: "Add +",
    selectSize: "Select Size / Variant",
    done: "Done",
    added: "Added",
    addSize: "Add Size"
  },
  hi: {
    title: "वेटर मेनू ऑर्डर",
    live: "लाइव कनेक्शन",
    loading: "व्यंजन लोड हो रहे हैं...",
    noItems: "इस श्रेणी में कोई आइटम नहीं मिला।",
    cartTotal: "टोकरी का कुल",
    tax: "कर",
    review: "ऑर्डर की समीक्षा करें",
    items: "आइटम",
    summary: "ऑर्डर सारांश",
    instructionsPlaceholder: "विशेष निर्देश या तैयारी का तरीका लिखें...",
    subtotal: "कुल योग",
    taxLabel: "कर (जीएसटी 5%)",
    grandTotal: "कुल मूल्य",
    sendKitchen: "रसोई में ऑर्डर भेजें",
    orderSuccess: "ऑर्डर सफलतापूर्वक दिया गया!",
    failedOrder: "ऑर्डर देने में विफल",
    add: "जोड़ें +",
    selectSize: "आकार / प्रकार चुनें",
    done: "पूर्ण",
    added: "जोड़ा गया",
    addSize: "आकार जोड़ें"
  }
};

export default function WaiterMenu() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const tableId = searchParams.get('tableId');
  const tableName = searchParams.get('tableName') || 'Selected Table';

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Cart state: { [cartId]: { menuItemId, name, price, quantity, specialInstructions } }
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [variantSelectorItem, setVariantSelectorItem] = useState(null);
  const [lang, setLang] = useState(localStorage.getItem('waiter_lang') || 'en');
  const t = waiterMenuDict[lang] || waiterMenuDict.en;

  useEffect(() => {
    const token = localStorage.getItem('waiter_token');
    if (!token) {
      navigate(`/waiter/${slug}/login`);
      return;
    }

    if (!tableId) {
      navigate(`/waiter/${slug}`);
      return;
    }

    fetchMenuData();
  }, [slug, tableId]);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const [cats, items] = await Promise.all([
        api.menu.getCategories(),
        api.menu.getItems()
      ]);
      setCategories(cats);
      setMenuItems(items);
      if (cats.length > 0) {
        setActiveCategory(cats[0]._id);
      }
    } catch (err) {
      console.error(err);
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('waiter_token');
        navigate(`/waiter/${slug}/login`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = (item, delta, variantName) => {
    if (item.hasVariants && !variantName) {
      setVariantSelectorItem(item);
      return;
    }

    const price = variantName
      ? (item.variants?.find(v => v.name === variantName)?.price || item.price)
      : item.price;

    const cartId = `${item._id}_${variantName || ''}`;

    setCart((prev) => {
      const current = prev[cartId];
      const newQty = (current ? current.quantity : 0) + delta;
      
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[cartId];
        return copy;
      }
      
      return {
        ...prev,
        [cartId]: {
          menuItemId: item._id,
          name: item.name,
          variantName: variantName || '',
          price,
          quantity: newQty,
          specialInstructions: current ? current.specialInstructions : ''
        }
      };
    });
  };

  const handleUpdateInstructions = (cartId, instructions) => {
    setCart((prev) => {
      if (!prev[cartId]) return prev;
      return {
        ...prev,
        [cartId]: {
          ...prev[cartId],
          specialInstructions: instructions
        }
      };
    });
  };

  const getCartList = () => Object.values(cart);

  const getItemQuantityInCart = (itemId) => {
    return getCartList().filter(i => i.menuItemId === itemId).reduce((sum, i) => sum + i.quantity, 0);
  };
  
  const getSubtotal = () => {
    return getCartList().reduce((sum, item) => sum + item.price * item.quantity, 0);
  };
  const getTax = () => Math.round(getSubtotal() * 0.05); // 5% GST
  const getTotal = () => getSubtotal() + getTax();

  const handlePlaceOrder = async () => {
    const items = getCartList().map(i => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      variantName: i.variantName || '',
      specialInstructions: i.specialInstructions || ''
    }));
    if (items.length === 0) return;

    try {
      setSubmitting(true);
      await api.waiter.placeOrder({
        tableOrRoomId: tableId,
        items
      });
      alert(t.orderSuccess);
      navigate(`/waiter/${slug}`);
    } catch (err) {
      alert(err.message || t.failedOrder);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = menuItems.filter(item => item.categoryId === activeCategory);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col pb-24 text-left">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-4 shadow flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/waiter/${slug}`)} 
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center border border-slate-700 cursor-pointer"
          >
            <span className="material-symbols-outlined text-white text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight">Waiter Menu Order</h1>
            <p className="text-[10px] text-amber-500 font-bold uppercase">{tableName}</p>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-slate-300">Live Connection</span>
        </div>
      </header>

      {/* Categories Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-[64px] z-10 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat._id}
            onClick={() => setActiveCategory(cat._id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
              activeCategory === cat._id
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="mr-1.5">{cat.icon || '🍲'}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-grow p-4 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-950 mx-auto"></div>
            <p className="text-slate-400 text-xs mt-3 font-semibold">Loading dishes...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">fastfood</span>
                <p className="text-slate-400 text-xs font-semibold">No items found in this category.</p>
              </div>
            ) : (
              filteredItems.map(item => {
                const cartItem = cart[item._id];
                return (
                  <div key={item._id} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm flex gap-3.5 items-center justify-between">
                    <div className="flex gap-3 items-center min-w-0">
                      {item.image ? (
                        <img 
                          src={item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`} 
                          alt={item.name} 
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                          <span className="material-symbols-outlined">restaurant</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 flex-shrink-0 border flex items-center justify-center rounded-sm ${
                            item.tags.includes('Non-Veg') ? 'border-red-500' : 'border-emerald-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              item.tags.includes('Non-Veg') ? 'bg-red-500' : 'bg-emerald-500'
                            }`} />
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-800 truncate">{item.name}</h4>
                        </div>
                        <p className="font-bold text-slate-900 text-xs mt-1">₹{item.price}</p>
                      </div>
                    </div>

                    {/* Counter */}
                    <div className="flex-shrink-0">
                      {cartItem ? (
                        <div className="flex items-center gap-3 bg-slate-900 text-white rounded-xl px-3 py-1.5 text-xs font-bold shadow-md">
                          <button onClick={() => handleUpdateQuantity(item, -1)} className="hover:text-amber-400 text-sm cursor-pointer">-</button>
                          <span className="w-4 text-center">{cartItem.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(item, 1)} className="hover:text-amber-400 text-sm cursor-pointer">+</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUpdateQuantity(item, 1)}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-sm border border-slate-950 cursor-pointer"
                        >
                          Add +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Sticky Bottom Bar */}
      {getCartList().length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 shadow-lg flex items-center justify-between z-10">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cart Total</p>
            <p className="text-lg font-black text-slate-900">₹{getSubtotal()} <span className="text-xs text-slate-400 font-semibold">(+{getTax()} tax)</span></p>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Review Order ({getCartList().reduce((sum, item) => sum + item.quantity, 0)} items)
            <span className="material-symbols-outlined text-[16px]">shopping_cart_checkout</span>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto flex flex-col justify-between animate-slideUp">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Order Summary</h3>
                <p className="text-[10px] text-amber-600 font-extrabold uppercase">{tableName}</p>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 space-y-4 mb-6">
              {getCartList().map(item => (
                <div key={item.menuItemId} className="border-b border-slate-100 pb-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-800">{item.name} <strong className="text-slate-400 font-medium">x{item.quantity}</strong></span>
                    <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                  </div>
                  {/* Cooking instructions input */}
                  <input
                    type="text"
                    placeholder="Add cooking / chef instructions..."
                    value={item.specialInstructions}
                    onChange={(e) => handleUpdateInstructions(item.menuItemId, e.target.value)}
                    className="w-full h-8 px-2.5 mt-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none font-medium"
                  />
                </div>
              ))}
            </div>

            {/* Total Math */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs mb-6">
              <div className="flex justify-between text-slate-500 font-semibold">
                <span>Subtotal</span>
                <span>₹{getSubtotal()}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-semibold">
                <span>Tax (GST 5%)</span>
                <span>₹{getTax()}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 text-sm border-t border-slate-200 pt-2 mt-1">
                <span>Grand Total</span>
                <span>₹{getTotal()}</span>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  Send Order to Kitchen
                  <span className="material-symbols-outlined text-[16px]">restaurant_menu</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
