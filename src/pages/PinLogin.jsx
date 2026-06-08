import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, setRestaurantToken } from '../api';

export default function PinLogin({ role }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roleLabels = {
    waiter: 'Waiter Console',
    kitchen: 'Kitchen Display KDS',
    counter: 'Counter Billing Panel'
  };

  const roleIcons = {
    waiter: 'hail',
    kitchen: 'chef_hat',
    counter: 'point_of_sale'
  };

  const handleKeyPress = (num) => {
    if (error) setError('');
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.auth.pinLogin(slug, role, pin);
      
      localStorage.setItem('restaurant_id', res.restaurantId);
      localStorage.setItem('restaurant_slug', res.restaurantSlug);

      if (role === 'waiter') {
        localStorage.setItem('waiter_token', res.token);
        navigate(`/waiter/${slug}`);
      } else {
        // Kitchen and Counter staff use standard restaurant_token to authorize order reads
        setRestaurantToken(res.token);
        navigate(`/${role}/${slug}`);
      }
    } catch (err) {
      setError(err.message || 'Incorrect PIN. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 select-none font-sans">
      <div className="flex-grow flex flex-col justify-center items-center max-w-sm mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-500">
            <span className="material-symbols-outlined text-4xl">{roleIcons[role]}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{roleLabels[role]}</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">{slug?.replace('-', ' ')}</p>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > index
                  ? 'bg-amber-500 border-amber-500 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'border-slate-700 bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-400 text-xs font-bold mb-4 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-center w-full animate-shake">
            {error}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              disabled={loading}
              className="h-16 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-xl font-bold flex items-center justify-center transition-all border border-slate-700/50 shadow-sm cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 rounded-full bg-slate-800/40 text-slate-400 hover:text-white active:scale-95 text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
          >
            CLEAR
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            disabled={loading}
            className="h-16 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-xl font-bold flex items-center justify-center transition-all border border-slate-700/50 shadow-sm cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 rounded-full bg-slate-800/40 text-slate-400 hover:text-white active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">backspace</span>
          </button>
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-500 font-medium pb-2">
        Stitch Digital Menu SaaS • Role Security Panel
      </div>
    </div>
  );
}
