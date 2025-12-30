import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SavedConfig } from '../types';

interface WelcomeScreenProps {
  savedConfigs?: SavedConfig[];
  onSwitchConfig?: (id: string) => void;
  activeConfigId?: string | null;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ savedConfigs, onSwitchConfig, activeConfigId }) => {
  const navigate = useNavigate();
  const hasBooks = savedConfigs && savedConfigs.length > 0;

  const handleBookClick = (id: string) => {
    if (onSwitchConfig) {
      onSwitchConfig(id);
      navigate('/home');
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Hero Image Section */}
      <div className="relative flex-1 w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover transform scale-105"
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAAToBpovPhswP58PwF-O2qGyq4stzGMUVbRhYzAaEYl_pOTtH7LSIGXJe5ph6uBOe8VpOW73sNXyYRLlia4g3NTtDaJPeZVRAA6hsxn0mczvT6Eje6g8OOwEkxyZlOUnsvpJyY7uHVZR8Vs2Chfsh-fF3QfwwhyKPQaplgw496AOiEyI6lVrFZXvRzPTDs2STUotM2P3qFuhgOuNHHVzHCV-8gUsrnPZcUv3ijHQ8xYJ-V7uJhk8d0b4Uqyhbn-Xmv6wADO53p5Zs")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-background-light dark:to-background-dark" />
      </div>

      {/* Content Section */}
      <div className="relative z-10 flex flex-col items-center justify-end w-full px-6 pb-10 pt-4 bg-background-light dark:bg-background-dark rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out">
        <div className="mb-6 p-4 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-primary">lunch_dining</span>
        </div>

        <h1 className="text-text-main dark:text-white tracking-tight text-3xl font-extrabold leading-tight text-center mb-3">
          Tarif Defterim
        </h1>

        <p className="text-gray-600 dark:text-gray-300 text-base font-medium leading-relaxed text-center max-w-xs mb-8">
          {hasBooks
            ? "Mutfaktaki serüvenine kaldığın yerden devam et."
            : "Binlerce denenmiş tarif, adım adım anlatımlar ve lezzetli öneriler seni bekliyor."}
        </p>

        {hasBooks ? (
          /* EXISTING USER VIEW */
          <div className="w-full max-w-[480px] space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-2">DEFTERLERİNİZ</label>
              {savedConfigs!.map(config => (
                <button
                  key={config.id}
                  onClick={() => handleBookClick(config.id)}
                  className="flex items-center gap-4 w-full p-3 rounded-2xl bg-white dark:bg-stone-900 border border-gray-100 dark:border-white/5 shadow-sm hover:border-primary/30 transition-all active:scale-[0.98] group"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">book_2</span>
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-base font-bold text-text-main dark:text-white truncate w-full text-left">{config.name}</span>
                    <span className="text-xs text-gray-400">Giriş yapmak için dokun</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">arrow_forward_ios</span>
                </button>
              ))}
            </div>

            <div className="h-px w-full bg-gray-100 dark:bg-white/5 my-2" />

            <button
              onClick={() => navigate('/firebase-config')}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-transparent border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary text-gray-400 hover:text-primary transition-all text-sm font-bold tracking-widest uppercase"
            >
              <span className="material-symbols-outlined mr-2">add</span>
              Yeni Defter Ekle
            </button>
          </div>
        ) : (
          /* NEW USER VIEW */
          <div className="w-full max-w-[480px] space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => navigate('/home')}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-primary hover:bg-primary-dark transition-all active:scale-[0.98] text-white text-lg font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/20"
            >
              <span className="truncate">Keşfetmeye Başla</span>
              <span className="material-symbols-outlined ml-2 text-[20px]">arrow_forward</span>
            </button>

            <button className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-4 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 transition-colors text-text-main dark:text-white text-sm font-bold">
              <span>Mevcut Defterin Var mı? <span onClick={() => navigate('/firebase-config')} className="text-primary underline decoration-2 underline-offset-2 cursor-pointer ml-1">Bağlan</span></span>
            </button>
          </div>
        )}

        <div className="h-4 w-full" />
      </div>
    </div>
  );
};

export default WelcomeScreen;
