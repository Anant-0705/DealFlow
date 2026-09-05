export function InvoiceStepper({ confirmed, shipped, invoiced, paid }: { confirmed: boolean; shipped: boolean; invoiced: boolean; paid: boolean }) {
  const steps = [["Order Confirmed", confirmed], ["Shipped", shipped], ["Invoiced", invoiced], ["Paid", paid]] as const;
  return <ol className="invoice-stepper">{steps.map(([label, done]) => <li className={done ? "done" : ""} key={label}><i>{done ? "✓" : "○"}</i><span>{label}</span>{label === "Shipped" && !done && <small title="Not yet shipped">not yet shipped</small>}</li>)}</ol>;
}
