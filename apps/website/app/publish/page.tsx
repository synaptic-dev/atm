import { createClient } from "@/services/supabase/server";
import { confirmPublish } from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PublishPage = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return (
      <div className="py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data.session) {
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
              <p className="text-sm text-muted-foreground">
                Publishing your tool will make it available to others in the
                OpenKit community. Make sure your tool is ready for others to
                use.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <form action={confirmPublish} className="w-full">
              <Button type="submit" className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Publish Tool
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PublishPage;
