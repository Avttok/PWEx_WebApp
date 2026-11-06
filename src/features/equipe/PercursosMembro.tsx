"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Package, Search } from "lucide-react";
import type { LngLatBoundsLike } from "maplibre-gl";
import { supabase } from "@/lib/supabase/client";
import { useMapa } from "@/lib/mapa/useMapa";
import { criarCamadasPercurso, desenharPercursos, separarRegistros, type Ping, type Registro } from "@/lib/mapa/percursos";
import { formatarPix } from "@/lib/pix/identificar";
import { toast } from "@/features/ui/toast";

const DIAS = ["Hoje", "Ontem", "Anteontem"];
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
function km(r: Registro) {
  const rad = Math.PI / 180;
  let m = 0;
  for (let i = 1; i < r.pontos.length; i++) {
    const a = r.pontos[i - 1], b = r.pontos[i];
    const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
    m += 2 * 6371000 * Math.asin(Math.sqrt(h));
  }
  return m / 1000;
}

/** Percursos de um motoboy por dia, separados em registros (procurando corrida / corrida), com a chave PIX. */
export function PercursosMembro({ id, teste }: { id: string; teste: boolean }) {
  const caixa = useRef<HTMLDivElement>(null);
  const { mapa, pronto } = useMapa(caixa);
  const [dia, setDia] = useState(0);
  const [pings, setPings] = useState<Ping[] | null>(null);
  const [destaque, setDestaque] = useState<number | null>(null);
  const [pix, setPix] = useState<{ tipo_chave: string; chave: string; titular: string } | null | undefined>(undefined);
  const [numeros, setNumeros] = useState<Record<string, string>>({});

  useEffect(() => {
    setPings(null); setDestaque(null);
    const ini = new Date(); ini.setHours(0, 0, 0, 0); ini.setDate(ini.getDate() - dia);
    const fim = new Date(ini); fim.setDate(fim.getDate() + 1);
    // percursos de teste e reais ficam separados: só os do modo atual
    supabase().from("localizacoes").select("lat,lng,status,corrida_id,registrado_em").eq("motoboy_id", id).eq("teste", teste)
      .gte("registrado_em", ini.toISOString()).lt("registrado_em", fim.toISOString()).order("registrado_em").limit(10000)
      .then(({ data }) => setPings((data ?? []) as Ping[]));
  }, [id, dia, teste]);
  useEffect(() => { supabase().from("chaves_pix").select("tipo_chave,chave,titular").eq("usuario_id", id).eq("principal", true).maybeSingle().then(({ data }) => setPix(data ?? null)); }, [id]);

  const registros = useMemo(() => separarRegistros(pings ?? []), [pings]);
  useEffect(() => {
    const ids = [...new Set(registros.map((r) => r.corridaId).filter(Boolean))] as string[];
    if (!ids.length) return;
    supabase().from("corridas").select("id,numero,teste").in("id", ids).then(({ data }) =>
      setNumeros(Object.fromEntries((data ?? []).map((c) => [c.id, `${c.teste ? "T" : "#"}${c.numero}`]))));
  }, [registros]);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    criarCamadasPercurso(m, teste);
    desenharPercursos(m, registros, teste, destaque);
    const pts = (destaque != null ? registros[destaque]?.pontos : registros.flatMap((r) => r.pontos)) ?? [];
    if (pts.length) {
      const lng = pts.map((p) => p.lng), lat = pts.map((p) => p.lat);
      m.fitBounds([[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]] as LngLatBoundsLike, { padding: 40, maxZoom: 16, duration: 500 });
    }
  }, [mapa, pronto, registros, destaque, teste]);

  return (
    <>
      <div className="filtro">{DIAS.map((d, i) => <button key={d} className={dia === i ? "ativo" : ""} onClick={() => setDia(i)}>{d}</button>)}</div>
      <div ref={caixa} style={{ height: 320, borderRadius: 16, overflow: "hidden", border: "1px solid var(--borda)" }} />
      <div className="legenda-percurso"><span>Início</span><span className={`degrade ${teste ? "teste" : ""}`} /><span>Fim</span></div>
      {pings == null ? <p className="dica">Carregando…</p> : registros.length === 0 ? <p className="vazio">Nenhum percurso neste dia.</p> : (
        <div className="registros" style={{ padding: 0 }}>
          {[...registros.entries()].reverse().map(([i, r]) => (
            <button key={i} type="button" className={`registro ${destaque === i ? "ativo" : ""}`} onClick={() => setDestaque(destaque === i ? null : i)}>
              {r.tipo === "corrida" ? <Package size={14} aria-hidden /> : <Search size={14} aria-hidden />}
              <span>{r.tipo === "corrida" ? `Corrida ${r.corridaId ? numeros[r.corridaId] ?? "" : ""}` : "Procurando corrida"}</span>
              <span className="dica">{hora(r.inicio)}–{hora(r.fim)} · {km(r).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</span>
            </button>
          ))}
          <p className="dica" style={{ margin: 0 }}>Total: {registros.reduce((s, r) => s + km(r), 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km · {registros.filter((r) => r.tipo === "corrida").length} em corrida</p>
        </div>
      )}
      <span className="rotulo">Chave PIX principal</span>
      {pix === undefined ? <p className="dica">…</p> : pix ? (
        <button className="botao-texto" onClick={() => { navigator.clipboard?.writeText(pix.chave); toast("Chave PIX copiada.", "ok"); }}>
          <Copy size={14} aria-hidden /> {formatarPix(pix.chave, pix.tipo_chave)} · {pix.titular}
        </button>
      ) : <p className="dica" style={{ margin: 0 }}>Ainda não cadastrou a chave PIX no MotoApp.</p>}
    </>
  );
}
