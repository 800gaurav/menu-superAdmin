import React from 'react';

export default function OrdersTab({
  orders,
  orderSearch,
  setOrderSearch,
  orderStatusFilter,
  setOrderStatusFilter,
  handleUpdateOrderStatus,
  setSelectedOrder,
  setIsOrderModalOpen,
  tabLoading,
  api
}) {
  const getFilteredOrders = () => {
    return orders.filter(o => {
      const matchesSearch = o.tableName.toLowerCase().includes(orderSearch.toLowerCase()) || 
        (o.orderNumber && o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()));
      const matchesStatus = orderStatusFilter ? o.status === orderStatusFilter : true;
      return matchesSearch && matchesStatus;
    });
  };

  const filtered = getFilteredOrders();

  return (
    <div className="space-y-6 animate-fadeIn text-xs">
      {tabLoading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div>
        </div>
      ) : (
        <>
          <header className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Operational Order Board</h1>
              <p className="text-[10px] text-slate-400 mt-1">Incoming orders auto-sync in real time. Kitchen sound notifications enabled.</p>
            </div>
            <a 
              href={api.orders.exportCsvUrl()} 
              download
              className="flex items-center gap-1.5 bg-[#003b1b] hover:bg-[#166534] text-white px-3.5 py-2 rounded-lg text-[10px] font-bold shadow cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export CSV History
            </a>
          </header>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 w-full sm:w-64">
              <span className="material-symbols-outlined text-slate-400 text-[18px] mr-2">search</span>
              <input 
                type="text" 
                className="bg-transparent border-none outline-none focus:ring-0 w-full text-xs"
                placeholder="Search table or order number..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
            <select 
              className="h-8 px-2 border border-slate-200 rounded-md bg-white outline-none"
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Accepted">Accepted</option>
              <option value="Preparing">Preparing</option>
              <option value="Ready">Ready / Served</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Orders grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filtered.length === 0 ? (
              <div className="md:col-span-3 text-center py-12 bg-white rounded-xl border border-slate-100">
                <p className="text-slate-400 text-sm">No matching orders found.</p>
              </div>
            ) : (
              filtered.map((ord) => (
                <div 
                  key={ord._id} 
                  className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${
                    ord.status === 'New' ? 'ring-2 ring-amber-500' : ''
                  }`}
                >
                  {/* Header */}
                  <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{ord.tableName}</span>
                      <span className="text-[10px] text-slate-400 block font-semibold">{ord.orderNumber}</span>
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

                  {/* Items list */}
                  <div className="p-3 flex-grow space-y-1.5">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-start text-xs">
                        <span className="font-semibold text-slate-700">{it.name} <strong className="text-slate-400 font-medium">x{it.quantity}</strong></span>
                        <span className="font-bold text-slate-800">₹{it.price * it.quantity}</span>
                      </div>
                    ))}
                    {ord.specialInstructions && (
                      <div className="mt-2 bg-amber-50/60 p-2 rounded-lg border border-amber-100 text-[10px] text-amber-700 font-medium italic">
                        Instructions: {ord.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* Footer details */}
                  <div className="p-3 border-t border-slate-100 bg-slate-50/20 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold">Total: <strong className="text-slate-800 font-bold">₹{ord.totalAmount}</strong></span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Status buttons */}
                  <div className="p-2 border-t border-slate-100 bg-slate-50/40 grid grid-cols-2 gap-2">
                    {ord.status === 'New' && (
                      <>
                        <button 
                          onClick={() => handleUpdateOrderStatus(ord._id, 'Cancelled')}
                          className="h-8 rounded-lg border border-red-200 text-red-500 text-[11px] font-bold cursor-pointer hover:bg-red-50"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => handleUpdateOrderStatus(ord._id, 'Accepted')}
                          className="h-8 bg-[#003b1b] hover:bg-[#166534] text-white text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Accept
                        </button>
                      </>
                    )}
                    {ord.status === 'Accepted' && (
                      <button 
                        onClick={() => handleUpdateOrderStatus(ord._id, 'Preparing')}
                        className="col-span-2 h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Start Preparing
                      </button>
                    )}
                    {ord.status === 'Preparing' && (
                      <button 
                        onClick={() => handleUpdateOrderStatus(ord._id, 'Ready')}
                        className="col-span-2 h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Mark Ready
                      </button>
                    )}
                    {ord.status === 'Ready' && (
                      <button 
                        onClick={() => handleUpdateOrderStatus(ord._id, 'Completed')}
                        className="col-span-2 h-8 bg-[#003b1b] hover:bg-[#166534] text-white text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Deliver / Complete
                      </button>
                    )}
                    {(ord.status === 'Completed' || ord.status === 'Cancelled') && (
                      <button 
                        onClick={() => {
                          setSelectedOrder(ord);
                          setIsOrderModalOpen(true);
                        }}
                        className="col-span-2 h-8 rounded-lg border border-slate-200 text-slate-500 text-[11px] font-bold cursor-pointer hover:bg-slate-50"
                      >
                        View Invoice
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
