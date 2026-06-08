import React from 'react';

export default function CrmTab({
  customers,
  advancedAnalytics,
  tabLoading,
  api
}) {
  return (
    <div className="space-y-6 animate-fadeIn text-xs text-left">
      {tabLoading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div>
        </div>
      ) : (
        <>
          <header className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-800 font-sans">Customer CRM</h1>
              <p className="text-[10px] text-slate-400 mt-1">Customer profiles, visits, birthdays, anniversaries, retention, and export-ready history.</p>
            </div>
            <a
              href={api.crm.exportCsvUrl()}
              className="bg-[#003b1b] hover:bg-[#166534] text-white px-3.5 py-2 rounded-xl text-[10px] font-bold shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export CSV
            </a>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Customers</span>
              <p className="text-lg font-black text-slate-800 mt-1">{customers.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Returning</span>
              <p className="text-lg font-black text-slate-800 mt-1">{advancedAnalytics?.customerRetention?.returning || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Birthdays Tracked</span>
              <p className="text-lg font-black text-slate-800 mt-1">{customers.filter(c => c.dateOfBirth).length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Anniversaries</span>
              <p className="text-lg font-black text-slate-800 mt-1">{customers.filter(c => c.anniversaryDate).length}</p>
            </div>
          </div>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 pl-4">Customer</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Visits</th>
                    <th className="p-3">Spend</th>
                    <th className="p-3 pr-4">Last Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">
                        No customer profiles recorded yet.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 pl-4 font-bold text-slate-800">{c.name || 'Guest'}</td>
                        <td className="p-3 text-slate-500">{c.mobile || c.email || 'N/A'}</td>
                        <td className="p-3 text-slate-800">{c.visitCount || 0}</td>
                        <td className="p-3 text-slate-800 font-semibold">₹{c.totalSpend || 0}</td>
                        <td className="p-3 text-slate-400 pr-4">
                          {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
