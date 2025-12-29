
import React from 'react';
import { useNavigate } from 'react-router-dom';

const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();

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
      <div className="relative z-10 flex flex-col items-center justify-end w-full px-6 pb-10 pt-4 bg-background-light dark:bg-background-dark rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="mb-6 p-4 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-primary">lunch_dining</span>
        </div>
        
        <h1 className="text-text-main dark:text-white tracking-tight text-3xl font-extrabold leading-tight text-center mb-3">
          Tarif Defterim
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 text-base font-medium leading-relaxed text-center max-w-xs mb-8">
          Mutfaktaki en iyi yardımcın. Binlerce denenmiş tarif, adım adım anlatımlar ve lezzetli öneriler seni bekliyor.
        </p>

        <button 
          onClick={() => navigate('/home')}
          className="flex w-full max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-primary hover:bg-primary-dark transition-all active:scale-[0.98] text-white text-lg font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/20 mb-3"
        >
          <span className="truncate">Keşfetmeye Başla</span>
          <span className="material-symbols-outlined ml-2 text-[20px]">arrow_forward</span>
        </button>

        <button className="flex w-full max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-text-main dark:text-white text-sm font-bold leading-normal tracking-[0.015em]">
          <span>Zaten hesabın var mı? <span className="text-primary underline decoration-2 underline-offset-2">Giriş Yap</span></span>
        </button>
        
        <div className="h-2 w-full" />
      </div>
    </div>
  );
};

export default WelcomeScreen;
