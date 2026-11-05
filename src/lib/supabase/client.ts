import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

let cliente: SupabaseClient | null = null;

/** Cliente Supabase do navegador (sessão salva no localStorage). */
export function supabase(): SupabaseClient {
  if (!cliente) {
    if (!url || !chave) throw new Error("Supabase não configurado: veja o arquivo .env");
    cliente = createClient(url, chave, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cliente;
}
