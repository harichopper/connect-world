'use client';

import type { Chat, User } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { UserProfile } from './UserProfile';
import { Users } from 'lucide-react'; // Import Users icon

interface ChatListProps {
  chats: Chat[];
  currentUser: User | null; // Allow currentUser to be potentially null
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

export function ChatList({ chats, currentUser, selectedChatId, onSelectChat }: ChatListProps) {

  const getChatDisplayInfo = (chat: Chat) => {
    // Handle cases where currentUser might be null during transition/logout
    const currentUserId = currentUser?.id;
    const otherParticipants = chat.participants.filter(p => p.id !== currentUserId);

    if (chat.isGroup) {
      return {
        name: chat.name || `Group (${chat.participants.length})`, // Use group name or default
        avatarUrl: undefined, // No specific avatar for group list item
        isOnline: otherParticipants.some(p => p.isOnline),
        isGroup: true,
        user: null,
      };
    } else if (otherParticipants.length === 1) {
      const user = otherParticipants[0];
      return {
        name: user?.name || 'Unknown User', // Handle potential undefined user
        avatarUrl: user?.avatarUrl,
        isOnline: user?.isOnline || false,
        isGroup: false,
        user: user,
      };
    } else {
      // Fallback for potentially malformed 1-on-1 chats or if currentUser issue
      return {
        name: 'Unknown Chat',
        avatarUrl: undefined,
        isOnline: false,
        isGroup: false,
        user: null,
      };
    }
  };

  // Handle case where currentUser is null (e.g., during logout transition)
  if (!currentUser) {
     return (
        <ScrollArea className="h-full w-full">
           <div className="p-4 text-center text-muted-foreground">Logging out...</div>
        </ScrollArea>
     );
  }

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-2 space-y-1">
        {chats.map((chat) => {
          const displayInfo = getChatDisplayInfo(chat);
          const lastMessage = chat.lastMessage;
          const isSelected = chat.id === selectedChatId;

          let lastMessagePreview = 'No messages yet';
          if (lastMessage) {
            // Prefix with sender name if it's a group chat and not the current user
             const prefix = chat.isGroup && lastMessage.sender.id !== currentUser.id
               ? `${lastMessage.sender.name || 'Someone'}: ` // Add fallback for sender name
               : '';

             switch (lastMessage.type) {
                case 'text':
                  lastMessagePreview = prefix + lastMessage.content;
                  break;
                case 'image':
                  lastMessagePreview = prefix + '📷 Image';
                  break;
                case 'video':
                  lastMessagePreview = prefix + '📹 Video';
                  break;
                case 'call_start':
                  lastMessagePreview = `📞 ${lastMessage.sender?.name || 'Someone'} started a call`;
                  break;
                case 'call_end':
                   lastMessagePreview = `🚫 Call ended (${lastMessage.content})`; // Duration in content
                   break;
                 default:
                    lastMessagePreview = prefix + '...';
              }
          }

          return (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={cn(
                'flex items-center w-full p-3 rounded-lg text-left transition-colors hover:bg-secondary/80 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:size-12 group-data-[collapsible=icon]/sidebar:p-0',
                isSelected ? 'bg-secondary' : 'bg-transparent'
              )}
              title={displayInfo.name} // Add title for collapsed view
            >
             <div className="relative flex-shrink-0 group-data-[collapsible=icon]/sidebar:m-0 mr-3">
               {displayInfo.isGroup ? (
                 <div className={cn(
                    "h-10 w-10 flex items-center justify-center bg-muted rounded-full text-muted-foreground",
                     // Style adjustments for collapsed state if needed
                  )}>
                   <Users className="h-6 w-6" /> {/* Group Icon */}
                  </div>
               ) : displayInfo.user ? ( // Check if user exists before rendering profile
                 <UserProfile user={displayInfo.user} size="md" />
               ) : (
                 // Fallback avatar if user is somehow null
                  <Avatar className="h-10 w-10">
                     <AvatarFallback>?</AvatarFallback>
                  </Avatar>
               )}
               {/* Only show online indicator if not a group or if user exists */}
               {(displayInfo.isOnline && (!displayInfo.isGroup || displayInfo.user)) && (
                   <span className="absolute h-2.5 w-2.5 bottom-0 right-0 rounded-full bg-accent ring-2 ring-background" title="Online"></span>
               )}
              </div>


              <div className="flex-1 overflow-hidden group-data-[collapsible=icon]/sidebar:hidden">
                <p className="font-medium truncate">{displayInfo.name}</p>
                <p className="text-sm text-muted-foreground truncate">{lastMessagePreview}</p>
              </div>
              <div className="flex flex-col items-end ml-2 text-xs text-muted-foreground flex-shrink-0 group-data-[collapsible=icon]/sidebar:hidden">
                {lastMessage?.timestamp && ( // Check if timestamp exists
                  <span className="mb-1 whitespace-nowrap">
                    {formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: true })} {/* Ensure Date object */}
                  </span>
                )}
                {chat.unreadCount && chat.unreadCount > 0 ? (
                  <Badge variant="default" className="h-5 px-1.5 bg-primary text-primary-foreground">
                    {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                  </Badge>
                 ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}