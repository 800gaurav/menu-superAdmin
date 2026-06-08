import React from 'react';

export default function OverviewTab({ stats, restaurant }) {
  return (
    <div className="space-y-6 animate-fadeIn text-xs">
      <header>
        <h1 className="text-xl font-bold text-slate-800">Operational Analytics</h1>
        <p className="text-[10px] text-slate-400 mt-1">Live performance indicator metrics for your business today.</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-left">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Completed</span>
          </div>
          <span className="text-xs text-slate-400 font-semibold block">Today's Net Revenue</span>
          <p className="text-lg font-bold text-slate-800 mt-1">₹{stats.todayRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-left">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-[#003b1b]/10 text-[#003b1b] rounded-lg">
              <span className="material-symbols-outlined text-[18px]">shopping_basket</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Count</span>
          </div>
          <span className="text-xs text-slate-400 font-semibold block">Today's Orders Count</span>
          <p className="text-lg font-bold text-slate-800 mt-1">{stats.todayOrdersCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-left">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-600">Pending / Active</span>
          </div>
          <span className="text-xs text-slate-400 font-semibold block">Active Orders in Kitchen</span>
          <p className="text-lg font-bold text-slate-800 mt-1">{stats.activeOrdersCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-left">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">QRs Enabled</span>
          </div>
          <span className="text-xs text-slate-400 font-semibold block">Total Table / Rooms</span>
          <p className="text-lg font-bold text-slate-800 mt-1">{stats.totalTables}</p>
        </div>
      </div>

      {/* Main section */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 max-w-4xl text-left">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-between sm:items-center mb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border border-slate-100 p-4 bg-slate-50/50 rounded-xl">
          <div className="space-y-2">
            <span className="block text-slate-400 font-semibold">White-Label Branding Config</span>
            <p className="text-slate-600"><strong className="text-slate-800">Slug:</strong> /menu/{restaurant?.slug}</p>
            <p className="text-slate-600">
              <strong className="text-slate-800">Brand Theme Color: </strong> 
              <span className="inline-block w-3 h-3 rounded border border-white align-middle" style={{ backgroundColor: restaurant?.brandColor }}></span> {restaurant?.brandColor}
            </p>
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
  );
}
