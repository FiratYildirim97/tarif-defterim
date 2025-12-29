
import React from 'react';

interface FilterModalProps {
  onClose: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] mx-auto max-w-md flex flex-col justify-end overflow-hidden" role="dialog" aria-modal="true">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="relative w-full bg-surface-light dark:bg-surface-dark rounded-t-[32px] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-6" />
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-text-main dark:text-white">Filtrele</h2>
          <button className="text-sm font-semibold text-text-secondary dark:text-primary hover:opacity-80 transition-opacity">Temizle</button>
        </div>

        <div className="space-y-3 mb-8">
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Kategoriler</h3>
          <div className="flex flex-wrap gap-2.5">
            {['Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği', 'Tatlılar', 'Çorba'].map((cat, idx) => (
              <button 
                key={cat}
                className={`h-9 px-4 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                  idx === 0 ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-text-main dark:text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Pişirme Süresi</h3>
          <div className="flex flex-wrap gap-2.5">
            {['15 dk altı', '30 dk altı', '45 dk altı', '60 dk altı'].map((time, idx) => (
              <button 
                key={time}
                className={`h-9 px-4 rounded-full text-sm font-medium transition-all active:scale-95 ${
                  idx === 1 ? 'bg-primary/10 border border-primary text-primary font-bold' : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-text-main dark:text-gray-300'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-xl shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>Sonuçları Göster</span>
          <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-semibold">4</span>
        </button>
      </div>
    </div>
  );
};

export default FilterModal;
