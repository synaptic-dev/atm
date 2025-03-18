import { createClient } from "@/services/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CategoryForm from "./category-form";
import { type Database } from "@/types/supabase";

// Define the tool categories enum and values
type ToolCategory = Database["public"]["Enums"]["tool_categories"];

// These values should match the enum in the database
const TOOL_CATEGORIES: ToolCategory[] = [
  "Communication",
  "Productivity",
  "Collaboration",
  "Social Media",
  "Analytics",
  "Finance",
  "Fun",
  "Utility",
  "Uncategorized",
];

const PublishPage = async () => {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getSession();

  if (authError) {
    return (
      <div className="py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{authError.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!authData.session) {
    return (
      <div className="py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please sign in to publish your tool.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Publish Your Tool</CardTitle>
            <CardDescription>
              Share your tool with the OpenKit community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-6">
                Publishing your tool will make it available to others in the
                OpenKit community. Make sure your tool is ready for others to
                use.
              </p>

              <CategoryForm categories={TOOL_CATEGORIES} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublishPage;
