"use server";
import { signInWithGithub } from "@/services/supabase/auth";

export async function signInWithGithubAction() {
  await signInWithGithub();
}
