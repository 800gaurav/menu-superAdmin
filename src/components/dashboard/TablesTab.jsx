import React from 'react';
import { Link } from 'react-router-dom';

export default function TablesTab({
  tables,
  tabLoading,
  setIsTableModalOpen,
  setTableFormData,
  handleToggleTableActive,
  handleDeleteTable,
  api
}) {
  return (
    <div className="space-y-6 animate-fadeIn text-xs text-left">
      {tabLoading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div>
        </div>
      ) : (
        <>
          <header className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-800 font-sans">Table & QR Management</h1>
              <p className="text-[10px] text-slate-400 mt-1">Configure layout, toggle active nodes, or instantly download white-label high-fidelity print QRs.</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/admin/qr-generator"
                className="bg-amber-50 hover:bg-amber-100 text-[#fda417] border border-[#fda417]/20 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                QR Studio
              </Link>
              <a
                href={api.tables.downloadZipUrl()}
                className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors"
              >
                ZIP Download
              </a>
              <button
                onClick={() => {
                  setTableFormData({ name: '', type: 'Table', id: null });
                  setIsTableModalOpen(true);
                }}
                className="bg-[#003b1b] hover:bg-[#166534] text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm cursor-pointer transition-colors"
              >
                Add QR Target
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tables.map(t => (
              <div
                key={t._id}
                className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col items-center relative transition-shadow hover:shadow-md ${
                  !t.isActive ? 'opacity-65' : ''
                }`}
              >
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {t.type}
                </span>

                <div className="absolute top-2 right-2 text-slate-400 flex gap-1">
                  <button
                    onClick={() => {
                      setTableFormData({ name: t.name, type: t.type, id: t._id });
                      setIsTableModalOpen(true);
                    }}
                    className="hover:text-[#003b1b] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteTable(t._id)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>

                <span className="font-bold text-slate-800 text-sm mb-3 mt-4">{t.name}</span>

                <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center justify-center w-32 h-32 relative">
                  {t.qrCodeData ? (
                    <img src={t.qrCodeData} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-slate-300 text-4xl animate-pulse">qr_code_2</span>
                  )}
                  {!t.isActive && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold uppercase tracking-wider">Inactive</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-4 text-xs font-bold">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 font-semibold">
                    <input
                      type="checkbox"
                      className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5"
                      checked={t.isActive}
                      onChange={() => handleToggleTableActive(t)}
                    />
                    Active
                  </label>
                  {t.qrCodeData && (
                    <a
                      href={t.qrCodeData}
                      download={`${t.name}_QR.png`}
                      className="text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
