-- SQL Migration script to add step_type, used_ingredients, and sub_actions columns to recipe_steps table in Supabase

ALTER TABLE recipe_steps 
ADD COLUMN IF NOT EXISTS step_type TEXT DEFAULT 'heat',
ADD COLUMN IF NOT EXISTS used_ingredients JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sub_actions JSONB DEFAULT '[]'::jsonb;
