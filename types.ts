
export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  group?: string;
  checked?: boolean;
}

export interface Step {
  id: string;
  title?: string;
  description: string;
  image?: string;
}

export interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  time: string;
  servings: string;
  calories: string;
  rating: number;
  difficulty: string;
  category: string;
  ingredients: Ingredient[];
  steps: Step[];
  isFavorite: boolean;
}

export enum Category {
  ALL = 'Tümü',
  BREAKFAST = 'Kahvaltı',
  MAIN = 'Ana Yemek',
  DESSERT = 'Tatlı',
  SOUP = 'Çorba',
  SALAD = 'Salata'
}

export enum ThemeMode {
  SYSTEM = 'system',
  LIGHT = 'light',
  DARK = 'dark'
}
