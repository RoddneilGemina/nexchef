export interface Post {
  id: string;
  username: string;
  userAvatar?: string;
  imageUrl?: string;
  caption: string;
  cheers: number;
  comments: number;
  shares: number;
  timestamp: string;
}