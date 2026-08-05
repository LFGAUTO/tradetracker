import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieBatch = { name: string; value: string; options: CookieOptions }[];
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Request-scoped client that reads the signed-in user's session cookie. */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieBatch) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component. The middleware refreshes the
            // session instead, so this is safe to ignore.
          }
        },
      },
    }
  );
}

/**
 * Service-role client. Server only, and only used to create sign-in accounts
 * from the Admin page. Never import this into a client component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** The signed-in user's profile row, or null. */
export async function getProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, name, email, role, active")
    .eq("id", user.id)
    .single();

  return data ?? null;
}
