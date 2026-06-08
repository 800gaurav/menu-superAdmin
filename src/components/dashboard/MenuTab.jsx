import React from 'react';

export default function MenuTab({
  categories,
  menuItems,
  tabLoading,
  setIsBulkModalOpen,
  setIsCategoryModalOpen,
  setIsItemModalOpen,
  setCatFormData,
  setItemFormData,
  handleToggleStock,
  handleDuplicateItem,
  handleDeleteItem,
  handleDeleteCategory
}) {
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
              <h1 className="text-xl font-bold text-slate-800">Menu & Categories</h1>
              <p className="text-xs text-slate-400 mt-1">Setup categories, add new items, duplicate existing meals, or trigger bulk price modifiers.</p>
            </div>
            <div className="grid grid-cols-1 sm:flex gap-2">
              <button 
                onClick={() => setIsBulkModalOpen(true)}
                className="bg-amber-50 hover:bg-amber-100 text-[#fda417] border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Bulk Price Editor
              </button>
              <button 
                onClick={() => {
                  setCatFormData({ name: '', icon: '🍛', isHidden: false, id: null });
                  setIsCategoryModalOpen(true);
                }}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Add Category
              </button>
              <button 
                onClick={() => {
                  setItemFormData({ name: '', description: '', price: '', categoryId: '', tags: ['Veg'], badges: [], image: '', id: null, hasVariants: false, variants: [] });
                  setIsItemModalOpen(true);
                }}
                className="bg-[#003b1b] hover:bg-[#166534] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
              >
                Add Menu Item
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category sidebar column */}
            <div className="space-y-3">
              <span className="block text-slate-700 text-xs font-bold mb-2">Food Categories</span>
              <div className="space-y-2">
                {categories.map(c => (
                  <div key={c._id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center text-left">
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className="text-lg">{c.icon || '🍛'}</span>
                      <span className={`font-semibold ${c.isHidden ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setCatFormData({ name: c.name, icon: c.icon || '🍔', isHidden: c.isHidden, id: c._id });
                          setIsCategoryModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(c._id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items column */}
            <div className="md:col-span-2 space-y-3">
              <span className="block text-slate-700 text-xs font-bold mb-2">Food Items List</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menuItems.map(item => {
                  const cat = categories.find(c => String(c._id) === String(item.categoryId));
                  return (
                    <div key={item._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group text-left">
                      {/* Tags layer */}
                      <div className="absolute top-2 left-2 flex gap-1 z-10">
                        {item.tags.map(t => (
                          <span key={t} className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            t === 'Veg' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'
                          }`}>
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Badge */}
                      {item.badges.length > 0 && (
                        <div className="absolute top-2 right-0 bg-[#fda417] text-white text-[8px] font-bold px-2 py-0.5 rounded-l-full z-10 shadow-sm">
                          {item.badges[0].toUpperCase()}
                        </div>
                      )}

                      {/* Image area */}
                      <div className="h-32 bg-slate-50 overflow-hidden relative">
                        {item.image ? (
                          <img 
                            src={item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`} 
                            alt={item.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <span className="material-symbols-outlined text-3xl">fastfood</span>
                          </div>
                        )}
                        {/* Stock banner */}
                        {!item.inStock && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-xs font-bold uppercase tracking-wider">Out of Stock</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3.5 flex-grow text-xs text-left">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                          <span className="font-bold text-[#003b1b] text-sm">
                            {item.hasVariants && item.variants && item.variants.length > 0
                              ? `₹${Math.min(...item.variants.map(v => v.price))}+`
                              : `₹${item.price}`}
                          </span>
                        </div>
                        <p className="text-slate-400 mt-0.5 truncate">{cat ? cat.name : 'Unknown Category'}</p>
                        <p className="text-slate-500 mt-2 line-clamp-2 leading-relaxed h-8">{item.description || 'No description provided.'}</p>
                      </div>

                      {/* Action row */}
                      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-600">
                          <input 
                            type="checkbox"
                            className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                            checked={item.inStock}
                            onChange={() => handleToggleStock(item._id)}
                          />
                          In Stock
                        </label>
                        <div className="flex gap-2 text-slate-400">
                          <button onClick={() => handleDuplicateItem(item._id)} className="hover:text-[#003b1b] cursor-pointer" title="Duplicate"><span className="material-symbols-outlined text-[18px]">content_copy</span></button>
                          <button 
                            onClick={() => {
                              setItemFormData({
                                name: item.name,
                                description: item.description,
                                price: (item.price || '').toString(),
                                categoryId: item.categoryId,
                                tags: item.tags,
                                badges: item.badges,
                                image: item.image,
                                id: item._id,
                                hasVariants: item.hasVariants || false,
                                variants: item.variants || []
                              });
                              setIsItemModalOpen(true);
                            }}
                            className="hover:text-[#003b1b] cursor-pointer"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDeleteItem(item._id)} className="hover:text-red-500 cursor-pointer" title="Delete"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
