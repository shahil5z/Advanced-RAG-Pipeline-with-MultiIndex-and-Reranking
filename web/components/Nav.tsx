"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/demo", label: "Demo" },
  { href: "/evaluation", label: "Evaluation" },
  { href: "/about", label: "About" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3 rounded-md">
          <img src="/icon.svg" alt="" width={36} height={36} className="h-9 w-9" />
          <span>
            <span className="block text-sm font-semibold leading-5">RAG Evaluation Lab</span>
            <span className="block text-xs leading-4 text-muted">Shahil · retrieval portfolio</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap gap-1">
          {links.map((link) => {
            const current = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold ${
                  current ? "bg-mist text-ink" : "text-ink hover:bg-paper"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
