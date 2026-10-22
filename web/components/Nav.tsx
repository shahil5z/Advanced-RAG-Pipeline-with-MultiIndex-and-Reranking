"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/demo", label: "Demo" },
  { href: "/evaluation", label: "Evaluation" },
  { href: "/architecture", label: "Architecture" },
  { href: "/failure-analysis", label: "Failure Analysis" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/about", label: "About" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="shell flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
        <Link href="/" className="gradient-text rounded-md text-sm font-semibold">
          Evaluation platform
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
        <nav aria-label="Primary" className="flex flex-wrap justify-end gap-x-1">
          {links.map((link) => {
            const current = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-2 text-sm transition-colors ${
                  current ? "border-b-2 border-accent font-semibold text-ink" : "text-muted hover:bg-wash hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
