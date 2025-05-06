
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Chat, Message, User } from '@/types';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PhoneCall, AlertCircle } from 'lucide-react'; // Added AlertCircle

interface ChatInterfaceProps {
  chat: Chat;
  currentUser: User | null; // Allow currentUser to be potentially null
  onSendMessage: (chatId: string, message: string, type: 'text' | 'image' | 'video') => void;
  onStartCall: (chatId: string, type: 'audio' | 'video') => void;
  onEndCall: (chatId: string, duration: string) => void; // For simulating call end
}

export function ChatInterface({ chat, currentUser, onSendMessage, onStartCall, onEndCall }: ChatInterfaceProps) {
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true); // Ref to track initial mount

  // Simulate call start/end locally for UI feedback
  const handleStartCall = (type: 'audio' | 'video') => {
    if (!currentUser) return; // Guard against missing user
    setIsCalling(true);
    setCallType(type);
    setCallStartTime(new Date());
    onStartCall(chat.id, type);
    // Simulate ending call after 15 seconds for demo
    setTimeout(() => {
      handleEndCall();
    }, 15000);
  };

  const handleEndCall = () => {
     if (!currentUser) return; // Guard against missing user
    if (callStartTime) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - callStartTime.getTime();
      const durationSec = Math.round(durationMs / 1000);
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;
      const durationStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      onEndCall(chat.id, durationStr);
      setIsCalling(false);
      setCallType(null);
      setCallStartTime(null);
    }
  };

  const handleSendMessage = (message: string, type: 'text' | 'image' | 'video') => {
     if (!currentUser) return; // Guard against missing user
    onSendMessage(chat.id, message, type);
  };

   const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
     // Use requestAnimationFrame for smoother scrolling after render
     requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: behavior, block: 'end' });
     });
   };

   useEffect(() => {
      // Scroll to bottom when messages change or chat selection changes
      // Use 'instant' scroll on initial load of a chat, 'smooth' for new messages
       const scrollBehavior = isInitialMountRef.current ? 'instant' : 'smooth';
      scrollToBottom(scrollBehavior);
        // After the first render for this chat, set initial mount to false
       isInitialMountRef.current = false;
        // Reset initial mount flag when the chat ID changes
       return () => {
            isInitialMountRef.current = true;
        };
   }, [chat.messages, chat.id]); // Add chat.id dependency


  // Group messages by sender to avoid repeating avatar for consecutive messages
  const groupedMessages = useMemo(() => {
      const groups: { sender: User | null; messages: Message[] }[] = []; // Allow sender to be null
      if (!chat?.messages || chat.messages.length === 0) return groups;

      let currentGroup: { sender: User | null; messages: Message[] } | null = null;

      for (const message of chat.messages) {
         const sender = message.sender; // Can be null if sender info is missing

        // Check if message type is a call event to display separately
        if (message.type === 'call_start' || message.type === 'call_end') {
          // Start a new group for call events
          currentGroup = { sender: sender, messages: [message] };
          groups.push(currentGroup);
          currentGroup = null; // Reset current group after adding call event
        } else if (currentGroup && currentGroup.sender?.id === sender?.id) { // Check sender ID existence
          // Add to existing group if same sender and not a call event
          currentGroup.messages.push(message);
        } else {
          // Start a new group for different sender or first message
          currentGroup = { sender: sender, messages: [message] };
          groups.push(currentGroup);
        }
      }
      return groups;
   }, [chat.messages]);


  return (
    // Ensure the main container uses full height and flex column layout
    // Added min-h-0 to prevent flex item from overflowing parent
    <div className="flex flex-col h-full bg-secondary/40 min-h-0">
      {/* ChatHeader remains sticky */}
      <ChatHeader chat={chat} currentUser={currentUser} onStartCall={handleStartCall} />

      {/* Call Alert remains */}
      {isCalling && (
         <Alert className="m-4 rounded-lg border-accent bg-accent/10">
            <PhoneCall className="h-4 w-4 text-accent" />
            <AlertTitle className="text-accent">Ongoing {callType} call...</AlertTitle>
            <AlertDescription>
                Call started {callStartTime && `at ${callStartTime.toLocaleTimeString()}`}. {/* Add duration timer if needed */}
                <button onClick={handleEndCall} className="ml-2 text-red-500 underline">End Call</button>
            </AlertDescription>
         </Alert>
       )}

      {/* ScrollArea takes remaining space and handles message scrolling */}
      <ScrollArea className="flex-1 px-4 pt-4 pb-2" viewportRef={scrollAreaRef}> {/* Added padding */}
         {groupedMessages.map((group, groupIndex) => (
           <div key={groupIndex} className="flex flex-col mb-3">
             {currentUser && group.messages.map((message, messageIndex) => ( // Check currentUser before mapping
                <MessageBubble
                  key={message.id || `${groupIndex}-${messageIndex}`} // Use index as fallback key if id is missing
                  message={message}
                  currentUser={currentUser}
                  // Only show avatar for the last non-call message in a consecutive block from the same sender
                  showAvatar={
                      (message.type !== 'call_start' && message.type !== 'call_end') &&
                      messageIndex === group.messages.length - 1
                   }
                  // Center align call messages
                  centerAlign={message.type === 'call_start' || message.type === 'call_end'}
                />
             ))}
              {/* Add a placeholder for messages that failed to send */}
              {group.messages.some(m => m.error) && (
                  <div className="text-xs text-destructive italic flex items-center gap-1 justify-end pr-10 mt-1">
                      <AlertCircle size={14}/> Some messages failed to send.
                  </div>
               )}
           </div>
         ))}
        <div ref={messagesEndRef} /> {/* Anchor to scroll to */}
      </ScrollArea>

      {/* ChatInput remains sticky at the bottom */}
      {currentUser && ( // Check currentUser before rendering ChatInput
         <ChatInput onSendMessage={handleSendMessage} onStartCall={handleStartCall} disabled={isCalling} />
       )}
    </div>
  );
}
