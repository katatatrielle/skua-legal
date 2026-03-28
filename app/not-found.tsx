import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Not found</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950">That page does not exist</h1>
      <p className="mt-3 text-sm text-slate-600">
        Return to the scaffold landing page to open an available matter.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Back home
      </Link>
    </div>
  );
}
