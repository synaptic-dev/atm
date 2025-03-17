import { getUser } from "@/services/supabase/user";
import { createClient } from "@/services/supabase/server";
import adminSupabase from "@/services/supabase/admin";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Plus } from "lucide-react";
import ToolCard from "@/components/tool-card";

const UserPage = async ({
  params,
}: {
  params: Promise<{ username: string }>;
}) => {
  const supabase = await createClient();
  const { username } = await params;
  const user = await getUser();

  const isSelf = user?.user_metadata.user_name === username;

  // Get the tools first
  const { data: tools } = await supabase
    .from("tools")
    .select("*")
    .eq("owner_username", username);

  // Get user metadata from admin auth using owner_id from one of the tools
  let authorMetadata: { avatar_url?: string; full_name?: string } = {};
  let authorAvatar = "";
  let authorFullName = "";

  if (tools && tools.length > 0) {
    const ownerId = tools[0].owner_id;
    const { data: authorData } =
      await adminSupabase.auth.admin.getUserById(ownerId);

    authorMetadata = authorData?.user?.user_metadata || {};
    authorAvatar = authorMetadata.avatar_url || "";
    authorFullName = authorMetadata.full_name || "";
  }

  return (
    <div className="py-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* User Info Sidebar - Now on the left */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
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
                      <p className="text-lg font-medium">{authorFullName}</p>
                    )}
                    <p className="text-lg font-medium">{username}</p>
                  </div>
                </div>

                {isSelf && (
                  <div className="flex flex-col gap-2 pt-2">
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                    <Button variant="default" size="sm" asChild>
                      <Link href="/publish">
                        <Plus className="mr-2 h-4 w-4" />
                        New Tool
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area - Tools - Now on the right */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Tools</CardTitle>
            </CardHeader>
            <CardContent>
              {tools && tools.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {tools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      id={tool.id}
                      name={tool.name}
                      description={tool.description}
                      type={tool.type}
                      owner_username={tool.owner_username}
                      tool_handle={tool.tool_handle}
                      created_at={tool.created_at}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">No tools found</p>
                  {isSelf && (
                    <Button variant="outline" className="mt-4" asChild>
                      <Link href="/publish">
                        <Plus className="mr-2 h-4 w-4" />
                        Create your first tool
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserPage;
