import { createClient } from "@/services/supabase/server";
import { getUser } from "@/services/supabase/user";
import adminSupabase from "@/services/supabase/admin";
import { deleteTool } from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CircleDot,
  Info,
  Layers,
  Trash2,
  User,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ToolPage = async ({
  params,
}: {
  params: Promise<{ username: string; tool_handle: string }>;
}) => {
  const user = await getUser();
  const { username, tool_handle } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tools")
    .select(
      `
      *,
      tool_capabilities(*)
    `,
    )
    .eq("owner_username", username)
    .eq("tool_handle", tool_handle);

  const tool = data?.[0];

  if (!tool) {
    return (
      <div className="py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tool not found</AlertTitle>
          <AlertDescription>
            The requested tool could not be found. It may have been deleted or
            moved.
          </AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button variant="outline" asChild>
            <Link href="/">
              <AlertCircle className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Fetch author metadata using admin client
  const { data: authorData } = await adminSupabase.auth.admin.getUserById(
    tool.owner_id,
  );
  const authorMetadata = authorData?.user?.user_metadata || {};
  const authorAvatar = authorMetadata.avatar_url || "";
  const authorFullName = authorMetadata.full_name || "";

  const isMultiCapability = tool.type === "multi-capability";

  // Get the file content for both single capability tools and the first tab of multi-capability tools
  let fileContent = null;
  const fileResponse = await fetch(
    `${process.env.NEXT_PUBLIC_R2_BUCKET_URL}/files/${tool.owner_id}/${tool_handle}`,
    {
      headers: {
        "Content-Type": "application/x-gzip",
      },
    },
  );

  if (fileResponse.ok) {
    fileContent = await fileResponse.text();
  }

  return (
    <div className="py-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Tool Info - Main Content Area */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{tool.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 h-6 text-xs font-normal"
                  >
                    {isMultiCapability ? (
                      <>
                        <Layers className="h-3 w-3" />
                        <span>Multi</span>
                      </>
                    ) : (
                      <>
                        <CircleDot className="h-3 w-3" />
                        <span>Single</span>
                      </>
                    )}
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-base">
                {tool.description}
              </CardDescription>

              {isMultiCapability && (
                <div className="flex items-start gap-2 mt-4 p-3 bg-muted/40 rounded-md text-sm text-muted-foreground border border-border/50">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    <span className="font-medium">Tip:</span> This is a
                    multi-capability tool. Each capability can be used
                    independently as a single tool or together as a complete
                    toolkit.
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* Display based on capability type */}
              {isMultiCapability ? (
                <div className="mt-4">
                  <Tabs defaultValue="full" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="full">Full Tool</TabsTrigger>
                      <TabsTrigger value="capabilities">
                        Capabilities
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="full"
                      className="border rounded-md p-4 bg-muted/30"
                    >
                      {fileContent ? (
                        <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96 p-4 bg-background rounded border">
                          {fileContent}
                        </pre>
                      ) : (
                        <div className="text-sm text-muted-foreground p-4">
                          Tool configuration file not available.
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent
                      value="capabilities"
                      className="border rounded-md p-4 bg-muted/30"
                    >
                      <h3 className="font-medium mb-4">Capabilities</h3>
                      <Accordion type="single" collapsible className="w-full">
                        {tool.tool_capabilities.map(
                          (capability: any, index: number) => (
                            <AccordionItem
                              key={capability.id}
                              value={capability.id}
                            >
                              <AccordionTrigger className="text-sm font-medium">
                                {capability.name || `Capability ${index + 1}`}
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="text-sm text-muted-foreground mb-4">
                                  {capability.description ||
                                    "No description available."}
                                </div>
                                <AsyncFileContent
                                  toolOwnerId={tool.owner_id}
                                  toolHandle={tool_handle}
                                  capabilityKey={capability.key}
                                />
                              </AccordionContent>
                            </AccordionItem>
                          ),
                        )}
                      </Accordion>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="mt-4 border rounded-md p-4 bg-muted/30">
                  {fileContent ? (
                    <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96 p-4 bg-background rounded border">
                      {fileContent}
                    </pre>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4">
                      Configuration file not available.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tool Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Created by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/${tool.owner_username}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={authorAvatar}
                        alt={authorFullName || username}
                      />
                      <AvatarFallback>
                        {authorFullName
                          ? authorFullName[0]?.toUpperCase()
                          : username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      {authorFullName && (
                        <p className="text-sm font-medium">{authorFullName}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        @{tool.owner_username}
                      </p>
                    </div>
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {tool.created_at
                        ? formatDistanceToNow(new Date(tool.created_at), {
                            addSuffix: true,
                          })
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            {user?.id === tool.owner_id && (
              <CardFooter>
                <form
                  className="w-full"
                  action={async () => {
                    "use server";
                    await deleteTool({
                      toolId: tool.id,
                      ownerId: tool.owner_id,
                    });
                  }}
                >
                  <Button
                    variant="destructive"
                    type="submit"
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Tool
                  </Button>
                </form>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// Component to fetch and display file content for multi-capability tools
const AsyncFileContent = async ({
  toolOwnerId,
  toolHandle,
  capabilityKey,
}: {
  toolOwnerId: string;
  toolHandle: string;
  capabilityKey: string;
}) => {
  try {
    const filePath = `${toolHandle}-${capabilityKey}`;
    const fileResponse = await fetch(
      `${process.env.NEXT_PUBLIC_R2_BUCKET_URL}/files/${toolOwnerId}/${filePath}`,
      {
        headers: {
          "Content-Type": "application/x-gzip",
        },
      },
    );

    if (fileResponse.ok) {
      const fileContent = await fileResponse.text();
      return (
        <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96 p-4 bg-background rounded border">
          {fileContent}
        </pre>
      );
    } else {
      return (
        <div className="text-sm text-muted-foreground p-4">
          Configuration file not available.
        </div>
      );
    }
  } catch (error) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Error loading configuration file.
      </div>
    );
  }
};

export default ToolPage;
