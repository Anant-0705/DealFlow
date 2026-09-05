import Image from "next/image";
import { Building2 } from "lucide-react";
import { saveCompanyProfile } from "@/modules/company/actions";
import { getCompanyProfile } from "@/modules/company/queries";
import { companyIdentityGaps } from "@/modules/company/readiness";
import { requirePageRole } from "@/lib/auth";
import { SETTINGS_ROLES } from "@/lib/roles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function CompanySettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await requirePageRole(SETTINGS_ROLES);
  const [{ error, notice }, company] = await Promise.all([searchParams, getCompanyProfile()]);
  const gaps = companyIdentityGaps(company);
  return (
    <div className="settings-grid">
      <form action={saveCompanyProfile} className="panel form-stack">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Letterhead</span>
            <h2>Company profile</h2>
          </div>
          <Building2 aria-hidden="true" />
        </div>
        <p className="muted">This identity prints on every quotation and invoice. Required fields must be saved before a document can be sent, confirmed, or printed.</p>
        {error && <Alert variant="destructive"><AlertTitle>Could not save company details</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {notice && <Alert><AlertTitle>Saved</AlertTitle><AlertDescription>{notice.replaceAll("+", " ")}</AlertDescription></Alert>}
        {gaps.length > 0 && <Alert variant="destructive"><AlertTitle>Letterhead incomplete</AlertTitle><AlertDescription>Still needed: {gaps.map((item) => item.label).join(", ")}.</AlertDescription></Alert>}
        <div className="logo-row">
          <Image className="logo-preview" src={company.logoDataUrl || "/branding/logo.png"} alt="Company logo preview" width={96} height={96} unoptimized />
          <div className="form-stack">
            <label>Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></label>
            <label className="check"><input name="removeLogo" type="checkbox" />Remove uploaded logo and use the default mark</label>
            <small className="muted">PNG, JPEG, WebP, or SVG up to 400 KB. The logo prints on quotation and invoice PDFs.</small>
          </div>
        </div>
        <h3>Identity</h3>
        <label>Legal name *<input name="legalName" required defaultValue={company.legalName} maxLength={160} /></label>
        <div className="form-row">
          <label>Trading name *<input name="tradingName" required defaultValue={company.tradingName} maxLength={80} /></label>
          <label>Tagline<input name="tagline" defaultValue={company.tagline} maxLength={120} /></label>
        </div>
        <label>Address line 1 *<input name="addressLine1" required defaultValue={company.addressLine1} maxLength={160} /></label>
        <label>Address line 2<input name="addressLine2" defaultValue={company.addressLine2} maxLength={160} /></label>
        <div className="form-row three">
          <label>City *<input name="city" required defaultValue={company.city} maxLength={80} /></label>
          <label>State *<input name="state" required defaultValue={company.state} maxLength={80} /></label>
          <label>PIN code *<input name="pincode" required defaultValue={company.pincode} inputMode="numeric" maxLength={6} /></label>
        </div>
        <div className="form-row three">
          <label>Country *<input name="country" required defaultValue={company.country || "India"} maxLength={80} /></label>
          <label>Email *<input name="email" type="email" required defaultValue={company.email} maxLength={254} /></label>
          <label>Phone *<input name="phone" required defaultValue={company.phone} maxLength={20} /></label>
        </div>
        <div className="form-row">
          <label>GSTIN *<input name="gstin" required defaultValue={company.gstin} maxLength={15} /></label>
          <label>PAN<input name="pan" defaultValue={company.pan} maxLength={10} /></label>
        </div>
        <h3>Bank details for invoices</h3>
        <div className="form-row">
          <label>Bank name *<input name="bankName" required defaultValue={company.bankName} maxLength={80} /></label>
          <label>Account name *<input name="bankAccountName" required defaultValue={company.bankAccountName} maxLength={120} /></label>
        </div>
        <div className="form-row">
          <label>Account number *<input name="bankAccountNo" required defaultValue={company.bankAccountNo} inputMode="numeric" maxLength={24} /></label>
          <label>IFSC *<input name="bankIfsc" required defaultValue={company.bankIfsc} maxLength={11} /></label>
        </div>
        <button className="button primary" type="submit">Save company letterhead</button>
      </form>
      <aside className="panel chain-card">
        <span className="eyebrow">Print flow</span>
        <h2>One brand. Customer-specific bills.</h2>
        <ol>
          <li><b>01</b><span><strong>Save this letterhead</strong><small>Logo, legal name, GSTIN, bank</small></span></li>
          <li><b>02</b><span><strong>Complete customer billing</strong><small>Phone, GSTIN, address</small></span></li>
          <li><b>03</b><span><strong>Print / Save PDF</strong><small>Quotation or invoice</small></span></li>
        </ol>
      </aside>
    </div>
  );
}
