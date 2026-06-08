import React from 'react';

export default function OrderInvoiceModal({
  isOpen,
  onClose,
  selectedOrder,
  onUpdatePaymentStatus
}) {
  if (!isOpen || !selectedOrder) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 text-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-6 relative text-left">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Order Invoice Detail</h2>
        <p className="text-slate-400 text-xs mb-4">Reference: {selectedOrder.orderNumber}</p>

        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3 text-xs mb-6">
          <div className="flex justify-between font-bold text-slate-800">
            <span>Diner Node:</span>
            <span>{selectedOrder.tableName}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Created time:</span>
            <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Status:</span>
            <span className="font-bold uppercase text-[#003b1b]">{selectedOrder.status}</span>
          </div>
          <div className="flex justify-between text-slate-500 items-center">
            <span>Payment:</span>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                selectedOrder.paymentStatus === 'Paid'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-500 border border-red-200'
              }`}>
                {selectedOrder.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
              </span>
              <button
                onClick={() => onUpdatePaymentStatus(selectedOrder._id, selectedOrder.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded text-[10px] cursor-pointer transition-all"
              >
                Mark {selectedOrder.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-3 space-y-2">
            <span className="font-bold text-slate-800 block mb-1">Itemized Summary</span>
            {selectedOrder.items.map((it, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{it.name} (x{it.quantity})</span>
                <span>₹{it.price * it.quantity}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200/60 pt-3 flex justify-between font-bold text-sm text-[#003b1b]">
            <span>Total Bill Amount:</span>
            <span>₹{selectedOrder.totalAmount}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full h-11 bg-[#003b1b] hover:bg-[#166534] text-white font-bold text-sm rounded-xl cursor-pointer"
        >
          Done & Close
        </button>
      </div>
    </div>
  );
}
