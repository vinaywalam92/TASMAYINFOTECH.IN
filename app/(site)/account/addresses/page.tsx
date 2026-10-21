import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteAddressAction } from "@/actions/account";
import { AddressForm } from "@/components/auth/AccountForms";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const list = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Saved addresses</h1>
      <ul className="space-y-4">
        {list.map((a) => (
          <li key={a.id} className="glass rounded-2xl p-4">
            <details>
              <summary className="cursor-pointer">
                <span className="font-medium">{a.label || a.name}</span>{a.isDefault ? <span className="chip ml-2">Default</span> : null}
                <span className="block text-sm text-muted">{a.name}, {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode} · {a.phone}</span>
              </summary>
              <div className="mt-4 space-y-3">
                <AddressForm address={a} />
                <form action={deleteAddressAction}><input type="hidden" name="id" value={a.id} /><button className="btn-danger btn-sm">Delete address</button></form>
              </div>
            </details>
          </li>
        ))}
        {list.length === 0 ? <li className="text-muted">No saved addresses yet.</li> : null}
      </ul>
      <section><h2 className="mb-4 text-xl font-semibold">Add a new address</h2><div className="glass rounded-2xl p-5"><AddressForm /></div></section>
    </div>
  );
}
