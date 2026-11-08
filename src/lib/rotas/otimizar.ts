import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const OSRM = "https://router.project-osrm.org";
interface Parada { id: string; ordem: number; tipo: "coleta" | "entrega"; lat: number; lng: number; status: string }

async function json<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "PWExpress-rotas" } });
    if (!r.ok) return null;
    const j = (await r.json()) as T & { code?: string };
    return j.code && j.code !== "Ok" ? null : j;
  } catch { return null; }
}
const coords = (ps: { lat: number; lng: number }[]) => ps.map((p) => `${p.lng},${p.lat}`).join(";");

/**
 * Otimiza uma rota pelas ruas: mantém as coletas primeiro (na ordem do roteirizador), acha a melhor
 * ordem das entregas (OSRM trip), calcula a distância por ruas da 1ª coleta até cada entrega (OSRM table)
 * e os km acumulados na rota (OSRM route). Devolve false se o mapa não respondeu.
 */
export async function otimizarRota(sb: SupabaseClient, corridaId: string, paradas: Parada[]): Promise<boolean> {
  const ord = [...paradas].sort((a, b) => a.ordem - b.ordem);
  if (ord.some((p) => p.status !== "pendente")) return true;
  const coletas = ord.filter((p) => p.tipo === "coleta");
  let entregas = ord.filter((p) => p.tipo === "entrega");
  if (!coletas.length || !entregas.length) return true;

  // melhor ordem das entregas saindo da última coleta
  if (entregas.length > 1) {
    const ultima = coletas[coletas.length - 1];
    const trip = await json<{ waypoints: { waypoint_index: number }[] }>(
      `${OSRM}/trip/v1/driving/${coords([ultima, ...entregas])}?source=first&destination=any&roundtrip=false&overview=false`);
    if (trip?.waypoints?.length === entregas.length + 1) {
      const pos = trip.waypoints.slice(1).map((w, i) => ({ p: entregas[i], k: w.waypoint_index }));
      entregas = pos.sort((a, b) => a.k - b.k).map((x) => x.p);
    }
  }
  const seq = [...coletas, ...entregas];
  const rota = await json<{ routes: { distance: number; duration: number; geometry: string; legs: { distance: number }[] }[] }>(
    `${OSRM}/route/v1/driving/${coords(seq)}?overview=full&geometries=polyline`);
  const r = rota?.routes?.[0];
  if (!r) return false;
  const tabela = await json<{ distances: (number | null)[][] }>(
    `${OSRM}/table/v1/driving/${coords([coletas[0], ...entregas])}?sources=0&annotations=distance`);
  const diretas = tabela?.distances?.[0]?.slice(1) ?? null;

  const acum: number[] = [];
  let soma = 0;
  seq.forEach((_, i) => { if (i > 0) soma += r.legs[i - 1]?.distance ?? 0; acum.push(Math.round(soma)); });
  const rua = seq.map((p) => {
    if (p.tipo !== "entrega") return null;
    const d = diretas?.[entregas.indexOf(p)];
    return d == null ? null : Math.round(d);
  });
  const { error } = await sb.rpc("aplicar_otimizacao", {
    p_corrida: corridaId, p_ordem: seq.map((p) => p.id), p_rua: rua, p_acum: acum,
    p_total: Math.round(r.distance), p_duracao: Math.round(r.duration) + seq.length * 180, p_polyline: r.geometry,
  });
  if (error) console.error("aplicar_otimizacao", corridaId, error.message);
  return !error;
}
