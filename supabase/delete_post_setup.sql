-- Run this once in the Supabase SQL editor to enable post deletion.
-- It adds owner delete policies, cascades, and a secure delete_own_post RPC.

-- Allow users to delete their own posts
DO $$ BEGIN
  CREATE POLICY "Users can delete own posts"
    ON posts FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow users to manage their own cheers
DO $$ BEGIN
  CREATE POLICY "Users can insert own cheers"
    ON post_cheers FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own cheers"
    ON post_cheers FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow post owners to remove cheers/comments tied to their posts
DO $$ BEGIN
  CREATE POLICY "Post owners can delete cheers on their posts"
    ON post_cheers FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM posts
        WHERE posts.id = post_cheers.post_id
          AND posts.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Post owners can delete comments on their posts"
    ON comments FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM posts
        WHERE posts.id = comments.post_id
          AND posts.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Post owners can delete recipe ingredients"
    ON recipe_ingredients FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM posts
        WHERE posts.id = recipe_ingredients.post_id
          AND posts.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Post owners can delete recipe steps"
    ON recipe_steps FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM posts
        WHERE posts.id = recipe_steps.post_id
          AND posts.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION delete_own_post(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM posts
    WHERE id = post_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You can only delete your own posts';
  END IF;

  DELETE FROM post_cheers WHERE post_cheers.post_id = delete_own_post.post_id;
  DELETE FROM comments WHERE comments.post_id = delete_own_post.post_id AND parent_id IS NOT NULL;
  DELETE FROM comments WHERE comments.post_id = delete_own_post.post_id;
  DELETE FROM recipe_ingredients WHERE recipe_ingredients.post_id = delete_own_post.post_id;
  DELETE FROM recipe_steps WHERE recipe_steps.post_id = delete_own_post.post_id;
  DELETE FROM posts WHERE id = delete_own_post.post_id AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_post(uuid) TO authenticated;
