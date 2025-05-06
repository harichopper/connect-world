
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarTrigger } from '@/components/ui/sidebar';
import { ChatList } from '@/components/chat/ChatList';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Login } from '@/components/auth/Login';
import type { User, Chat, Message, MessageType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageSquarePlus, LogOut, Users, Loader2 } from 'lucide-react'; // Added Users, Loader2
import { NewGroupModal } from '@/components/chat/NewGroupModal';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/components/chat/UserProfile';
import { Separator } from '@/components/ui/separator'; // Import Separator
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea for user list
import { cn } from '@/lib/utils'; // Import cn for conditional classes

// Mock initial user data (replace with actual user fetching later)
// NOTE: This list is only used as a fallback if the server doesn't provide users.
// User creation happens logically when a new username logs in.
const initialAvailableUsers: User[] = [
  { id: 'user1', name: 'Alice', avatarUrl: 'https://picsum.photos/seed/alice/100/100', isOnline: false },
  { id: 'user2', name: 'Bob', avatarUrl: 'https://picsum.photos/seed/bob/100/100', isOnline: false },
  { id: 'user3', name: 'Charlie', avatarUrl: 'https://picsum.photos/seed/charlie/100/100', isOnline: false },
  { id: 'user4', name: 'Diana', avatarUrl: 'https://picsum.photos/seed/diana/100/100', isOnline: false },
];

// Use a ref to manage the socket instance to avoid issues with re-renders
const socketRef = React.createRef<Socket | null>();

export default function ChatterBoxAppContainer() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // State for login loading
  const { toast } = useToast(); // Get toast function here

  const handleLogin = (username: string) => {
    setIsLoggingIn(true); // Start loading
    // Simulate network delay for login
    setTimeout(() => {
        // Basic login: find user or create a temporary one
        // In a real app, this would likely involve an API call to check/create user
        let user = initialAvailableUsers.find(u => u.name.toLowerCase() === username.toLowerCase());

        if (!user) {
          // "Create" a new user profile client-side for this session
          console.log(`User "${username}" not found. Creating new profile locally.`);
          user = {
            id: `user_${Date.now()}`, // Simple unique ID for demo
            name: username,
            avatarUrl: `https://picsum.photos/seed/${username.toLowerCase()}/100/100`,
            isOnline: true, // Assume online after login
          };
          // NOTE: We are NOT modifying initialAvailableUsers here anymore.
          // The ChatterBoxApp component will handle adding this user to its state
          // when it receives the initial data from the server (or uses the fallback).
        } else {
           console.log(`Found existing user: ${user.name}`);
           user = { ...user, isOnline: true }; // Mark existing user as online
        }
        setCurrentUser(user);
        setIsLoggingIn(false); // Stop loading
    }, 500); // 0.5 second delay
  };

  const handleLogout = useCallback(() => {
    console.log("Logging out...");
    if (socketRef.current && currentUser) { // Ensure currentUser exists before emitting logout
      socketRef.current.emit('logout', currentUser.id); // Notify server
      socketRef.current.disconnect();
      socketRef.current = null; // Ensure socket is reset
      console.log("Socket disconnected on logout.");
    }
    setCurrentUser(null); // Reset user, triggers unmount of ChatterBoxApp and its cleanup
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
  }, [currentUser, toast]); // Add currentUser to dependency array

  if (isLoggingIn) {
     return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Logging in...</p>
        </div>
     );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Pass the newly logged-in/created user to ChatterBoxApp
  return <ChatterBoxApp user={currentUser} onLogout={handleLogout} />;
}


interface ChatterBoxAppProps {
  user: User;
  onLogout: () => void;
}

function ChatterBoxApp({ user: initialUser, onLogout }: ChatterBoxAppProps) {
  // State for the current user, initialized by the prop but can be updated (e.g., online status)
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // State to hold all known users (from server or fallback + current user)
  const [availableUsers, setAvailableUsers] = useState<User[]>(initialAvailableUsers);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [view, setView] = useState<'chats' | 'users'>('chats'); // State to toggle between chats and users list
  const [isLoadingData, setIsLoadingData] = useState(true); // Loading state for initial data
  const { toast } = useToast();

  // --- Socket.IO Integration ---
  useEffect(() => {
    // Ensure initialUser is valid before proceeding
    if (!initialUser?.id) {
        console.error("ChatterBoxApp mounted without a valid user.");
        // Optionally call logout or show an error
        onLogout();
        return;
    }

    // Set the current user state initially from the prop
    setCurrentUser(initialUser);
    setIsLoadingData(true); // Start loading initial data

    // Connect only if not already connected
    if (!socketRef.current) {
       console.log(`Attempting to connect socket for user: ${initialUser.name} (${initialUser.id})`);
       socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
         query: { userId: initialUser.id, username: initialUser.name } // Pass user info on connection
       });

      const socket = socketRef.current; // Local variable for easier access

      socket.on('connect', () => {
        console.log('Connected to Socket.IO server', socket?.id);
        // Request initial data after connection
        socket?.emit('request_initial_data');
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.IO server:', reason);
        if (reason !== 'io client disconnect') {
            toast({
              title: "Connection Lost",
              description: "Disconnected from chat server. Trying to reconnect...",
              variant: "destructive",
            });
             // Optionally reset state or show disconnected UI
             setIsLoadingData(false); // Stop loading on disconnect
             setChats([]);
             setAvailableUsers(initialAvailableUsers); // Reset to fallback
             setSelectedChatId(null);
        }
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        toast({
          title: "Connection Error",
          description: `Could not connect to the chat server. ${err.message}`,
          variant: "destructive",
        });
        setIsLoadingData(false); // Stop loading on connection error
      });

       // Listen for initial data (chats, online users, all users)
      socket.on('initial_data', (data: { chats: Chat[], onlineUsers: Record<string, string>, allUsers: User[] }) => {
         console.log('Received initial data:', data);
         const serverChats = data.chats || [];
         // Sort initial chats by last message timestamp (descending)
         const sortedChats = serverChats.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return timeB - timeA;
          });
         setChats(sortedChats);


         // Determine the base list of users (server's list or fallback)
         let baseUsers = data.allUsers && data.allUsers.length > 0 ? data.allUsers : initialAvailableUsers;

         // Ensure the current user is in the list, even if they are "new" and not yet on the server's list
         const currentUserInList = baseUsers.some(u => u.id === initialUser.id);
         if (!currentUserInList) {
             console.log("Current user not in server's user list, adding locally.");
             baseUsers = [...baseUsers, initialUser];
         }

         // Update available users list and their online status from server data
         setAvailableUsers(baseUsers.map(u => ({
           ...u,
           // Mark as online if present in onlineUsers OR if it's the current user logging in
           isOnline: !!data.onlineUsers[u.id] || u.id === initialUser.id
         })));

         // Update the currentUser state's online status based on server data (or assume true if newly logged in)
         setCurrentUser(prev => prev ? {...prev, isOnline: !!data.onlineUsers[prev.id] || prev.id === initialUser.id } : null);


         // Select the first chat if available and none is selected
         if (sortedChats.length > 0 && !selectedChatId) {
           setSelectedChatId(sortedChats[0].id);
         } else if (sortedChats.length === 0) {
             setSelectedChatId(null); // No chats available
         }
          setIsLoadingData(false); // Data loaded
       });


      // Listen for new messages
      socket.on('receive_message', (newMessage: Message, chatId: string) => {
        console.log("Received message:", newMessage, "for chat:", chatId);
        setChats(prevChats => {
            let chatExists = false;
            const updatedChats = prevChats.map(chat => {
             if (chat.id === chatId) {
                chatExists = true;
               // Ensure messages array exists and avoid duplicates
                const currentMessages = chat.messages || [];
               if (currentMessages.some(m => m.id === newMessage.id)) {
                  console.log(`Duplicate message ID ${newMessage.id} ignored.`);
                 return chat;
               }
               const updatedMessages = [...currentMessages, newMessage];
               return {
                 ...chat,
                 messages: updatedMessages,
                 lastMessage: newMessage,
                 // Increment unread count if the chat is not currently selected
                 unreadCount: chat.id === selectedChatId ? 0 : (chat.unreadCount || 0) + 1,
               };
             }
             return chat;
           });
            // If the chat doesn't exist locally yet (e.g., added to a new group or first 1-1 message)
             if (!chatExists) {
                 console.warn(`Received message for potentially new/unknown chat ${chatId}. Requesting update.`);
                 // Requesting full update might be heavy, consider alternative 'get_chat_info' event
                 socket?.emit('request_initial_data'); // Refresh data to get the new chat
                 return prevChats; // Return previous state until update arrives
             }

            // Sort chats to bring the one with the new message to the top
             const chatWithNewMessageIndex = updatedChats.findIndex(c => c.id === chatId);
             if (chatWithNewMessageIndex > -1) {
                const [movedChat] = updatedChats.splice(chatWithNewMessageIndex, 1);
                return [movedChat, ...updatedChats];
             }
            return updatedChats;
          }
        );
        // If message received for the selected chat, emit 'read' status
        if (chatId === selectedChatId && currentUser) { // Ensure currentUser exists
           socket?.emit('mark_as_read', chatId, currentUser.id);
        }
      });

      // Listen for message status updates (delivered/read)
      socket.on('message_status_update', (chatId: string, messageId: string, status: 'delivered' | 'read') => {
        console.log("Status update:", chatId, messageId, status);
        setChats(prevChats =>
          prevChats.map(chat => {
            if (chat.id === chatId) {
              const messages = chat.messages || []; // Ensure messages array exists
              return {
                ...chat,
                messages: messages.map(m =>
                  m.id === messageId ? { ...m, status } : m
                ),
              };
            }
            return chat;
          })
        );
      });

      // Listen for user online/offline status changes
      socket.on('user_status_update', (userId: string, isOnline: boolean) => {
        console.log("User status update:", userId, isOnline);
        // Update the main availableUsers list
        setAvailableUsers(prevUsers => prevUsers.map(u =>
          u.id === userId ? { ...u, isOnline } : u
        ));
        // Update user status within chat participants
         setChats(prevChats => prevChats.map(chat => ({
            ...chat,
            participants: (chat.participants || []).map(p =>
                p.id === userId ? { ...p, isOnline } : p
             )
         })));
         // Update the current user's status if it's them
         if (userId === currentUser?.id) {
             setCurrentUser(prev => prev ? {...prev, isOnline} : null);
         }
      });

       // Listen for new group creation updates (when added by someone else)
       socket.on('group_created', (newChat: Chat) => {
         console.log("Added to new group:", newChat);
         setChats(prevChats => {
            // Prevent duplicates if the creator's callback also adds the chat
            if (prevChats.some(chat => chat.id === newChat.id)) {
                 console.log("Group already exists locally, ignoring event.");
                return prevChats;
            }
             return [newChat, ...prevChats];
         });
         toast({
            title: "Added to Group",
            description: `You were added to the group: ${newChat.name || 'Unnamed Group'}.`,
          });
       });

       // Listen for direct chat start confirmation/updates
       socket.on('direct_chat_started', (newChat: Chat) => {
          console.log("Direct chat started/found:", newChat);
          setChats(prevChats => {
             const chatExists = prevChats.some(c => c.id === newChat.id);
             if (chatExists) {
                 // If chat exists, update it (maybe new messages/participants info) and move to top
                 console.log(`Updating existing direct chat ${newChat.id}`);
                 return [newChat, ...prevChats.filter(c => c.id !== newChat.id)];
             } else {
                 // Otherwise, add it to the top
                 console.log(`Adding new direct chat ${newChat.id}`);
                 return [newChat, ...prevChats];
             }
          });
          setSelectedChatId(newChat.id); // Select the direct chat
          setView('chats'); // Switch back to chat view
           // Find the name of the other participant for the toast message
           const otherParticipant = newChat.participants.find(p => p.id !== currentUser?.id);
          toast({
            title: "Chat Started",
            description: `Chat with ${otherParticipant?.name || 'user'} started.`,
          });
        });


       // Listen for errors from the server
      socket.on('server_error', (errorMessage: string) => {
         console.error("Server error:", errorMessage);
         toast({
           title: "Server Error",
           description: errorMessage,
           variant: "destructive",
         });
       });
    } else if (!currentUser?.id && socketRef.current) {
        // If user somehow becomes null after initial mount (e.g. error), disconnect
        console.log("Current user became null, disconnecting socket.");
        socketRef.current.disconnect();
        socketRef.current = null;
    }

    // Cleanup function
    return () => {
      const socket = socketRef.current;
      if (socket) {
        console.log('Cleaning up socket listeners in ChatterBoxApp...');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('initial_data');
        socket.off('receive_message');
        socket.off('message_status_update');
        socket.off('user_status_update');
        socket.off('group_created');
        socket.off('direct_chat_started'); // Clean up direct chat listener
        socket.off('server_error');
        console.log('ChatterBoxApp Socket listeners removed.');
        // Disconnection is handled by the parent's handleLogout or if currentUser becomes null
      }
    };
    // Rerun if initialUser prop changes (login) or selectedChatId (for marking read)
    // currentUser dependency added for mark_as_read and other operations relying on current user state
  }, [initialUser, selectedChatId, toast, onLogout, currentUser]);

  // --- Chat Management ---

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    // Mark messages as read and notify server
    setChats(prevChats =>
      prevChats.map(chat => {
        if (chat.id === chatId && chat.unreadCount && chat.unreadCount > 0 && currentUser) {
           // Optimistically update unread count locally first
           const updatedChat = { ...chat, unreadCount: 0 };
          socketRef.current?.emit('mark_as_read', chatId, currentUser.id); // Notify server
          return updatedChat;
        }
        return chat;
      })
    );
    setView('chats'); // Ensure we are viewing chats when one is selected
  };

   // Start a direct chat with another user
   const handleStartDirectChat = useCallback((otherUserId: string) => {
     const socket = socketRef.current;
     if (!socket || !currentUser) {
       toast({ title: "Error", description: "Not connected.", variant: "destructive" });
       return;
     }
     if (otherUserId === currentUser.id) {
       toast({ title: "Info", description: "You cannot chat with yourself.", variant: "default" });
       return;
     }

     // Check if a direct chat with this user already exists
     const existingChat = chats.find(chat =>
        !chat.isGroup && chat.participants.length === 2 && chat.participants.some(p => p.id === otherUserId)
     );

     if (existingChat) {
        console.log(`Direct chat with ${otherUserId} already exists (${existingChat.id}). Selecting it.`);
        handleSelectChat(existingChat.id); // Select the existing chat
        setView('chats'); // Ensure chat view is active
     } else {
        console.log(`Requesting to start new direct chat between ${currentUser.id} and ${otherUserId}`);
        socket.emit('start_direct_chat', currentUser.id, otherUserId);
        // The server will respond with 'direct_chat_started' which will update the UI and select the chat
        // Optionally show a loading indicator while waiting for the server response
         toast({ title: "Starting Chat...", description: "Please wait.", variant: "default", duration: 2000 });
     }
   }, [currentUser, toast, chats]); // Added chats dependency


  const handleSendMessage = useCallback((chatId: string, content: string, type: MessageType) => {
     const socket = socketRef.current;
    if (!socket || !currentUser) {
        toast({ title: "Error", description: "Not connected to chat.", variant: "destructive" });
        return;
     };

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`; // More robust temporary ID
    const newMessage: Message = {
      id: tempId,
      sender: currentUser, // Use the most up-to-date currentUser state
      content: content,
      timestamp: new Date(),
      type: type,
      status: 'sent', // Initial status (client-side)
    };

    // Optimistic UI update
    setChats(prevChats => {
      let targetChatIndex = prevChats.findIndex(chat => chat.id === chatId);

       if (targetChatIndex === -1) {
          console.error("Attempted to send message to non-existent chat:", chatId);
           toast({ title: "Error", description: "Could not find the chat to send the message.", variant: "destructive" });
          return prevChats;
       }

       const targetChat = prevChats[targetChatIndex];
       const currentMessages = targetChat.messages || [];
       const updatedMessages = [...currentMessages, newMessage];

       const updatedChat = {
         ...targetChat,
         messages: updatedMessages,
         lastMessage: newMessage,
         unreadCount: 0, // Reset unread count on send
       };

        // Move the updated chat to the top
        const remainingChats = [
          ...prevChats.slice(0, targetChatIndex),
          ...prevChats.slice(targetChatIndex + 1)
        ];
        return [updatedChat, ...remainingChats];
     });


    // Send message via Socket.IO
    socket.emit('send_message', chatId, newMessage, (ack: { success: boolean, messageId?: string, error?: string }) => {
       if (ack.success && ack.messageId) {
          console.log(`Message with tempId ${tempId} sent successfully, server ID: ${ack.messageId}`);
          // Update message ID and potentially status from server ack
           setChats(prevChats =>
             prevChats.map(chat => {
               if (chat.id === chatId) {
                  const messages = chat.messages || [];
                  const updatedMessages = messages.map(m =>
                      m.id === tempId ? { ...m, id: ack.messageId!, status: 'delivered' } : m // Update ID and status
                  );
                 // Check if the last message was the one we just sent
                 const updatedLastMessage = chat.lastMessage?.id === tempId
                    ? updatedMessages.find(m => m.id === ack.messageId!) || chat.lastMessage // Update last message if it was the temp one
                    : chat.lastMessage;

                 return {
                    ...chat,
                    messages: updatedMessages,
                    lastMessage: updatedLastMessage, // Update lastMessage if necessary
                  };
               }
               return chat;
             })
           );
       } else {
          console.error(`Failed to send message with tempId ${tempId}:`, ack.error);
          // Revert optimistic update or show error state for the specific message
          setChats(prevChats =>
             prevChats.map(chat => {
               if (chat.id === chatId) {
                  const messages = chat.messages || [];
                  const revertedMessages = messages.map(m =>
                       m.id === tempId ? { ...m, status: undefined, error: ack.error || "Failed to send" } : m // Mark as failed
                   );
                  // Potentially revert lastMessage if it was the failed one
                   const lastValidMessage = revertedMessages.filter(m => m.id !== tempId).pop();
                   const revertedLastMessage = chat.lastMessage?.id === tempId ? lastValidMessage : chat.lastMessage;

                 return {
                   ...chat,
                   messages: revertedMessages,
                   lastMessage: revertedLastMessage,
                 };
               }
               return chat;
             })
           );
          toast({
             title: "Message Failed",
             description: ack.error || "Could not send the message.",
             variant: "destructive",
           });
       }
    });

  }, [currentUser, toast]);

  // Call handling remains the same
  const handleStartCall = useCallback((chatId: string, type: 'audio' | 'video') => {
     const socket = socketRef.current;
    if (!socket || !currentUser) return;
    console.log(`Starting ${type} call in chat ${chatId}`);
    const tempId = `call_start_${Date.now()}`;
    const callStartMessage: Message = {
       id: tempId,
       sender: currentUser,
       content: type, // Store call type in content
       timestamp: new Date(),
       type: 'call_start',
     };
      // Optimistically update UI and move chat to top
      setChats(prevChats => {
         let targetChatIndex = prevChats.findIndex(chat => chat.id === chatId);
         if (targetChatIndex === -1) return prevChats;

          const targetChat = prevChats[targetChatIndex];
          const messages = targetChat.messages || [];
          const updatedChat = {
            ...targetChat,
            messages: [...messages, callStartMessage],
            lastMessage: callStartMessage,
          };
           // Move the updated chat to the top
           const remainingChats = [
             ...prevChats.slice(0, targetChatIndex),
             ...prevChats.slice(targetChatIndex + 1)
           ];
           return [updatedChat, ...remainingChats];
        });
      socket.emit('start_call', chatId, callStartMessage, (ack: { success: boolean, messageId?: string, error?: string }) => {
        if (ack.success && ack.messageId) {
            console.log(`Call start message ${tempId} confirmed with ID ${ack.messageId}`);
            setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: c.messages.map(m => m.id === tempId ? { ...m, id: ack.messageId! } : m) } : c));
        } else {
             console.error(`Failed to send call start message ${tempId}:`, ack.error);
              // Optionally revert or show error
             toast({ title: "Call Start Failed", description: ack.error || "Could not start the call.", variant: "destructive" });
        }
      });
  }, [currentUser, toast]);

  const handleEndCall = useCallback((chatId: string, duration: string) => {
      const socket = socketRef.current;
      if (!socket || !currentUser) return;
      console.log(`Ending call in chat ${chatId}, duration: ${duration}`);
      const tempId = `call_end_${Date.now()}`;
      const callEndMessage: Message = {
        id: tempId,
        sender: currentUser,
        content: duration, // Store duration in content
        timestamp: new Date(),
        type: 'call_end',
      };
       // Optimistically update UI and move chat to top
       setChats(prevChats => {
          let targetChatIndex = prevChats.findIndex(chat => chat.id === chatId);
          if (targetChatIndex === -1) return prevChats;

           const targetChat = prevChats[targetChatIndex];
           const messages = targetChat.messages || [];
           const updatedChat = {
             ...targetChat,
             messages: [...messages, callEndMessage],
             lastMessage: callEndMessage,
           };
           // Move the updated chat to the top
           const remainingChats = [
             ...prevChats.slice(0, targetChatIndex),
             ...prevChats.slice(targetChatIndex + 1)
           ];
           return [updatedChat, ...remainingChats];
         });
       socket.emit('end_call', chatId, callEndMessage, (ack: { success: boolean, messageId?: string, error?: string }) => {
        if (ack.success && ack.messageId) {
             console.log(`Call end message ${tempId} confirmed with ID ${ack.messageId}`);
             setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: c.messages.map(m => m.id === tempId ? { ...m, id: ack.messageId! } : m) } : c));
        } else {
             console.error(`Failed to send call end message ${tempId}:`, ack.error);
             // Optionally revert or show error
              toast({ title: "Call End Failed", description: ack.error || "Could not end the call properly.", variant: "destructive" });
        }
       });
    }, [currentUser, toast]);

  const handleCreateGroup = useCallback((groupName: string, selectedUserIds: string[]) => {
    const socket = socketRef.current;
    if (!socket || !currentUser) {
       toast({ title: "Error", description: "Not connected.", variant: "destructive" });
       return;
    }
    if (!groupName.trim() || selectedUserIds.length === 0) {
      toast({ title: "Invalid Group", description: "Group name and at least one member are required.", variant: "destructive" });
      return;
    }

    const participantIds = [currentUser.id, ...selectedUserIds];
    console.log("Creating group:", groupName, "with members:", participantIds);

    // Emit event to server to create the group
    socket.emit('create_group', groupName, participantIds, (ack: { success: boolean, newChat?: Chat, error?: string }) => {
      if (ack.success && ack.newChat) {
          console.log("Group created successfully by server:", ack.newChat);
         // Add the new chat to the state immediately and move to top
         // Ensure we don't add duplicates if 'group_created' event arrives quickly
         setChats(prevChats => {
            if (prevChats.some(c => c.id === ack.newChat!.id)) {
                console.log("Group already exists locally (from callback), updating and moving to top.");
                // Update existing chat data (just in case) and move to top
                 return [ack.newChat!, ...prevChats.filter(c => c.id !== ack.newChat!.id)];
             } else {
                 console.log("Adding new group to local state (from callback).");
                 // Otherwise, add it to the top
                 return [ack.newChat!, ...prevChats];
            }
         });
         setSelectedChatId(ack.newChat!.id); // Select the newly created chat
         setView('chats'); // Switch back to chat view
         toast({ title: "Group Created", description: `Group "${groupName}" was successfully created.` });
         setIsNewGroupModalOpen(false); // Close modal
      } else {
        console.error("Failed to create group:", ack.error);
        toast({
          title: "Group Creation Failed",
          description: ack.error || "Could not create the group.",
          variant: "destructive",
        });
      }
    });
  }, [currentUser, toast]);


  const filteredChats = chats.filter(chat => {
    if (!currentUser) return false;
     const otherParticipants = (chat.participants || []).filter(p => p.id !== currentUser.id);
      let chatName = chat.name;
      if (!chatName && !chat.isGroup && otherParticipants.length === 1) {
         chatName = otherParticipants[0]?.name || 'Unknown User';
      } else if (!chatName && chat.isGroup) {
         // Construct a more descriptive group name if none is set
         const participantNames = (chat.participants || [])
            .filter(p => p.id !== currentUser.id) // Exclude current user
            .map(p => p.name)
            .slice(0, 3) // Limit to first 3 names
            .join(', ');
         chatName = participantNames ? `Group: ${participantNames}` : `Group (${(chat.participants || []).length})`;
         if ((chat.participants?.length ?? 0) > 4) { // Add ellipsis if more than 3 other participants
              chatName += '...';
         }
      } else if (!chatName) {
          chatName = 'Unnamed Chat';
      }
     return chatName.toLowerCase().includes(searchTerm.toLowerCase());
   });

   // Filter available users based on search term, excluding the current user
   const filteredUsers = currentUser ? availableUsers.filter(u =>
     u.id !== currentUser.id && u.name.toLowerCase().includes(searchTerm.toLowerCase())
   ) : [];

  const selectedChat = chats.find(chat => chat.id === selectedChatId);
   // Exclude current user from the list of users to add to a group
   const usersForGroupModal = currentUser ? availableUsers.filter(u => u.id !== currentUser.id) : [];

  // Handle loading state or intermediate state where currentUser might be briefly null
  if (!currentUser) {
     return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading session...</p> {/* Or a loading spinner */}
        </div>
     );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar side="left" collapsible="icon" className="border-r data-[state=collapsed]:border-none data-[variant=inset]:border-none data-[variant=floating]:border-none">
          <SidebarHeader className="p-3">
             {/* User Profile and Logout Button */}
              <div className="flex items-center justify-between mb-3">
                 {/* Pass the confirmed currentUser state */}
                 <UserProfile user={currentUser} size="sm" showName={true} className="group-data-[collapsible=icon]:hidden truncate" />
                  <Button variant="ghost" size="icon" onClick={onLogout} title="Logout" className="ml-auto">
                      <LogOut className="h-5 w-5" />
                      <span className="sr-only">Logout</span>
                  </Button>
              </div>
             <div className="flex items-center justify-between mb-2">
               <h2 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden whitespace-nowrap">
                  ChatterBox
               </h2>
               <SidebarTrigger className="md:hidden" />
               <Button variant="ghost" size="icon" className="group-data-[collapsible=icon]:hidden" onClick={() => setIsNewGroupModalOpen(true)} title="Create New Group">
                  <MessageSquarePlus className="h-5 w-5" />
                  <span className="sr-only">New Group</span>
               </Button>
             </div>
             {/* Search Input */}
             <div className="relative group-data-[collapsible=icon]:hidden mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={view === 'chats' ? "Search chats..." : "Search users..."}
                  className="pl-8 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
               {/* View Toggle Buttons */}
               <div className="flex gap-1 group-data-[collapsible=icon]:hidden">
                 <Button
                   variant={view === 'chats' ? 'secondary' : 'ghost'}
                   size="sm"
                   onClick={() => setView('chats')}
                   className="flex-1"
                 >
                   Chats
                 </Button>
                 <Button
                   variant={view === 'users' ? 'secondary' : 'ghost'}
                   size="sm"
                   onClick={() => setView('users')}
                   className="flex-1"
                 >
                   Users
                 </Button>
               </div>
           </SidebarHeader>
           <SidebarContent className="p-0">
             {isLoadingData ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
             ) : view === 'chats' && currentUser ? (
               <ChatList
                 chats={filteredChats}
                 currentUser={currentUser}
                 selectedChatId={selectedChatId}
                 onSelectChat={handleSelectChat}
               />
             ) : view === 'users' && currentUser ? (
                <ScrollArea className="h-full w-full">
                   <div className="p-2 space-y-1">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <button
                            key={user.id}
                            onClick={() => handleStartDirectChat(user.id)} // *** ADDED onClick HANDLER ***
                            className={cn(
                              'flex items-center w-full p-3 rounded-lg text-left transition-colors hover:bg-secondary/80 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:size-12 group-data-[collapsible=icon]/sidebar:p-0'
                            )}
                            title={`Chat with ${user.name}`} // Tooltip for collapsed view
                          >
                            <UserProfile user={user} size="md" showName={true} className="flex-1 overflow-hidden group-data-[collapsible=icon]/sidebar:hidden" />
                            {/* Just the profile icon for collapsed view */}
                            <div className="hidden group-data-[collapsible=icon]/sidebar:block">
                               <UserProfile user={user} size="md" showName={false} />
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center p-4 group-data-[collapsible=icon]/sidebar:hidden">
                          No users found.
                        </p>
                      )}
                   </div>
                </ScrollArea>
              ) : null /* Handle other potential view states or loading */}
           </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-hidden">
          {selectedChat && view === 'chats' ? ( // Only show chat interface if a chat is selected and view is 'chats'
            <ChatInterface
              chat={selectedChat}
              currentUser={currentUser} // Pass confirmed currentUser state
              onSendMessage={handleSendMessage}
              onStartCall={handleStartCall}
              onEndCall={handleEndCall}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                {isLoadingData ? (
                    <>
                        <Loader2 className="h-12 w-12 mb-4 text-primary/50 animate-spin" />
                        <p>Loading chats...</p>
                    </>
                ) : view === 'chats' && chats.length === 0 ? (
                   <>
                     <MessageSquarePlus className="h-16 w-16 mb-4 text-primary/50" />
                     <p>No chats yet.</p>
                      <p className="text-sm mt-2">Start a conversation with a user or create a group.</p>
                      <div className="mt-4 flex gap-2">
                         <Button variant="outline" size="sm" onClick={() => setView('users')}>
                            <Users className="mr-2 h-4 w-4" /> Find Users
                          </Button>
                         <Button variant="outline" size="sm" onClick={() => setIsNewGroupModalOpen(true)}>
                            <MessageSquarePlus className="mr-2 h-4 w-4" /> Create New Group
                          </Button>
                      </div>
                    </>
                ) : view === 'chats' ? (
                    <>
                        <MessageSquarePlus className="h-16 w-16 mb-4 text-primary/50" />
                        <p>Select a chat to start messaging</p>
                        <p className="text-sm mt-2">or</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsNewGroupModalOpen(true)}>
                            <MessageSquarePlus className="mr-2 h-4 w-4" /> Create New Group
                         </Button>
                    </>
                ) : view === 'users' ? (
                    <>
                        <Users className="h-16 w-16 mb-4 text-primary/50" />
                        <p>Select a user from the list to start a direct message</p>
                    </>
                ) : ( // Fallback
                  <p>Select a chat or user</p>
               )}
            </div>
          )}
        </SidebarInset>
      </div>
       {/* New Group Modal */}
      <NewGroupModal
         isOpen={isNewGroupModalOpen}
         onClose={() => setIsNewGroupModalOpen(false)}
         users={usersForGroupModal} // Pass users excluding the current one
         onCreateGroup={handleCreateGroup}
       />
    </SidebarProvider>
  );
}

