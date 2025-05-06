'use client';

import type { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserProfileProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export function UserProfile({ user, size = 'md', showName = false, className }: UserProfileProps) {
  const avatarSizeClass = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  }[size];

  const statusSizeClass = {
    sm: 'h-2 w-2 bottom-0 right-0',
    md: 'h-2.5 w-2.5 bottom-0 right-0',
    lg: 'h-3 w-3 bottom-0.5 right-0.5',
  }[size];

  const fallback = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative shrink-0">
        <Avatar className={cn(avatarSizeClass)}>
           <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile picture"/>
           <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        {user.isOnline && (
           <span
              className={cn(
                'absolute rounded-full bg-accent ring-2 ring-background',
                statusSizeClass
              )}
              title="Online"
            />
        )}
      </div>
      {showName && <span className="font-medium truncate">{user.name}</span>}
    </div>
  );
}
