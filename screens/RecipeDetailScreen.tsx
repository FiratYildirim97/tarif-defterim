
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Recipe } from '../types';


interface RecipeDetailProps {
  recipes: Recipe[];
  toggleFavorite: (id: string) => void;
}

const UNIT_RATIOS: Record<string, number> = {
  'ml': 1,
  'gr': 1,
  'oz': 29.57,
  'Su Bardağı': 240,
  'Çay Bardağı': 125,
  'Yemek Kaşığı': 15,
  'Tatlı Kaşığı': 10,
  'Çay Kaşığı': 5,
};

// Audio Helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const RecipeDetailScreen: React.FC<RecipeDetailProps> = ({ recipes, toggleFavorite, deleteRecipe }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const converterRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Media Session for Lock Screen Widget
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [convAmount, setConvAmount] = useState<string>('1');
  const [fromUnit, setFromUnit] = useState<string>('Su Bardağı');
  const [toUnit, setToUnit] = useState<string>('ml');
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [highlightConverter, setHighlightConverter] = useState(false);

  const recipe = recipes.find(r => r.id === id);

  const convertedResult = useMemo(() => {
    const val = parseFloat(convAmount);
    if (isNaN(val)) return 0;
    const fromRatio = UNIT_RATIOS[fromUnit] || 1;
    const toRatio = UNIT_RATIOS[toUnit] || 1;
    const inBase = val * fromRatio;
    return (inBase / toRatio).toFixed(1);
  }, [convAmount, fromUnit, toUnit]);

  // Robust Wake Lock Request Function
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;

    if (isCookingMode && document.visibilityState === 'visible') {
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          console.warn('Wake Lock request was disallowed by permissions policy or environment.');
        } else {
          console.debug('Wake Lock could not be acquired:', err.message);
        }
      }
    }
  }, [isCookingMode]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.debug('Wake Lock release error:', err);
      }
    }
  }, []);

  // Effect for Media Session (Lock Screen Widget)
  useEffect(() => {
    if (isCookingMode && recipe && 'mediaSession' in navigator) {
      const currentStep = recipe.steps[currentStepIndex];

      // Update Metadata for the widget
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `ADIM ${currentStepIndex + 1}: ${currentStep.title || 'Hazırlık'}`,
        artist: recipe.title,
        album: 'Pişirme Modu Aktif',
        artwork: [
          { src: currentStep.image || recipe.image, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      // Handle lock screen controls
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        setCurrentStepIndex(prev => Math.max(0, prev - 1));
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        setCurrentStepIndex(prev => Math.min(recipe.steps.length - 1, prev + 1));
      });

      // Create a tiny silent audio to keep the session alive on mobile
      if (!silentAudioRef.current) {
        // Base64 silent mp3 (1sec)
        silentAudioRef.current = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
        silentAudioRef.current.loop = true;
      }
      silentAudioRef.current.play().catch(() => {
        console.debug("Silent audio needs user interaction");
      });

    } else if (!isCookingMode && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
    }
  }, [isCookingMode, currentStepIndex, recipe]);

  // Effect for handling Wake Lock and Visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    if (isCookingMode) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      releaseWakeLock();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isCookingMode, requestWakeLock, releaseWakeLock]);

  // Local Voice Control Logic
  useEffect(() => {
    let recognition: any = null;

    const speakText = (text: string) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    };

    if (isCookingMode && isVoiceActive) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert("Tarayıcınız sesli komutları desteklemiyor. Lütfen Chrome, Edge veya Safari kullanın.");
        setIsVoiceActive(false);
        return;
      }

      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.lang = 'tr-TR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const command = lastResult[0].transcript.trim().toLowerCase();

        // Visual feedback could be added here if needed
        console.log("Algılanan Komut:", command);

        if (command.includes('ileri') || command.includes('sonraki') || command.includes('geç') || command.includes('tamam')) {
          if (currentStepIndex < recipe.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
          } else {
            speakText("Afiyet olsun! Tarif bitti.");
            setIsCookingMode(false);
          }
        } else if (command.includes('geri') || command.includes('önceki') || command.includes('dön')) {
          if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
          }
        } else if (command.includes('oku') || command.includes('tekrar') || command.includes('ne') || command.includes('söyle')) {
          speakText(recipe.steps[currentStepIndex].description);
        } else if (command.includes('dur') || command.includes('sus')) {
          window.speechSynthesis.cancel();
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          setIsVoiceActive(false);
          alert("Mikrofon izni reddedildi.");
        }
      };

      try {
        recognition.start();
        // Read the current step automatically when entering the step
        speakText(recipe.steps[currentStepIndex].description);
      } catch (e) {
        console.error("Recognition start failed", e);
      }
    } else {
      window.speechSynthesis.cancel();
    }

    return () => {
      if (recognition) recognition.stop();
      window.speechSynthesis.cancel();
    };
  }, [isCookingMode, isVoiceActive, currentStepIndex]);

  const toggleIngredient = (ingId: string) => {
    const newChecked = new Set(checkedIds);
    if (newChecked.has(ingId)) newChecked.delete(ingId);
    else newChecked.add(ingId);
    setCheckedIds(newChecked);
  };

  const handleShare = async () => {
    if (!recipe) return;
    let shareUrl = window.location.href;
    const isValidUrl = shareUrl.startsWith('http');
    const shareText = `${recipe.title} tarifine bir bak! ${recipe.subtitle}`;
    const shareData: ShareData = { title: recipe.title, text: shareText };
    if (isValidUrl) shareData.url = shareUrl;
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) await navigator.share(shareData);
      else throw new Error('Share API not supported');
    } catch (err) {
      const fullContent = `${shareText}${isValidUrl ? `\n\nLink: ${shareUrl}` : ''}`;
      await navigator.clipboard.writeText(fullContent);
      alert('Panoya kopyalandı!');
    }
  };

  const handleIngredientQuickConvert = (amountStr: string) => {
    const match = amountStr.match(/(\d+[\.,]?\d*)\s*(.*)/);
    if (match) {
      setConvAmount(match[1].replace(',', '.'));
      const unit = match[2].trim();
      const foundUnit = Object.keys(UNIT_RATIOS).find(u => unit.toLowerCase().includes(u.toLowerCase()) || u.toLowerCase().includes(unit.toLowerCase()));
      if (foundUnit) setFromUnit(foundUnit);
      setIsConverterOpen(true);
      setHighlightConverter(true);
      setTimeout(() => {
        converterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightConverter(false), 1500);
      }, 100);
    }
  };

  if (!recipe) return <div className="p-10 text-center">Tarif bulunamadı.</div>;

  if (isCookingMode) {
    const currentStep = recipe.steps[currentStepIndex];
    const progress = ((currentStepIndex + 1) / recipe.steps.length) * 100;
    return (
      <div className="fixed inset-0 z-[100] bg-background-light dark:bg-background-dark flex flex-col md:flex-row animate-in fade-in duration-300">
        {/* Voice Assistant Indicator */}
        <div className="absolute top-12 right-6 md:right-12 z-50 flex items-center gap-4">
          {isVoiceActive && (
            <div className="flex items-center gap-3 bg-primary/20 backdrop-blur-xl px-4 py-2 rounded-2xl border border-primary/30">
              <div className="size-3 rounded-full bg-primary animate-ping" />
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Sesli Kontrol Aktif</span>
            </div>
          )}
          <button
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={`size-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${isVoiceActive ? 'bg-primary text-white scale-110 shadow-primary/30' : 'bg-white dark:bg-stone-800 text-gray-400'}`}
          >
            <span className="material-symbols-outlined text-3xl">{isVoiceActive ? 'mic' : 'mic_off'}</span>
          </button>
        </div>

        <div className="hidden md:flex md:w-[40%] h-full bg-stone-900 overflow-hidden">
          <img src={currentStep.image || recipe.image} className="w-full h-full object-cover opacity-60" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="pt-12 pb-4 px-6 md:px-12 bg-surface-light dark:bg-surface-dark border-b border-gray-100 dark:border-stone-800">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setIsCookingMode(false)} className="text-primary font-black uppercase tracking-widest text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">close</span> Kapat
              </button>
              <div className="h-2 flex-1 mx-8 bg-gray-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-black text-gray-400">ADIM {currentStepIndex + 1}/{recipe.steps.length}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 md:p-16 flex flex-col justify-center max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black mb-10 leading-tight text-text-main dark:text-white">{currentStep.title}</h2>
            <p className="text-2xl md:text-3xl font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{currentStep.description}</p>
            {isVoiceActive && (
              <p className="mt-12 p-6 rounded-3xl bg-gray-100 dark:bg-white/5 border border-dashed border-primary/30 text-xs font-black text-primary uppercase tracking-widest text-center animate-pulse">
                Adımı geçmek için "SONRAKİ" demen yeterli!
              </p>
            )}
            <div className="mt-8 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">lock</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kilit ekranından kontrol edebilirsin</span>
            </div>
          </div>
          <div className="p-8 md:p-12 flex gap-6 bg-surface-light dark:bg-surface-dark border-t border-gray-100 dark:border-stone-800">
            <button disabled={currentStepIndex === 0} onClick={() => setCurrentStepIndex(prev => prev - 1)} className="flex-1 h-20 rounded-[2rem] bg-gray-100 dark:bg-stone-800 font-black disabled:opacity-30 active:scale-95 transition-all uppercase tracking-widest">Geri</button>
            {currentStepIndex === recipe.steps.length - 1
              ? <button onClick={() => setIsCookingMode(false)} className="flex-[2] h-20 rounded-[2rem] bg-green-500 text-white font-black text-2xl shadow-lg shadow-green-500/20 active:scale-95 transition-all">TARİFİ BİTİR</button>
              : <button onClick={() => setCurrentStepIndex(prev => prev + 1)} className="flex-[2] h-20 rounded-[2rem] bg-primary text-white font-black text-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all">SONRAKİ ADIM</button>
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col lg:flex-row min-h-screen bg-background-light dark:bg-background-dark">
      {/* HERO & INFO SECTION */}
      <div className="relative w-full lg:w-[40%] h-[400px] lg:h-screen lg:sticky lg:top-0 shrink-0">
        <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between px-6 pt-12 pb-4">
          <button onClick={() => navigate(-1)} className="flex size-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xl text-white border border-white/20 hover:bg-white/40 transition-all"><span className="material-symbols-outlined">arrow_back</span></button>
          <div className="flex gap-3">
            {deleteRecipe && (
              <button
                onClick={() => {
                  deleteRecipe(recipe.id);
                  navigate('/');
                }}
                className="flex size-12 items-center justify-center rounded-2xl bg-red-500/20 backdrop-blur-xl text-white border border-red-500/30 hover:bg-red-500 hover:text-white transition-all"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
            <button onClick={() => navigate(`/edit/${recipe.id}`)} className="flex size-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xl text-white border border-white/20 hover:bg-white/40 transition-all"><span className="material-symbols-outlined">edit</span></button>
            <button onClick={() => toggleFavorite(recipe.id)} className={`flex size-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xl border border-white/20 transition-all ${recipe.isFavorite ? 'text-red-500 bg-white' : 'text-white'}`}><span className="material-symbols-outlined" style={{ fontVariationSettings: recipe.isFavorite ? "'FILL' 1" : "'FILL' 0" }}>favorite</span></button>
            <button onClick={handleShare} className="flex size-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xl text-white border border-white/20 hover:bg-white/40 transition-all"><span className="material-symbols-outlined">share</span></button>
          </div>
        </div>
        <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: `url("${recipe.image}")` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background-light dark:from-background-dark via-transparent to-transparent opacity-60 lg:hidden" />
      </div>

      <div className="flex-1 px-6 md:px-12 py-10 lg:py-20 -mt-10 lg:mt-0 relative z-10 bg-background-light dark:bg-background-dark rounded-t-[3rem] lg:rounded-none flex flex-col gap-10">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-[1.1] text-text-main dark:text-white">{recipe.title}</h1>
          <p className="text-lg text-text-secondary dark:text-gray-400 font-medium italic">"{recipe.subtitle}"</p>
          <div className="flex flex-wrap gap-4">
            {[{ icon: 'schedule', label: recipe.time }, { icon: 'group', label: recipe.servings }, { icon: 'local_fire_department', label: recipe.calories }, { icon: 'star', label: recipe.rating, highlight: true }].map((stat, idx) => (
              <div key={idx} className={`flex items-center gap-2.5 rounded-2xl border px-5 py-3 shadow-sm transition-all ${stat.highlight ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-surface-light dark:bg-white/5 border-gray-100 dark:border-white/5'}`}>
                <span className="material-symbols-outlined text-[22px]">{stat.icon}</span>
                <span className="text-base font-black tracking-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-text-main dark:text-white uppercase tracking-widest flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">kitchen</span> Malzemeler
              </h2>
              <span className="text-xs font-bold bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-full text-gray-500">{recipe.ingredients.length} Kalem</span>
            </div>
            <div ref={converterRef} className={`rounded-3xl bg-white dark:bg-stone-900/50 border overflow-hidden transition-all ${highlightConverter ? 'ring-4 ring-primary/20 border-primary' : 'border-gray-100 dark:border-white/5'}`}>
              <button onClick={() => setIsConverterOpen(!isConverterOpen)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                <div className="flex items-center gap-3"><span className="material-symbols-outlined text-primary">straighten</span><span className="font-black text-primary text-sm uppercase tracking-widest">Hızlı Ölçü Dönüştürücü</span></div>
                <span className={`material-symbols-outlined text-primary transition-transform duration-300 ${isConverterOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {isConverterOpen && <div className="p-5 flex flex-col md:flex-row gap-3 border-t border-gray-100 dark:border-white/5">
                <input type="number" value={convAmount} onChange={(e) => setConvAmount(e.target.value)} className="flex-1 h-12 rounded-xl bg-gray-100 dark:bg-black/20 border-none font-bold px-4 text-sm" />
                <div className="flex items-center gap-3 flex-[2]">
                  <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} className="flex-1 h-12 rounded-xl bg-gray-100 dark:bg-black/20 border-none font-bold px-4 appearance-none text-xs">{Object.keys(UNIT_RATIOS).map(u => <option key={u}>{u}</option>)}</select>
                  <span className="material-symbols-outlined text-primary">sync</span>
                  <div className="flex-1 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg">{convertedResult} ml</div>
                </div>
              </div>}
            </div>
            <ul className="flex flex-col gap-3">
              {recipe.ingredients.map((ing) => {
                const isChecked = checkedIds.has(ing.id);
                return (
                  <li key={ing.id} onClick={() => toggleIngredient(ing.id)} className={`group flex items-center gap-4 p-5 rounded-[2rem] border transition-all cursor-pointer ${isChecked ? 'bg-primary/5 border-primary/20' : 'bg-surface-light dark:bg-surface-dark border-gray-50 dark:border-white/5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'}`}>
                    <div className={`size-8 rounded-full border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-primary border-primary text-white' : 'border-gray-300 text-transparent'}`}><span className="material-symbols-outlined text-sm font-black">check</span></div>
                    <span className={`flex-1 font-bold text-lg ${isChecked ? 'text-gray-400 line-through' : ''}`}>{ing.amount} {ing.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleIngredientQuickConvert(ing.amount); }} className="size-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition-all"><span className="material-symbols-outlined text-[20px]">straighten</span></button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-6">
            <h2 className="text-2xl font-black text-text-main dark:text-white uppercase tracking-widest flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">auto_stories</span> Hazırlanışı
            </h2>
            <div className="flex flex-col gap-8">
              {recipe.steps.map((step, index) => (
                <div key={step.id} className="relative flex flex-col gap-6 p-8 rounded-[3rem] bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:shadow-xl transition-all">
                  <div className="absolute -left-4 -top-4 size-14 rounded-[1.5rem] bg-primary text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-primary/40 ring-8 ring-background-light dark:ring-background-dark">{index + 1}</div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-text-main dark:text-white">{step.title}</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{step.description}</p>
                    {step.image && <img src={step.image} className="w-full h-72 object-cover rounded-[2.5rem] mt-6 shadow-inner ring-1 ring-black/5" />}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-10 right-10 z-40">
        <button
          onClick={() => { if (recipe.steps.length) setIsCookingMode(true); }}
          className="group flex h-20 items-center justify-center gap-4 rounded-[2.5rem] bg-primary px-10 text-white font-black shadow-2xl shadow-primary/50 hover:scale-105 active:scale-95 transition-all text-xl"
        >
          <span className="material-symbols-outlined text-4xl group-hover:rotate-12 transition-transform">restaurant_menu</span>
          PİŞİRMEYE BAŞLA
        </button>
      </div>
      <div className="h-32 lg:hidden" />
    </div>
  );
};

export default RecipeDetailScreen;
