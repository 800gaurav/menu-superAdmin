import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { api } from '../api';
import BillPrint from './BillPrint';

export default function CounterPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ count: 0, revenue: 0, averageValue: 0 });
  const [loading, setLoading] = useState(true);
  
  // Printing states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('restaurant_token') || localStorage.getItem('waiter_token'); // Staff tokens
    if (!token) {
      navigate(`/admin/login`);
      return;
    }

    fetchCounterData();
    connectSocket();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [slug]);

  const fetchCounterData = async () => {
    try {
      setLoading(true);
      const [orderList, stats] = await Promise.all([
        api.counter.getOrders(),
        api.counter.getSalesSummary()
      ]);
      setOrders(orderList);
      setSummary(stats);
    } catch (err) {
      console.error(err);
      if (err.status === 401 || err.status === 403) {
        navigate(`/admin/login`);
      }
    } finally {
      setLoading(false);
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
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 chime
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.error(e);
    }
  };

  const connectSocket = () => {
    const restId = localStorage.getItem('restaurant_id');
    if (!restId) return;

    socketRef.current = io('http://localhost:5000');
    
    // Join standard room
    socketRef.current.emit('joinRestaurant', restId);

    // Live events
    socketRef.current.on('orderCreated', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev].sort((a, b) => b.billRequested - a.billRequested || b.createdAt - a.createdAt));
      playNotificationSound();
    });

    socketRef.current.on('orderUpdated', (updatedOrder) => {
      if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Cancelled') {
        setOrders((prev) => prev.filter(o => o._id !== updatedOrder._id));
      } else {
        setOrders((prev) => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o).sort((a, b) => b.billRequested - a.billRequested || b.createdAt - a.createdAt));
      }
      refreshSummary();
    });
  };

  const refreshSummary = async () => {
    try {
      const stats = await api.counter.getSalesSummary();
      setSummary(stats);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettleOrder = async (orderId) => {
    if (!window.confirm('Settle billing for this order and mark as Completed?')) return;
    try {
      await api.counter.completeOrder(orderId);
      setOrders((prev) => prev.filter(o => o._id !== orderId));
      refreshSummary();
    } catch (err) {
      alert('Failed to settle order');
    }
  };

  const handleOpenPrint = (order) => {
    setSelectedOrder(order);
    setIsPrintModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('restaurant_token');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
          </div>
          <div>
            <h1 className="font-extrabold text-base text-slate-900">Counter Billing Dashboard</h1>
            <p className="text-xs text-slate-400 font-semibold tracking-wide capitalize">{slug?.replace('-', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchCounterData}
            className="w-10 h-10 border border-slate-200 hover:bg-slate-50 flex items-center justify-center rounded-xl bg-white text-slate-500 cursor-pointer shadow-sm"
            title="Refresh Grid"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
          <button 
            onClick={handleLogout}
            className="h-10 border border-slate-200 hover:bg-slate-50 px-4 rounded-xl bg-white text-xs font-bold text-red-500 cursor-pointer shadow-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6 text-left">
        {/* Sales Stats overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Settled Today</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{summary.count} orders</h3>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Daily Net Revenue</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">₹{summary.revenue.toLocaleString()}</h3>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Average Ticket Value</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1 font-sans">₹{summary.averageValue}</h3>
            </div>
            <div className="p-3.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl">
              <span className="material-symbols-outlined text-2xl">analytics</span>
            </div>
          </div>
        </div>

        {/* Live Orders Billing Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div>
              <h2 className="font-extrabold text-sm text-slate-800">Billing Settlement Queue</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Verify guest balances and settle checks in real time.</p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-600 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
              {orders.length} Active Checks
            </span>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-950 mx-auto"></div>
              <p className="text-slate-400 text-xs mt-3 font-semibold">Updating billing data...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center rounded-2xl mx-auto mb-3">
                <span className="material-symbols-outlined text-2xl">point_of_sale</span>
              </div>
              <h3 className="font-bold text-slate-700 text-xs">No active orders needing billing.</h3>
              <p className="text-slate-400 text-[10px] mt-1">Diners' check requests will automatically flash here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4 pl-6">Table / Room</th>
                    <th className="p-4">Order Details</th>
                    <th className="p-4">Placed By</th>
                    <th className="p-4">Bill Status</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orders.map((ord) => (
                    <tr 
                      key={ord._id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        ord.billRequested ? 'bg-amber-50/50 hover:bg-amber-50/70 border-l-4 border-l-amber-500' : ''
                      }`}
                    >
                      <td className="p-4 pl-6">
                        <span className="font-extrabold text-sm text-slate-800 block">{ord.tableName}</span>
                        <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">{ord.orderNumber}</span>
                      </td>
                      <td className="p-4 min-w-[200px]">
                        <div className="space-y-1 max-h-16 overflow-y-auto pr-2">
                          {ord.items.map((it, i) => (
                            <div key={i} className="text-slate-600 flex justify-between gap-4">
                              <span>{it.name} <strong className="text-slate-400">x{it.quantity}</strong></span>
                              <span className="text-slate-500">₹{it.price * it.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          ord.placedBy === 'waiter' 
                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {ord.placedBy || 'customer'}
                        </span>
                      </td>
                      <td className="p-4">
                        {ord.billRequested ? (
                          <span className="flex items-center gap-1.5 text-amber-600 font-black animate-pulse uppercase tracking-wider text-[10px]">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            Bill Requested!
                          </span>
                        ) : (
                          <span className="text-slate-400">Dining In</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-extrabold text-sm text-slate-900">₹{ord.totalAmount}</span>
                        {ord.subtotal && (
                          <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                            Subtotal: ₹{ord.subtotal}
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right space-x-2">
                        <button
                          onClick={() => handleOpenPrint(ord)}
                          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl bg-white shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">print</span>
                          Print Bill
                        </button>
                        <button
                          onClick={() => handleSettleOrder(ord._id)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          Settle check
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Bill Printing Overlay Modal */}
      {isPrintModalOpen && selectedOrder && (
        <BillPrint 
          order={selectedOrder} 
          onClose={() => setIsPrintModalOpen(false)} 
        />
      )}
    </div>
  );
}
