import { getUser } from "@/services/supabase/user";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = async () => {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">👌</span>
            <span className="font-bold text-xl">OpenKit</span>
          </Link>

          <NavigationMenu className="ml-4 hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/explore" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Explore
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link
                  href="https://docs.openkit.fun"
                  target="_blank"
                  legacyBehavior
                  passHref
                >
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Docs
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage
                  src={user.user_metadata?.avatar_url || ""}
                  alt={user.user_metadata?.name || user.email || ""}
                />
                <AvatarFallback>
                  {(user.user_metadata?.name ||
                    user.email ||
                    "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
