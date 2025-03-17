import { createClient } from "@/services/supabase/server";
import { redirect } from "next/navigation";

async function signInWithGithub() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/api/auth/callback`,
    },
  });
  console.log("🚀 ~ signInWithGithub ~ data:", data);
  if (error) {
    console.error(error);
  }

  if (data.url) {
    redirect(data.url);
  }
}

async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export { signInWithGithub, signOut };
