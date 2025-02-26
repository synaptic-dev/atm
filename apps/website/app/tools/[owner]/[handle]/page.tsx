import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeBlock } from '@/components/CodeBlock';
import { getTool, getTools } from '@/lib/s3';

// Revalidate the page every hour
export const revalidate = 3600;

interface PageProps {
  params: Promise<{
    owner: string;
    handle: string;
  }>;
}

// Generate static params for all tools
export async function generateStaticParams() {
  const tools = await getTools();
  
  return tools.map((tool) => ({
    owner: tool.owner_username,
    handle: tool.handle,
  }));
}

export default async function ToolPage({ params }: PageProps) {
  const { owner, handle } = await params;
  
  const tool = await getTool(owner, handle);
  if (!tool) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{tool.name}</h1>
        <p className="text-lg text-gray-600">{tool.owner_username} / {tool.handle}</p>
      </div>
      <p className="text-lg text-gray-600 mb-8">{tool.description}</p>

      <h2 className="text-2xl font-semibold mb-4">Capabilities</h2>
      <div className="grid grid-cols-1 gap-6">
        {tool.capabilities.map((capability) => (
          <Card key={capability.id} className="w-full">
            <CardHeader>
              <CardTitle>{capability.name}</CardTitle>
              <CardDescription>{capability.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="schema">
                <TabsList>
                  <TabsTrigger value="schema">Schema</TabsTrigger>
                  <TabsTrigger value="runner">Runner</TabsTrigger>
                </TabsList>
                <TabsContent value="schema">
                  <CodeBlock code={capability.schema} language="typescript" />
                </TabsContent>
                <TabsContent value="runner">
                  <CodeBlock code={capability.runner} language="typescript" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 