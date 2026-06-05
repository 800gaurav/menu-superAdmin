import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { api } from '../api';

const COLUMNS = [
  { id: 'New', label: 'New Orders', icon: 'fiber_new', next: 'Accepted' },
  { id: 'Accepted', label: 'Accepted', icon: 'task_alt', next: 'Preparing' },
  { id: 'Preparing', label: 'Preparing', icon: 'skillet', next: 'Ready' },
  { id: 'Ready', label: 'Ready', icon: 'room_service', next: 'Served' },
  { id: 'Served', label: 'Served', icon: 'done_all', next: 'Completed' }
];

const PRIORITY_CLASS = {
  Normal: 'border-white/10',
  High: 'border-amber-400 shadow-amber-500/10',
  Rush: 'border-red-400 shadow-red-500/20'
};

export default function KitchenPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchData();
    const clock = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => {
      clearInterval(clock);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [slug]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const refresh = setInterval(() => fetchOrders(false), 15000);
    return () => clearInterval(refresh);
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.customer.getMenu(slug);
      setRestaurant(data.restaurant);
      await Promise.all([fetchOrders(false), fetchAnalytics()]);
      connectSocket(data.restaurant._id);
    } catch (err) {
      if (err.status === 401 || err.status === 403) navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await api.orders.getOrders();
      setOrders(data);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await api.analytics.getDashboard(1);
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    }
  };

  const connectSocket = (restaurantId) => {
    if (socketRef.current) socketRef.current.disconnect();
    socketRef.current = io('http://localhost:5000');
    socketRef.current.emit('joinKitchen', restaurantId);
    socketRef.current.on('orderCreated', (order) => {
      setOrders((prev) => [order, ...prev.filter((o) => o._id !== order._id)]);
      playSound();
      fetchAnalytics();
    });
    socketRef.current.on('orderUpdated', (order) => {
      setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
      fetchAnalytics();
    });
  };

  const playSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523.25, 659.25, 783.99].forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.value = 0.22;
        osc.start(ctx.currentTime + index * 0.12);
        osc.stop(ctx.currentTime + index * 0.12 + 0.16);
      });
    } catch {}
  };

  const updateStatus = async (orderId, status) => {
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status } : o)));
    try {
      await api.orders.updateStatus(orderId, status);
    } catch (err) {
      setOrders(previous);
      alert(err.message || 'Unable to update order');
    }
  };

  const updatePriority = async (orderId, priority) => {
    try {
      const updated = await api.orders.updatePriority(orderId, priority);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
    } catch {
      alert('Unable to update priority');
    }
  };

  const onDrop = (event, status) => {
    const orderId = event.dataTransfer.getData('orderId');
    if (orderId) updateStatus(orderId, status);
  };

  const activeOrders = useMemo(
    () => orders.filter((o) => COLUMNS.some((c) => c.id === o.status)),
    [orders]
  );

  const getElapsedMinutes = (order) => Math.max(0, Math.floor((currentTime - new Date(order.createdAt)) / 60000));

  const formatElapsed = (order) => {
    const mins = getElapsedMinutes(order);
    if (mins < 1) return '0m';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const fullScreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div className="min-h-screen bg-[#101318] text-white text-left">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#171b22] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
              <span className="material-symbols-outlined">restaurant</span>
            </div>
            <div>
              <h1 className="text-lg font-black leading-tight">{restaurant?.name || 'Kitchen Display'}</h1>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Restaurant-grade KDS</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200">
              {activeOrders.length} Active
            </div>
            <button onClick={() => setAutoRefresh((v) => !v)} className={`h-10 rounded-lg border px-3 text-xs font-bold ${autoRefresh ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-300'}`}>
              <span className="material-symbols-outlined align-middle text-[16px]">sync</span> Auto
            </button>
            <button onClick={() => setSoundEnabled((v) => !v)} className={`h-10 rounded-lg border px-3 text-xs font-bold ${soundEnabled ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>
              <span className="material-symbols-outlined align-middle text-[16px]">{soundEnabled ? 'volume_up' : 'volume_off'}</span>
            </button>
            <button onClick={fullScreen} className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200">
              <span className="material-symbols-outlined align-middle text-[16px]">fullscreen</span>
            </button>
            <button onClick={() => fetchOrders(true)} className="h-10 rounded-lg bg-white px-3 text-xs font-black text-slate-950">
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Kitchen Revenue" value={`₹${analytics?.revenue?.total || 0}`} />
          <Metric label="Orders Today" value={analytics?.revenue?.orders || 0} />
          <Metric label="QR Scans" value={analytics?.qrScans || 0} />
          <Metric label="Peak Hour" value={analytics?.peakHours?.[0]?._id !== undefined ? `${analytics.peakHours[0]._id}:00` : '-'} />
        </div>
      </header>

      <main className="p-4">
        {loading ? (
          <div className="flex h-[60vh] items-center justify-center text-sm font-bold text-slate-400">Syncing orders...</div>
        ) : (
          <div className="grid min-h-[calc(100vh-180px)] grid-cols-1 gap-4 md:grid-cols-5">
            {COLUMNS.map((column) => {
              const columnOrders = activeOrders.filter((order) => order.status === column.id);
              return (
                <section
                  key={column.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDrop(event, column.id)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-emerald-300">{column.icon}</span>
                      <h2 className="text-sm font-black">{column.label}</h2>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-black">{columnOrders.length}</span>
                  </div>

                  <div className="space-y-3">
                    {columnOrders.map((order) => (
                      <article
                        key={order._id}
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData('orderId', order._id)}
                        className={`rounded-lg border bg-[#1d222b] p-3 shadow-xl ${PRIORITY_CLASS[order.priority || 'Normal']} ${getElapsedMinutes(order) >= 20 ? 'ring-2 ring-red-500/70' : getElapsedMinutes(order) >= 10 ? 'ring-2 ring-amber-400/60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-bold uppercase text-slate-400">{order.orderNumber}</p>
                            <h3 className="text-2xl font-black">{order.tableName}</h3>
                          </div>
                          <div className="text-right">
                            <span className="block rounded-md bg-white/10 px-2 py-1 text-xs font-black tabular-nums">{formatElapsed(order)}</span>
                            <span className="mt-1 block text-xs font-bold text-emerald-300">₹{order.totalAmount}</span>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {order.items.map((item, index) => (
                            <div key={`${order._id}-${index}`} className="flex justify-between gap-2 text-sm">
                              <span className="font-semibold text-slate-100">{item.name}</span>
                              <span className="rounded bg-emerald-400/15 px-2 py-0.5 font-black text-emerald-200">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {order.specialInstructions && (
                          <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 p-2 text-xs font-semibold text-amber-100">{order.specialInstructions}</p>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <select
                            value={order.priority || 'Normal'}
                            onChange={(event) => updatePriority(order._id, event.target.value)}
                            className="h-9 flex-1 rounded-md border border-white/10 bg-[#11151b] px-2 text-xs font-bold text-white"
                          >
                            <option>Normal</option>
                            <option>High</option>
                            <option>Rush</option>
                          </select>
                          {column.next && (
                            <button onClick={() => updateStatus(order._id, column.next)} className="h-9 rounded-md bg-emerald-500 px-3 text-xs font-black text-slate-950">
                              {column.next === 'Completed' ? 'Close' : column.next}
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-100">{value}</p>
    </div>
  );
}
