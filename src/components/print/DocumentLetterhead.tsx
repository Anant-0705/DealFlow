type CompanyLetterhead = {
  legalName: string;
  tradingName: string;
  tagline: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin: string;
  pan: string;
  logoDataUrl: string | null;
};

type Party = {
  label: string;
  name: string;
  lines: Array<string | null | undefined>;
};

function linesOf(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

export function companyAddressLines(company: CompanyLetterhead) {
  return linesOf([
    company.addressLine1,
    company.addressLine2,
    [company.city, company.state, company.pincode].filter(Boolean).join(", "),
    company.country,
    company.phone ? `Phone ${company.phone}` : "",
    company.email,
    company.gstin ? `GSTIN ${company.gstin}` : "",
    company.pan ? `PAN ${company.pan}` : "",
  ]);
}

export function DocumentLetterhead({
  company,
  title,
  code,
  kicker,
  meta,
  stamp,
}: {
  company: CompanyLetterhead;
  title: string;
  code: string;
  kicker?: string;
  meta: Array<string | null | undefined>;
  stamp?: string | null;
}) {
  const logo = company.logoDataUrl || "/branding/logo.png";
  return (
    <header className="print-letterhead">
      <div className="print-brand">
        <Image className="print-logo" src={logo} alt="" width={88} height={52} unoptimized />
        <div>
          <span className="eyebrow">{company.tradingName || "DealFlow"}</span>
          <h1>{title} {code}</h1>
          {kicker ? <p>{kicker}</p> : null}
        </div>
      </div>
      <div className="print-meta">
        {stamp ? <strong className="print-stamp">{stamp}</strong> : null}
        {linesOf(meta).map((line) => <small key={line}>{line}</small>)}
      </div>
    </header>
  );
}

export function DocumentParties({ from, to }: { from: Party; to: Party }) {
  return (
    <section className="print-addresses">
      <div>
        <span>{from.label}</span>
        <strong>{from.name}</strong>
        {linesOf(from.lines).map((line) => <p key={line}>{line}</p>)}
      </div>
      <div>
        <span>{to.label}</span>
        <strong>{to.name}</strong>
        {linesOf(to.lines).map((line) => <p key={line}>{line}</p>)}
      </div>
    </section>
  );
}

export function DocumentBank({ company }: { company: { bankName: string; bankAccountName: string; bankAccountNo: string; bankIfsc: string } }) {
  if (!company.bankName && !company.bankAccountNo) return null;
  return (
    <section className="print-bank">
      <h2>Bank details</h2>
      <p>{company.bankName}</p>
      <p>{company.bankAccountName}</p>
      <p>A/c {company.bankAccountNo}</p>
      <p>IFSC {company.bankIfsc}</p>
    </section>
  );
}

export function PrintPageStyle() {
  return <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } }`}</style>;
}
import Image from "next/image";
