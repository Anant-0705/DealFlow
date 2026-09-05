const modules = [
  "Smart quotations",
  "Approval routing",
  "Warehouse fulfillment",
  "Hybrid billing",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07110f] text-[#f5fbf8]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <nav className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 font-black text-[#07110f]">
              D
            </span>
            <div>
              <p className="font-semibold tracking-tight">DealFlow</p>
              <p className="text-xs text-emerald-100/55">Sales operations, connected</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
            Hackathon build
          </span>
        </nav>

        <section className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Quote to payment
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Keep every moving part of a deal in sync.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-emerald-50/65">
              Build quotations, enforce discount policies, coordinate stock,
              negotiate with customers, and reconcile one-time and recurring billing.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <button className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#07110f] transition hover:bg-emerald-300">
                Open workspace
              </button>
              <button className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/5">
                View architecture
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-emerald-950/50 backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-white/45">Deal preview</p>
                <p className="mt-1 font-semibold">Acme workplace upgrade</p>
              </div>
              <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">
                Approval needed
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {modules.map((module, index) => (
                <div key={module} className="rounded-2xl border border-white/8 bg-black/15 p-4">
                  <span className="text-xs font-medium text-emerald-300/70">0{index + 1}</span>
                  <p className="mt-3 text-sm font-medium text-white/80">{module}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-emerald-400 p-5 text-[#07110f]">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-65">Core promise</p>
              <p className="mt-2 text-lg font-semibold">Approved terms become fulfilled and paid orders.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
