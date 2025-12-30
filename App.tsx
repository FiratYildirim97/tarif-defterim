
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen';
import HomeScreen from './screens/HomeScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import RecipeDetailScreen from './screens/RecipeDetailScreen';
import AddRecipeScreen from './screens/AddRecipeScreen';
import SettingsScreen from './screens/SettingsScreen';
import FirebaseConfigScreen from './screens/FirebaseConfigScreen';
import { ThemeMode, Recipe, Category } from './types';
import { INITIAL_RECIPES } from './constants';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, writeBatch } from 'firebase/firestore';

const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(ThemeMode.LIGHT);
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('local_recipes');
    return saved ? JSON.parse(saved) : INITIAL_RECIPES;
  });
  const [categories, setCategories] = useState<string[]>(Object.values(Category));
  const [userName, setUserName] = useState<string>(localStorage.getItem('user_name') || 'Şef Adayı');
  const [firebaseConfig, setFirebaseConfig] = useState<string>(localStorage.getItem('fb_config') || '');

  const isSyncingRef = useRef(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('local_recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('user_name', userName);
  }, [userName]);

  // Firebase Initialization and Sync
  useEffect(() => {
    if (!firebaseConfig) return;

    let unsubscribe: () => void;
    try {
      const config = JSON.parse(firebaseConfig);
      const app = getApps().length === 0 ? initializeApp(config) : getApp();
      const db = getFirestore(app);
      const recipesCol = collection(db, 'recipes');

      // 1. Listen for remote changes
      unsubscribe = onSnapshot(recipesCol, (snapshot) => {
        isSyncingRef.current = true;
        const remoteRecipes: Recipe[] = [];
        snapshot.forEach((doc) => {
          remoteRecipes.push(doc.data() as Recipe);
        });

        if (remoteRecipes.length > 0) {
          // Merge logic: prefer remote but keep local if not in remote
          setRecipes(prev => {
            const merged = [...remoteRecipes];
            prev.forEach(local => {
              if (!merged.find(r => r.id === local.id)) {
                // If local recipe not on cloud, we'll need to upload it later
                merged.push(local);
              }
            });
            return merged;
          });
        }
        isSyncingRef.current = false;
      });

    } catch (err) {
      console.error("Firebase Sync Error:", err);
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, [firebaseConfig]);

  // Upload changes to Firebase
  useEffect(() => {
    if (!firebaseConfig || isSyncingRef.current) return;

    const syncToCloud = async () => {
      try {
        const config = JSON.parse(firebaseConfig);
        const app = getApps().length === 0 ? initializeApp(config) : getApp();
        const db = getFirestore(app);

        // Push all current recipes to Firestore
        // For performance, in a real app we'd only push changes
        const batch = writeBatch(db);
        recipes.forEach(recipe => {
          const docRef = doc(db, 'recipes', recipe.id);
          batch.set(docRef, recipe);
        });
        await batch.commit();
      } catch (err) {
        console.debug("Cloud upload failed", err);
      }
    };

    const timeout = setTimeout(syncToCloud, 2000); // Debounce sync
    return () => clearTimeout(timeout);
  }, [recipes, firebaseConfig]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === ThemeMode.DARK) {
      root.classList.add('dark');
    } else if (theme === ThemeMode.LIGHT) {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const toggleFavorite = (id: string) => {
    setRecipes(prev => prev.map(r =>
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    ));
  };

  const addCategory = (name: string) => {
    if (name && !categories.includes(name)) {
      setCategories(prev => [...prev, name]);
    }
  };

  const addRecipe = (newRecipe: Recipe) => {
    setRecipes(prev => [newRecipe, ...prev]);
  };

  const updateRecipe = (updatedRecipe: Recipe) => {
    setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
  };

  const resetData = () => {
    if (window.confirm('Tüm verileri sıfırlamak istediğinize emin misiniz? Kendi eklediğiniz tarifler silinecektir.')) {
      setRecipes(INITIAL_RECIPES);
      setUserName('Şef Adayı');
      alert('Uygulama başarıyla sıfırlandı.');
    }
  };

  const updateFirebaseConfig = (config: string) => {
    setFirebaseConfig(config);
    localStorage.setItem('fb_config', config);
  };

  return (
    <div className="mx-auto min-h-screen relative shadow-2xl bg-background-light dark:bg-background-dark overflow-x-hidden md:max-w-4xl lg:max-w-6xl xl:max-w-screen-xl border-x border-gray-100 dark:border-stone-900">
      <HashRouter>
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route
            path="/home"
            element={
              <HomeScreen
                recipes={recipes}
                toggleFavorite={toggleFavorite}
                categories={categories}
                onAddCategory={addCategory}
                userName={userName}
              />
            }
          />
          <Route
            path="/favorites"
            element={
              <FavoritesScreen
                recipes={recipes}
                toggleFavorite={toggleFavorite}
              />
            }
          />
          <Route
            path="/recipe/:id"
            element={
              <RecipeDetailScreen
                recipes={recipes}
                toggleFavorite={toggleFavorite}
              />
            }
          />
          <Route
            path="/add"
            element={
              <AddRecipeScreen
                categories={categories}
                onAddCategory={addCategory}
                onAddRecipe={addRecipe}
                recipes={recipes}
              />
            }
          />
          <Route
            path="/edit/:id"
            element={
              <AddRecipeScreen
                categories={categories}
                onAddCategory={addCategory}
                onAddRecipe={addRecipe}
                onUpdateRecipe={updateRecipe}
                recipes={recipes}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsScreen
                theme={theme}
                setTheme={setTheme}
                userName={userName}
                setUserName={setUserName}
                resetData={resetData}
                recipes={recipes}
                firebaseConfig={firebaseConfig}
                setFirebaseConfig={updateFirebaseConfig}
              />
            }
          />
          <Route
            path="/firebase-config"
            element={
              <FirebaseConfigScreen
                setFirebaseConfig={updateFirebaseConfig}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </div>
  );
};

export default App;
