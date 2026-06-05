import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  // Wizard Data Accumulator
  const [businessProfile, setBusinessProfile] = useState({
    name: '',
    phone: '',
    address: '',
    brandColor: '#003b1b',
    googleMapsLink: '',
    reviewLink: '',
    logo: '',
    socialLinks: { instagram: '', facebook: '', whatsapp: '' }
  });

  const [tableType, setTableType] = useState('Table'); // 'Table' | 'Room' | 'Both'
  const [tablesCount, setTablesCount] = useState(4);
  const [tablesList, setTablesList] = useState([
    { name: 'Table 1' }, { name: 'Table 2' }, { name: 'Table 3' }, { name: 'Table 4' }
  ]);

  const [categoriesList, setCategoriesList] = useState([
    { name: 'Starters', icon: '🥗' },
    { name: 'Main Course', icon: '🍛' },
    { name: 'Beverages', icon: '🥤' },
    { name: 'Desserts', icon: '🍨' }
  ]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🍔');

  const [menuItems, setMenuItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    categoryIndex: 0,
    tags: ['Veg'],
    badges: [],
    image: ''
  });

  const [generatedQRs, setGeneratedQRs] = useState([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.restaurant.getProfile();
      setProfile(data);
      setBusinessProfile({
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
        brandColor: data.brandColor || '#003b1b',
        googleMapsLink: data.googleMapsLink || '',
        reviewLink: data.reviewLink || '',
        logo: data.logo || '',
        socialLinks: {
          instagram: data.socialLinks?.instagram || '',
          facebook: data.socialLinks?.facebook || '',
          whatsapp: data.socialLinks?.whatsapp || ''
        }
      });
    } catch (err) {
      console.error(err);
      navigate('/admin/login');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await api.restaurant.uploadLogo(formData);
      setBusinessProfile({ ...businessProfile, logo: res.logoUrl });
    } catch (err) {
      alert('Error uploading logo: ' + err.message);
    }
  };

  const handleItemImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.restaurant.uploadImage(formData);
      setNewItem({ ...newItem, image: res.imageUrl });
    } catch (err) {
      alert('Error uploading image: ' + err.message);
    }
  };

  // Adjust tablesCount list dynamically
  const handleTablesCountChange = (val) => {
    const count = parseInt(val) || 0;
    setTablesCount(count);
    const newList = [];
    const prefix = tableType === 'Room' ? 'Room' : 'Table';
    for (let i = 1; i <= count; i++) {
      newList.push({ name: `${prefix} ${i}` });
    }
    setTablesList(newList);
  };

  const handleTableTypeChange = (type) => {
    setTableType(type);
    const newList = [];
    const prefix = type === 'Room' ? 'Room' : 'Table';
    for (let i = 1; i <= tablesCount; i++) {
      newList.push({ name: `${prefix} ${i}` });
    }
    setTablesList(newList);
  };

  const handleUpdateTableName = (index, val) => {
    const newList = [...tablesList];
    newList[index].name = val;
    setTablesList(newList);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    setCategoriesList([...categoriesList, { name: newCatName.trim(), icon: newCatIcon }]);
    setNewCatName('');
  };

  const handleRemoveCategory = (index) => {
    setCategoriesList(categoriesList.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    if (!newItem.name.trim() || !newItem.price) {
      alert('Item name and price are required');
      return;
    }
    setMenuItems([...menuItems, { ...newItem, price: parseFloat(newItem.price) }]);
    setNewItem({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      categoryIndex: 0,
      tags: ['Veg'],
      badges: [],
      image: ''
    });
  };

  const handleRemoveItem = (index) => {
    setMenuItems(menuItems.filter((_, i) => i !== index));
  };

  // Step Transitions & Final Save
  const handleNextStep = async () => {
    if (step === 1) {
      // Save profile updates to backend first
      try {
        setLoading(true);
        await api.restaurant.updateProfile(businessProfile);
        setStep(2);
      } catch (err) {
        alert('Failed to save profile: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      // Time to write all data to backend and generate QRs!
      try {
        setLoading(true);
        
        // 1. Create categories
        const createdCats = [];
        for (let cat of categoriesList) {
          const res = await api.menu.createCategory({ name: cat.name, icon: cat.icon });
          createdCats.push(res);
        }

        // 2. Create menu items linked to categories
        for (let item of menuItems) {
          // Resolve category ID based on dynamic mapping
          const mappedCat = createdCats[item.categoryIndex] || createdCats[0];
          if (mappedCat) {
            await api.menu.createItem({
              name: item.name,
              description: item.description,
              price: item.price,
              image: item.image,
              categoryId: mappedCat._id,
              tags: item.tags,
              badges: item.badges
            });
          }
        }

        // 3. Create Tables & Get QRs
        const qrs = [];
        for (let tab of tablesList) {
          const res = await api.tables.createTable({
            name: tab.name,
            type: tableType === 'Both' ? 'Table' : tableType
          });
          qrs.push(res);
        }
        setGeneratedQRs(qrs);

        setStep(5);
      } catch (err) {
        alert('Error processing setup: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFinishWizard = async () => {
    try {
      setLoading(true);
      await api.restaurant.completeWizard();
      navigate('/admin');
    } catch (err) {
      alert('Error finishing onboarding: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f7f9fb] min-h-screen pb-12 text-left">
      {/* Top Wizard Header / Progress Indicator */}
      <header className="bg-white border-b border-slate-200 py-6 px-8 shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-[#003b1b] flex items-center gap-2">
              <span className="material-symbols-outlined">auto_awesome</span>
              MenuOS Setup Wizard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Let's configure your restaurant's digital presence in minutes.</p>
          </div>
          {/* Progress dots */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  step === s
                    ? 'bg-[#003b1b] text-white scale-110 shadow-md shadow-[#003b1b]/20'
                    : step > s
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
          
          {/* STEP 1: BUSINESS PROFILE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Business Profile</h2>
                <p className="text-xs text-slate-400 mt-1">Onboard your branding details. These will reflect instantly on your customer digital menu.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Logo upload card */}
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  {businessProfile.logo ? (
                    <img 
                      src={businessProfile.logo.startsWith('http') ? businessProfile.logo : `http://localhost:5000${businessProfile.logo}`} 
                      alt="Logo" 
                      className="w-24 h-24 rounded-full object-cover shadow-sm border border-slate-100 mb-4" 
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-4">
                      <span className="material-symbols-outlined text-4xl">storefront</span>
                    </div>
                  )}
                  <label className="bg-[#003b1b] hover:bg-[#166534] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition-colors">
                    Upload Logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <span className="text-[10px] text-slate-400 mt-2">PNG or JPG, up to 2MB</span>
                </div>

                {/* Form fields */}
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1">Business Name</label>
                      <input 
                        type="text" 
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#003b1b] outline-none"
                        value={businessProfile.name}
                        onChange={(e) => setBusinessProfile({ ...businessProfile, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1">Phone Number</label>
                      <input 
                        type="text" 
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#003b1b] outline-none"
                        value={businessProfile.phone}
                        onChange={(e) => setBusinessProfile({ ...businessProfile, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 text-xs font-bold mb-1">Physical Address</label>
                    <input 
                      type="text" 
                      className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#003b1b] outline-none"
                      value={businessProfile.address}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1">Google Maps Location URL</label>
                      <input 
                        type="url" 
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#003b1b] outline-none"
                        placeholder="https://maps.google.com/?q=..."
                        value={businessProfile.googleMapsLink}
                        onChange={(e) => setBusinessProfile({ ...businessProfile, googleMapsLink: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1">Google Review URL</label>
                      <input 
                        type="url" 
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#003b1b] outline-none"
                        placeholder="Direct review link for GMB"
                        value={businessProfile.reviewLink}
                        onChange={(e) => setBusinessProfile({ ...businessProfile, reviewLink: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1">Instagram Link</label>
                      <input 
                        type="url" 
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#003b1b] outline-none"
                        value={businessProfile.socialLinks.instagram}
                        onChange={(e) => setBusinessProfile({ 
                          ...businessProfile, 
                          socialLinks: { ...businessProfile.socialLinks, instagram: e.target.value } 
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1">WhatsApp Number</label>
                      <input 
                        type="text" 
                        className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#003b1b] outline-none"
                        placeholder="e.g. +919876543210"
                        value={businessProfile.socialLinks.whatsapp}
                        onChange={(e) => setBusinessProfile({ 
                          ...businessProfile, 
                          socialLinks: { ...businessProfile.socialLinks, whatsapp: e.target.value } 
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1">Brand Theme Color</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          className="w-11 h-11 border border-slate-200 rounded-lg p-0.5 cursor-pointer bg-white"
                          value={businessProfile.brandColor}
                          onChange={(e) => setBusinessProfile({ ...businessProfile, brandColor: e.target.value })}
                        />
                        <span className="text-xs font-mono uppercase text-slate-500">{businessProfile.brandColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TABLES / ROOMS SETUP */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Tables & Rooms Setup</h2>
                <p className="text-xs text-slate-400 mt-1">Configure your physical tables or hotel rooms. Unique QR codes will be prepared for each entry.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="space-y-4">
                  {/* Select type */}
                  <div>
                    <label className="block text-slate-700 text-xs font-bold mb-2">Operation Type</label>
                    <div className="flex flex-col space-y-2">
                      {['Table', 'Room', 'Both'].map((t) => (
                        <label key={t} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-4 py-3 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100/50">
                          <input 
                            type="radio" 
                            name="tableType" 
                            className="text-[#003b1b] focus:ring-[#003b1b]" 
                            checked={tableType === t}
                            onChange={() => handleTableTypeChange(t)}
                          />
                          {t === 'Both' ? 'Tables & Rooms both' : `${t} ordering`}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Quantity input */}
                  <div>
                    <label className="block text-slate-700 text-xs font-bold mb-1">Number of Tables / Rooms</label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#003b1b] outline-none"
                      value={tablesCount}
                      min="1"
                      onChange={(e) => handleTablesCountChange(e.target.value)}
                    />
                  </div>
                </div>

                {/* Listing edit panels */}
                <div className="md:col-span-2 space-y-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-6 max-h-[360px] overflow-y-auto">
                  <span className="block text-slate-700 text-xs font-bold mb-2">Customize Names / Labels</span>
                  <div className="grid grid-cols-2 gap-3">
                    {tablesList.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold text-xs w-6">{idx + 1}.</span>
                        <input 
                          type="text" 
                          className="h-10 px-3 border border-slate-200 rounded-lg text-xs w-full bg-white outline-none focus:ring-1 focus:ring-[#003b1b]"
                          value={t.name}
                          onChange={(e) => handleUpdateTableName(idx, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: MENU CATEGORIES SETUP */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Menu Categories</h2>
                <p className="text-xs text-slate-400 mt-1">Create categories for structuring your menu (e.g., Starters, Main Course, Breads).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="space-y-4">
                  <span className="block text-slate-700 text-xs font-bold">Add New Category</span>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Category Name</label>
                    <input 
                      type="text" 
                      className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#003b1b] outline-none"
                      placeholder="e.g. Breads"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Icon Emoji</label>
                    <select 
                      className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-[#003b1b]"
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                    >
                      <option value="🥗">🥗 Salad</option>
                      <option value="🍛">🍛 Curry / Rice</option>
                      <option value="🥤">🥤 Beverages</option>
                      <option value="🍨">🍨 Desserts</option>
                      <option value="🍞">🍞 Breads</option>
                      <option value="🍕">🍕 Pizza / Fast Food</option>
                      <option value="🍔">🍔 Burger</option>
                      <option value="🍲">🍲 Soup</option>
                    </select>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleAddCategory}
                    className="w-full h-11 bg-[#003b1b] hover:bg-[#166534] text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                  >
                    Add to List
                  </button>
                </div>

                {/* Categories active list */}
                <div className="md:col-span-2 bg-slate-50/50 border border-slate-100 rounded-2xl p-6">
                  <span className="block text-slate-700 text-xs font-bold mb-4">Active Categories (Drag to Reorder)</span>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {categoriesList.map((cat, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-300 material-symbols-outlined cursor-grab">drag_indicator</span>
                          <span className="text-lg">{cat.icon}</span>
                          <span className="font-semibold text-sm text-slate-800">{cat.name}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveCategory(idx)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: ADD INITIAL MENU ITEMS */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Add Menu Items</h2>
                  <p className="text-xs text-slate-400 mt-1">Populate some initial items to get started. You can skip this and add items later too.</p>
                </div>
                <button 
                  onClick={handleNextStep}
                  className="text-xs font-bold text-[#003b1b] hover:underline"
                >
                  Skip this Step
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Add Item form */}
                <div className="space-y-3 bg-slate-50/30 p-4 rounded-xl border border-slate-200/50 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Item Name</label>
                    <input 
                      type="text" 
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#003b1b] outline-none bg-white"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Price (₹)</label>
                      <input 
                        type="number" 
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#003b1b] outline-none bg-white"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Category</label>
                      <select 
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#003b1b] outline-none bg-white"
                        value={newItem.categoryIndex}
                        onChange={(e) => setNewItem({ ...newItem, categoryIndex: parseInt(e.target.value) })}
                      >
                        {categoriesList.map((cat, idx) => (
                          <option key={idx} value={idx}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Short Description</label>
                    <textarea 
                      rows="2"
                      className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#003b1b] outline-none bg-white text-xs"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Tag</label>
                      <select 
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#003b1b] outline-none bg-white"
                        value={newItem.tags[0]}
                        onChange={(e) => setNewItem({ ...newItem, tags: [e.target.value] })}
                      >
                        <option value="Veg">Veg</option>
                        <option value="Non-Veg">Non-Veg</option>
                        <option value="Vegan">Vegan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Badge</label>
                      <select 
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#003b1b] outline-none bg-white"
                        value={newItem.badges[0] || ''}
                        onChange={(e) => setNewItem({ ...newItem, badges: e.target.value ? [e.target.value] : [] })}
                      >
                        <option value="">None</option>
                        <option value="Best Seller">Best Seller</option>
                        <option value="Chef's Special">Chef's Special</option>
                        <option value="New">New</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Item Photo</label>
                    <div className="flex items-center gap-2">
                      <label className="bg-[#003b1b] text-white px-3 py-2 rounded-lg cursor-pointer font-semibold">
                        Choose File
                        <input type="file" accept="image/*" onChange={handleItemImageUpload} className="hidden" />
                      </label>
                      {newItem.image && <span className="text-[10px] text-emerald-600 font-bold">Uploaded ✓</span>}
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleAddItem}
                    className="w-full h-10 bg-[#003b1b] text-white font-semibold rounded-lg mt-2 cursor-pointer"
                  >
                    Add Item
                  </button>
                </div>

                {/* Items preview list */}
                <div className="md:col-span-2 bg-slate-50/50 border border-slate-100 rounded-2xl p-6 overflow-y-auto max-h-[360px]">
                  <span className="block text-slate-700 text-xs font-bold mb-4">Added Items ({menuItems.length})</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {menuItems.map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex gap-3 shadow-sm relative">
                        <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={`http://localhost:5000${item.image}`} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <span className="material-symbols-outlined">fastfood</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-grow text-xs">
                          <h4 className="font-semibold text-slate-800 truncate">{item.name}</h4>
                          <span className="text-slate-400 block mt-0.5">{categoriesList[item.categoryIndex]?.name}</span>
                          <span className="font-bold text-slate-800 block mt-1">₹{item.price}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveItem(idx)}
                          className="absolute right-2 top-2 text-red-400 hover:text-red-600 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: QR CODES REVIEW & FINISH */}
          {step === 5 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Your QR Codes are Ready!</h2>
                <p className="text-xs text-slate-400 mt-1">Onboarding completed successfully. Here are your generated white-label QR codes.</p>
              </div>

              {/* QR Review Box */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 max-h-[300px] overflow-y-auto">
                {generatedQRs.map((tab) => (
                  <div key={tab._id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center">
                    <span className="font-bold text-xs text-[#003b1b] mb-2">{tab.name}</span>
                    <img src={tab.qrCodeData} alt="QR Code" className="w-28 h-28 border border-white bg-white p-1 rounded shadow-sm" />
                    <a 
                      href={tab.qrCodeData} 
                      download={`${tab.name}_QR.png`}
                      className="text-[10px] text-emerald-600 font-bold hover:underline mt-2 flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">download</span>
                      Download
                    </a>
                  </div>
                ))}
              </div>

              <div className="pt-4 max-w-sm mx-auto">
                <button 
                  onClick={handleFinishWizard}
                  disabled={loading}
                  className="w-full h-12 bg-[#003b1b] hover:bg-[#166534] text-white font-bold text-sm rounded-xl shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Finalizing Setup...' : 'Go to Operations Dashboard'}
                </button>
              </div>
            </div>
          )}

          {/* Footer Navigation Buttons (For Step 1 to Step 4) */}
          {step < 5 && (
            <div className="border-t border-slate-100 pt-6 mt-8 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={step === 1 || loading}
                className="h-11 px-6 rounded-lg border border-slate-200 text-slate-500 font-semibold text-sm cursor-pointer hover:bg-slate-50 disabled:opacity-30"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={loading}
                className="h-11 px-6 bg-[#003b1b] hover:bg-[#166534] text-white font-semibold text-sm rounded-lg cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Processing...' : step === 4 ? 'Generate QRs & Finish' : 'Next Step'}
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
