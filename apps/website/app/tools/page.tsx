import { getTools } from '@/lib/supabase/tools';
import { Tool } from '@/lib/supabase/tools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

// Revalidate the page every hour
export const revalidate = 3600;

export default async function ToolsPage() {
  const tools = await getTools();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Available Tools</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool: Tool) => (
          <Link key={tool.id} href={`/tools/${tool.owner_username}/${tool.tool_handle}`}>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{tool.name}</CardTitle>
                <CardDescription>
                  <span className="text-sm text-gray-500">{tool.owner_username} / {tool.tool_handle}</span>
                  <p className="mt-1">{tool.description}</p>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500">
                  {(tool.capabilities || []).length} capabilities
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 