import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeMode, Recipe, SavedConfig } from '../types';

interface SettingsProps {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  userName: string;
  setUserName: (name: string) => void;
  resetData: () => void;
  recipes: Recipe[];
  firebaseConfig: string;
  setFirebaseConfig: (config: string) => void;
  savedConfigs?: SavedConfig[];
  onSwitchConfig?: (id: string) => void;
  onRemoveConfig?: (id: string) => void;
  activeConfigId?: string | null;
}

const SettingsScreen: React.FC<SettingsProps> = ({
  theme, setTheme, userName, setUserName, resetData, recipes,
  firebaseConfig, setFirebaseConfig, savedConfigs, onSwitchConfig, onRemoveConfig, activeConfigId
}) => {
  const navigate = useNavigate();
  const [tempConfig, setTempConfig] = useState(firebaseConfig);

  const handleSaveFirebase = () => {
    try {
      if (tempConfig.trim()) {
        JSON.parse(tempConfig); // Validate JSON
        setFirebaseConfig(tempConfig);
        alert('Bulut bağlantısı başarıyla kuruldu! Tarifleriniz senkronize ediliyor.');
      } else {
        setFirebaseConfig('');
        alert('Bulut bağlantısı kesildi.');
      }
    } catch (e) {
      alert('Hata: Geçersiz JSON formatı. Lütfen Firebase Console\'dan aldığınız yapılandırma objesini tam olarak yapıştırın.');
    }
  };

  // Türkçe karakterleri PDF uyumlu hale getirmek için yardımcı fonksiyon
  const fixTR = (text: string) => {
    const chars: Record<string, string> = {
      'İ': 'I', 'ı': 'i', 'Ş': 'S', 'ş': 's', 'Ğ': 'G', 'ğ': 'g', 'Ç': 'C', 'ç': 'c', 'Ö': 'O', 'ö': 'o', 'Ü': 'U', 'ü': 'u'
    };
    return text.replace(/[İıŞşĞğÇçÖöÜü]/g, m => chars[m] || m);
  };

  const handleExportData = async () => {
    try {
      // @ts-ignore
      const { jsPDF } = await import('https://esm.sh/jspdf');
      const doc = new jsPDF();
      const primaryColor = [238, 140, 43];
      let yPos = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(fixTR("TARIF DEFTERIM"), 105, yPos, { align: "center" });

      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(fixTR(`Sef ${userName} Tarafindan Hazirlandi`), 105, yPos, { align: "center" });

      yPos += 20;
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.line(20, yPos, 190, yPos);
      yPos += 15;

      recipes.forEach((recipe, index) => {
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(18);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(fixTR(`${index + 1}. ${recipe.title.toUpperCase()}`), 20, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150);
        doc.text(fixTR(recipe.subtitle), 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50);
        doc.text(fixTR(`${recipe.time} | ${recipe.servings} | ${recipe.calories}`), 20, yPos);
        yPos += 12;
        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(fixTR("MALZEMELER"), 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        recipe.ingredients.forEach(ing => {
          doc.text(fixTR(`• ${ing.amount} ${ing.name}`), 25, yPos);
          yPos += 6;
          if (yPos > 270) { doc.addPage(); yPos = 20; }
        });
        yPos += 6;
        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(fixTR("YAPILISI"), 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        recipe.steps.forEach((step, sIdx) => {
          const lines = doc.splitTextToSize(fixTR(`${sIdx + 1}. ${step.description}`), 160);
          doc.text(lines, 25, yPos);
          yPos += (lines.length * 6) + 2;
          if (yPos > 270) { doc.addPage(); yPos = 20; }
        });
        yPos += 15;
        doc.setDrawColor(240);
        doc.line(20, yPos - 5, 190, yPos - 5);
      });

      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], "Tarif_Defterim.pdf", { type: "application/pdf" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Tarif Defterim PDF', text: 'Tüm tariflerim burada!' });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = "Tarif_Defterim.pdf";
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) { alert('PDF oluşturulurken bir hata oluştu.'); }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      <header className="sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-6 pt-12 pb-6 border-b border-gray-100 dark:border-stone-900">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="flex size-12 items-center justify-center rounded-2xl bg-white dark:bg-stone-900 shadow-sm border border-gray-100 dark:border-white/5 text-primary active:scale-95 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Uygulama Ayarları</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col gap-10">

        {/* Profile Section */}
        <section className="flex flex-col gap-4">
          <h4 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Profil</h4>
          <div className="overflow-hidden rounded-[2.5rem] bg-surface-light dark:bg-surface-dark shadow-sm border border-gray-50 dark:border-white/5 p-6 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="size-24 rounded-3xl overflow-hidden border-4 border-primary/20 shadow-xl">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-3BP8MI0Qu5hJ4Qj-eZTPHguhPU28P8AiE-mUhaRAzz78zeJpNw9Z53svjbVX8OVkZXoxb20_m73kMLbzPbFp5-Oc-ViPxomy7ap4DbFwbvXJi_rQvHNLtovsBZq-DtmoL3LUBOYrMQGaKBAaGLYIkLI8vuXxYEzpTkwJkDqoKotAAvN3pZwV09UbzxWLw53GcZmi1Jd94hyypCj1aQiCj-8b2kgkbaBvO1SzS0Armd34KhzDvUgNwP-RPGbIZPxouljovW3rPaU" alt="User" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 w-full space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Kullanıcı Adı</label>
                  <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full h-14 bg-gray-50 dark:bg-stone-900 border-none rounded-2xl px-5 font-bold focus:ring-2 focus:ring-primary/20" placeholder="İsminiz..." />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MY BOOKS SECTION */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Defterlerim (Firebase)</h4>
            <button
              onClick={() => navigate('/firebase-config')}
              className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Yeni Ekle
            </button>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] bg-surface-light dark:bg-surface-dark shadow-sm border border-gray-50 dark:border-white/5 p-6 md:p-8">
            {savedConfigs && savedConfigs.length > 0 ? (
              <div className="space-y-4">
                {savedConfigs.map(config => (
                  <div
                    key={config.id}
                    onClick={() => {
                      if (config.id !== activeConfigId && onSwitchConfig) {
                        onSwitchConfig(config.id);
                      }
                    }}
                    className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${config.id === activeConfigId
                        ? 'bg-primary/5 border-primary/20 shadow-md shadow-primary/5'
                        : 'bg-white dark:bg-black/20 border-gray-100 dark:border-white/5 hover:border-primary/30'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config.id === activeConfigId ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                        }`}>
                        <span className="material-symbols-outlined">{config.id === activeConfigId ? 'cloud_done' : 'book_2'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-base font-bold ${config.id === activeConfigId ? 'text-primary' : 'text-text-main dark:text-white'}`}>
                          {config.name}
                        </span>
                        <span className="text-xs text-gray-400 font-mono truncate max-w-[150px] opacity-60">
                          {config.id === activeConfigId ? 'Aktif Defter' : 'Değiştirmek için tıkla'}
                        </span>
                      </div>
                    </div>

                    {config.id !== activeConfigId && onRemoveConfig && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`${config.name} adlı defteri silmek istediğinize emin misiniz?`)) {
                            onRemoveConfig(config.id);
                          }
                        }}
                        className="h-10 w-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    )}

                    {config.id === activeConfigId && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 mb-4">
                  <span className="material-symbols-outlined text-3xl">no_accounts</span>
                </div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Henüz kayıtlı bir defteriniz yok.</p>
                <button
                  onClick={() => navigate('/firebase-config')}
                  className="mt-4 px-6 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all"
                >
                  Defter Ekle
                </button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
              <p className="text-[10px] text-gray-400 leading-relaxed text-center">
                Eklediğiniz defterler arasında geçiş yaparak farklı tarif koleksiyonlarınıza erişebilirsiniz. Her defter kendi tariflerini saklar.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <section className="flex flex-col gap-4">
            <h4 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Görünüm</h4>
            <div className="overflow-hidden rounded-[2.5rem] bg-surface-light dark:bg-surface-dark shadow-sm border border-gray-50 dark:border-white/5 p-8 h-full">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><span className="material-symbols-outlined">palette</span></div>
                  <span className="text-base font-bold">Renk Teması</span>
                </div>
                <div className="flex w-full rounded-2xl bg-gray-100 dark:bg-black/30 p-1.5">
                  {[ThemeMode.SYSTEM, ThemeMode.LIGHT, ThemeMode.DARK].map((mode) => (
                    <button key={mode} onClick={() => setTheme(mode)} className={`flex-1 rounded-xl py-2.5 text-[10px] font-black transition-all uppercase tracking-widest ${theme === mode ? 'bg-white dark:bg-stone-800 shadow-xl text-primary' : 'text-gray-400'}`}>
                      {mode === ThemeMode.SYSTEM ? 'OTOMATİK' : mode === ThemeMode.LIGHT ? 'AÇIK' : 'KOYU'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h4 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Veri Yönetimi</h4>
            <div className="overflow-hidden rounded-[2.5rem] bg-surface-light dark:bg-surface-dark shadow-sm border border-gray-50 dark:border-white/5 h-full">
              <div className="flex flex-col">
                <button onClick={handleExportData} className="flex items-center justify-between gap-4 px-8 py-6 active:bg-gray-50 dark:active:bg-white/5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><span className="material-symbols-outlined">picture_as_pdf</span></div>
                    <span className="text-base font-bold">PDF Olarak Paylaş</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-300">share</span>
                </button>
                <div className="mx-8 h-px bg-gray-50 dark:bg-white/5" />
                <button onClick={resetData} className="flex items-center justify-between gap-4 px-8 py-6 active:bg-red-50 group">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all"><span className="material-symbols-outlined">delete_forever</span></div>
                    <span className="text-base font-bold text-red-500">Tüm Verileri Sıfırla</span>
                  </div>
                  <span className="material-symbols-outlined text-red-200">warning</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-12 py-10 border-t border-gray-100 dark:border-white/5 text-center flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-3xl font-black">restaurant</span></div>
          <p className="text-xs font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.4em]">TARİF DEFTERİM • V1.0.3</p>
        </footer>
      </main>
    </div>
  );
};

export default SettingsScreen;
