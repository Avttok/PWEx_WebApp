import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * Chave secreta do Supabase (Project Settings → API Keys → Secret key).
 * Fica SÓ nas variáveis de ambiente da Vercel, nunca no navegador nem no GitHub.
 */
const secreta = () => process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const adminConfigurado = () => Boolean(url && secreta());

export function supabaseAdmin(): SupabaseClient {
  return createClient(url, secreta(), { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Confere se quem chamou (pelo token da sessão) é gestor. Devolve o id ou null. */
export async function gestorDaRequisicao(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !url || !publica) return null;
  const sb = createClient(url, publica, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: u } = await sb.auth.getUser(token);
  if (!u.user) return null;
  const { data } = await sb.rpc("is_gestor");
  return data === true ? u.user.id : null;
}
