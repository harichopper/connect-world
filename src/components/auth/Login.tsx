
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }
    setError('');
    onLogin(username.trim());
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary/40">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome to ChatterBox</CardTitle>
          <CardDescription>Enter your username to join</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="e.g., Alice"
                value={username}
                onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(''); // Clear error on typing
                }}
                aria-describedby={error ? "username-error" : undefined}
              />
               {error && <p id="username-error" className="text-xs text-destructive">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              <LogIn className="mr-2 h-4 w-4" /> Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
