import { redirect } from "next/navigation";

/** A central de ajuda fica no site do cliente (pública). O app e o painel abrem por aqui. */
export default async function PaginaAjuda({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const destino = (process.env.NEXT_PUBLIC_SITE_CLIENTE_URL ?? "").replace(/\/$/, "");
  const busca = new URLSearchParams(Object.entries(q).filter(([, v]) => v != null) as [string, string][]).toString();
  if (destino) redirect(`${destino}/ajuda${busca ? `?${busca}` : ""}`);
  return <main className="tela-login"><p className="subtitulo">A central de ajuda fica no site do cliente.</p></main>;
}
