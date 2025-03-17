import { createClient } from "@/services/supabase/server";
import { confirmPublish } from "./actions";

const PublishPage = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return <div>Error: {error.message}</div>;
  }
  if (!data.session) {
    return <div>No session found</div>;
  }

  return (
    <form action={confirmPublish}>
      <button type="submit">Publish</button>
    </form>
  );
};

export default PublishPage;
