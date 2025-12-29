
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BottomNavProps {
  activeTab: 'home' | 'favorites' | 'settings';
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] flex justify-center p-6 md:p-8 pointer-events-none">
      <nav className="w-full max-w-lg bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[2.5rem] shadow-2xl shadow-black/20 py-3 px-8 flex items-center justify-between pointer-events-auto">
        <button 
          onClick={() => navigate('/home')}
          className={`flex flex-col items-center gap-1 w-16 transition-all ${
            activeTab === 'home' ? 'text-primary scale-110' : 'text-gray-400'
          }`}
        >
          <span className={`material-symbols-outlined text-[28px] ${activeTab === 'home' ? 'fill-current' : ''}`} style={{ fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}>
            book_2
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest">TARİFLER</span>
        </button>

        <button 
          onClick={() => navigate('/favorites')}
          className={`flex flex-col items-center gap-1 w-16 transition-all ${
            activeTab === 'favorites' ? 'text-primary scale-110' : 'text-gray-400'
          }`}
        >
          <span className={`material-symbols-outlined text-[28px] ${activeTab === 'favorites' ? 'fill-current' : ''}`} style={{ fontVariationSettings: activeTab === 'favorites' ? "'FILL' 1" : "'FILL' 0" }}>
            favorite
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest">FAVORİLER</span>
        </button>

        <button 
          onClick={() => navigate('/add')}
          className="flex flex-col items-center justify-center -mt-16 group"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary text-white shadow-2xl shadow-primary/50 transition-all group-hover:rotate-90 group-hover:scale-110 active:scale-90">
            <span className="material-symbols-outlined text-[32px]">add</span>
          </div>
        </button>

        <button 
          onClick={() => navigate('/settings')}
          className={`flex flex-col items-center gap-1 w-16 transition-all ${
            activeTab === 'settings' ? 'text-primary scale-110' : 'text-gray-400'
          }`}
        >
          <span className={`material-symbols-outlined text-[28px] ${activeTab === 'settings' ? 'fill-current' : ''}`} style={{ fontVariationSettings: activeTab === 'settings' ? "'FILL' 1" : "'FILL' 0" }}>
            settings
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest">AYARLAR</span>
        </button>
      </nav>
    </div>
  );
};

export default BottomNav;
