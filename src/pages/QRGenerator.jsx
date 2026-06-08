import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../api';

export default function QRGenerator() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);

  // QR Design States
  const [template, setTemplate] = useState('tent'); // 'minimal' | 'tent' | 'banner'
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [accentColor, setAccentColor] = useState('#003b1b');
  const [label, setLabel] = useState('SCAN TO ORDER');
  const [footerLabel, setFooterLabel] = useState('Table');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [profile, tableList] = await Promise.all([
        api.restaurant.getProfile(),
        api.tables.getTables()
      ]);
      setRestaurant(profile);
      setTables(tableList);
      if (profile.brandColor) {
        setAccentColor(profile.brandColor);
      }
      if (tableList.length > 0) {
        setSelectedTable(tableList[0]);
      }
    } catch (err) {
      console.error(err);
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  // Redraw Canvas whenever states change
  useEffect(() => {
    if (!loading && selectedTable) {
      drawQRCanvas();
    }
  }, [loading, selectedTable, template, fgColor, bgColor, accentColor, label, footerLabel, restaurant]);

  const drawQRCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 1. Resolve Target URL
    const targetUrl = selectedTable.targetUrl || `http://localhost:5173/menu/${restaurant.slug}?table=${encodeURIComponent(selectedTable.name)}`;

    try {
      // 2. Generate raw QR code image in memory (using high error correction for framing)
      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
        color: {
          dark: fgColor,
          light: bgColor
        }
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      
      qrImg.onload = () => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (template === 'minimal') {
          // Minimal Template: just the QR code
          canvas.width = 320;
          canvas.height = 320;
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(qrImg, 10, 10, 300, 300);
        }
        else if (template === 'tent') {
          // Tent Card Template (Portrait Stand)
          canvas.width = 380;
          canvas.height = 540;
          
          // Background
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Outer Border with Accent color
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 12;
          ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
          
          // Header Accent Block
          ctx.fillStyle = accentColor;
          ctx.fillRect(12, 12, canvas.width - 24, 80);
          
          // Header Text
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 22px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label.toUpperCase(), canvas.width / 2, 60);

          // Draw QR Image
          ctx.drawImage(qrImg, 40, 115, 300, 300);

          // Subtitle / Call to action
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
          ctx.fillText('Order & Pay Directly From Your Phone', canvas.width / 2, 445);

          // Footer Accent bar
          ctx.fillStyle = accentColor;
          ctx.fillRect(12, 475, canvas.width - 24, 53);

          // Table Number footer text
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 18px system-ui, -apple-system, sans-serif';
          ctx.fillText(`${footerLabel.toUpperCase()}: ${selectedTable.name.toUpperCase()}`, canvas.width / 2, 510);
        }
        else if (template === 'banner') {
          // Banner / Landscape Table Stand Template
          canvas.width = 600;
          canvas.height = 380;

          // Background
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Border
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 10;
          ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

          // Left Text Panel
          ctx.fillStyle = accentColor;
          ctx.font = '900 28px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(restaurant?.name?.toUpperCase() || 'STITCH CAFE', 40, 75);

          ctx.fillStyle = '#334155';
          ctx.font = '900 24px system-ui, -apple-system, sans-serif';
          ctx.fillText(label.toUpperCase(), 40, 130);

          ctx.fillStyle = '#64748b';
          ctx.font = '500 13px system-ui, -apple-system, sans-serif';
          ctx.fillText('1. Scan the QR Code', 40, 185);
          ctx.fillText('2. Select dishes from menu', 40, 215);
          ctx.fillText('3. Place order & enjoy!', 40, 245);

          // Left Footer Badge (Table Number)
          ctx.fillStyle = accentColor;
          ctx.fillRect(40, 290, 220, 50);

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 16px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${footerLabel.toUpperCase()}: ${selectedTable.name.toUpperCase()}`, 150, 322);

          // Right Panel QR Code
          ctx.textAlign = 'center';
          ctx.drawImage(qrImg, 320, 40, 240, 240);

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillText('POWERED BY STITCH MENU', 440, 305);
        }
      };
    } catch (err) {
      console.error('Canvas compilation error:', err);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_${selectedTable?.name || 'Stitch'}_${template}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans flex flex-col md:flex-row text-left">
      {/* Settings Panel Left */}
      <aside className="w-full md:w-[380px] bg-white border-r border-slate-200 p-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <button 
              onClick={() => navigate('/admin')} 
              className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <div>
              <h1 className="font-extrabold text-sm text-slate-800">QR Design Studio</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Advanced Canvas Composite</p>
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 font-bold">Synchronizing studio...</p>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Target Table */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase">Select Target Location</label>
                <select 
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none bg-white font-semibold"
                  value={selectedTable?._id || ''}
                  onChange={(e) => setSelectedTable(tables.find(t => t._id === e.target.value))}
                >
                  {tables.map(t => <option key={t._id} value={t._id}>{t.name} ({t.type})</option>)}
                </select>
              </div>

              {/* Template Style */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase">Frame Layout Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'minimal', label: 'Minimal', icon: 'qr_code' },
                    { id: 'tent', label: 'Tent Card', icon: 'splitscreen' },
                    { id: 'banner', label: 'Table Stand', icon: 'view_agenda' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`py-2 px-1 border rounded-lg font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                        template === t.id 
                          ? 'border-[#003b1b] bg-[#003b1b]/5 text-[#003b1b]' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{t.icon}</span>
                      <span className="text-[9px]">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Labels (if not minimal) */}
              {template !== 'minimal' && (
                <>
                  <div>
                    <label className="block text-slate-500 font-bold mb-1.5 uppercase">Header Text Callout</label>
                    <input 
                      type="text" 
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none font-semibold focus:ring-1 focus:ring-[#003b1b]"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold mb-1.5 uppercase">Footer Prefix Label</label>
                    <input 
                      type="text" 
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none font-semibold focus:ring-1 focus:ring-[#003b1b]"
                      value={footerLabel}
                      onChange={(e) => setFooterLabel(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Color Accents */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase">Branding Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5" />
                    <span className="font-mono text-[9px] uppercase">{accentColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase">QR Dots Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5" />
                    <span className="font-mono text-[9px] uppercase">{fgColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100">
          <button
            onClick={handleDownload}
            disabled={!selectedTable}
            className="w-full h-11 bg-[#003b1b] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download Design PNG
          </button>
        </div>
      </aside>

      {/* Canvas Viewport Right */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-900 overflow-auto">
        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">Rendering Canvas viewport</span>
        
        {/* Shadowed high contrast card standee */}
        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700/60 shadow-2xl flex items-center justify-center max-w-full">
          <canvas 
            ref={canvasRef} 
            className="max-w-full rounded-lg shadow-md border border-slate-700 bg-white"
            style={{ maxHeight: '70vh' }}
          />
        </div>

        <span className="text-slate-600 text-[9px] font-medium mt-4">
          Changes compile in real-time. Exported images match canvas dpi 1:1.
        </span>
      </main>
    </div>
  );
}
