import Link from "next/link";

import { GITHUB_URL } from "@/lib/site";

const links = [
  { href: "/demo", label: "Demo" },
  { href: "/evaluation", label: "Evaluation" },
  { href: "/about", label: "About" },
];

export function Footer() {
  return (
    <footer className="on-dark mt-20 bg-navy text-white">
      <div className="shell grid gap-8 py-12 sm:grid-cols-[1.4fr_1fr] sm:items-end">
        <div className="flex gap-4">
          <img src="/logo.png" alt="" width={56} height={56} className="h-14 w-14 rounded-lg ring-2 ring-white/80" />
          <div>
            <p className="font-serif text-2xl leading-tight">Shahil Haque</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/75">
              Advanced RAG pipeline with multi-index retrieval and reranking.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <a className="inline-flex min-h-11 items-center text-sm font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-white" href={GITHUB_URL}>
            GitHub
          </a>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center text-sm text-white/80 hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
