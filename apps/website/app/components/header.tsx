import { getUser } from "@/services/supabase/user";
import Link from "next/link";

const Header = async () => {
  const user = await getUser();

  return (
    <div className="h-16 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-full px-4">
        <Link href="/" className="text-2xl font-bold">
          👌 OpenKit
        </Link>
        {user ? (
          <div className="flex items-center gap-4">
            <Link href="/settings">Settings</Link>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/login">Login</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
