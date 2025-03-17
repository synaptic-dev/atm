"use server";

import { createClient } from "@/services/supabase/server";
import { getUser } from "@/services/supabase/user";
import { redirect } from "next/navigation";

const deleteTool = async ({
  toolId,
  ownerId,
}: {
  toolId: string;
  ownerId: string;
}) => {
  console.log("deleteTool", toolId, ownerId);
  const user = await getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tools")
    .delete()
    .eq("id", toolId)
    .eq("owner_id", ownerId);

  console.log("deleteTool result", data, error);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/${user.user_metadata.user_name}`);
};

export { deleteTool };
