import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { api } from '../api';

const waiterDict = {
  en: {
    terminal: "Waiter Terminal",
    logout: "Logout",
    seating: "Seating Tables",
    pager: "Service Pager Callouts",
    floorDetails: "Updating floor details...",
    tablesLayout: "Tables Layout",
    selectOrder: "Select to order",
    clickOrder: "Click to place order",
    runningTotal: "Running Total:",
    pagingLogs: "Paging logs",
    noPager: "No active service pager requests.",
    pagerAlert: "Pager Alert",
    called: "Called",
    attend: "Attend",
    occupied: "Occupied",
    free: "Free"
  },
  hi: {
    terminal: "वेटर टर्मिनल",
    logout: "लॉगआउट",
    seating: "सीटिंग टेबल्स",
    pager: "सेवा पेजर कॉलआउट्स",
    floorDetails: "फ्लोर विवरण अपडेट किया जा रहा है...",
    tablesLayout: "टेबल्स लेआउट",
    selectOrder: "ऑर्डर करने के लिए चुनें",
    clickOrder: "ऑर्डर देने के लिए क्लिक करें",
    runningTotal: "सक्रिय कुल राशि:",
    pagingLogs: "पेजिंग लॉग्स",
    noPager: "कोई सक्रिय सेवा पेजर अनुरोध नहीं हैं।",
    pagerAlert: "पेजर अलर्ट",
    called: "कॉल समय",
    attend: "स्वीकार करें",
    occupied: "व्यस्त",
    free: "खाली"
  }
};

export default function WaiterDashboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'calls'
  const [lang, setLang] = useState(localStorage.getItem('waiter_lang') || 'en');
  const t = waiterDict[lang] || waiterDict.en;
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('waiter_token');
    if (!token) {
      navigate(`/waiter/${slug}/login`);
      return;
    }

    fetchDashboardData();
    connectSocket();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [slug]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [tableList, callList] = await Promise.all([
        api.waiter.getTables(),
        api.waiter.getCalls()
      ]);
      setTables(tableList);
      setCalls(callList);
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

  const playChimeSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(830.61, audioCtx.currentTime); // Ab5
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
        gain2.gain.setValueAtTime(0.4, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.35);
      }, 180);
    } catch (e) {
      console.error(e);
    }
  };

  const connectSocket = () => {
    const restId = localStorage.getItem('restaurant_id');
    if (!restId) return;

    socketRef.current = io('http://localhost:5000');
    
    // Join both standard room and kitchen room (waiter calls are sent to kitchen/restaurant rooms)
    socketRef.current.emit('joinRestaurant', restId);
    socketRef.current.emit('joinKitchen', restId);

    // Waiter called listener
    socketRef.current.on('waiterCalled', (newCall) => {
      setCalls((prev) => [newCall, ...prev]);
      playChimeSound();
    });

    // Waiter call attended by someone else
    socketRef.current.on('waiterCallAttended', (attendedCall) => {
      setCalls((prev) => prev.filter(c => c._id !== attendedCall._id));
    });

    // Orders status changes
    socketRef.current.on('orderCreated', () => {
      fetchDashboardData();
    });
    
    socketRef.current.on('orderUpdated', () => {
      fetchDashboardData();
    });
  };

  const handleAttendCall = async (callId) => {
    try {
      await api.waiter.attendCall(callId);
      setCalls((prev) => prev.filter(c => c._id !== callId));
    } catch (err) {
      alert('Failed to resolve call notification');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('waiter_token');
    navigate(`/waiter/${slug}/login`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col pb-20">
      {/* Top Header */}
      <header className="bg-slate-900 text-white px-4 py-4 shadow flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-black">W</div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight">{t.terminal}</h1>
            <p className="text-[10px] text-slate-400 capitalize">{slug?.replace('-', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const nextLang = lang === 'en' ? 'hi' : 'en';
              setLang(nextLang);
              localStorage.setItem('waiter_lang', nextLang);
            }}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-extrabold rounded-lg text-[10px] cursor-pointer transition-all uppercase"
          >
            {lang === 'en' ? 'हिन्दी' : 'EN'}
          </button>
          <button 
            onClick={handleLogout}
            className="text-xs font-bold text-red-400 hover:text-red-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
          >
            {t.logout}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-[56px] z-10 flex">
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'tables' 
              ? 'border-amber-500 text-amber-600 font-extrabold' 
              : 'border-transparent text-slate-500'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
          {t.seating} ({tables.length})
        </button>
        <button
          onClick={() => setActiveTab('calls')}
          className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTab === 'calls' 
              ? 'border-amber-500 text-amber-600 font-extrabold' 
              : 'border-transparent text-slate-500'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">notifications_active</span>
          {t.pager}
          {calls.length > 0 && (
            <span className="absolute top-2 right-4 bg-red-500 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold animate-pulse">
              {calls.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full text-left">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
            <p className="text-slate-400 text-xs mt-3 font-semibold">{t.floorDetails}</p>
          </div>
        ) : (
          <>
            {activeTab === 'tables' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span>{t.tablesLayout}</span>
                  <span>{t.selectOrder}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {tables.map(table => (
                    <div
                      key={table._id}
                      onClick={() => navigate(`/waiter/${slug}/menu?tableId=${table._id}&tableName=${encodeURIComponent(table.name)}`)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-32 active:scale-95 ${
                        table.status === 'Occupied'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-[0_4px_12px_rgba(245,158,11,0.2)]'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-base tracking-tight">{table.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          table.status === 'Occupied'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {table.status === 'Occupied' ? t.occupied : t.free}
                        </span>
                      </div>
                      
                      <div className="text-left">
                        {table.status === 'Occupied' ? (
                          <>
                            <span className="text-[10px] opacity-80 block font-medium">{t.runningTotal}</span>
                            <span className="text-sm font-black">₹{table.activeOrderAmount}</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold block">{t.clickOrder}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'calls' && (
              <div className="space-y-4">
                <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider">{t.pagingLogs}</span>
                {calls.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                    <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">notifications_off</span>
                    <p className="text-slate-400 text-xs font-semibold">{t.noPager}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {calls.map(call => (
                      <div key={call._id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between animate-fadeIn">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl">notifications_active</span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-800">{call.tableLabel} {t.pagerAlert}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              {t.called} {new Date(call.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAttendCall(call._id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                        >
                          {t.attend}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
