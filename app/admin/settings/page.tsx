import { requirePermission } from "@/lib/auth";
import { getSettings, POLICY_KEYS } from "@/lib/settings";
import { saveSettingsAction } from "@/actions/admin/ops";
import { Card, F, Flash, PageTitle, Sel } from "@/components/admin/ui";

export const metadata = { title: "Settings" };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const POLICY_TITLES: Record<string, string> = { shipping: "Shipping policy", returns: "Return & refund policy", cancellation: "Cancellation policy", privacy: "Privacy policy", terms: "Terms & conditions" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requirePermission("settings:write");
  const sp = await searchParams;
  const s = await getSettings();
  const benefits = [...s.benefits, { title: "", body: "" }];
  return (
    <div className="max-w-4xl space-y-6">
      <PageTitle>Settings</PageTitle><Flash sp={sp} />
      <p className="text-sm text-muted">Nothing is pre-filled with invented details. Anything left blank is simply not shown on the storefront.</p>

      <Card title="Business details">
        <form action={saveSettingsAction} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="section" value="business" />
          <F label="Display name" name="businessName" defaultValue={s.businessName} /><F label="Legal name" name="legalName" defaultValue={s.legalName} />
          <F label="Email" name="email" type="email" defaultValue={s.email} /><F label="Phone" name="phone" defaultValue={s.phone} />
          <F label="WhatsApp number" name="whatsapp" defaultValue={s.whatsapp} /><F label="Notification email" name="notifyEmail" type="email" defaultValue={s.notifyEmail} hint="Where enquiries are emailed. Defaults to Email." />
          <F label="Address" name="address" textarea rows={2} defaultValue={s.address} className="sm:col-span-2" /><F label="Business hours" name="hours" defaultValue={s.hours} className="sm:col-span-2" />
          <F label="Google Maps embed URL" name="mapEmbedUrl" defaultValue={s.mapEmbedUrl} hint="https://www.google.com/maps/embed?…" className="sm:col-span-2" />
          <F label="GSTIN" name="gstin" defaultValue={s.gstin} /><F label="Seller state code (2 digits)" name="sellerStateCode" defaultValue={s.sellerStateCode} />
          <Sel label="Listed prices are" name="priceDisplay" value={s.priceDisplay} options={[{ value: "INCL", label: "Inclusive of GST" }, { value: "EXCL", label: "Exclusive of GST (GST added at checkout)" }]} className="sm:col-span-2" />
          <F label="Facebook URL" name="facebook" defaultValue={s.social.facebook} /><F label="Instagram URL" name="instagram" defaultValue={s.social.instagram} /><F label="LinkedIn URL" name="linkedin" defaultValue={s.social.linkedin} /><F label="X URL" name="x" defaultValue={s.social.x} /><F label="YouTube URL" name="youtube" defaultValue={s.social.youtube} />
          <div className="sm:col-span-2"><button className="btn-primary">Save business details</button></div>
        </form>
      </Card>

      <Card title="Delivery policy">
        <form action={saveSettingsAction} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="section" value="delivery" />
          <F label="Same-day dispatch cut-off hour (0–23, IST)" name="cutoffHour" type="number" defaultValue={s.cutoffHour} /><F label="Extra handling days" name="handlingDays" type="number" defaultValue={s.handlingDays} />
          <fieldset className="sm:col-span-2"><legend className="label">Working days</legend><div className="flex flex-wrap gap-4">{DAYS.map((d, i) => <label key={d} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name={`wd${i}`} defaultChecked={s.workingDays.includes(i)} className="size-4 accent-electric-500" />{d}</label>)}</div></fieldset>
          <F label="Holidays (YYYY-MM-DD, comma or space separated)" name="holidays" textarea rows={2} defaultValue={s.holidays.join(", ")} className="sm:col-span-2" />
          <F label="Delivery notice banner" name="deliveryNotice" defaultValue={s.deliveryNotice} hint="Shown on the delivery page, e.g. delays." className="sm:col-span-2" />
          <div className="sm:col-span-2"><button className="btn-primary">Save delivery policy</button></div>
        </form>
      </Card>

      <Card title="Content">
        <form action={saveSettingsAction} className="space-y-3"><input type="hidden" name="section" value="content" />
          <F label="About us text" name="aboutBody" textarea rows={6} defaultValue={s.aboutBody} hint='Blank line = new paragraph, "## " = heading, "- " = bullet.' />
          <F label="Return window (days)" name="returnWindowDays" type="number" defaultValue={s.returnWindowDays ?? ""} hint="Leave blank until you have decided." />
          <fieldset><legend className="label">“Why choose us” points (leave title blank to remove)</legend>
            <div className="space-y-2">{benefits.map((b, i) => <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]"><input name="benefitTitle" defaultValue={b.title} className="input" aria-label={`Point ${i + 1} title`} placeholder="Title" /><input name="benefitBody" defaultValue={b.body} className="input" aria-label={`Point ${i + 1} text`} placeholder="Text" /></div>)}</div>
          </fieldset>
          <button className="btn-primary">Save content</button>
        </form>
      </Card>

      <Card title="Policy pages">
        <form action={saveSettingsAction} className="space-y-4"><input type="hidden" name="section" value="policies" />
          <p className="text-sm text-muted">Write your own policies (consider legal review). Pages with no text show a “not published yet” notice.</p>
          {POLICY_KEYS.map((k) => <F key={k} label={POLICY_TITLES[k]} name={`policy_${k}`} textarea rows={8} defaultValue={s.policies[k]} />)}
          <button className="btn-primary">Save policies</button>
        </form>
      </Card>
    </div>
  );
}
