// This is our Mock Backend service.
// We use this so that the MVP works flawlessly on Expo Go physical devices
// without requiring complex local IP networking or firewall configurations.
// It exposes standard async/await Promises, making it a 1:1 drop-in replacement
// for a real Node/Express API or Firebase when you are ready to deploy.

export interface UserProfile {
  id: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
}

// In-memory Database
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

// Simulate network latency
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const backendAPI = {
  auth: {
    login: async (username: string, password: string): Promise<UserProfile> => {
      await delay(800); // Simulate network
      const user = mockDatabase.users.find(u => u.username === username && u.password === password);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Return user profile without password
      return {
        id: user.id,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
      };
    }
  },
  users: {
    getProfile: async (id: string): Promise<UserProfile> => {
      await delay(400);
      const user = mockDatabase.users.find(u => u.id === id);
      if (!user) throw new Error('User not found');
      
      return {
        id: user.id,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
      };
    }
  }
};
