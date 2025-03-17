import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, CircleDot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ToolCardProps = {
  id: string;
  name: string;
  description: string;
  type: string;
  owner_username: string;
  tool_handle: string;
  created_at: string;
};

export default function ToolCard({
  id,
  name,
  description,
  type,
  owner_username,
  tool_handle,
  created_at,
}: ToolCardProps) {
  const isMultiCapability = type === "multi-capability";

  return (
    <Link href={`/${owner_username}/${tool_handle}`} key={id} className="group">
      <Card className="h-full flex flex-col overflow-hidden transition-all hover:border-primary hover:shadow-md">
        <CardHeader className="pb-2 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="line-clamp-1 text-lg">{name}</CardTitle>
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
          <CardDescription className="line-clamp-2">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-grow p-0">
          {/* Card content can be added here if needed */}
        </CardContent>

        <CardFooter className="border-t mt-auto flex items-center justify-between bg-muted/20 p-3">
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
