import React from 'react';

const dict = {
  en: {
    desk: "Counter Billing Desk",
    desc: "Verify diner balances, manage active checks, and print thermal receipts.",
    refresh: "Refresh Desk",
    settled: "Settled Today",
    orders: "orders",
    revenue: "Daily Net Revenue",
    average: "Average Ticket Value",
    search: "Search table or order #...",
    filter: "Filter Table:",
    allTables: "All Tables/Rooms",
    activeCheck: "Active Check Settlements",
    activeDesc: "Click \"Settle\" to complete the billing flow and clear table occupancy.",
    activeTables: "Active Tables",
    noActive: "No active orders requiring billing.",
    noActiveDesc: "Active customer checkout requests will show up here automatically.",
    tableCol: "Table / Room",
    itemsCol: "Item Details",
    sourceCol: "Source",
    statusCol: "Billing Status",
    paymentCol: "Payment",
    dueCol: "Balance Due",
    actionCol: "Actions",
    print: "Print",
    settle: "Settle",
    history: "Billing Order History Log",
    historyDesc: "Search and audit completed or in-progress invoices.",
    allLog: "All Log",
    new: "New",
    inKitchen: "In Kitchen",
    readyServed: "Ready/Served",
    completed: "Settled",
    cancelled: "Cancelled",
    today: "Today's",
    older: "Older",
    dateTimeCol: "Date & Time",
    itemsSumCol: "Items Summary",
    receiptCol: "Receipt",
    noHistory: "No matching history orders found in this log category.",
    unpaid: "Unpaid",
    paid: "Paid"
  },
  hi: {
    desk: "काउंटर बिलिंग डेस्क",
    desc: "ग्राहकों के बिल की जांच करें, सक्रिय आर्डर्स का प्रबंधन करें, और थर्मल रसीदें प्रिंट करें।",
    refresh: "डेस्क रीफ्रेश करें",
    settled: "आज निपटाए गए",
    orders: "ऑर्डर",
    revenue: "दैनिक शुद्ध राजस्व",
    average: "औसत टिकट मूल्य",
    search: "टेबल या ऑर्डर नंबर खोजें...",
    filter: "टेबल फ़िल्टर:",
    allTables: "सभी टेबल/कमरे",
    activeCheck: "सक्रिय चेक निपटान",
    activeDesc: "बिलिंग प्रक्रिया पूरी करने और टेबल खाली करने के लिए \"निपटाएं\" पर क्लिक करें।",
    activeTables: "सक्रिय टेबल्स",
    noActive: "बिलिंग के लिए कोई सक्रिय ऑर्डर नहीं है।",
    noActiveDesc: "सक्रिय ग्राहकों के चेकआउट अनुरोध यहां स्वचालित रूप से दिखाई देंगे।",
    tableCol: "टेबल / कमरा",
    itemsCol: "आइटम विवरण",
    sourceCol: "स्रोत",
    statusCol: "बिलिंग स्थिति",
    paymentCol: "भुगतान",
    dueCol: "बकाया राशि",
    actionCol: "कार्रवाई",
    print: "प्रिंट",
    settle: "निपटाएं",
    history: "बिलिंग ऑर्डर इतिहास लॉग",
    historyDesc: "पूरे हो चुके या चल रहे इनवॉइस खोजें और जांचें।",
    allLog: "सभी लॉग",
    new: "नया",
    inKitchen: "रसोई में",
    readyServed: "तैयार/परोसा गया",
    completed: "निपटाया गया",
    cancelled: "रद्द",
    today: "आज का",
    older: "पुराना",
    dateTimeCol: "दिनांक और समय",
    itemsSumCol: "आइटम सारांश",
    receiptCol: "रसीद",
    noHistory: "इस श्रेणी में कोई मिलान ऑर्डर इतिहास नहीं मिला।",
    unpaid: "बकाया",
    paid: "भुगतान किया"
  }
};

export default function BillingTab({
  billingOrders,
  historyOrders,
  billingSummary,
  tables,
  orderSearch,
  setOrderSearch,
  billingTableFilter,
  setBillingTableFilter,
  historyTab,
  setHistoryTab,
  handleOpenPrintBilling,
  handleSettleBillingOrder,
  fetchTabData,
  tabLoading,
  lang = 'en'
}) {
  const t = dict[lang] || dict.en;

  const filteredActiveOrders = billingOrders.filter(o => {
    const matchesSearch = o.tableName.toLowerCase().includes(orderSearch.toLowerCase()) || (o.orderNumber && o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()));
    const matchesTable = billingTableFilter ? o.tableName === billingTableFilter : true;
    return matchesSearch && matchesTable;
  });

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
              <h1 className="text-xl font-bold text-slate-800 font-sans">{t.desk}</h1>
              <p className="text-xs text-slate-400 mt-1">{t.desc}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchTabData('billing')}
                className="bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                {t.refresh}
              </button>
            </div>
          </header>

          {/* Sales Stats overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t.settled}</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{billingSummary.count} {t.orders}</h3>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <span className="material-symbols-outlined text-xl">check_circle</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t.revenue}</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">₹{billingSummary.revenue.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <span className="material-symbols-outlined text-xl">payments</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t.average}</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">₹{billingSummary.averageValue}</h3>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <span className="material-symbols-outlined text-xl">analytics</span>
              </div>
            </div>
          </div>

          {/* Controls/Filters row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 w-full sm:w-64">
              <span className="material-symbols-outlined text-slate-400 text-[18px] mr-2">search</span>
              <input
                type="text"
                className="bg-transparent border-none outline-none focus:ring-0 w-full text-xs"
                placeholder={t.search}
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
            
            {/* Table wise Filter dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold shrink-0">{t.filter}</span>
              <select
                className="h-8 px-2 border border-slate-200 rounded-md bg-white outline-none focus:ring-1 focus:ring-[#003b1b]"
                value={billingTableFilter}
                onChange={(e) => setBillingTableFilter(e.target.value)}
              >
                <option value="">{t.allTables}</option>
                {tables.map(tOption => (
                  <option key={tOption._id} value={tOption.name}>{tOption.name} ({tOption.type})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Settlement Queue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="font-extrabold text-sm text-slate-800">{t.activeCheck}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{t.activeDesc}</p>
              </div>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                {filteredActiveOrders.length} {t.activeTables}
              </span>
            </div>

            {filteredActiveOrders.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="w-10 h-10 bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center rounded-xl mx-auto mb-3">
                  <span className="material-symbols-outlined text-xl">payments</span>
                </div>
                <h3 className="font-bold text-slate-700 text-xs">{t.noActive}</h3>
                <p className="text-slate-400 text-[10px] mt-1">{t.noActiveDesc}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 pl-4">{t.tableCol}</th>
                      <th className="p-3">{t.itemsCol}</th>
                      <th className="p-3">{t.sourceCol}</th>
                      <th className="p-3">{t.statusCol}</th>
                      <th className="p-3">{t.paymentCol}</th>
                      <th className="p-3">{t.dueCol}</th>
                      <th className="p-3 pr-4 text-right">{t.actionCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredActiveOrders.map((ord) => (
                      <tr
                        key={ord._id}
                        className={`hover:bg-slate-50/50 transition-colors ${
                          ord.billRequested ? 'bg-amber-50/60 hover:bg-amber-100/40 border-l-4 border-l-amber-500' : ''
                        }`}
                      >
                        <td className="p-3 pl-4">
                          <span className="font-extrabold text-slate-800 block text-sm">{ord.tableName}</span>
                          <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">{ord.orderNumber}</span>
                        </td>
                        <td className="p-3 min-w-[220px]">
                          <div className="space-y-1 max-h-16 overflow-y-auto pr-2 font-mono">
                            {ord.items.map((it, i) => (
                              <div key={i} className="text-slate-600 flex justify-between gap-4 text-[11px]">
                                <span>
                                  {it.name} {it.variantName ? <strong className="text-emerald-600">({it.variantName})</strong> : null} <strong className="text-slate-400">x{it.quantity}</strong>
                                </span>
                                <span className="text-slate-500 font-bold">₹{it.price * it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.25 rounded text-[8px] font-black uppercase tracking-wider ${
                            ord.placedBy === 'waiter'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {ord.placedBy || 'customer'}
                          </span>
                        </td>
                        <td className="p-3">
                          {ord.billRequested ? (
                            <span className="flex items-center gap-1.5 text-amber-600 font-black animate-pulse uppercase tracking-wider text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Bill Requested!
                            </span>
                          ) : (
                            <span className="text-slate-400 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              {ord.status}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            ord.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-500 border border-red-200'
                          }`}>
                            {ord.paymentStatus === 'Paid' ? t.paid : t.unpaid}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-extrabold text-sm text-slate-900">₹{ord.totalAmount}</span>
                          <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                            GST Included
                          </span>
                        </td>
                        <td className="p-3 pr-4 text-right space-x-2 shrink-0">
                          <button
                            onClick={() => handleOpenPrintBilling(ord)}
                            className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg bg-white shadow-sm inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">print</span>
                            {t.print}
                          </button>
                          <button
                            onClick={() => handleSettleBillingOrder(ord._id)}
                            className="px-2.5 py-1 bg-[#003b1b] hover:bg-[#166534] text-white font-bold rounded-lg shadow inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            {t.settle}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Order History Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/30 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-extrabold text-sm text-slate-800">{t.history}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{t.historyDesc}</p>
              </div>
              {/* History categories filters */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-[9px] font-bold self-start">
                {[
                  { id: 'all', label: t.allLog },
                  { id: 'new', label: t.new },
                  { id: 'processing', label: t.inKitchen },
                  { id: 'ready', label: t.readyServed },
                  { id: 'completed', label: t.completed },
                  { id: 'cancelled', label: t.cancelled },
                  { id: 'today', label: t.today },
                  { id: 'old', label: t.older }
                ].map(subTab => (
                  <button
                    key={subTab.id}
                    onClick={() => setHistoryTab(subTab.id)}
                    className={`px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      historyTab === subTab.id
                        ? 'bg-[#003b1b] text-white'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {subTab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter history items */}
            {(() => {
              const filteredHistory = historyOrders.filter(o => {
                const matchesSearch = o.tableName.toLowerCase().includes(orderSearch.toLowerCase()) || (o.orderNumber && o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()));
                const matchesTable = billingTableFilter ? o.tableName === billingTableFilter : true;
                
                let matchesTab = true;
                if (historyTab === 'new') {
                  matchesTab = o.status === 'New';
                } else if (historyTab === 'processing') {
                  matchesTab = o.status === 'Accepted' || o.status === 'Preparing';
                } else if (historyTab === 'ready') {
                  matchesTab = o.status === 'Ready' || o.status === 'Served';
                } else if (historyTab === 'completed') {
                  matchesTab = o.status === 'Completed';
                } else if (historyTab === 'cancelled') {
                  matchesTab = o.status === 'Cancelled';
                } else if (historyTab === 'today') {
                  matchesTab = new Date(o.createdAt).toDateString() === new Date().toDateString();
                } else if (historyTab === 'old') {
                  matchesTab = new Date(o.createdAt).toDateString() !== new Date().toDateString();
                }
                
                return matchesSearch && matchesTable && matchesTab;
              });

              if (filteredHistory.length === 0) {
                return (
                  <div className="text-center py-12 px-6">
                    <p className="text-slate-400 text-xs">{t.noHistory}</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <tr>
                        <th className="p-3 pl-4">{t.tableCol}</th>
                        <th className="p-3">{t.dateTimeCol}</th>
                        <th className="p-3">{t.itemsSumCol}</th>
                        <th className="p-3">{t.statusCol}</th>
                        <th className="p-3">{t.paymentCol}</th>
                        <th className="p-3">{t.dueCol}</th>
                        <th className="p-3 pr-4 text-right">{t.receiptCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredHistory.map((ord) => (
                        <tr key={ord._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 pl-4 font-bold text-slate-800">
                            <span>{ord.tableName}</span>
                            <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">{ord.orderNumber}</span>
                          </td>
                          <td className="p-3 text-slate-500 text-[10px]">
                            {new Date(ord.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="p-3 max-w-xs truncate text-[10px] text-slate-500">
                            {ord.items.map(i => `${i.name}${i.variantName ? ` (${i.variantName})` : ''} (x${i.quantity})`).join(', ')}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                              ord.status === 'New' ? 'bg-amber-100 text-amber-600' :
                              ord.status === 'Accepted' ? 'bg-blue-100 text-blue-600' :
                              ord.status === 'Preparing' ? 'bg-indigo-100 text-indigo-600' :
                              ord.status === 'Ready' ? 'bg-emerald-100 text-emerald-600' :
                              ord.status === 'Completed' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              ord.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-500 border border-red-200'
                            }`}>
                              {ord.paymentStatus === 'Paid' ? t.paid : t.unpaid}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            ₹{ord.totalAmount}
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <button
                              onClick={() => handleOpenPrintBilling(ord)}
                              className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 cursor-pointer shadow-sm ml-auto"
                              title="Print Receipt"
                            >
                              <span className="material-symbols-outlined text-[14px]">print</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
