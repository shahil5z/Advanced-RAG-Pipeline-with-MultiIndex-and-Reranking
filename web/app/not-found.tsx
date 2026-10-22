import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Page not found.</h1>
      <Link href="/demo" className="text-sm underline">
        Return to Demo
      </Link>
    </div>
  );
}
