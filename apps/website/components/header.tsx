'use client';

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SearchInput } from "./search-input"
import { Github } from "lucide-react"

export function Header() {
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
          <a 
            href="https://docs.try-synaptic.ai/atm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Docs
          </a>
          <a
            href="https://github.com/synaptic-dev/atm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center"
          >
            <Github className="h-5 w-5" />
          </a>
          
          <Button size="sm" asChild>
            <a 
              href="https://try-synaptic.ai/published-tools"
              target="_blank"
              rel="noopener noreferrer"
            >
              Publish on ATM
            </a>
          </Button>
        </nav>
      </div>
    </header>
  )
} 