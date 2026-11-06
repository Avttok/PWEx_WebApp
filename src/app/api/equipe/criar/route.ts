import { adminConfigurado, ehDev, gestorDaRequisicao, supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAPEIS = ["gestor", "motoboy", "dev"] as const;

/** Cria uma conta (motoboy e/ou gestor) já confirmada. Só gestores podem chamar. */
export async function POST(req: Request) {
  if (!adminConfigurado()) return Response.json({ erro: "servidor_sem_chave" }, { status: 503 });
  const gestor = await gestorDaRequisicao(req);
  if (!gestor) return Response.json({ erro: "apenas_gestor" }, { status: 403 });

  let c: { email?: string; senha?: string; nome?: string; papeis?: string[]; repasse?: number | null };
  try { c = await req.json(); } catch { return Response.json({ erro: "json_invalido" }, { status: 400 }); }

  const email = String(c.email ?? "").trim().toLowerCase();
  const nome = String(c.nome ?? "").trim();
  const senha = String(c.senha ?? "");
  const papeis = (c.papeis ?? []).filter((p): p is (typeof PAPEIS)[number] => (PAPEIS as readonly string[]).includes(p));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ erro: "email_invalido" }, { status: 400 });
  if (nome.length < 2 || nome.length > 60) return Response.json({ erro: "nome_invalido" }, { status: 400 });
  if (senha.length < 8) return Response.json({ erro: "senha_curta" }, { status: 400 });
  if (papeis.length === 0) return Response.json({ erro: "sem_papel" }, { status: 400 });
  if (papeis.includes("dev") && !(await ehDev(req))) return Response.json({ erro: "apenas_dev" }, { status: 403 });
  const repasse = c.repasse == null ? null : Number(c.repasse);
  if (repasse != null && (Number.isNaN(repasse) || repasse < 0 || repasse > 100)) return Response.json({ erro: "percentual_invalido" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
  if (error || !data.user) {
    const existe = /already|registered|exists/i.test(error?.message ?? "");
    return Response.json({ erro: existe ? "email_existe" : "falha_ao_criar", detalhe: error?.message }, { status: existe ? 409 : 500 });
  }
  const id = data.user.id;

  // perfil nasce pelo gatilho do banco; aqui só definimos nome e papéis
  const p = await admin.from("perfis").upsert({ id, nome, papeis });
  if (p.error) return Response.json({ erro: "falha_no_perfil", detalhe: p.error.message, id }, { status: 500 });
  if (papeis.includes("motoboy")) {
    const m = await admin.from("motoboys").upsert({ id, repasse_pct: repasse });
    if (m.error) return Response.json({ erro: "falha_no_motoboy", detalhe: m.error.message, id }, { status: 500 });
  }
  return Response.json({ ok: true, id });
}

/** Diagnóstico: mostra se a chave secreta está configurada (sem revelar o valor). */
export async function GET() {
  return Response.json({ SUPABASE_SECRET_KEY: adminConfigurado() });
}
