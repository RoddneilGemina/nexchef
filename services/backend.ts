import { supabase, HAS_SUPABASE } from './supabase';

export interface UserProfile {
  id: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
}

const mockDatabase = {
  users: [
    {
      id: 'usr_1',
      username: 'roronexchefdev',
      password: '123',
      bio: 'trying my first project!',
      avatarUrl: null,
    },
    {
      id: 'usr_2',
      username: 'gordonramsay',
      password: '123',
      bio: 'It is raw!',
      avatarUrl: null,
    },
    {
      id: 'usr_3',
      username: 'jamieoliver',
      password: '123',
      bio: 'Olive oil is good.',
      avatarUrl: null,
    }
  ],
  follows: [
    { follower_id: 'usr_2', following_id: 'usr_1' }, // gordonramsay follows roronexchefdev
    { follower_id: 'usr_1', following_id: 'usr_3' }  // roronexchefdev follows jamieoliver
  ]
};

let currentMockUserId: string | null = 'usr_1';

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

const mapPost = (p: any, sessionUserId?: string) => ({
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
  has_cheered: p.post_cheers?.some((c: any) => c.user_id === sessionUserId) || false,
  post_type: p.post_type || 'text',
  recipe_title: p.recipe_title || null,
  total_duration: p.total_duration ?? null,
  recipe_ingredients: p.recipe_ingredients || [],
  recipe_steps: (p.recipe_steps || []).sort(
    (a: any, b: any) => (a.step_number || 0) - (b.step_number || 0)
  ),
});

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
        currentMockUserId = user.id;
        return { id: user.id, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl };
      }
    },
    
    signUp: async (username: string, password: string): Promise<UserProfile> => {
      if (HAS_SUPABASE) {
        const email = username.includes('@') ? username : `${username}@nexchef.app`;
        const displayUsername = username.includes('@') ? username.split('@')[0] : username;

        // 1. Sign up the user in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error('Sign up failed');

        // 2. Create the profile in the profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: displayUsername,
            bio: 'Welcome to my kitchen profile!',
            avatar_url: null,
          });

        // Get the profile to return (ignoring error if it already exists or was auto-created)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, bio, avatar_url')
          .eq('id', data.user.id)
          .maybeSingle();

        return {
          id: data.user.id,
          username: profile?.username || displayUsername,
          bio: profile?.bio || 'Welcome to my kitchen profile!',
          avatarUrl: profile?.avatar_url || null,
        };
      } else {
        await delay(800);
        const exists = mockDatabase.users.some(u => u.username.toLowerCase() === username.toLowerCase());
        if (exists) throw new Error('Username already exists');

        const newUser = {
          id: `usr_${mockDatabase.users.length + 1}`,
          username: username,
          password: password,
          bio: 'Welcome to my kitchen profile!',
          avatarUrl: null,
        };
        mockDatabase.users.push(newUser);

        currentMockUserId = newUser.id;
        return {
          id: newUser.id,
          username: newUser.username,
          bio: newUser.bio,
          avatarUrl: newUser.avatarUrl,
        };
      }
    },
    
    updatePassword: async (newPassword: string): Promise<void> => {
      if (HAS_SUPABASE) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);
      } else {
        await delay(500);
        if (!currentMockUserId) throw new Error('Not authenticated');
        const user = mockDatabase.users.find(u => u.id === currentMockUserId);
        if (!user) throw new Error('User not found');
        user.password = newPassword;
      }
    },
    
    checkSession: async (): Promise<UserProfile | null> => {
      if (!HAS_SUPABASE) {
        if (!currentMockUserId) return null;
        const user = mockDatabase.users.find(u => u.id === currentMockUserId);
        if (!user) return null;
        return { id: user.id, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl };
      }
      
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
    createRecipe: async (title: string, caption: string, totalDuration: number | null, ingredients: any[], steps: any[]): Promise<void> => {
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
        total_duration: totalDuration,
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

      // 3. Insert steps (sequential timing with durations)
      const validSteps = steps
        .filter((s) => s.title.trim())
        .map((s, index) => ({
          post_id: post.id,
          step_number: index + 1,
          title: s.title.trim(),
          description: (s.description || '').trim(),
          start_time: s.start_time ?? 0,
          duration: Math.max(1, s.duration ?? 0),
        }));

      if (validSteps.length === 0) {
        throw new Error('Add at least one step with a title before posting.');
      }

      const { error: stepError } = await supabase.from('recipe_steps').insert(validSteps);
      if (stepError) throw new Error(stepError.message);
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
    deletePost: async (id: string): Promise<void> => {
      if (HAS_SUPABASE) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Not authenticated');

        const userId = session.user.id;

        const throwIfError = (step: string, error: { message: string } | null) => {
          if (error) throw new Error(`${step}: ${error.message}`);
        };

        // Prefer server-side delete (bypasses child-table RLS issues when migration is applied)
        const { error: rpcError } = await supabase.rpc('delete_own_post', { post_id: id });
        if (!rpcError) return;

        const rpcUnavailable =
          rpcError.code === 'PGRST202' ||
          rpcError.message.includes('Could not find the function') ||
          rpcError.message.includes('delete_own_post');

        if (!rpcUnavailable) {
          throw new Error(rpcError.message);
        }

        const { data: post, error: fetchError } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', id)
          .single();
        throwIfError('Could not load post', fetchError);
        if (!post || post.user_id !== userId) {
          throw new Error('You can only delete your own posts');
        }

        const relatedDeletes = [
          supabase.from('post_cheers').delete().eq('post_id', id),
          supabase.from('comments').delete().eq('post_id', id).not('parent_id', 'is', null),
          supabase.from('comments').delete().eq('post_id', id),
          supabase.from('recipe_ingredients').delete().eq('post_id', id),
          supabase.from('recipe_steps').delete().eq('post_id', id),
        ];

        for (const query of relatedDeletes) {
          const { error } = await query;
          throwIfError('Could not delete related post data', error);
        }

        const { data: deleted, error: deleteError } = await supabase
          .from('posts')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
          .select('id');

        throwIfError('Could not delete post', deleteError);
        if (!deleted?.length) {
          throw new Error(
            'Post was not deleted. Run supabase/delete_post_setup.sql in the Supabase SQL editor to enable deletes.'
          );
        }
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
        
        return data.map((p) => mapPost(p, session?.user?.id));
      }
      
      // Fallback
      return mockDatabase.users.map((u, i) => ({
        id: `post_mock_${u.id}`,
        user_id: u.id,
        username: u.username,
        userAvatar: null,
        imageUrl: null,
        caption: i === 0 
          ? `Enjoying my cooking journey on Nexchef!` 
          : i === 1 
          ? `It's raw! Here is how to make the perfect steak.` 
          : `Olive oil is the secret ingredient to everything.`,
        cheers: 8 + i,
        comments: i === 0 ? 1 : 0,
        shares: i,
        timestamp: '2026-06-10 08:00 AM',
        updated_at: null,
        has_cheered: i === 1,
        post_type: i === 1 ? 'recipe' : 'text',
        recipe_title: i === 1 ? 'Perfect Ribeye Steak' : undefined,
        total_duration: i === 1 ? 600 : undefined,
        recipe_ingredients: i === 1 ? [
          { name: 'ribeye steak', quantity: '1', unit: 'lb' },
          { name: 'butter', quantity: '2', unit: 'tbsp' },
          { name: 'garlic', quantity: '3', unit: 'cloves' }
        ] : [],
        recipe_steps: i === 1 ? [
          { step_number: 1, title: 'Sear steak', description: 'Sear steak in a hot skillet for 2 minutes on each side.', start_time: 0, duration: 240 },
          { step_number: 2, title: 'Baste', description: 'Add butter, garlic, and herbs. Spoon melted butter over steak.', start_time: 240, duration: 360 }
        ] : []
      }));
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
        
        return data.map((p) => mapPost(p, session?.user?.id));
      }
      
      // Fallback
      const user = mockDatabase.users.find(u => u.id === userId);
      if (!user) return [];
      return [
        {
          id: `post_mock_${userId}`,
          user_id: userId,
          username: user.username,
          userAvatar: null,
          imageUrl: null,
          caption: `Welcome to my kitchen profile! Try out my latest recipe.`,
          cheers: 15,
          comments: 0,
          shares: 2,
          timestamp: '2026-06-10 10:00 AM',
          updated_at: null,
          has_cheered: false,
          post_type: 'recipe',
          recipe_title: 'Classic Tomato Pasta',
          total_duration: 300,
          recipe_ingredients: [
            { name: 'pasta', quantity: '200', unit: 'g' },
            { name: 'canned tomatoes', quantity: '1', unit: 'can' }
          ],
          recipe_steps: [
            { step_number: 1, title: 'Boil pasta', description: 'Cook pasta in salted water until al dente.', start_time: 0, duration: 180 },
            { step_number: 2, title: 'Simmer sauce', description: 'Cook tomatoes with garlic and herbs, then toss with pasta.', start_time: 180, duration: 120 }
          ]
        }
      ];
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
        
        return mapPost(data, session?.user?.id);
      }
      
      // Fallback
      return {
        id: id,
        user_id: 'usr_2',
        username: 'gordonramsay',
        userAvatar: null,
        imageUrl: null,
        caption: 'This is my classic recipe.',
        cheers: 22,
        comments: 1,
        shares: 5,
        timestamp: '2026-06-10 11:00 AM',
        updated_at: null,
        has_cheered: false,
        post_type: 'text'
      };
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
      if (HAS_SUPABASE) {
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
      }
      
      // Fallback
      return [
        {
          id: 'comment_mock_1',
          post_id: postId,
          user_id: 'usr_2',
          parent_id: null,
          content: 'This recipe looks delicious! Can\'t wait to try it.',
          created_at: '2026-06-10 10:15 AM',
          username: 'gordonramsay',
          userAvatar: null
        }
      ];
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
      } else {
        await delay(200);
        // Mock ignore or push
      }
    }
  },

  follows: {
    getFollowStatus: async (myId: string, targetId: string) => {
      if (HAS_SUPABASE) {
        const [followingRes, followerRes] = await Promise.all([
          supabase.from('follows').select('follower_id').eq('follower_id', myId).eq('following_id', targetId).maybeSingle(),
          supabase.from('follows').select('follower_id').eq('follower_id', targetId).eq('following_id', myId).maybeSingle()
        ]);
        return {
          isFollowing: !!followingRes.data,
          isFollowedBy: !!followerRes.data
        };
      } else {
        return {
          isFollowing: mockDatabase.follows.some(f => f.follower_id === myId && f.following_id === targetId),
          isFollowedBy: mockDatabase.follows.some(f => f.follower_id === targetId && f.following_id === myId)
        };
      }
    },
    toggleFollow: async (myId: string, targetId: string, isFollowingCurrently: boolean): Promise<void> => {
      if (HAS_SUPABASE) {
        if (isFollowingCurrently) {
          const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', myId)
            .eq('following_id', targetId);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase
            .from('follows')
            .insert({
              follower_id: myId,
              following_id: targetId
            });
          if (error) throw new Error(error.message);
        }
      } else {
        await delay(200);
        if (isFollowingCurrently) {
          mockDatabase.follows = mockDatabase.follows.filter(
            f => !(f.follower_id === myId && f.following_id === targetId)
          );
        } else {
          mockDatabase.follows.push({
            follower_id: myId,
            following_id: targetId
          });
        }
      }
    },
    getFollowers: async (userId: string): Promise<UserProfile[]> => {
      if (HAS_SUPABASE) {
        const { data, error } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', userId);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) return [];

        const followerIds = data.map(d => d.follower_id);
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, username, bio, avatar_url')
          .in('id', followerIds);
        if (pError) throw new Error(pError.message);

        return (profiles || []).map(p => ({
          id: p.id,
          username: p.username,
          bio: p.bio,
          avatarUrl: p.avatar_url
        }));
      } else {
        await delay(300);
        const followerIds = mockDatabase.follows
          .filter(f => f.following_id === userId)
          .map(f => f.follower_id);
        return mockDatabase.users
          .filter(u => followerIds.includes(u.id))
          .map(u => ({ id: u.id, username: u.username, bio: u.bio, avatarUrl: u.avatarUrl }));
      }
    },
    getFollowing: async (userId: string): Promise<UserProfile[]> => {
      if (HAS_SUPABASE) {
        const { data, error } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) return [];

        const followingIds = data.map(d => d.following_id);
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, username, bio, avatar_url')
          .in('id', followingIds);
        if (pError) throw new Error(pError.message);

        return (profiles || []).map(p => ({
          id: p.id,
          username: p.username,
          bio: p.bio,
          avatarUrl: p.avatar_url
        }));
      } else {
        await delay(300);
        const followingIds = mockDatabase.follows
          .filter(f => f.follower_id === userId)
          .map(f => f.following_id);
        return mockDatabase.users
          .filter(u => followingIds.includes(u.id))
          .map(u => ({ id: u.id, username: u.username, bio: u.bio, avatarUrl: u.avatarUrl }));
      }
    }
  }
};
