import { getTools } from '@/lib/s3';
import { Tool } from '@/lib/s3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function ToolsPage() {
  const tools = await getTools();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Available Tools</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool: Tool) => (
          <Link key={tool.id} href={`/tools/${tool.owner_id}/${tool.handle}`}>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{tool.name}</CardTitle>
                <CardDescription>
                  <span className="text-sm text-gray-500">{tool.owner_id} / {tool.handle}</span>
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