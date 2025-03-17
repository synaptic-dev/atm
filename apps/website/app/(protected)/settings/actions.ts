"use server";
import { signOut } from "@/services/supabase/auth";
import { redirect } from "next/navigation";

export async function signOutAction() {
  await signOut();
  redirect("/");
}
