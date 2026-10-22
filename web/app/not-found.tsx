import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-4xl">Page not found</h1>
      <p className="text-sm leading-6 text-muted">That address is not part of this site.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">
          Back home
        </Link>
        <Link href="/demo" className="btn-ghost">
          Open the demo
        </Link>
      </div>
    </div>
  );
}
