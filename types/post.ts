export interface RecipeIngredient {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface SubActionReminder {
  id: string;
  type: 'stir' | 'flip' | 'baste' | 'check' | 'add_ingredient' | 'custom';
  label: string;
  startOffsetSeconds: number; // Seconds relative to step start
  endOffsetSeconds?: number;   // Optional end offset for range actions like stirring
}

export interface RecipeStep {
  id?: string;
  step_number?: number;
  title: string;
  description: string;
  start_time?: number | null; // Seconds from the beginning of the recipe
  duration?: number | null; // Total seconds
  step_type?: 'prep' | 'heat';
  stepType?: 'prep' | 'heat';
  used_ingredients?: string[];
  usedIngredients?: string[];
  sub_actions?: SubActionReminder[];
  subActions?: SubActionReminder[];
}

export interface Post {
  id: string;
  user_id: string;
  username: string;
  userAvatar?: string | null;
  imageUrl?: string | null;
  caption: string;
  cheers: number;
  comments: number;
  shares: number;
  timestamp: string;
  updated_at?: string | null;
  has_cheered?: boolean;
  post_type?: 'text' | 'recipe';
  recipe_title?: string | null;
  total_duration?: number | null; // Total seconds for the whole recipe
  recipe_ingredients?: RecipeIngredient[];
  recipe_steps?: RecipeStep[];
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  username: string;
  userAvatar?: string | null;
  replies?: Comment[];
}