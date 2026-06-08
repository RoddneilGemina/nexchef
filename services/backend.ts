import { supabase, HAS_SUPABASE } from './supabase';

export interface UserProfile {
  id: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
}

// ============================================================================
// MOCK DATABASE (Fallback)
// ============================================================================
const mockDatabase = {
  users: [
    {
      id: 'usr_1',
      username: 'roronexchefdev',
      password: '123',
      bio: 'trying my first project!',
      avatarUrl: null,
    }
  ]
};

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ============================================================================
// BACKEND ADAPTER API
// This dynamically switches between Supabase (if configured) and the Mock DB.
// ============================================================================

// Helper to format dates
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const backendAPI = {
  auth: {
    login: async (username: string, password: string): Promise<UserProfile> => {
      
      // 1. SUPABASE IMPLEMENTATION
      if (HAS_SUPABASE) {
        const email = username.includes('@') ? username : `${username}@nexchef.app`;

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) throw new Error(error.message);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, bio, avatar_url')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) throw new Error(profileError.message);

        if (!profile) {
          throw new Error('Login succeeded, but your Profile is missing in the database! Make sure you inserted a row into the "profiles" table using your exact Auth UUID.');
        }

        return {
          id: profile.id,
          username: profile.username,
          bio: profile.bio,
          avatarUrl: profile.avatar_url,
        };
      } 
      
      // 2. MOCK IMPLEMENTATION (Fallback)
      else {
        await delay(800);
        const user = mockDatabase.users.find(u => u.username === username && u.password === password);
        if (!user) throw new Error('Invalid credentials');
        return { id: user.id, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl };
      }
    },
    
    checkSession: async (): Promise<UserProfile | null> => {
      if (!HAS_SUPABASE) return null;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, bio, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profile) return null;

      return {
        id: profile.id,
        username: profile.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
      };
    },

    onAuthStateChange: (callback: (profile: UserProfile | null) => void) => {
      if (!HAS_SUPABASE) {
        return { data: { subscription: { unsubscribe: () => {} } } };
      }

      return supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          callback(null);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, bio, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (profile) {
          callback({
            id: profile.id,
            username: profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatar_url,
          });
        } else {
          callback(null);
        }
      });
    }
  },
  
  users: {
    getProfile: async (id: string): Promise<UserProfile> => {
      if (HAS_SUPABASE) {
        const { data, error } = await supabase.from('profiles').select('id, username, bio, avatar_url').eq('id', id).single();
        if (error) throw new Error(error.message);
        return { id: data.id, username: data.username, bio: data.bio, avatarUrl: data.avatar_url };
      } else {
        await delay(400);
        const user = mockDatabase.users.find(u => u.id === id);
        if (!user) throw new Error('User not found');
        return { id: user.id, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl };
      }
    },
    updateProfile: async (id: string, username: string, bio: string): Promise<void> => {
      if (HAS_SUPABASE) {
        const { error } = await supabase.from('profiles').update({ username, bio }).eq('id', id);
        if (error) throw new Error(error.message);
      } else {
        await delay(400);
        // Mock ignore
      }
    }
  },

  posts: {
    createRecipe: async (title: string, caption: string, ingredients: any[], steps: any[]): Promise<void> => {
      if (!HAS_SUPABASE) {
        await delay(800);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // 1. Insert post with post_type 'recipe'
      const { data: post, error: postError } = await supabase.from('posts').insert({
        user_id: session.user.id,
        post_type: 'recipe',
        recipe_title: title,
        caption,
      }).select('id').single();

      if (postError) throw new Error(postError.message);

      // 2. Insert ingredients
      const validIngredients = ingredients.filter(i => i.name.trim());
      if (validIngredients.length > 0) {
        const { error: ingError } = await supabase.from('recipe_ingredients').insert(
          validIngredients.map(ing => ({
            post_id: post.id,
            name: ing.name.trim(),
            quantity: ing.quantity,
            unit: ing.unit,
          }))
        );
        if (ingError) throw new Error(ingError.message);
      }

      // 3. Insert steps
      const validSteps = steps.filter(s => s.title.trim());
      if (validSteps.length > 0) {
        const { error: stepError } = await supabase.from('recipe_steps').insert(
          validSteps.map((s, index) => ({
            post_id: post.id,
            step_number: index + 1,
            title: s.title.trim(),
            description: s.description.trim(),
            duration: s.duration ? parseInt(s.duration, 10) : null,
          }))
        );
        if (stepError) throw new Error(stepError.message);
      }
    },
    createPost: async (caption: string, imageUrl: string | null): Promise<void> => {
      if (HAS_SUPABASE) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Not authenticated');

        const { error } = await supabase.from('posts').insert({
          user_id: session.user.id,
          caption,
          image_url: imageUrl,
        });

        if (error) throw new Error(error.message);
      } else {
        await delay(800);
        console.log('Mock post created:', { caption, imageUrl });
      }
    },
    updatePost: async (id: string, caption: string): Promise<void> => {
      if (HAS_SUPABASE) {
        const { error } = await supabase.from('posts').update({ 
          caption, 
          updated_at: new Date().toISOString() 
        }).eq('id', id);
        if (error) throw new Error(error.message);
      } else {
        await delay(400);
      }
    },
    getFeed: async (): Promise<any[]> => {
      if (HAS_SUPABASE) {
        const { data: { session } } = await supabase.auth.getSession();
        
        const { data, error } = await supabase
          .from('posts')
          .select('*, profiles!posts_user_id_fkey(username, avatar_url), post_cheers(user_id), comments(id), recipe_ingredients(*), recipe_steps(*)')
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        
        return data.map(p => ({
          id: p.id,
          user_id: p.user_id,
          username: p.profiles?.username || 'Unknown',
          userAvatar: p.profiles?.avatar_url,
          imageUrl: p.image_url,
          caption: p.caption,
          cheers: p.post_cheers?.length || 0,
          comments: p.comments?.length || 0,
          shares: p.shares_count,
          timestamp: formatDate(p.created_at),
          updated_at: p.updated_at ? formatDate(p.updated_at) : null,
          has_cheered: p.post_cheers?.some((c: any) => c.user_id === session?.user?.id) || false,
          post_type: p.post_type || 'text',
          recipe_title: p.recipe_title || null,
          recipe_ingredients: p.recipe_ingredients || [],
          recipe_steps: p.recipe_steps || []
        }));
      }
      return []; 
    },
    getUserPosts: async (userId: string): Promise<any[]> => {
      if (HAS_SUPABASE) {
        const { data: { session } } = await supabase.auth.getSession();
        
        const { data, error } = await supabase
          .from('posts')
          .select('*, profiles!posts_user_id_fkey(username, avatar_url), post_cheers(user_id), comments(id), recipe_ingredients(*), recipe_steps(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        
        return data.map(p => ({
          id: p.id,
          user_id: p.user_id,
          username: p.profiles?.username || 'Unknown',
          userAvatar: p.profiles?.avatar_url,
          imageUrl: p.image_url,
          caption: p.caption,
          cheers: p.post_cheers?.length || 0,
          comments: p.comments?.length || 0,
          shares: p.shares_count,
          timestamp: formatDate(p.created_at),
          updated_at: p.updated_at ? formatDate(p.updated_at) : null,
          has_cheered: p.post_cheers?.some((c: any) => c.user_id === session?.user?.id) || false,
          post_type: p.post_type || 'text',
          recipe_title: p.recipe_title || null,
          recipe_ingredients: p.recipe_ingredients || [],
          recipe_steps: p.recipe_steps || []
        }));
      }
      return [];
    },
    getPost: async (id: string): Promise<any> => {
      if (HAS_SUPABASE) {
        const { data: { session } } = await supabase.auth.getSession();
        
        const { data, error } = await supabase
          .from('posts')
          .select('*, profiles!posts_user_id_fkey(username, avatar_url), post_cheers(user_id), comments(id), recipe_ingredients(*), recipe_steps(*)')
          .eq('id', id)
          .single();
        if (error) throw new Error(error.message);
        
        return {
          id: data.id,
          user_id: data.user_id,
          username: data.profiles?.username || 'Unknown',
          userAvatar: data.profiles?.avatar_url,
          imageUrl: data.image_url,
          caption: data.caption,
          cheers: data.post_cheers?.length || 0,
          comments: data.comments?.length || 0,
          shares: data.shares_count,
          timestamp: formatDate(data.created_at),
          updated_at: data.updated_at ? formatDate(data.updated_at) : null,
          has_cheered: data.post_cheers?.some((c: any) => c.user_id === session?.user?.id) || false,
          post_type: data.post_type || 'text',
          recipe_title: data.recipe_title || null,
          recipe_ingredients: data.recipe_ingredients || [],
          recipe_steps: data.recipe_steps || []
        };
      }
      return null;
    },
    toggleCheer: async (postId: string, currentlyCheered: boolean): Promise<void> => {
      if (HAS_SUPABASE) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Not authenticated');

        if (currentlyCheered) {
          // Remove cheer
          const { error } = await supabase.from('post_cheers')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', session.user.id);
          if (error) throw new Error(error.message);
        } else {
          // Add cheer
          const { error } = await supabase.from('post_cheers')
            .insert({ post_id: postId, user_id: session.user.id });
          if (error) throw new Error(error.message);
        }
      }
    }
  },

  comments: {
    getComments: async (postId: string): Promise<any[]> => {
      if (!HAS_SUPABASE) return [];
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      
      return data.map(c => ({
        id: c.id,
        post_id: c.post_id,
        user_id: c.user_id,
        parent_id: c.parent_id,
        content: c.content,
        created_at: formatDate(c.created_at),
        username: c.profiles?.username || 'Unknown',
        userAvatar: c.profiles?.avatar_url,
      }));
    },
    createComment: async (postId: string, content: string, parentId: string | null = null): Promise<void> => {
      if (HAS_SUPABASE) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Not authenticated');

        const { error } = await supabase.from('comments').insert({
          post_id: postId,
          user_id: session.user.id,
          content,
          parent_id: parentId,
        });

        if (error) throw new Error(error.message);
      }
    }
  }
};
