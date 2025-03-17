import { getUser } from "@/services/supabase/user";
import { signInWithGithubAction } from "./actions";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Github } from "lucide-react";

export default async function Login() {
  const user = await getUser();

  console.log("🚀 ~ Login ~ user:", user);

  if (user) {
    redirect(`/${user.user_metadata.user_name}`);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Continue with GitHub to start using OpenKit
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form action={signInWithGithubAction}>
            <Button className="w-full" type="submit">
              <Github className="mr-2 h-4 w-4" />
              Sign in with GitHub
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          By signing in, you agree to our{" "}
          <a
            href="/terms"
            className="underline underline-offset-4 hover:text-primary ml-1 mr-1"
          >
            Terms of Service
          </a>
          and
          <a
            href="/privacy"
            className="underline underline-offset-4 hover:text-primary ml-1"
          >
            Privacy Policy
          </a>
          .
        </CardFooter>
      </Card>
    </div>
  );
}
