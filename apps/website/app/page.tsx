import { createClient } from "@/services/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const { data: tools } = await supabase.from("tools").select();

  return (
    <div>
      {tools?.map((tool) => (
        <div key={tool.id}>
          <Link href={`/${tool.owner_username}/${tool.tool_handle}`}>
            <div className="flex items-center gap-2">
              <p>{tool.name}</p>
              <p>{tool.description}</p>
              <p>{tool.created_at}</p>
              <p>{tool.owner_username}</p>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
