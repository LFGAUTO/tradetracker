import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase-server";
import { signOut } from "@/lib/actions";
import { NavLinks } from "@/components/nav-links";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <Image src="/logo.png" alt="LFG AUTO" width={36} height={36} />
            <span className="hidden font-display text-xl leading-none tracking-[0.08em] text-chalk sm:block">
              Trade Tracker
            </span>
          </Link>

          <NavLinks isAdmin={profile.role === "admin"} />

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-[13px] text-chalk">{profile.name || profile.email}</p>
              <p className="font-head text-[10px] uppercase tracking-[0.16em] text-gold">
                {profile.role === "admin" ? "Admin" : "Standard"}
              </p>
            </div>
            <form action={signOut}>
              <button className="btn btn-quiet btn-sm">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
