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
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="shell flex items-center justify-between gap-3 py-2.5">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-lg">
          <img src="/logo.png" alt="" width={56} height={56} className="h-12 w-12 rounded-lg shadow-card sm:h-14 sm:w-14" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-5 text-ink">RAG Evaluation Lab</span>
            <span className="block text-xs leading-4 text-muted">Shahil Haque</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap justify-end gap-1">
          {links.map((link) => {
            const current = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold ${
                  current ? "bg-navy text-white" : "text-ink hover:bg-wash"
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
