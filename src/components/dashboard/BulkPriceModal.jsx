import React from 'react';

export default function BulkPriceModal({
  isOpen,
  onClose,
  bulkPriceData,
  setBulkPriceData,
  handleBulkPrice
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 text-xs">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden p-6 relative text-left">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Bulk Pricing Modifier</h2>
        <p className="text-slate-400 text-[10px] mb-4">Modify prices of all menu items instantly at once.</p>

        <form onSubmit={handleBulkPrice} className="space-y-4 text-xs text-left">
          <div>
            <label className="block text-slate-600 font-bold mb-1">Modifier Action</label>
            <select
              className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b] text-xs"
              value={bulkPriceData.type}
              onChange={(e) => setBulkPriceData({ ...bulkPriceData, type: e.target.value })}
            >
              <option value="percentage">Add/Subtract by Percentage (%)</option>
              <option value="fixed_add">Add/Subtract by Flat Value (₹)</option>
              <option value="fixed_set">Set All Items to a Single Price (₹)</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-bold mb-1">Value (Use negative sign to decrease)</label>
            <input
              type="number"
              className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] text-xs bg-white"
              placeholder="e.g. 10 or -5"
              value={bulkPriceData.value}
              onChange={(e) => setBulkPriceData({ ...bulkPriceData, value: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl mt-4 cursor-pointer transition-colors"
          >
            Apply Modifiers Now
          </button>
        </form>
      </div>
    </div>
  );
}
