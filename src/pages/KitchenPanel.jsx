import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { api } from '../api';

const kitchenDict = {
  en: {
    title: "Kitchen Display Dashboard",
    newOrders: "NEW ORDERS",
    preparing: "PREPARING",
    readyServe: "READY TO SERVE",
    elapsed: "min",
    elapsedPlural: "mins",
    instructions: "Instructions",
    waiterOrder: "Waiter Order",
    noCards: "No active cards",
    volume: "Volume Control",
    fullscreen: "Fullscreen",
    back: "Back",
    ok: "OK",
    alertTitle: "Call Alert",
    alertDesc: "Waiter requested service!",
    completed: "Serve & Close"
  },
  hi: {
    title: "रसोई प्रदर्शन डैशबोर्ड",
    newOrders: "नए ऑर्डर",
    preparing: "तैयार हो रहा है",
    readyServe: "परोसने के लिए तैयार",
    elapsed: "मिनट",
    elapsedPlural: "मिनट",
    instructions: "निर्देश",
    waiterOrder: "वेटर ऑर्डर",
    noCards: "कोई सक्रिय कार्ड नहीं",
    volume: "ध्वनि नियंत्रण",
    fullscreen: "पूर्ण स्क्रीन",
    back: "वापस",
    ok: "ठीक है",
    alertTitle: "कॉल अलर्ट",
    alertDesc: "वेटर ने सेवा का अनुरोध किया!",
    completed: "परोसें और बंद करें"
  }
};

const COLUMNS = [
  { id: 'New', label: 'NEW ORDERS', icon: 'fiber_new', next: 'Preparing', bg: 'bg-[#b45309]/5 border-amber-500/20' },
  { id: 'Preparing', label: 'PREPARING', icon: 'skillet', next: 'Ready', bg: 'bg-[#1e1b4b]/5 border-indigo-500/20' },
  { id: 'Ready', label: 'READY TO SERVE', icon: 'room_service', next: 'Completed', bg: 'bg-[#064e3b]/5 border-emerald-500/20' }
];

const PRIORITY_CLASS = {
  Normal: 'border-slate-800',
  High: 'border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.1)]',
  Rush: 'border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse'
};

export default function KitchenPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [calls, setCalls] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(localStorage.getItem('kitchen_lang') || 'en');
  const t = kitchenDict[lang] || kitchenDict.en;
  
  const socketRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
    const clock = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => {
      clearInterval(clock);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [slug]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const data = await api.customer.getMenu(slug);
      setRestaurant(data.restaurant);
      
      const orderList = await api.orders.getOrders();
      setOrders(orderList);

      const activeCalls = await api.waiter.getCalls().catch(() => []);
      setCalls(activeCalls);

      connectSocket(data.restaurant._id);
    } catch (err) {
      console.error(err);
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const playChimeSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5
        gain2.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 120);
    } catch (e) {
      console.error('Audio synthesizer error:', e);
    }
  };

  const connectSocket = (restaurantId) => {
    if (socketRef.current) socketRef.current.disconnect();
    socketRef.current = io('http://localhost:5000');
    
    // Join rooms
    socketRef.current.emit('joinKitchen', restaurantId);
    socketRef.current.emit('joinRestaurant', restaurantId);

    // Socket listeners
    socketRef.current.on('orderCreated', (order) => {
      setOrders((prev) => [order, ...prev.filter((o) => o._id !== order._id)]);
      playChimeSound();
    });

    socketRef.current.on('orderUpdated', (order) => {
      if (order.status === 'Completed' || order.status === 'Cancelled') {
        setOrders((prev) => prev.filter((o) => o._id !== order._id));
      } else {
        setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
      }
    });

    socketRef.current.on('waiterCalled', (newCall) => {
      setCalls((prev) => [newCall, ...prev]);
      playChimeSound();
    });

    socketRef.current.on('waiterCallAttended', (attendedCall) => {
      setCalls((prev) => prev.filter(c => c._id !== attendedCall._id));
    });
  };

  const updateStatus = async (orderId, newStatus) => {
    const backup = orders;
    // Optimistic UI updates
    if (newStatus === 'Completed') {
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } else {
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)));
    }
    
    try {
      await api.orders.updateStatus(orderId, newStatus);
    } catch (err) {
      setOrders(backup);
      alert(err.message || 'Unable to transition order state');
    }
  };

  const updatePriority = async (orderId, priority) => {
    try {
      const updated = await api.orders.updatePriority(orderId, priority);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
    } catch {
      alert('Unable to update priority level');
    }
  };

  const handleAttendCall = async (callId) => {
    try {
      await api.waiter.attendCall(callId);
      setCalls((prev) => prev.filter((c) => c._id !== callId));
    } catch (err) {
      console.error(err);
    }
  };

  const onDrop = (event, targetStatus) => {
    const orderId = event.dataTransfer.getData('orderId');
    if (orderId) updateStatus(orderId, targetStatus);
  };

  const activeOrders = useMemo(() => {
    return orders.filter(o => ['New', 'Accepted', 'Preparing', 'Ready', 'Served'].includes(o.status));
  }, [orders]);

  const getElapsedMinutes = (order) => Math.max(0, Math.floor((currentTime - new Date(order.createdAt)) / 60000));

  const formatElapsed = (order) => {
    const mins = getElapsedMinutes(order);
    return `${mins} ${mins !== 1 ? t.elapsedPlural : t.elapsed}`;
  };

  const fullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  };

  const getColLabel = (colId) => {
    if (colId === 'New') return t.newOrders;
    if (colId === 'Preparing') return t.preparing;
    if (colId === 'Ready') return t.readyServe;
    return colId;
  };

  const getNextButtonLabel = (nextStatus) => {
    if (nextStatus === 'Completed') return t.completed;
    if (nextStatus === 'Preparing') return t.preparing;
    if (nextStatus === 'Ready') return t.readyServe;
    return nextStatus;
  };

  return (
    <div className="min-h-screen bg-[#0d0f12] text-white flex flex-col font-sans select-none text-left">
      {/* KDS Header */}
      <header className="border-b border-slate-800 bg-[#12161b] px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">chef_hat</span>
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">{restaurant?.name || 'Kitchen Display'}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-semibold text-xs text-slate-300">
          <button
            onClick={() => {
              const nextLang = lang === 'en' ? 'hi' : 'en';
              setLang(nextLang);
              localStorage.setItem('kitchen_lang', nextLang);
            }}
            className="h-9 px-3 border border-slate-800 hover:bg-slate-800 rounded-lg flex items-center justify-center cursor-pointer text-[10px] font-extrabold uppercase"
          >
            {lang === 'en' ? 'हिन्दी' : 'EN'}
          </button>
          <div className="h-9 px-3 border border-slate-800 rounded-lg flex items-center justify-center font-mono text-sm tracking-wide">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button 
            onClick={() => setSoundEnabled(v => !v)}
            className={`h-9 w-9 border rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              soundEnabled ? 'border-orange-500/30 bg-orange-500/10 text-orange-500' : 'border-slate-800 text-slate-500'
            }`}
            title={t.volume}
          >
            <span className="material-symbols-outlined text-lg">{soundEnabled ? 'volume_up' : 'volume_off'}</span>
          </button>
          <button 
            onClick={fullScreen}
            className="h-9 w-9 border border-slate-800 hover:bg-slate-800 rounded-lg flex items-center justify-center cursor-pointer"
            title={t.fullscreen}
          >
            <span className="material-symbols-outlined text-lg">fullscreen</span>
          </button>
          <button 
            onClick={() => navigate('/admin')}
            className="h-9 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            {t.back}
          </button>
        </div>
      </header>

      {/* Kanban Board Grid */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[calc(100vh-76px)] overflow-hidden">
        {COLUMNS.map((column) => {
          const colOrders = activeOrders.filter((o) => {
            if (column.id === 'New') return o.status === 'New' || o.status === 'Accepted';
            if (column.id === 'Preparing') return o.status === 'Preparing';
            if (column.id === 'Ready') return o.status === 'Ready' || o.status === 'Served';
            return false;
          });

          return (
            <section
              key={column.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, column.id)}
              className={`rounded-2xl border flex flex-col max-h-full ${column.bg} bg-slate-950/20`}
            >
              {/* Column Title */}
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-lg">{column.icon}</span>
                  <h2 className="text-xs font-black tracking-widest uppercase">{getColLabel(column.id)}</h2>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-extrabold">{colOrders.length}</span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {colOrders.length === 0 ? (
                  <div className="text-center py-16 text-slate-600 text-xs font-semibold">
                    {t.noCards}
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <article
                      key={order._id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('orderId', order._id)}
                      className={`rounded-2xl border bg-[#14181f] p-4 shadow-lg cursor-grab active:cursor-grabbing transition-all hover:border-slate-700/80 ${
                        PRIORITY_CLASS[order.priority || 'Normal']
                      } ${
                        getElapsedMinutes(order) >= 20 
                          ? 'ring-2 ring-red-500/50' 
                          : getElapsedMinutes(order) >= 10 
                          ? 'ring-2 ring-amber-500/40' 
                          : ''
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-white">{order.tableName}</span>
                            {order.placedBy === 'waiter' && (
                              <span className="px-2 py-0.5 rounded bg-orange-500 text-slate-950 text-[8px] font-black uppercase tracking-wider">
                                {t.waiterOrder}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{order.orderNumber}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] font-black tabular-nums bg-slate-800 px-2 py-1 rounded-md text-slate-300">
                            {formatElapsed(order)}
                          </span>
                        </div>
                      </div>

                      {/* Card Items */}
                      <div className="py-3.5 space-y-2 border-b border-slate-800">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-200">
                              {it.name} {it.variantName ? <span className="text-orange-400 font-extrabold text-[10px] ml-1">({it.variantName})</span> : null}
                            </span>
                            <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded font-black text-orange-400">
                              x{it.quantity}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Chef Instructions */}
                      {order.specialInstructions && (
                        <div className="mt-3 bg-amber-500/5 border border-amber-500/10 rounded-xl p-2.5 text-[10px] text-amber-300 font-bold leading-normal">
                          {t.instructions}: {order.specialInstructions}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-3.5 flex items-center gap-2.5">
                        <select
                          value={order.priority || 'Normal'}
                          onChange={(e) => updatePriority(order._id, e.target.value)}
                          className="h-9 flex-grow max-w-[100px] border border-slate-800 bg-[#0d0f12] rounded-xl text-[10px] font-bold text-slate-300 outline-none px-2"
                        >
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Rush">Rush</option>
                        </select>

                        {column.next && (
                          <button
                            onClick={() => updateStatus(order._id, column.next)}
                            className="h-9 flex-grow bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-[10px] uppercase shadow-sm cursor-pointer transition-colors"
                          >
                            {getNextButtonLabel(column.next)}
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </main>

      {/* Floating Waiter Alert Service Toast List */}
      <div className="fixed bottom-6 right-6 z-50 w-80 space-y-3 pointer-events-none">
        {calls.map((call) => (
          <div 
            key={call._id} 
            className="bg-[#181d26] border-2 border-orange-500/60 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 pointer-events-auto animate-slideUp"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-xl">notifications_active</span>
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-xs text-white truncate">{call.tableLabel} {t.alertTitle}</h4>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{t.alertDesc}</p>
              </div>
            </div>
            <button
              onClick={() => handleAttendCall(call._id)}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-slate-950 rounded-xl text-[10px] font-black shadow-sm cursor-pointer transition-colors flex-shrink-0"
            >
              {t.ok}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
