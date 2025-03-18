import { createClient } from "@/services/supabase/server";
import { Badge } from "@/components/ui/badge";
import ToolCard from "@/components/tool-card";

export default async function Home() {
  const supabase = await createClient();
  const { data: tools } = await supabase.from("tools").select();

  return (
    <div className="py-10">
      <div className="flex flex-col gap-6">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-16">
          <div className="flex max-w-[64rem] flex-col items-center gap-4 text-center mx-auto">
            <Badge className="px-4 py-1.5 text-sm" variant="secondary">
              Welcome to OpenKit
            </Badge>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">
              The App Store for Agents
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Unleash the power of agents with OpenKit
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools?.map((tool) => (
            <ToolCard
              key={tool.id}
              id={tool.id}
              name={tool.name}
              description={tool.description}
              type={tool.type}
              owner_username={tool.owner_username}
              tool_handle={tool.tool_handle}
              created_at={tool.created_at}
              category={tool.category}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
