import { createClient } from "./server";

const getUser = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return data?.user;
};

export { getUser };
