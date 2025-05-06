'use client';

import type { Chat, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Phone, Video, ArrowLeft, MoreVertical, Users } from 'lucide-react'; // Added Users icon
import { UserProfile } from './UserProfile';
import { useRouter } from 'next/navigation'; // Assuming usage of Next.js router for back navigation
import { SidebarTrigger } from '@/components/ui/sidebar'; // Import SidebarTrigger
import { Avatar, AvatarFallback } from '../ui/avatar'; // Import Avatar components

interface ChatHeaderProps {
  chat: Chat | null; // Allow chat to be potentially null
  currentUser: User | null; // Allow currentUser to be potentially null
  onStartCall: (type: 'audio' | 'video') => void;
}

export function ChatHeader({ chat, currentUser, onStartCall }: ChatHeaderProps) {
  const router = useRouter();

  // Handle cases where chat or currentUser might be null
  if (!chat || !currentUser) {
     return (
        <div className="flex items-center justify-between p-3 border-b bg-background sticky top-0 z-10 h-16 shrink-0">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden mr-1" />
             <Avatar className="h-10 w-10">
                 <AvatarFallback>?</AvatarFallback>
             </Avatar>
             <span className="font-medium">Loading...</span>
           </div>
        </div>
      );
  }

  // Find the other participant(s) in the chat
  const otherParticipants = chat.participants?.filter(p => p.id !== currentUser.id) || []; // Add safeguard for participants array

  // Display logic: Use chat.name for groups, participant name for 1-on-1
  const displayUser = !chat.isGroup && otherParticipants.length === 1 ? otherParticipants[0] : null;
  const chatName = chat.name || (displayUser ? displayUser.name : `Group (${chat.participants?.length || 0})`); // Safeguard length
  // Online status: Check individual for 1-on-1, check if anyone is online for groups
  const isOnline = displayUser ? displayUser.isOnline : otherParticipants.some(p => p.isOnline);


  return (
    // Make header sticky, ensure fixed height, use flex for alignment
    <div className="flex items-center justify-between p-3 border-b bg-background sticky top-0 z-10 h-16 shrink-0">
       <div className="flex items-center gap-2 overflow-hidden"> {/* Add overflow-hidden */}
          {/* Mobile Sidebar Trigger */}
          <SidebarTrigger className="md:hidden mr-1" />

          {displayUser ? (
             // Ensure UserProfile content doesn't push elements out
             <UserProfile user={displayUser} showName={true} className="truncate" />
          ) : (
            // Group Display (using chat.name or default)
            <div className="flex items-center gap-2">
               <div className="relative h-10 w-10 flex items-center justify-center bg-muted rounded-full text-muted-foreground flex-shrink-0">
                 <Users className="h-6 w-6" /> {/* Use Users icon for group */}
                {isOnline && <span className="absolute h-2.5 w-2.5 bottom-0 right-0 rounded-full bg-accent ring-2 ring-background" title="Someone is online"></span>}
              </div>
               {/* Allow chat name to truncate */}
               <span className="font-medium truncate">{chatName}</span>
             </div>
          )}
       </div>
       {/* Keep call buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onStartCall('audio')}>
          <Phone />
          <span className="sr-only">Start Audio Call</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onStartCall('video')}>
          <Video />
          <span className="sr-only">Start Video Call</span>
        </Button>
         {/* More options button (optional) */}
         {/* <Button variant="ghost" size="icon">
           <MoreVertical />
            <span className="sr-only">More options</span>
          </Button> */}
      </div>
    </div>
  );
}