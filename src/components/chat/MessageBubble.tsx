
'use client';

import type { Message, User } from '@/types';
import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns'; // Import isValid
import { UserProfile } from './UserProfile';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Check, CheckCheck, Clock, PhoneCall, PhoneOff, Video, AlertCircle } from 'lucide-react'; // Added AlertCircle
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'; // Import Tooltip components

interface MessageBubbleProps {
  message: Message;
  currentUser: User | null; // Allow currentUser to be potentially null
  showAvatar?: boolean; // Whether to show the avatar next to the bubble
  centerAlign?: boolean; // Whether to center-align the bubble (for call messages)
}

export function MessageBubble({ message, currentUser, showAvatar = true, centerAlign = false }: MessageBubbleProps) {
  // Handle cases where sender or currentUser might be null
  const isCurrentUser = message.sender?.id === currentUser?.id;
  const sender = message.sender; // Can be null
  const hasError = !!message.error; // Check if the message has an error property

  const renderContent = () => {
    switch (message.type) {
      case 'text':
        // Break long words to prevent overflow
        return <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>;
      case 'image':
         // Check if content is a valid URL (basic check)
         if (typeof message.content === 'string' && message.content.startsWith('data:image')) {
           return (
              <Image
                 src={message.content}
                 alt="Sent image"
                 width={250} // Slightly increase max width for larger screens
                 height={200} // Adjust height accordingly
                 className="rounded-md object-cover max-w-full h-auto" // Ensure image scales down
                 data-ai-hint="chat media"
               />
           );
          } else {
            return <p className="text-sm text-destructive italic flex items-center gap-1"><AlertCircle size={16}/> Invalid image data</p>;
          }
       case 'video':
         // Check if content is a valid URL (basic check)
          if (typeof message.content === 'string' && message.content.startsWith('data:video')) {
            return (
               <div className="relative w-full max-w-[250px] h-auto bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden">
                 <Video className="text-white h-10 w-10 absolute" />
                 <span className="absolute bottom-1 right-1 text-white text-xs bg-black/50 px-1 rounded">Video</span>
                  {/* Could add a thumbnail here if available */}
               </div>
            );
           } else {
            return <p className="text-sm text-destructive italic flex items-center gap-1"><AlertCircle size={16}/> Invalid video data</p>;
           }
       case 'call_start':
         return (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground italic">
              <PhoneCall className="h-4 w-4 text-accent" />
              <span>Call started</span>
            </div>
         );
       case 'call_end':
          return (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground italic">
              <PhoneOff className="h-4 w-4 text-destructive" />
              <span>Call ended{message.content ? `: ${message.content}` : ''}</span> {/* Show duration if available */}
            </div>
          );
       default:
         return <p className="text-sm text-muted-foreground italic">Unsupported message type</p>;
     }
  };

  const renderStatus = () => {
     if (!isCurrentUser || message.type === 'call_start' || message.type === 'call_end') return null;

     // Don't show status for media for now, could be added later
     if (message.type === 'image' || message.type === 'video') return null;

      // If message failed to send, show error icon
      if (hasError) {
        return (
          <TooltipProvider delayDuration={100}>
             <Tooltip>
                 <TooltipTrigger>
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                 </TooltipTrigger>
                 <TooltipContent>
                    <p className="text-xs">{message.error || "Failed to send"}</p>
                 </TooltipContent>
             </Tooltip>
          </TooltipProvider>
        );
      }


     switch (message.status) {
       case 'sent':
         // Show clock only if message ID looks temporary (client-side)
         if (message.id?.startsWith('temp_')) {
             return <Clock className="h-3.5 w-3.5 text-muted-foreground" title="Sending..." />;
         }
          return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
       case 'delivered':
         return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
       case 'read':
         return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />; // Example read color
       default:
         // Default to sent (single check) if status is missing but not temporary
         if (!message.id?.startsWith('temp_')) {
             return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
          }
         return null; // Don't show icon if temporary and status unknown
     }
   };

    const timestamp = message.timestamp ? new Date(message.timestamp) : null; // Ensure Date object
    const isValidTimestamp = timestamp && isValid(timestamp);

  return (
    <div
      className={cn(
        'flex gap-2 w-full mb-1', // Add bottom margin
        isCurrentUser && !centerAlign ? 'justify-end' : 'justify-start',
        centerAlign ? 'justify-center' : '' // Center align if requested
      )}
    >
      {/* Show avatar for other user if sender exists */}
      {!isCurrentUser && showAvatar && !centerAlign && sender && (
          <UserProfile user={sender} size="sm" className="self-end" /> // Align avatar bottom
      )}
       <div className={cn(
          'flex flex-col max-w-[75%] md:max-w-[65%]', // Responsive max width
          isCurrentUser && !centerAlign ? 'items-end' : 'items-start',
          centerAlign ? 'items-center' : '', // Center items if bubble is centered
           hasError && isCurrentUser ? 'opacity-70' : '' // Reduce opacity for failed messages from current user
        )}>
         {/* Render Card only for non-call messages */}
         {message.type !== 'call_start' && message.type !== 'call_end' ? (
             <Card
               className={cn(
                 'rounded-lg shadow-sm',
                  isCurrentUser
                     ? 'bg-primary text-primary-foreground rounded-br-none'
                     : 'bg-card text-card-foreground rounded-bl-none',
                 // Remove padding/bg/border for media if content is valid
                 (message.type === 'image' || message.type === 'video') && typeof message.content === 'string' && message.content.startsWith('data:')
                   ? 'p-0 overflow-hidden bg-transparent border-0 shadow-none'
                   : 'p-2 px-3',
                   hasError && !isCurrentUser ? 'border-destructive/50 bg-destructive/10' : '', // Style error for received messages
                   hasError && isCurrentUser ? 'border-destructive/50' : '' // Style error for sent messages
               )}
             >
                {/* Use min-h-[20px] to prevent collapsing */}
               <CardContent className={cn(
                    "p-0 min-h-[20px]",
                    (message.type === 'image' || message.type === 'video') && typeof message.content === 'string' && message.content.startsWith('data:')
                        ? ''
                        : 'p-2 px-3',
                    hasError ? 'text-destructive' : '' // Make text red on error inside card
                    )}>
                 {renderContent()}
               </CardContent>
             </Card>
         ) : (
            // Render call content directly without a card for centered messages
             renderContent()
         )}
         {/* Timestamp and Status (only for non-centered messages) */}
         {!centerAlign && (
             <div className="flex items-center gap-1 mt-1">
                {isValidTimestamp && (
                    <span className="text-xs text-muted-foreground">
                        {format(timestamp, 'p')}
                    </span>
                 )}
                {renderStatus()}
             </div>
         )}
      </div>
      {/* Show avatar for current user if sender exists */}
       {isCurrentUser && showAvatar && !centerAlign && sender && (
          <UserProfile user={sender} size="sm" className="self-end" /> // Align avatar bottom
       )}
    </div>
  );
}
