'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Mic, SendHorizontal, Phone, Video, Smile } from 'lucide-react'; // Added Smile for emoji
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ChatInputProps {
  onSendMessage: (message: string, type: 'text' | 'image' | 'video') => void;
  onStartCall: (type: 'audio' | 'video') => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, onStartCall, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for textarea

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    adjustTextareaHeight(); // Adjust height on input change
  };


  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
      // Reset textarea height after sending
       setTimeout(adjustTextareaHeight, 0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simulate sending - replace with actual upload logic
      console.log('Selected file:', file.name, file.type);
      const reader = new FileReader();
      reader.onload = (e) => {
         const fileUrl = e.target?.result as string;
         if (file.type.startsWith('image/')) {
           onSendMessage(fileUrl, 'image');
         } else if (file.type.startsWith('video/')) {
           onSendMessage(fileUrl, 'video');
         } else {
           // Handle other file types if needed
           console.warn("Unsupported file type:", file.type);
         }
      };
      reader.readAsDataURL(file);

      // Reset file input
      event.target.value = '';
    }
  };

   // Adjust height on initial render and when message state changes externally
   React.useEffect(() => {
      adjustTextareaHeight();
    }, [message]);

  return (
    // Make input area sticky at the bottom, use flex for alignment
    <div className="flex items-end gap-2 p-3 border-t bg-background sticky bottom-0 shrink-0">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,video/*" // Accept images and videos
      />

      {/* Attachment/Call Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0" disabled={disabled}>
            <Paperclip />
            <span className="sr-only">Attach file or start call</span>
          </Button>
        </PopoverTrigger>
        {/* Ensure popover appears above the input */}
        <PopoverContent className="w-auto p-1 mb-1" side="top" align="start">
           <div className="flex gap-1">
             <Button variant="ghost" size="icon" onClick={handleAttachClick} disabled={disabled} title="Attach File">
               <Paperclip />
             </Button>
             <Button variant="ghost" size="icon" onClick={() => onStartCall('audio')} disabled={disabled} title="Start Audio Call">
               <Phone />
             </Button>
              <Button variant="ghost" size="icon" onClick={() => onStartCall('video')} disabled={disabled} title="Start Video Call">
               <Video />
             </Button>
            {/* <Button variant="ghost" size="icon" disabled={disabled} title="Record Audio">
               <Mic />
             </Button> */}
           </div>
        </PopoverContent>
      </Popover>

       {/* Emoji Picker (Placeholder) - Keep commented out */}
       {/* <Button variant="ghost" size="icon" className="shrink-0" disabled={disabled}>
          <Smile />
         <span className="sr-only">Emoji</span>
        </Button> */}

      <Textarea
        ref={textareaRef} // Assign ref
        value={message}
        onChange={handleInputChange} // Use custom handler
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        // Dynamic height, flex-1 takes available width, rounded-full for style
        className="flex-1 resize-none min-h-[40px] max-h-[150px] text-sm rounded-full px-4 py-2 overflow-y-auto" // Added overflow-y-auto
        rows={1} // Start with 1 row
        disabled={disabled}
      />
      {/* Send Button */}
      <Button size="icon" onClick={handleSend} disabled={!message.trim() || disabled} className="shrink-0 rounded-full bg-primary hover:bg-primary/90">
        <SendHorizontal />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
}
