
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Category, Step, Recipe, Ingredient } from '../types';
import { INITIAL_RECIPES } from '../constants';
import { analyzeRecipeImage, analyzeMultipleRecipesFromDoc } from '@/services/ocr';

interface AddRecipeScreenProps {
  categories: string[];
  onAddCategory: (name: string) => void;
  onAddRecipe: (recipe: Recipe) => void;
  onUpdateRecipe?: (recipe: Recipe) => void;
  recipes?: Recipe[];
}

const AddRecipeScreen: React.FC<AddRecipeScreenProps> = ({
  categories,
  onAddCategory,
  onAddRecipe,
  onUpdateRecipe,
  recipes = []
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = Boolean(id);
  const existingRecipe = useMemo(() => recipes.find(r => r.id === id), [id, recipes]);

  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [servings, setServings] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categories.find(c => c !== Category.ALL) || Category.BREAKFAST
  );

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<{ amount: string; name: string }[]>([{ amount: '', name: '' }]);
  const [steps, setSteps] = useState<Partial<Step>[]>([{ title: '', description: '', image: '' }]);

  useEffect(() => {
    if (isEditMode && existingRecipe) {
      setName(existingRecipe.title);
      setTime(existingRecipe.time);
      setServings(existingRecipe.servings);
      setSelectedCategory(existingRecipe.category);
      setCoverImage(existingRecipe.image);
      setIngredients(existingRecipe.ingredients.map(i => ({ amount: i.amount, name: i.name })));
      setSteps(existingRecipe.steps.map(s => ({ title: s.title, description: s.description, image: s.image })));
    }
  }, [isEditMode, existingRecipe]);

  const ingredientSuggestions = useMemo(() => {
    const names = INITIAL_RECIPES.flatMap(r => r.ingredients.map(i => i.name));
    return Array.from(new Set(names)).sort();
  }, []);

  const addIngredient = () => setIngredients([...ingredients, { amount: '', name: '' }]);
  const removeIngredient = (index: number) => { if (ingredients.length > 1) { const newIngs = [...ingredients]; newIngs.splice(index, 1); setIngredients(newIngs); } };
  const updateIngredient = (index: number, field: 'amount' | 'name', val: string) => { const newIngs = [...ingredients]; newIngs[index] = { ...newIngs[index], [field]: val }; setIngredients(newIngs); };

  const addStep = () => setSteps([...steps, { title: '', description: '', image: '' }]);
  const removeStep = (index: number) => { if (steps.length > 1) { const newSteps = [...steps]; newSteps.splice(index, 1); setSteps(newSteps); } };
  const updateStep = (index: number, field: keyof Step, value: string) => { const newSteps = [...steps]; newSteps[index] = { ...newSteps[index], [field]: value }; setSteps(newSteps); };

  const handleAddNewCategory = () => {
    const name = window.prompt('Yeni kategori adını girin:');
    if (name && name.trim()) { onAddCategory(name.trim()); setSelectedCategory(name.trim()); }
  };

  // Utility to compress images
  const compressImage = async (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Moderate compression
      };
    });
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      const compressed = await compressImage(rawBase64);
      setCoverImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleAIScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      // 1. Get raw base64 for OCR (OCR might prefer high res, but limits apply)
      const rawBase64 = reader.result as string;
      const rawData = rawBase64.split(',')[1];

      // 2. Compress for UI/Storage
      const compressed = await compressImage(rawBase64);
      if (!coverImage) setCoverImage(compressed);

      setIsAnalyzing(true);
      try {
        const result = await analyzeRecipeImage(rawData);
        if (result) {
          setName(result.name || ''); setTime(result.time || ''); setServings(result.servings || '');
          if (result.ingredients?.length > 0) setIngredients(result.ingredients);
          if (result.steps?.length > 0) setSteps(result.steps);
        }
      } catch (err) { alert("Tarif analiz edilemedi."); } finally { setIsAnalyzing(false); }
    };
    reader.readAsDataURL(file);
  };

  // Fix: Cast files to File[] to resolve 'unknown' type errors for file access
  const handleBatchScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsBatchAnalyzing(true);
    try {
      const fileData = await Promise.all(files.map(file => {
        return new Promise<{ mimeType: string, data: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              mimeType: file.type,
              data: (reader.result as string).split(',')[1]
            });
          };
          reader.readAsDataURL(file);
        });
      }));

      const results = await analyzeMultipleRecipesFromDoc(fileData);
      if (results && results.length > 0) {
        setBatchResults(results);
      } else {
        alert("Dosyalarda tarif bulunamadı.");
      }
    } catch (err) {
      alert("Toplu analiz sırasında bir hata oluştu.");
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  const addBatchRecipesToDefter = () => {
    batchResults.forEach(res => {
      const newRecipe: Recipe = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        title: res.name || 'Adsız Tarif',
        subtitle: `${res.category || 'Genel'} kategorisinden toplu eklenen tarif`,
        image: 'https://images.unsplash.com/photo-1495195129352-aec325a55b65?auto=format&fit=crop&q=80&w=1000',
        time: res.time || '0 dk',
        servings: res.servings || '1 Kişilik',
        calories: '0 kcal',
        rating: 5.0,
        difficulty: 'Kolay',
        category: res.category || Category.BREAKFAST,
        isFavorite: false,
        ingredients: (res.ingredients || []).map((ing: any, i: number) => ({ id: `i-${Date.now()}-${i}`, name: ing.name, amount: ing.amount })),
        steps: (res.steps || []).map((step: any, i: number) => ({
          id: `s-${Date.now()}-${i}`,
          title: `Adım ${i + 1}`,
          description: step.description
        }))
      };
      onAddRecipe(newRecipe);
    });
    alert(`${batchResults.length} tarif defterine eklendi!`);
    navigate('/home');
  };

  const handleSave = () => {
    const recipeData: Recipe = {
      id: isEditMode && existingRecipe ? existingRecipe.id : Date.now().toString(),
      title: name || 'Adsız Tarif',
      subtitle: `${selectedCategory} kategorisinde ${isEditMode ? 'güncellenmiş' : 'yeni'} bir tarif`,
      image: coverImage || 'https://images.unsplash.com/photo-1495195129352-aec325a55b65?auto=format&fit=crop&q=80&w=1000',
      time: time || '0 dk',
      servings: servings || '1 Kişilik',
      calories: isEditMode && existingRecipe ? existingRecipe.calories : '0 kcal',
      rating: isEditMode && existingRecipe ? existingRecipe.rating : 5.0,
      difficulty: isEditMode && existingRecipe ? existingRecipe.difficulty : 'Kolay',
      category: selectedCategory,
      isFavorite: isEditMode && existingRecipe ? existingRecipe.isFavorite : false,
      ingredients: ingredients.filter(ing => ing.name.trim() !== '').map((ing, idx) => ({ id: `i-${Date.now()}-${idx}`, name: ing.name, amount: ing.amount })),
      steps: steps.filter(step => step.description?.trim() !== '').map((step, idx) => ({ id: `s-${Date.now()}-${idx}`, title: step.title || `Adım ${idx + 1}`, description: step.description || '', image: step.image }))
    };
    if (isEditMode && onUpdateRecipe) onUpdateRecipe(recipeData); else onAddRecipe(recipeData);
    navigate(isEditMode ? `/recipe/${recipeData.id}` : '/home');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen">
      <datalist id="ingredient-suggestions">{ingredientSuggestions.map(s => <option key={s} value={s} />)}</datalist>

      <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-6 py-6 border-b border-gray-100 dark:border-stone-900 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-text-secondary dark:text-primary font-black uppercase tracking-widest text-xs">VAZGEÇ</button>
        <h2 className="text-xl font-black text-text-main dark:text-white uppercase tracking-tighter">{isEditMode ? 'TARİFİ DÜZENLE' : 'YENİ TARİF EKLE'}</h2>
        <button onClick={handleSave} className="bg-primary text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">KAYDET</button>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* LEFT COLUMN: VISUALS & BASICS */}
          <div className="lg:col-span-5 flex flex-col gap-10">
            {!isEditMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Single Scan */}
                <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-orange-600 p-6 text-white shadow-xl shadow-primary/20 cursor-pointer transition-all hover:scale-[1.02]" onClick={() => scanInputRef.current?.click()}>
                  <input type="file" accept="image/*" className="hidden" ref={scanInputRef} onChange={handleAIScan} />
                  <div className="flex flex-col items-center gap-3 text-center">
                    <span className="material-symbols-outlined text-4xl">photo_camera</span>
                    <div><h3 className="text-sm font-black">FOTOĞRAFTAN EKLE</h3><p className="text-[10px] opacity-80">Tek bir tarif için</p></div>
                  </div>
                  {isAnalyzing && <div className="absolute inset-0 bg-primary/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in"><div className="h-8 w-8 border-4 border-white/20 border-t-white rounded-full animate-spin mb-2" /> <span className="text-[10px] font-black uppercase">Metin Okunuyor...</span></div>}
                </div>

                {/* Batch Scan */}
                <div className="group relative overflow-hidden rounded-[2rem] bg-surface-dark p-6 text-white shadow-xl cursor-pointer transition-all hover:scale-[1.02]" onClick={() => batchInputRef.current?.click()}>
                  <input type="file" accept="image/*,application/pdf" multiple className="hidden" ref={batchInputRef} onChange={handleBatchScan} />
                  <div className="flex flex-col items-center gap-3 text-center">
                    <span className="material-symbols-outlined text-4xl text-primary">picture_as_pdf</span>
                    <div><h3 className="text-sm font-black text-white">TOPLU PDF/GÖRSEL</h3><p className="text-[10px] text-gray-400">Çoklu tarif tarayıcı</p></div>
                  </div>
                  {isBatchAnalyzing && <div className="absolute inset-0 bg-stone-900/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in"><div className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-2" /> <span className="text-[10px] font-black uppercase text-primary">PDF Taranıyor...</span></div>}
                </div>
              </div>
            )}

            {/* Batch Preview Results */}
            {batchResults.length > 0 && (
              <div className="bg-white dark:bg-stone-900/80 rounded-[2.5rem] p-8 border border-primary/20 shadow-2xl animate-in slide-in-from-top duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-primary uppercase tracking-widest">Bulunan Tarifler ({batchResults.length})</h3>
                  <button onClick={() => setBatchResults([])} className="text-gray-400 hover:text-red-500"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2 mb-6">
                  {batchResults.map((res, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                      <p className="font-black text-text-main dark:text-white uppercase text-sm mb-1">{res.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{res.category || 'Genel'} • {res.time || 'N/A'}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addBatchRecipesToDefter}
                  className="w-full h-14 rounded-2xl bg-primary text-white font-black tracking-widest uppercase text-xs shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">library_add</span>
                  DEFTERE EKLE ({batchResults.length})
                </button>
              </div>
            )}

            <section className="space-y-6">
              <h3 className="text-lg font-black text-text-main dark:text-white uppercase tracking-widest px-2">Kapak Fotoğrafı</h3>
              <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={handleCoverUpload} />
              <div onClick={() => coverInputRef.current?.click()} className="relative aspect-video w-full rounded-[2.5rem] border-4 border-dashed border-gray-100 dark:border-stone-800 bg-surface-light dark:bg-stone-900/50 overflow-hidden flex flex-col items-center justify-center hover:border-primary/50 transition-all cursor-pointer group shadow-sm">
                {coverImage ? <img src={coverImage} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <><span className="material-symbols-outlined text-5xl text-gray-200 mb-2">add_photo_alternate</span><p className="font-bold text-gray-400">Görsel Seç</p></>}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex flex-col gap-4">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-16 rounded-2xl bg-surface-light dark:bg-stone-900 border-none shadow-sm px-6 text-xl font-black focus:ring-4 focus:ring-primary/20" placeholder="Tarifin Adı Ne?" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative"><span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">schedule</span><input type="text" value={time} onChange={(e) => setTime(e.target.value)} className="w-full h-14 pl-12 pr-4 rounded-xl bg-surface-light dark:bg-stone-900 border-none font-bold" placeholder="Hazırlama Süresi" /></div>
                  <div className="relative"><span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">group</span><input type="text" value={servings} onChange={(e) => setServings(e.target.value)} className="w-full h-14 pl-12 pr-4 rounded-xl bg-surface-light dark:bg-stone-900 border-none font-bold" placeholder="Kaç Kişilik?" /></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2"><span className="text-xs font-black text-gray-400 uppercase">Kategori Seç</span><button onClick={handleAddNewCategory} className="text-xs font-black text-primary hover:underline">+ YENİ EKLE</button></div>
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c !== Category.ALL).map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`h-10 px-6 rounded-xl text-sm font-black transition-all ${selectedCategory === cat ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 dark:bg-stone-900 text-gray-500 hover:bg-gray-200'}`}>{cat}</button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: INGREDIENTS & STEPS */}
          <div className="lg:col-span-7 flex flex-col gap-12 lg:pl-12 lg:border-l lg:border-gray-100 lg:dark:border-stone-900">

            <section className="space-y-6">
              <h3 className="text-lg font-black text-text-main dark:text-white uppercase tracking-widest px-2">Malzeme Listesi</h3>
              <div className="flex flex-col gap-4">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-3 group animate-in slide-in-from-right duration-300">
                    <input type="text" value={ing.amount} onChange={(e) => updateIngredient(idx, 'amount', e.target.value)} className="w-24 h-12 rounded-xl border-none bg-surface-light dark:bg-stone-900 font-bold px-3 text-sm shadow-sm" placeholder="Miktar" />
                    <input type="text" value={ing.name} list="ingredient-suggestions" onChange={(e) => updateIngredient(idx, 'name', e.target.value)} className="flex-1 h-12 rounded-xl border-none bg-surface-light dark:bg-stone-900 font-bold px-4 text-sm shadow-sm" placeholder="Malzeme Adı" />
                    <button onClick={() => removeIngredient(idx)} className="size-12 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><span className="material-symbols-outlined">delete</span></button>
                  </div>
                ))}
              </div>
              <button onClick={addIngredient} className="w-full h-14 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-black flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">+ MALZEME EKLE</button>
            </section>

            <section className="space-y-6">
              <h3 className="text-lg font-black text-text-main dark:text-white uppercase tracking-widest px-2">Hazırlanış Adımları</h3>
              <div className="flex flex-col gap-8">
                {steps.map((step, idx) => (
                  <div key={idx} className="relative flex flex-col gap-4 p-8 rounded-[2.5rem] bg-white dark:bg-stone-900 border border-gray-100 dark:border-stone-800 shadow-sm animate-in zoom-in-95 duration-500">
                    <div className="absolute -left-4 -top-4 size-12 rounded-[1.2rem] bg-primary text-white flex items-center justify-center font-black text-xl shadow-lg ring-8 ring-background-light dark:ring-background-dark">{idx + 1}</div>
                    <div className="flex items-center gap-3">
                      <input type="text" value={step.title} onChange={(e) => updateStep(idx, 'title', e.target.value)} className="flex-1 bg-transparent border-none text-xl font-black placeholder:text-gray-200 focus:ring-0" placeholder="Adım Başlığı (Opsiyonel)" />
                      <button onClick={() => removeStep(idx)} className="text-red-300 hover:text-red-500"><span className="material-symbols-outlined">close</span></button>
                    </div>
                    <textarea value={step.description} onChange={(e) => updateStep(idx, 'description', e.target.value)} className="w-full min-h-[120px] rounded-2xl bg-gray-50 dark:bg-black/20 border-none p-5 text-base font-medium resize-none focus:ring-2 focus:ring-primary/10" placeholder="Bu adımda ne yapılacak?" />
                  </div>
                ))}
              </div>
              <button onClick={addStep} className="w-full h-14 rounded-2xl bg-primary/5 border border-primary/20 text-primary font-black flex items-center justify-center gap-2 hover:bg-primary/10 transition-all">+ ADIM EKLE</button>
            </section>
          </div>
        </div>
      </main>

      <div className="h-32" />
    </div>
  );
};

export default AddRecipeScreen;
