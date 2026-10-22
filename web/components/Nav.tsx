"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/demo", label: "Demo" },
  { href: "/evaluation", label: "Evaluation" },
  { href: "/reference", label: "API" },
  { href: "/about", label: "About" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="shell flex items-center justify-between gap-3 py-3">
        <Link href="/" className="rounded-md text-sm font-semibold text-ink">
          RAG Evaluation Lab
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
