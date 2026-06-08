import React from 'react';

export default function MenuItemModal({
  isOpen,
  onClose,
  itemFormData,
  setItemFormData,
  categories,
  handleSaveItem,
  handleUploadItemImageForm
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 text-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden p-6 relative text-left">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          {itemFormData.id ? 'Edit Menu Item' : 'Add Menu Item'}
        </h2>

        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Item Name</label>
              <input
                type="text"
                className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-[#003b1b] text-xs"
                value={itemFormData.name}
                onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Price (₹)</label>
              <input
                type="number"
                className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-[#003b1b] text-xs disabled:bg-slate-50 disabled:text-slate-400"
                value={itemFormData.hasVariants ? '' : itemFormData.price}
                onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                required={!itemFormData.hasVariants}
                disabled={itemFormData.hasVariants}
                placeholder={itemFormData.hasVariants ? "Set in variants below" : ""}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="hasVariants"
              className="rounded text-[#003b1b] focus:ring-[#003b1b] w-4 h-4 cursor-pointer"
              checked={itemFormData.hasVariants || false}
              onChange={(e) => setItemFormData({ ...itemFormData, hasVariants: e.target.checked })}
            />
            <label htmlFor="hasVariants" className="text-slate-700 font-bold cursor-pointer">
              Has Multiple Sizes / Variants (e.g. Half, Full)
            </label>
          </div>

          {itemFormData.hasVariants && (
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
              <label className="block text-slate-700 font-bold">Variants / Sizes</label>
              {itemFormData.variants && itemFormData.variants.map((v, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Size name (e.g. Half)"
                    className="flex-grow h-8 px-2 border border-slate-200 bg-white rounded outline-none focus:ring-1 focus:ring-[#003b1b] text-xs"
                    value={v.name}
                    onChange={(e) => {
                      const updated = [...itemFormData.variants];
                      updated[index].name = e.target.value;
                      setItemFormData({ ...itemFormData, variants: updated });
                    }}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    className="w-24 h-8 px-2 border border-slate-200 bg-white rounded outline-none focus:ring-1 focus:ring-[#003b1b] text-xs"
                    value={v.price}
                    onChange={(e) => {
                      const updated = [...itemFormData.variants];
                      updated[index].price = e.target.value;
                      setItemFormData({ ...itemFormData, variants: updated });
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = itemFormData.variants.filter((_, i) => i !== index);
                      setItemFormData({ ...itemFormData, variants: updated });
                    }}
                    className="text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setItemFormData({
                    ...itemFormData,
                    variants: [...(itemFormData.variants || []), { name: '', price: '' }]
                  });
                }}
                className="w-full py-1.5 border border-dashed border-[#003b1b] text-[#003b1b] font-bold rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Size Variant
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Category</label>
              <select
                className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b] text-xs"
                value={itemFormData.categoryId}
                onChange={(e) => setItemFormData({ ...itemFormData, categoryId: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Tags</label>
              <select
                className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b] text-xs"
                value={itemFormData.tags[0]}
                onChange={(e) => setItemFormData({ ...itemFormData, tags: [e.target.value] })}
              >
                <option value="Veg">Veg</option>
                <option value="Non-Veg">Non-Veg</option>
                <option value="Vegan">Vegan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1">Food Description</label>
            <textarea
              rows="3"
              className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-[#003b1b] text-xs"
              value={itemFormData.description}
              onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Badges / Highlights</label>
              <select
                className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#003b1b] text-xs"
                value={itemFormData.badges[0] || ''}
                onChange={(e) => setItemFormData({ ...itemFormData, badges: e.target.value ? [e.target.value] : [] })}
              >
                <option value="">None</option>
                <option value="Best Seller">Best Seller</option>
                <option value="Chef's Special">Chef's Special</option>
                <option value="New">New</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Food Photo</label>
              <div className="flex items-center gap-2">
                <label className="bg-[#003b1b] text-white px-3 py-1.5 rounded-lg cursor-pointer font-semibold hover:bg-[#166534] transition-colors">
                  Choose Artwork
                  <input type="file" accept="image/*" onChange={handleUploadItemImageForm} className="hidden" />
                </label>
                {itemFormData.image && <span className="text-emerald-600 font-bold">Uploaded ✓</span>}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-[#003b1b] text-white font-bold rounded-xl mt-4 cursor-pointer hover:bg-[#166534] transition-colors"
          >
            {itemFormData.id ? 'Save Item' : 'Add Item'}
          </button>
        </form>
      </div>
    </div>
  );
}
