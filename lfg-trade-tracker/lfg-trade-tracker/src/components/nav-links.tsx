"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE = [
  { href: "/", label: "Board" },
  { href: "/trades/new", label: "New trade" },
  { href: "/archive", label: "Archive" },
];

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const links = isAdmin ? [...BASE, { href: "/admin", label: "Settings" }] : BASE;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-xs border px-3 py-1.5 font-head text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              active
                ? "border-golddim bg-goldwash text-gold"
                : "border-transparent text-muted hover:text-chalk"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
