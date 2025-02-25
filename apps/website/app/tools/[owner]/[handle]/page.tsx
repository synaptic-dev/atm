import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeBlock } from '@/components/CodeBlock';

const SUPABASE_URL='https://hnibcchiknipqongruty.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWJjY2hpa25pcHFvbmdydXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NDA3MTksImV4cCI6MjA0NzQxNjcxOX0.ocOf570HeHOoc8ZgKyXeLAJEO90BJ-yQfnPtgBiINKs';

interface Tool {
  name: string;
  handle: string;
  owner_id: string;
  description: string;
  file_path: string;
  capabilities: Capability[];
}

interface Capability {
  id: string;
  name: string;
  description: string;
  key: string;
  schema: string;
  runner: string;
}

async function getCapabilityFiles(supabase: any, filePath: string, key: string) {
  try {
    // Construct paths for schema and runner files
    const schemaPath = `${filePath}/capabilities/${key}/schema.ts`;
    const runnerPath = `${filePath}/capabilities/${key}/runner.ts`;

    // Get public URLs for both files
    const { data: schemaUrlData } = supabase.storage
      .from('atm_tools')
      .getPublicUrl(schemaPath);

    const { data: runnerUrlData } = supabase.storage
      .from('atm_tools')
      .getPublicUrl(runnerPath);

    if (!schemaUrlData?.publicUrl || !runnerUrlData?.publicUrl) {
      console.error('Error getting public URLs');
      return { schema: '', runner: '' };
    }

    // Download both files
    const [schemaRes, runnerRes] = await Promise.all([
      fetch(schemaUrlData.publicUrl),
      fetch(runnerUrlData.publicUrl)
    ]);

    if (!schemaRes.ok || !runnerRes.ok) {
      console.error('Error downloading files:', {
        schema: schemaRes.statusText,
        runner: runnerRes.statusText
      });
      return { schema: '', runner: '' };
    }

    // Get the text content
    const schema = await schemaRes.text();
    const runner = await runnerRes.text();

    return { schema, runner };
  } catch (error) {
    console.error('Error processing capability files:', error);
    return { schema: '', runner: '' };
  }
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ owner: string; handle: string }>
}) {
  const { owner, handle } = await params;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log('owner', owner);
  console.log('handle', handle);

  // Fetch basic tool information
  const { data: toolData, error: toolError } = await supabase
    .from('atm_tools')
    .select('*')
    .eq('owner_id', owner)
    .eq('handle', handle)
    .single();

  if (toolError || !toolData) {
    console.error('Error fetching tool:', toolError);
    notFound();
  }

  // Fetch tool capabilities
  const { data: capabilities, error: capsError } = await supabase
    .from('atm_tool_capabilities')
    .select('*')
    .eq('tool_id', toolData.id);

  if (capsError) {
    console.error('Error fetching capabilities:', capsError);
    notFound();
  }

  // Fetch schema and runner code for each capability
  const capabilitiesWithCode = await Promise.all(
    (capabilities || []).map(async (cap) => {
      const { schema, runner } = await getCapabilityFiles(supabase, toolData.file_path, cap.key);
      return {
        ...cap,
        schema,
        runner
      };
    })
  );

  const tool: Tool = {
    ...toolData,
    capabilities: capabilitiesWithCode
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{tool.name}</h1>
        <p className="text-lg text-gray-600">{tool.owner_id} / {tool.handle}</p>
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