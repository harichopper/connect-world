
export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  isOnline: boolean;
}

export type MessageType = 'text' | 'image' | 'video' | 'call_start' | 'call_end';

export interface Message {
  id: string; // Can be temporary on client, confirmed by server
  sender: User;
  content: string; // URL for media, text content for text, duration/type for calls
  timestamp: Date;
  type: MessageType;
  status?: 'sent' | 'delivered' | 'read'; // Optional message status
  error?: string; // Optional: Error message if sending failed
}

export interface Chat {
  id: string;
  name?: string; // Optional: Name for group chats
  participants: User[];
  messages: Message[];
  lastMessage?: Message; // For display in chat list
  unreadCount?: number;
  isGroup: boolean; // Explicitly indicate if it's a group chat
}

