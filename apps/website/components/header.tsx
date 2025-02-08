import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-8 sm:px-20">
        <div className="flex flex-1 items-center justify-between">
          {/* Logo/Home Link */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">ATM</span>
          </Link>

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
            
            {/* Auth Buttons */}
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
              <Button size="sm">
                Sign Up
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
} 