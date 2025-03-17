import { createClient } from "@/services/supabase/server";
import { getUser } from "@/services/supabase/user";
import { deleteTool } from "./actions";

const ToolPage = async ({
  params,
}: {
  params: Promise<{ username: string; tool_handle: string }>;
}) => {
  const user = await getUser();
  const { username, tool_handle } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tools")
    .select(
      `
      *,
      tool_capabilities(*)
    `,
    )
    .eq("owner_username", username)
    .eq("tool_handle", tool_handle);

  const tool = data?.[0];

  if (!tool) {
    return <div>Tool not found</div>;
  }

  const file = await fetch(
    `${process.env.NEXT_PUBLIC_R2_BUCKET_URL}/files/${tool.owner_id}/${tool_handle}`,
    {
      headers: {
        "Content-Type": "application/x-gzip",
      },
    },
  );

  return (
    <div className="mt-16">
      <div>{JSON.stringify(data)}</div>
      {file.ok && (
        <div>
          <pre>{file.text()}</pre>
        </div>
      )}

      {user?.id === tool.owner_id && (
        <form
          action={async () => {
            "use server";
            await deleteTool({ toolId: tool.id, ownerId: tool.owner_id });
          }}
        >
          <button type="submit">Delete</button>
        </form>
      )}
    </div>
  );
};

export default ToolPage;
