import React from 'react';

export default function CategoryModal({
  isOpen,
  onClose,
  catFormData,
  setCatFormData,
  handleSaveCategory
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
          {catFormData.id ? 'Edit Category' : 'Create Category'}
        </h2>

        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-bold mb-1">Category Name</label>
            <input
              type="text"
              className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] text-xs bg-white"
              value={catFormData.name}
              onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-slate-600 font-bold mb-1">Emoji Icon</label>
            <select
              className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b] text-xs"
              value={catFormData.icon}
              onChange={(e) => setCatFormData({ ...catFormData, icon: e.target.value })}
            >
              <option value="🥗">🥗 Salad</option>
              <option value="🍛">🍛 Curry / Rice</option>
              <option value="🥤">🥤 Beverages</option>
              <option value="🍨">🍨 Desserts</option>
              <option value="🍞">🍞 Breads</option>
              <option value="🍕">🍕 Pizza / Fast Food</option>
              <option value="🍲">🍲 Soup</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-600 pt-2">
            <input
              type="checkbox"
              className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
              checked={catFormData.isHidden}
              onChange={(e) => setCatFormData({ ...catFormData, isHidden: e.target.checked })}
            />
            Temporarily Hide Category (e.g. at dinner time)
          </label>

          <button
            type="submit"
            className="w-full h-11 bg-[#003b1b] text-white font-bold rounded-xl mt-4 cursor-pointer hover:bg-[#166534] transition-colors"
          >
            {catFormData.id ? 'Save changes' : 'Create Category'}
          </button>
        </form>
      </div>
    </div>
  );
}
