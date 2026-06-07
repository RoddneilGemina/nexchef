import { Post } from '@/types/post';

export const MOCK_POSTS: Post[] = [
  {
    id: '1',
    username: 'chef_alex',
    caption: 'Just perfected my classic Italian carbonara! The secret is in the guanciale and using Pecorino Romano. No cream allowed! 🍝✨ #cooking #pasta #italian',
    cheers: 124,
    comments: 42,
    shares: 12,
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    username: 'baker_bob',
    caption: 'Morning sourdough bake! Listen to that crust crackle. I let this one ferment for 48 hours and the flavor profile is unbelievable. Let me know if you want the starter recipe! 🥖🍞',
    cheers: 89,
    comments: 15,
    shares: 5,
    timestamp: '5 hours ago',
  },
  {
    id: '3',
    username: 'vegan_vibes',
    caption: 'Crispy tofu tacos with a spicy mango salsa. Who says plant-based has to be boring? 🌮🥑 You really have to press the tofu well to get this level of crispiness. Full recipe in the comments below! Don\'t forget to squeeze some fresh lime juice on top right before serving.',
    cheers: 256,
    comments: 88,
    shares: 45,
    timestamp: '1 day ago',
  }
];