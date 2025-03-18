import Link from "next/link";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, CircleDot, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/types/supabase";

type ToolCardProps = {
  id: string;
  name: string;
  description: string;
  type: string;
  owner_username: string;
  tool_handle: string;
  created_at: string;
  category?: Database["public"]["Enums"]["tool_categories"] | null;
};

export default function ToolCard({
  id,
  name,
  description,
  type,
  owner_username,
  tool_handle,
  created_at,
  category,
}: ToolCardProps) {
  const isMultiCapability = type === "multi-capability";

  return (
    <Link href={`/${owner_username}/${tool_handle}`} key={id} className="group">
      <Card className="h-full flex flex-col overflow-hidden transition-all hover:border-primary hover:shadow-md">
        <div className="flex flex-col gap-y-1">
          <div className="px-3">
            {category && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 h-6 text-xs font-normal px-2 mb-2"
              >
                <Tag className="h-3 w-3" />
                <span>{category}</span>
              </Badge>
            )}
          </div>

          <CardHeader className="pb-3 pt-0 px-3">
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="line-clamp-1 text-lg">{name}</CardTitle>
              <Badge
                variant="outline"
                className="flex items-center gap-1 h-6 text-xs font-normal shrink-0"
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
            <CardDescription className="line-clamp-2 mt-2">
              {description}
            </CardDescription>
          </CardHeader>
        </div>

        <CardFooter className="border-t mt-auto flex items-center justify-between bg-muted/20 py-2 px-3">
          <Badge
            variant="secondary"
            className="px-2 py-1 h-auto text-xs font-normal"
          >
            by {owner_username}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {created_at
              ? formatDistanceToNow(new Date(created_at), {
                  addSuffix: true,
                })
              : ""}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
