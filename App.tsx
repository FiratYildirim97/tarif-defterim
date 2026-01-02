import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import RecipeDetailScreen from './screens/RecipeDetailScreen';
import AddRecipeScreen from './screens/AddRecipeScreen';
import SettingsScreen from './screens/SettingsScreen';
import { ThemeMode, Recipe, Category } from './types';
import { INITIAL_RECIPES } from './constants';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { ToastProvider } from './contexts/ToastContext';

// Hardcoded Firebase Configuration

// Hardcoded Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9idTPYpjZApVudE9YX3gTNpIg0ZHfc2Y",
  authDomain: "tarif-defterim-f0aae.firebaseapp.com",
  projectId: "tarif-defterim-f0aae",
  storageBucket: "tarif-defterim-f0aae.firebasestorage.app",
  messagingSenderId: "285283683122",
  appId: "1:285283683122:web:37c700aa2f44081db0a52b"
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(ThemeMode.LIGHT);
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('local_recipes');
    return saved ? JSON.parse(saved) : INITIAL_RECIPES;
  });
  const [categories, setCategories] = useState<string[]>(Object.values(Category));
  const [userName, setUserName] = useState<string>(localStorage.getItem('user_name') || 'Şef Adayı');

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
    let unsubscribe: () => void;
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(app);
      const recipesCol = collection(db, 'tarif_defterim');

      // 1. Listen for remote changes
      unsubscribe = onSnapshot(recipesCol, (snapshot) => {
        isSyncingRef.current = true;
        const remoteRecipes: Recipe[] = [];
        snapshot.forEach((doc) => {
          remoteRecipes.push(doc.data() as Recipe);
        });

        // Always trust remote as the source of truth if it has data
        if (remoteRecipes.length > 0) {
          setRecipes(remoteRecipes);
        } else if (recipes.length > 0 && recipes !== INITIAL_RECIPES) {
          // If remote is empty but we have local data (first time setup), upload local
          // This is a one-time migration or initialization step
          const batch = writeBatch(db);
          recipes.forEach(recipe => {
            const docRef = doc(db, 'tarif_defterim', recipe.id);
            batch.set(docRef, recipe);
          });
          batch.commit().then(() => console.log("Initial Migration Done"));
        }

        isSyncingRef.current = false;
      });

    } catch (err) {
      console.error("Firebase Sync Error:", err);
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // We need to change how we sync. Instead of syncing on "recipes" state change (which triggers on download too),
  // we should have specific functions for adding/updating that push to Firebase directly.

  // However, to keep it simple with current architecture:
  // We will trust that "recipes" state update coming from "onSnapshot" sets isSyncingRef=true
  // Upload changes to Firebase - REMOVED (Replaced with direct actions)

  // Persistence
  useEffect(() => {
    localStorage.setItem('local_recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('user_name', userName);
  }, [userName]);

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

  const toggleFavorite = async (id: string) => {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    const updated = { ...recipe, isFavorite: !recipe.isFavorite };

    // Optimistic
    setRecipes(prev => prev.map(r => r.id === id ? updated : r));

    // Remote
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(app);
      await setDoc(doc(db, 'tarif_defterim', id), updated);
    } catch (err) {
      console.error("Fav Error:", err);
    }
  };

  const addCategory = (name: string) => {
    if (name && !categories.includes(name)) {
      setCategories(prev => [...prev, name]);
    }
  };

  const addRecipe = async (newRecipe: Recipe) => {
    // Optimistic
    setRecipes(prev => [newRecipe, ...prev]);

    // Remote
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(app);
      await setDoc(doc(db, 'tarif_defterim', newRecipe.id), newRecipe);
    } catch (err) {
      console.error("Add Recipe Error:", err);
      alert("Tarif buluta kaydedilemedi, internet bağlantınızı kontrol edin.");
    }
  };

  const updateRecipe = async (updatedRecipe: Recipe) => {
    // Optimistic
    setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));

    // Remote
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(app);
      await setDoc(doc(db, 'tarif_defterim', updatedRecipe.id), updatedRecipe);
    } catch (err) {
      console.error("Update Recipe Error:", err);
      alert("Değişiklikler kaydedilemedi.");
    }
  };

  const deleteRecipe = async (id: string) => {
    if (!window.confirm('Bu tarifi silmek istediğinize emin misiniz?')) return;

    // Optimistic
    setRecipes(prev => prev.filter(r => r.id !== id));

    // Remote
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(app);
      await deleteDoc(doc(db, 'tarif_defterim', id));
    } catch (err) {
      console.error("Delete Recipe Error:", err);
      alert("Silme işlemi kaydedilemedi.");
    }
  };

  const resetData = () => {
    if (window.confirm('Tüm verileri sıfırlamak istediğinize emin misiniz? Kendi eklediğiniz tarifler silinecektir.')) {
      setRecipes(INITIAL_RECIPES);
      setUserName('Şef Adayı');
      alert('Uygulama başarıyla sıfırlandı.');
    }
  };

  return (
    <div className="mx-auto min-h-screen relative shadow-2xl bg-background-light dark:bg-background-dark overflow-x-hidden md:max-w-4xl lg:max-w-6xl xl:max-w-screen-xl border-x border-gray-100 dark:border-stone-900">
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route
              path="/"
              element={
                <HomeScreen
                  recipes={recipes}
                  toggleFavorite={toggleFavorite}
                  categories={categories}
                  onAddCategory={addCategory}
                  userName={userName}
                  deleteRecipe={deleteRecipe}
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
                  deleteRecipe={deleteRecipe}
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
                />
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </div>
  );
};

export default App;
