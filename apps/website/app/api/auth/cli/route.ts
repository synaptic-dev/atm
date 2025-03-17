import { createClient } from "@/services/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getSession();

  console.log("🚀 ~ GET ~ session data:", data);

  // Extract the 'next' URL parameter from the request
  const url = new URL(request.url);
  const nextUrl = url.searchParams.get("next");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data.session) {
    return Response.json({ error: "No active session" }, { status: 401 });
  }

  // If a next URL was provided, redirect to it with the access token
  if (nextUrl) {
    const redirectUrl = new URL(decodeURIComponent(nextUrl));
    redirectUrl.searchParams.set("access_token", data.session.access_token);
    return Response.redirect(redirectUrl.toString());
  }

  return Response.json({ session: data.session });
}
