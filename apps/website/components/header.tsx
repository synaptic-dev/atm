'use client';

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SearchInput } from "./search-input"
import { useAuth } from "@/lib/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase/client"

export function Header() {
  const { user, loading } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo/Home Link */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">ATM</span>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <SearchInput />
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-6">
          <Link 
            href="/tools" 
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Browse
          </Link>
          <Link 
            href="/docs" 
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Docs
          </Link>
          
          {/* Auth Section */}
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/tools">My Tools</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <a href="https://try-synaptic.ai/login?next=/atm">Sign In</a>
              </Button>
              <Button size="sm" asChild>
                <a href="https://try-synaptic.ai/login?next=/atm">Sign Up</a>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
} 