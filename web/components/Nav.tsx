import Link from "next/link";

const links = [
  ["/", "Home"],
  ["/demo", "Demo"],
  ["/evaluation", "Evaluation"],
  ["/about", "About"],
];

export function Nav() {
  return (
    <header className="border-b border-stone-300 bg-white">
      <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="AI RAGCHECK" className="h-10 w-10 rounded-sm bg-stone-950 object-cover" />
          <span className="text-sm font-semibold">RAG Evaluation Lab</span>
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="underline-offset-4 hover:underline focus:outline focus:outline-2 focus:outline-stone-800">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
