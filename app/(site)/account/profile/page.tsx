import { requireUser } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "@/components/auth/AccountForms";

export const metadata = { title: "Profile & security" };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  return (
    <div className="max-w-xl space-y-10">
      <section><h1 className="mb-4 text-2xl font-bold">Profile</h1><p className="mb-4 text-sm text-muted">Email: {user.email}</p><ProfileForm name={user.name} phone={user.phone ?? ""} /></section>
      <section><h2 className="mb-4 text-xl font-semibold">Change password</h2><PasswordForm /><p className="mt-3 text-xs text-muted">Changing your password signs you out of other devices.</p></section>
    </div>
  );
}
