import { signOutAction } from "./actions";
export default async function Settings() {
  return (
    <div>
      <h1>(Protected): Settings</h1>
      <form action={signOutAction}>
        <button type="submit">Sign out</button>
      </form>
    </div>
  );
}
