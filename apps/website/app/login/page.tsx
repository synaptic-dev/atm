import { getUser } from "@/services/supabase/user";
import { signInWithGithubAction } from "./actions";
import { redirect } from "next/navigation";

export default async function Login() {
  const user = await getUser();

  console.log("🚀 ~ Login ~ user:", user);

  if (user) {
    redirect(`/${user.user_metadata.user_name}`);
  }

  return (
    <form action={signInWithGithubAction}>
      <button type="submit">Login with Github</button>
    </form>
  );
}
