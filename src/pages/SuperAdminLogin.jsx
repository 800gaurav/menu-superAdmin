import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setSuperAdminToken } from '../api';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.auth.superAdminLogin(email, password);
      setSuperAdminToken(data.token);
      navigate('/superadmin');
    } catch (err) {
      setError(err.message || 'Invalid username/email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0F172A] min-h-screen flex items-center justify-center m-0 p-0">
      <main className="relative z-10 w-full max-w-[480px] px-4">
        {/* Auth Card Container */}
        <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.08)] flex flex-col items-center p-8 md:p-10 w-full h-auto min-h-[400px]">
          {/* Badge */}
          <div className="mb-6">
            <span className="bg-[#F1F5F9] text-[#64748B] px-3 py-1 rounded-full font-semibold text-xs uppercase tracking-wider">
              SuperAdmin
            </span>
          </div>
          {/* Logo */}
          <div className="mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '24px' }}>
                restaurant_menu
              </span>
            </div>
          </div>
          {/* Title & Subtitle */}
          <div className="text-center mb-8">
            <h1 className="text-[#0F172A] text-2xl font-bold leading-tight mb-2">Welcome back</h1>
            <p className="text-[#64748B] text-sm">Sign in to manage all restaurants</p>
          </div>

          {error && (
            <div className="w-full mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="w-full space-y-5" onSubmit={handleLogin}>
            {/* Email Input */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[#0F172A] text-sm font-semibold" htmlFor="email">
                Email address / Username
              </label>
              <input
                className="w-full h-12 px-4 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none transition-all text-[#0F172A]"
                id="email"
                type="text"
                placeholder="admin@platform.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {/* Password Input */}
            <div className="space-y-1.5 text-left relative">
              <label className="block text-[#0F172A] text-sm font-semibold" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full h-12 px-4 pr-12 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none transition-all text-[#0F172A]"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#7C3AED] transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            {/* Sign In Button */}
            <button
              className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm rounded-lg transition-all active:scale-[0.98] mt-2 shadow-sm cursor-pointer disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </main>
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-8 px-8 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-white/40 pointer-events-none text-xs">
        <div className="font-bold opacity-30">SaaS Restaurant Platform</div>
        <div className="opacity-30">© 2024 Restaurant SaaS Platform. All rights reserved.</div>
        <div className="flex gap-6 pointer-events-auto">
          <a className="hover:text-[#7C3AED] transition-colors" href="#">Privacy Policy</a>
          <a className="hover:text-[#7C3AED] transition-colors" href="#">Terms of Service</a>
          <a className="hover:text-[#7C3AED] transition-colors" href="#">Support</a>
        </div>
      </footer>
    </div>
  );
}
