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

export default function ToolDetail({ params }: { params: { id: string } }) {
  // For demo purposes - in real app, fetch tool data based on params.id
  const tool = {
    id: params.id,
    name: "Gmail",
    description: "Send emails programmatically through Gmail API with advanced templating and attachment support",
    author: "Google",
    version: "2.1.0",
    capabilities: [
      {
        name: "Send Email",
        description: "Send a new email to one or multiple recipients",
        schema: {
          input: {
            type: "object",
            required: ["to", "subject", "body"],
            properties: {
              to: {
                type: "string",
                description: "Recipient email address"
              },
              subject: {
                type: "string",
                description: "Email subject line"
              },
              body: {
                type: "string",
                description: "Email body content (supports HTML)"
              }
            }
          }
        },
        runnerCode: `async function sendEmail(input: SendEmailInput) {
  const gmail = google.gmail({ version: 'v1', auth });
  
  // Create email content
  const message = {
    to: input.to,
    subject: input.subject,
    html: input.body
  };

  // Encode the email in base64
  const encodedMessage = Buffer.from(
    Object.entries(message)
      .map(([key, value]) => \`\${key}: \${value}\`)
      .join('\\n')
  ).toString('base64');

  // Send the email
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });

  return res.data;
}`
      },
      {
        name: "Check Email",
        description: "Check for new emails in your inbox",
        schema: {
          input: {
            type: "object",
            properties: {
              maxResults: {
                type: "number",
                description: "Maximum number of emails to return",
                default: 10
              },
              labelIds: {
                type: "array",
                items: { type: "string" },
                description: "Only return messages with these labels"
              }
            }
          }
        },
        runnerCode: `async function checkEmail(input: CheckEmailInput) {
  const gmail = google.gmail({ version: 'v1', auth });

  // List messages matching the criteria
  const res = await gmail.users.messages.list({
    userId: 'me',
    maxResults: input.maxResults || 10,
    labelIds: input.labelIds,
    q: 'in:inbox'
  });

  // Get full message details for each email
  const messages = await Promise.all(
    res.data.messages.map(async (message) => {
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: message.id
      });
      return details.data;
    })
  );

  return messages;
}`
      },
      {
        name: "Draft Email",
        description: "Create a draft email without sending",
        schema: {
          input: {
            type: "object",
            required: ["to", "subject", "body"],
            properties: {
              to: {
                type: "string",
                description: "Recipient email address"
              },
              subject: {
                type: "string",
                description: "Email subject line"
              },
              body: {
                type: "string",
                description: "Email body content"
              }
            }
          }
        },
        runnerCode: `async function createDraft(input: CreateDraftInput) {
  const gmail = google.gmail({ version: 'v1', auth });

  // Create draft content
  const message = {
    to: input.to,
    subject: input.subject,
    html: input.body
  };

  // Encode the email in base64
  const encodedMessage = Buffer.from(
    Object.entries(message)
      .map(([key, value]) => \`\${key}: \${value}\`)
      .join('\\n')
  ).toString('base64');

  // Create the draft
  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: encodedMessage
      }
    }
  });

  return res.data;
}`
      }
    ]
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
                  <div className="flex flex-col items-start gap-1.5">
                    <h3 className="font-semibold text-lg">{capability.name}</h3>
                    <p className="text-sm text-muted-foreground font-normal">
                      {capability.description}
                    </p>
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