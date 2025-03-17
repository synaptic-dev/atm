import { signOutAction } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { getUser } from "@/services/supabase/user";

export default async function Settings() {
  const user = await getUser();

  return (
    <div className="py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Settings
        </h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm font-medium">Username</p>
                <p className="text-sm text-muted-foreground">
                  @{user?.user_metadata?.user_name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Manage your active session</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between">
            <form action={signOutAction}>
              <Button variant="destructive" type="submit">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
