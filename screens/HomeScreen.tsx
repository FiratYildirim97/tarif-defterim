
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category, Recipe } from '../types';
import BottomNav from '../components/BottomNav';
import FilterModal from '../components/FilterModal';


interface HomeScreenProps {
  recipes: Recipe[];
  toggleFavorite: (id: string) => void;
  categories: string[];
  onAddCategory: (name: string) => void;
  userName?: string;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ recipes, toggleFavorite, categories, onAddCategory, userName = 'Şef' }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>(Category.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // AI Suggestion State Removed

  const filteredRecipes = recipes.filter(recipe => {
    const matchesCategory = selectedCategory === Category.ALL || recipe.category === selectedCategory;
    const title = recipe.title || '';
    const subtitle = recipe.subtitle || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getIconForCategory = (cat: string) => {
    switch (cat) {
      case Category.ALL: return 'apps';
      case Category.BREAKFAST: return 'bakery_dining';
      case Category.MAIN: return 'restaurant';
      case Category.DESSERT: return 'icecream';
      case Category.SOUP: return 'soup_kitchen';
      case Category.SALAD: return 'eco';
      default: return 'label';
    }
  };

  const handleAddNewCategory = () => {
    const name = window.prompt('Yeni kategori adını girin:');
    if (name && name.trim()) {
      onAddCategory(name.trim());
    }
  };

  // AI Suggestion Handler Removed

  return (
    <div className="min-h-screen">
      <div className="flex flex-col md:flex-row md:gap-10">

        {/* LEFT COLUMN / SIDEBAR (Tablet Landscape) */}
        <aside className="md:w-85 lg:w-96 md:h-screen md:sticky md:top-0 md:bg-surface-light md:dark:bg-surface-dark md:border-r md:border-gray-100 md:dark:border-stone-900 md:p-8 flex flex-col shrink-0 pb-32 md:pb-32 overflow-y-auto no-scrollbar">
          <header className="flex items-center justify-between mb-8 md:mb-12 p-6 md:p-0">
            <div className="flex flex-col">
              <span className="text-text-secondary dark:text-primary/80 text-xs font-black tracking-widest uppercase">Merhaba, {userName}</span>
              <h1 className="text-text-main dark:text-white text-2xl font-bold">Tarif Defterim</h1>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="h-10 w-10 rounded-full overflow-hidden border-2 border-white dark:border-stone-800 shadow-sm transition-transform hover:scale-110"
            >
              <img
                alt="User"
                className="h-full w-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-3BP8MI0Qu5hJ4Qj-eZTPHguhPU28P8AiE-mUhaRAzz78zeJpNw9Z53svjbVX8OVkZXoxb20_m73kMLbzPbFp5-Oc-ViPxomy7ap4DbFwbvXJi_rQvHNLtovsBZq-DtmoL3LUBOYrMQGaKBAaGLYIkLI8vuXxYEzpTkwJkDqoKotAAvN3pZwV09UbzxWLw53GcZmi1Jd94hyypCj1aQiCj-8b2kgkbaBvO1SzS0Armd34KhzDvUgNwP-RPGbIZPxouljovW3rPaU"
              />
            </button>
          </header>

          {/* AI Chef Card in Sidebar */}
          {/* AI Chef Card Removed */}

          <div className="px-6 md:px-0 mb-8">
            <div className="group relative flex w-full items-center">
              <span className="absolute left-4 text-text-secondary dark:text-gray-400">
                <span className="material-symbols-outlined text-[22px]">search</span>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full rounded-2xl border-none bg-gray-100 dark:bg-stone-900/50 pl-12 pr-4 text-sm font-bold text-text-main dark:text-white focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Tarif ara..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar md:flex-1 px-6 md:px-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Kategoriler</span>
            <div className="flex flex-row md:flex-col gap-2 overflow-x-auto no-scrollbar pb-4 md:pb-0">
              {categories.map((catLabel) => (
                <button
                  key={catLabel}
                  onClick={() => setSelectedCategory(catLabel)}
                  className={`flex h-11 shrink-0 items-center gap-x-3 rounded-xl px-4 transition-all ${selectedCategory === catLabel
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${selectedCategory === catLabel ? 'text-white' : 'text-primary'}`}>
                    {getIconForCategory(catLabel)}
                  </span>
                  <p className="text-sm font-bold tracking-tight">{catLabel}</p>
                </button>
              ))}
              <button
                onClick={handleAddNewCategory}
                className="flex h-11 shrink-0 items-center gap-x-3 rounded-xl px-4 text-primary border border-dashed border-primary/40 hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <p className="text-sm font-bold">Yeni Kategori</p>
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN / MAIN FEED (Tablet Landscape) */}
        <main className="flex-1 px-6 md:px-10 py-8 md:py-12 pb-32 md:pb-40">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-text-main dark:text-white">{selectedCategory} Tarifler</h2>
              <p className="text-sm font-medium text-text-secondary">{filteredRecipes.length} muhteşem lezzet listelendi</p>
            </div>
            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-white dark:bg-stone-900 border border-gray-100 dark:border-white/5 px-4 py-2.5 text-sm font-bold shadow-sm hover:shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span> Filtrele
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                className="group flex flex-col rounded-[2.5rem] bg-surface-light dark:bg-surface-dark overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 border border-gray-50 dark:border-white/5 cursor-pointer transform hover:scale-[1.02]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    alt={recipe.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src={recipe.image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(recipe.id);
                    }}
                    className="absolute top-4 right-4 z-10 size-11 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white transition-all hover:text-red-500"
                  >
                    <span className={`material-symbols-outlined ${recipe.isFavorite ? 'fill-current text-red-500' : ''}`} style={{ fontVariationSettings: recipe.isFavorite ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                  </button>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h4 className="text-text-main dark:text-white text-xl font-black mb-2 line-clamp-1">{recipe.title}</h4>
                  <p className="text-text-secondary dark:text-gray-400 text-sm font-medium mb-4 line-clamp-2 leading-relaxed">{recipe.subtitle}</p>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                        <span className="text-xs font-bold text-gray-500">{recipe.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-primary">star</span>
                        <span className="text-xs font-black text-primary">{recipe.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="text-center py-32 bg-surface-light dark:bg-stone-900/50 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-white/5 flex flex-col items-center">
              <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">search_off</span>
              <p className="text-lg font-bold text-gray-400">Aradığın kriterlerde tarif bulunamadı.</p>
              <button onClick={() => { setSearchQuery(''); setSelectedCategory(Category.ALL); }} className="mt-4 text-primary font-bold underline">Tümünü Göster</button>
            </div>
          )}
        </main>
      </div>

      <BottomNav activeTab="home" />
      {isFilterOpen && <FilterModal onClose={() => setIsFilterOpen(false)} />}

      {/* AI Suggestion Result Modal Removed */}
    </div>
  );
};

export default HomeScreen;
