import { getUser } from "@/services/supabase/user";
import { createClient } from "@/services/supabase/server";
import Link from "next/link";

const UserPage = async ({
  params,
}: {
  params: Promise<{ username: string }>;
}) => {
  const supabase = await createClient();
  const { username } = await params;
  const user = await getUser();

  const isSelf = user?.user_metadata.user_name === username;

  const { data: tools, error } = await supabase
    .from("tools")
    .select("*")
    .eq("owner_username", username);

  return (
    <div>
      {username}
      {isSelf && <button>Edit</button>}
      {tools?.map((tool) => (
        <div key={tool.id}>
          <Link href={`/${username}/${tool.tool_handle}`}>{tool.name}</Link>
        </div>
      ))}
    </div>
  );
};

export default UserPage;
