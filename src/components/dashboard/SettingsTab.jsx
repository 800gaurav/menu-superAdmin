import React from 'react';

export default function SettingsTab({
  restaurant,
  setRestaurant,
  handleSaveBranding,
  handleSaveCustomerDataSettings,
  handleSaveActionButtons,
  setCustomerField,
  handleUploadLogo
}) {
  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl text-xs text-left">
      <header>
        <h1 className="text-xl font-bold text-slate-800 font-sans">White-Label Branding Setup</h1>
        <p className="text-[10px] text-slate-400 mt-1">Apply your visual styles, pick color accents, adjust socials, and preview changes instantly.</p>
      </header>

      {/* Customer Data Collection Settings */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Customer Data Collection</h2>
            <p className="text-slate-400 text-[10px] mt-0.5">Choose fields shown before checkout. Super Admin must enable this feature first.</p>
          </div>
          <label className="flex items-center gap-2 font-bold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
              checked={!!restaurant?.customerDataSettings?.enabled}
              onChange={(e) => setRestaurant({
                ...restaurant,
                customerDataSettings: { ...(restaurant.customerDataSettings || {}), enabled: e.target.checked }
              })}
              disabled={!restaurant?.features?.customerDataCollection}
            />
            Enabled
          </label>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {['name', 'mobile', 'email', 'dateOfBirth', 'anniversaryDate'].map((field) => (
            <div key={field} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <p className="font-bold capitalize text-slate-700">{field.replace(/([A-Z])/g, ' $1')}</p>
              <label className="mt-2.5 flex items-center gap-2 text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                  checked={!!restaurant?.customerDataSettings?.fields?.[field]?.enabled}
                  onChange={(e) => setCustomerField(field, { enabled: e.target.checked })}
                />
                Collect
              </label>
              <label className="mt-1.5 flex items-center gap-2 text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                  checked={!!restaurant?.customerDataSettings?.fields?.[field]?.required}
                  onChange={(e) => setCustomerField(field, { required: e.target.checked })}
                />
                Required
              </label>
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveCustomerDataSettings}
          className="mt-4 h-9 px-4 rounded-lg bg-[#003b1b] hover:bg-[#166534] text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
        >
          Save Customer Settings
        </button>
      </section>

      {/* Floating Action Buttons Settings */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Smart Floating Actions</h2>
            <p className="text-slate-400 text-[10px] mt-0.5">Configure customer menu quick action buttons.</p>
          </div>
          <button
            type="button"
            onClick={() => setRestaurant({
              ...restaurant,
              actionButtons: [
                ...(restaurant.actionButtons || []),
                { type: 'shareMenu', label: 'Share', icon: 'share', enabled: true, order: (restaurant.actionButtons || []).length }
              ]
            })}
            className="h-8 rounded-lg border border-slate-200 hover:bg-slate-50 px-3 font-bold text-slate-600 shadow-sm transition-colors cursor-pointer"
          >
            Add Action
          </button>
        </div>

        <div className="space-y-3">
          {(restaurant.actionButtons || []).map((action, index) => (
            <div key={`${action.type}-${index}`} className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400">Action Type</label>
                <select
                  value={action.type}
                  onChange={(e) => {
                    const next = [...(restaurant.actionButtons || [])];
                    next[index] = { ...action, type: e.target.value };
                    setRestaurant({ ...restaurant, actionButtons: next });
                  }}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"
                >
                  {['googleReview', 'instagram', 'facebook', 'whatsapp', 'call', 'website', 'shareMenu', 'addToHomeScreen', 'feedback', 'loyalty'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400">Button Label</label>
                <input
                  value={action.label || ''}
                  onChange={(e) => {
                    const next = [...(restaurant.actionButtons || [])];
                    next[index] = { ...action, label: e.target.value };
                    setRestaurant({ ...restaurant, actionButtons: next });
                  }}
                  placeholder="Label"
                  className="h-9 rounded-md border border-slate-200 px-3 bg-white text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400">Target URL / Phone</label>
                <input
                  value={action.url || ''}
                  onChange={(e) => {
                    const next = [...(restaurant.actionButtons || [])];
                    next[index] = { ...action, url: e.target.value };
                    setRestaurant({ ...restaurant, actionButtons: next });
                  }}
                  placeholder="URL or tel link"
                  className="h-9 rounded-md border border-slate-200 px-3 bg-white text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400">Sorting Order</label>
                <input
                  type="number"
                  value={action.order || 0}
                  onChange={(e) => {
                    const next = [...(restaurant.actionButtons || [])];
                    next[index] = { ...action, order: Number(e.target.value) };
                    setRestaurant({ ...restaurant, actionButtons: next });
                  }}
                  className="h-9 rounded-md border border-slate-200 px-3 bg-white text-xs"
                />
              </div>

              <div className="flex items-end pb-2.5 pl-1.5">
                <label className="flex items-center gap-2 font-bold text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                    checked={!!action.enabled}
                    onChange={(e) => {
                      const next = [...(restaurant.actionButtons || [])];
                      next[index] = { ...action, enabled: e.target.checked };
                      setRestaurant({ ...restaurant, actionButtons: next });
                    }}
                  />
                  Enabled
                </label>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveActionButtons}
          className="mt-4 h-9 px-4 rounded-lg bg-[#003b1b] hover:bg-[#166534] text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
        >
          Save Action Buttons
        </button>
      </section>

      {/* Main Branding form & Simulator Grid */}
      <form onSubmit={handleSaveBranding} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm mb-2">Branding & Color Accents</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Brand Theme Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="w-10 h-10 border border-slate-200 rounded-lg p-0.5 cursor-pointer bg-white"
                  value={restaurant?.brandColor || '#003b1b'}
                  onChange={(e) => setRestaurant({ ...restaurant, brandColor: e.target.value })}
                />
                <span className="font-mono uppercase text-slate-500 font-bold">{restaurant?.brandColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Logo Artwork</label>
              <div className="flex items-center gap-3">
                <label className="bg-[#003b1b] text-white px-3.5 py-2 rounded-lg cursor-pointer font-semibold shadow-sm hover:bg-[#166534] transition-colors">
                  Change Logo
                  <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                </label>
                {restaurant?.logo && <span className="text-[10px] text-emerald-600 font-semibold">Loaded ✓</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Tagline Slogan</label>
              <input
                type="text"
                className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] bg-white text-xs"
                value={restaurant?.brandingSettings?.tagline || ''}
                onChange={(e) => setRestaurant({
                  ...restaurant,
                  brandingSettings: { ...(restaurant?.brandingSettings || {}), tagline: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">PWA Installation App Name</label>
              <input
                type="text"
                className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] bg-white text-xs"
                value={restaurant?.brandingSettings?.pwaName || ''}
                onChange={(e) => setRestaurant({
                  ...restaurant,
                  brandingSettings: { ...(restaurant?.brandingSettings || {}), pwaName: e.target.value }
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Browser Page Title</label>
              <input
                type="text"
                className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] bg-white text-xs"
                value={restaurant?.brandingSettings?.pageTitle || ''}
                onChange={(e) => setRestaurant({
                  ...restaurant,
                  brandingSettings: { ...(restaurant?.brandingSettings || {}), pageTitle: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Footer Copyright / Credits</label>
              <input
                type="text"
                className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] bg-white text-xs"
                value={restaurant?.brandingSettings?.footerText || ''}
                onChange={(e) => setRestaurant({
                  ...restaurant,
                  brandingSettings: { ...(restaurant?.brandingSettings || {}), footerText: e.target.value }
                })}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h4 className="font-bold text-slate-800 text-xs">Socials & Direct Google Reviews</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Google Direct Review Link</label>
                <input
                  type="url"
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] bg-white text-xs"
                  value={restaurant?.reviewLink || ''}
                  onChange={(e) => setRestaurant({ ...restaurant, reviewLink: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Instagram Profile</label>
                <input
                  type="url"
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] bg-white text-xs"
                  value={restaurant?.socialLinks?.instagram || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant,
                    socialLinks: { ...(restaurant?.socialLinks || {}), instagram: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Facebook Fanpage</label>
                <input
                  type="url"
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] bg-white text-xs"
                  value={restaurant?.socialLinks?.facebook || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant,
                    socialLinks: { ...(restaurant?.socialLinks || {}), facebook: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">WhatsApp Chat API Number</label>
                <input
                  type="text"
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#003b1b] bg-white text-xs"
                  value={restaurant?.socialLinks?.whatsapp || ''}
                  onChange={(e) => setRestaurant({
                    ...restaurant,
                    socialLinks: { ...(restaurant?.socialLinks || {}), whatsapp: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-3 text-slate-500">
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                  checked={!!restaurant?.brandingSettings?.showGoogleReview}
                  onChange={(e) => setRestaurant({
                    ...restaurant,
                    brandingSettings: { ...(restaurant?.brandingSettings || {}), showGoogleReview: e.target.checked }
                  })}
                />
                Display Google Review Badge
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                  checked={!!restaurant?.brandingSettings?.showInstagram}
                  onChange={(e) => setRestaurant({
                    ...restaurant,
                    brandingSettings: { ...(restaurant?.brandingSettings || {}), showInstagram: e.target.checked }
                  })}
                />
                Display Instagram Link
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                  checked={!!restaurant?.brandingSettings?.showFacebook}
                  onChange={(e) => setRestaurant({
                    ...restaurant,
                    brandingSettings: { ...(restaurant?.brandingSettings || {}), showFacebook: e.target.checked }
                  })}
                />
                Display Facebook Link
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                  checked={!!restaurant?.brandingSettings?.showWhatsapp}
                  onChange={(e) => setRestaurant({
                    ...restaurant,
                    brandingSettings: { ...(restaurant?.brandingSettings || {}), showWhatsapp: e.target.checked }
                  })}
                />
                Display WhatsApp Button
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-10 bg-[#003b1b] hover:bg-[#166534] text-white font-bold rounded-xl cursor-pointer shadow transition-colors"
          >
            Save Branding Layout
          </button>
        </div>

        {/* Live Preview Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col items-center">
          <span className="block text-slate-700 text-xs font-bold mb-4">Mobile Live Preview</span>
          <div className="w-56 h-[400px] border-8 border-slate-800 rounded-[28px] overflow-hidden flex flex-col bg-[#F8FAFC] shadow-inner relative text-[10px]">
            {/* Header preview */}
            <div className="bg-white px-2 py-3 flex items-center justify-between border-b border-slate-100 shadow-sm pt-5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[#003b1b] text-white flex items-center justify-center overflow-hidden">
                  {restaurant?.logo ? (
                    <img src={restaurant.logo.startsWith('http') ? restaurant.logo : `http://localhost:5000${restaurant.logo}`} alt="L" className="w-full h-full object-cover" />
                  ) : (
                    'S'
                  )}
                </div>
                <span className="font-bold text-slate-800 truncate max-w-[80px]">{restaurant?.name || 'Restaurant'}</span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-xs">shopping_cart</span>
            </div>

            {/* Sticky preview variables */}
            <div className="p-3 flex-grow space-y-3">
              <div className="h-16 w-full bg-slate-200 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-1.5 text-left">
                  <span className="text-white font-bold leading-none text-[8px]">Today's Special</span>
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 flex gap-1.5">
                <div className="w-8 h-8 bg-slate-100 rounded-md"></div>
                <div className="text-left flex-grow min-w-0">
                  <span className="font-bold text-slate-800 block text-[9px] truncate">Paneer Tikka</span>
                  <span className="text-[9px] font-bold mt-0.5 block" style={{ color: restaurant?.brandColor || '#003b1b' }}>₹325</span>
                </div>
                <button
                  type="button"
                  className="w-4 h-4 rounded flex items-center justify-center text-white text-[9px]"
                  style={{ backgroundColor: restaurant?.brandColor || '#003b1b' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Bottom cart preview */}
            <div className="p-2 bg-white border-t border-slate-100">
              <div className="py-2 px-2.5 rounded-lg text-white flex justify-between items-center" style={{ backgroundColor: restaurant?.brandColor || '#003b1b' }}>
                <span className="font-bold text-[8px]">View Cart</span>
                <span className="font-bold text-[8px]">₹325</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
