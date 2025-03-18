"use server";
import { createClient } from "@/services/supabase/server";
import { redirect } from "next/navigation";
import { type Database } from "@/types/supabase";

// Define the tool category type
type ToolCategory = Database["public"]["Enums"]["tool_categories"];

const confirmPublish = async (formData: FormData): Promise<void> => {
  const category = formData.get("category") as ToolCategory;

  // Validate category
  if (!category) {
    throw new Error("Please select a category for your tool");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  console.log("🚀 ~ confirmPublish ~ data:", data);
  console.log("🚀 ~ confirmPublish ~ category:", category);

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error("No session found");
  }

  // Use the CLI server URL from environment variable
  const cliServerUrl =
    process.env.NEXT_PUBLIC_CLI_SERVER_URL || "http://localhost:42420";

  console.log("🚀 ~ confirmPublish ~ cliServerUrl:", cliServerUrl);

  // Create the redirect URL with auth parameters
  const redirectUrl = new URL(cliServerUrl);
  redirectUrl.searchParams.set("access_token", data.session.access_token);

  // Add refresh_token parameter
  redirectUrl.searchParams.set("refresh_token", data.session.refresh_token);

  // Add user_id parameter which is needed by the CLI
  if (data.session.user?.id) {
    redirectUrl.searchParams.set("user_id", data.session.user.id);
  }

  // Add category parameter
  redirectUrl.searchParams.set("category", category);

  // Redirect to a special handler page that will redirect to localhost
  // and then automatically show success
  redirect(
    `/publish/redirect?target=${encodeURIComponent(redirectUrl.toString())}`,
  );
};

export { confirmPublish };
