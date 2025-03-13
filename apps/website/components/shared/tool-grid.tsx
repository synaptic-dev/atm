import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Tool } from '@/lib/supabase/tools';

interface ToolGridProps {
  tools: Tool[];
  limit?: number;
}

export function ToolGrid({ tools, limit }: ToolGridProps) {
  const displayTools = limit ? tools.slice(0, limit) : tools;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displayTools.map((tool: Tool) => (
        <Link 
          key={tool.id} 
          href={`/tools/${tool.owner_username}/${tool.tool_handle}`}
          prefetch={true}
          className="block h-full"
        >
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>{tool.name}</CardTitle>
              <CardDescription>
                <span className="text-sm text-gray-500">by {tool.owner_username}</span>
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
  );
} 