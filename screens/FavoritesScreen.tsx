
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Recipe } from '../types';
import BottomNav from '../components/BottomNav';

interface FavoritesScreenProps {
  recipes: Recipe[];
  toggleFavorite: (id: string) => void;
}

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ recipes, toggleFavorite }) => {
  const navigate = useNavigate();
  const favoriteRecipes = recipes.filter(r => r.isFavorite);

  return (
    <div className="min-h-screen pb-32 md:pb-40 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="flex flex-col px-6 md:px-10 pt-12 pb-10">
        <h1 className="text-text-main dark:text-white text-4xl font-black leading-tight tracking-tight">Favorilerim</h1>
        <p className="text-text-secondary dark:text-gray-400 text-lg font-medium mt-1">Beğendiğin ve kaydettiğin özel lezzetler</p>
      </header>

      {/* Favorites GRID List */}
      <div className="px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteRecipes.map((recipe) => (
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
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(recipe.id);
                  }}
                  className="absolute top-4 right-4 z-10 size-12 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white transition-all hover:text-red-500"
                >
                  <span className="material-symbols-outlined fill-current text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </button>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <h4 className="text-text-main dark:text-white text-xl font-black mb-2">{recipe.title}</h4>
                <p className="text-text-secondary dark:text-gray-400 text-sm font-medium mb-4 line-clamp-2">{recipe.subtitle}</p>
                
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                  <div className="flex gap-4">
                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><span className="material-symbols-outlined text-[18px] text-primary">schedule</span>{recipe.time}</span>
                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><span className="material-symbols-outlined text-[18px] text-primary">star</span>{recipe.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {favoriteRecipes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center gap-6 bg-surface-light dark:bg-surface-dark rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-white/5">
            <div className="p-8 rounded-full bg-primary/5 text-primary">
              <span className="material-symbols-outlined text-7xl">favorite_border</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black">Henüz Favorin Yok</h3>
              <p className="text-gray-400 max-w-[300px] mx-auto">En sevdiğin tarifleri keşfet ve kalp simgesine basarak buraya ekle.</p>
            </div>
            <button 
              onClick={() => navigate('/home')}
              className="px-10 py-4 bg-primary text-white rounded-[2rem] font-black shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
            >
              KEŞFETMEYE BAŞLA
            </button>
          </div>
        )}
      </div>

      <BottomNav activeTab="favorites" />
    </div>
  );
};

export default FavoritesScreen;
