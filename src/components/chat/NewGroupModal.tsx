
'use client';

import React, { useState } from 'react';
import type { User } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, X } from 'lucide-react';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[]; // Users available to add (excluding current user)
  onCreateGroup: (groupName: string, selectedUserIds: string[]) => void;
}

export function NewGroupModal({ isOpen, onClose, users, onCreateGroup }: NewGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const handleUserSelect = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    // Basic validation
    if (groupName.trim() && selectedUserIds.size > 0) {
      onCreateGroup(groupName.trim(), Array.from(selectedUserIds));
       // Reset state after creation attempt (or success)
       setGroupName('');
       setSelectedUserIds(new Set());
       setSearchTerm('');
      // onClose(); // Keep open on error, close on success is handled in parent
    } else {
       // Optionally show an inline error/toast message here
       console.warn("Group name and at least one member required.");
    }
  };

   // Filter users based on search term
   const filteredUsers = users.filter(user =>
     user.name.toLowerCase().includes(searchTerm.toLowerCase())
   );

   const handleClose = () => {
       // Reset state on close
       setGroupName('');
       setSelectedUserIds(new Set());
       setSearchTerm('');
       onClose();
    };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Create New Group</DialogTitle>
          <DialogDescription>
            Select members and give your group a name.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Group Name Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="group-name" className="text-right">
              Name
            </Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group Name"
              className="col-span-3"
            />
          </div>

          {/* Member Search Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="member-search" className="text-right">
              Members
            </Label>
            <Input
              id="member-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members..."
              className="col-span-3"
            />
          </div>

          {/* Member Selection List */}
          <ScrollArea className="h-[200px] col-span-4 border rounded-md p-2">
            <div className="space-y-2">
              {filteredUsers.length > 0 ? (
                 filteredUsers.map(user => (
                   <div key={user.id} className="flex items-center justify-between space-x-2 p-2 rounded-md hover:bg-secondary/50 transition-colors">
                     <div className="flex items-center space-x-3">
                       <Checkbox
                         id={`user-${user.id}`}
                         checked={selectedUserIds.has(user.id)}
                         onCheckedChange={() => handleUserSelect(user.id)}
                         aria-label={`Select ${user.name}`}
                       />
                       <Avatar className="h-8 w-8">
                         <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile picture"/>
                         <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                       </Avatar>
                       <Label htmlFor={`user-${user.id}`} className="font-normal cursor-pointer">
                         {user.name}
                       </Label>
                      </div>
                     {user.isOnline && <span className="h-2 w-2 rounded-full bg-accent" title="Online"></span>}
                   </div>
                 ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!groupName.trim() || selectedUserIds.size === 0}
          >
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
