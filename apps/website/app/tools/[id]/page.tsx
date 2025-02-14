import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Zap, ChevronDown } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { getTool } from "@/lib/s3"
import { DownloadCapability } from "@/components/download-capability"

export default async function ToolDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const tool = await getTool(id);

  if (!tool) {
    return <div>Tool not found</div>;
  }

  return (
    <div className="container mx-auto py-10">
      {/* Tool Header with CTA */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">{tool.name}</h1>
          <p className="text-muted-foreground text-lg">{tool.description}</p>
        </div>
        <Button className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Enable on Synaptic 
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Tool Information</CardTitle>
              <CardDescription>Basic details about the tool</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-1">Author</h3>
                  <p className="text-muted-foreground">{tool.author}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Version</h3>
                  <p className="text-muted-foreground">{tool.version}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capabilities Tab */}
        <TabsContent value="capabilities">
          <Accordion type="single" collapsible className="space-y-4">
            {tool.capabilities.map((capability) => (
              <AccordionItem key={capability.name} value={capability.name} className="border rounded-lg px-6">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-1 items-center justify-between pr-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{capability.name}</h3>
                        <DownloadCapability 
                          name={capability.name}
                          schema={capability.schema}
                          runnerCode={capability.runnerCode}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground font-normal">
                        {capability.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Tabs defaultValue="schema" className="mt-4">
                    <TabsList>
                      <TabsTrigger value="schema">Schema</TabsTrigger>
                      <TabsTrigger value="runner">Runner Code</TabsTrigger>
                    </TabsList>
                    <TabsContent value="schema" className="mt-4">
                      <pre className="bg-muted p-4 rounded-lg overflow-auto">
                        {JSON.stringify(capability.schema, null, 2)}
                      </pre>
                    </TabsContent>
                    <TabsContent value="runner" className="mt-4">
                      <pre className="bg-muted p-4 rounded-lg overflow-auto font-mono text-sm">
                        {capability.runnerCode}
                      </pre>
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  )
} 