import { createClient } from "@/services/supabase/server";
import ToolCard from "@/components/tool-card";
import { Search } from "lucide-react";
import { type Database } from "@/types/supabase";
import CategoriesFilter from "./categories-filter";

// Define the tool categories enum and values
type ToolCategory = Database["public"]["Enums"]["tool_categories"];

// These values should match the enum in the database
const TOOL_CATEGORIES: ToolCategory[] = [
  "Communication",
  "Productivity",
  "Collaboration",
  "Social Media",
  "Analytics",
  "Finance",
  "Fun",
  "Utility",
  "Uncategorized",
];

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const supabase = await createClient();

  // Get the selected category from URL parameters
  const { category } = await searchParams;
  const selectedCategory = category as ToolCategory | undefined;

  // Query with optional category filter
  let query = supabase.from("tools").select("*");

  // Apply category filter if specified
  if (selectedCategory) {
    query = query.eq("category", selectedCategory);
  }

  const { data: tools } = await query;

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto">
      <div className="flex flex-col gap-8">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold">Explore Tools</h1>
          <p className="text-muted-foreground max-w-3xl">
            Discover the complete collection of tools available in OpenKit.
            Browse through single-capability tools for specific tasks or
            multi-capability toolkits for comprehensive solutions.
          </p>

          <div className="flex flex-col md:flex-row gap-4 items-start md:justify-between">
            {/* Future search functionality could go here */}
            <div className="h-10 w-full md:w-1/2 lg:w-1/3 bg-muted/40 border border-border/50 rounded-lg flex items-center px-3 text-muted-foreground">
              <Search className="h-4 w-4 mr-2" />
              <span>Search coming soon...</span>
            </div>

            {/* Categories filter */}
            <CategoriesFilter
              categories={TOOL_CATEGORIES}
              selectedCategory={selectedCategory}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        {tools?.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-lg text-muted-foreground">No tools found</p>
            <p className="text-muted-foreground">
              Be the first to publish a tool!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
