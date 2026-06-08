import React from 'react';

export default function TableModal({
  isOpen,
  onClose,
  tableFormData,
  setTableFormData,
  handleSaveTable
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
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          {tableFormData.id ? 'Edit Table/Room' : 'Create Table/Room'}
        </h2>

        <form onSubmit={handleSaveTable} className="space-y-4 text-xs text-left">
          <div>
            <label className="block text-slate-600 font-bold mb-1">Name / Identifier Number</label>
            <input
              type="text"
              className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] text-xs bg-white"
              placeholder="e.g. Table 5 or Room 102"
              value={tableFormData.name}
              onChange={(e) => setTableFormData({ ...tableFormData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-slate-600 font-bold mb-1">Identifier Type</label>
            <select
              className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b] text-xs"
              value={tableFormData.type}
              onChange={(e) => setTableFormData({ ...tableFormData, type: e.target.value })}
            >
              <option value="Table">Table</option>
              <option value="Room">Room (Hotel Use)</option>
              <option value="DirectMenu">Direct Menu</option>
              <option value="Reception">Reception</option>
              <option value="Takeaway">Takeaway</option>
              <option value="SocialMedia">Social Media</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-[#003b1b] text-white font-bold rounded-xl mt-4 cursor-pointer hover:bg-[#166534] transition-colors"
          >
            {tableFormData.id ? 'Save changes' : 'Generate QR Code'}
          </button>
        </form>
      </div>
    </div>
  );
}
