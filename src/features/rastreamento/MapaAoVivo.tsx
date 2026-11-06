"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, LineString, Point } from "geojson";
import { AlertTriangle, BatteryMedium, Crosshair, FlaskConical, LocateFixed, Map as IconeMapa, Timer } from "lucide-react";
import { maplibregl } from "@/lib/mapa/maplibre";
import { useMapa } from "@/lib/mapa/useMapa";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { useRastreamento } from "./useRastreamento";
import { COR_STATUS, ROTULO_STATUS, type Motoboy } from "./tipos";

const ORDEM: Record<Motoboy["status"], number> = { em_corrida: 0, disponivel: 1, offline: 2 };

/** Tempo máximo sem posição antes de marcar "sem sinal" (3 ciclos do intervalo). */
function limiteSemSinalMs(m: Motoboy): number {
  if (m.status === "em_corrida") return (m.modo_economia ? 90 : 45) * 3 * 1000;
  if (m.status === "disponivel") return 3 * 60 * 3 * 1000;
  return Infinity;
}

function ha(agora: number, iso: string | null): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 1000));
  if (s < 60) return `há ${s}s`;
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} d`;
}

export function MapaAoVivo() {
  const { motoboys, nomes, fotos, trilhas, conectado, erro } = useRastreamento();
  const container = useRef<HTMLDivElement>(null);
  const { mapa, pronto } = useMapa(container);
  const marcadores = useRef<Record<string, maplibregl.Marker>>({});
  const enquadrado = useRef(false);
  const [seguindo, setSeguindo] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // camadas (recriadas sempre que o mapa é recriado, ex.: troca de tema)
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    marcadores.current = {};
    enquadrado.current = false;
    m.addSource("trilhas", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    m.addSource("pontos", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    m.addLayer({ id: "trilhas-contorno", type: "line", source: "trilhas", layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#0a0a0a", "line-width": 7, "line-opacity": 0.5 } });
    m.addLayer({ id: "trilhas-linha", type: "line", source: "trilhas", layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#d4af37", "line-width": 4 } });
    m.addLayer({ id: "pontos-circulo", type: "circle", source: "pontos",
      paint: { "circle-radius": 3.5, "circle-color": ["get", "cor"], "circle-stroke-color": "#0a0a0a", "circle-stroke-width": 1 } });
  }, [mapa, pronto]);

  // trilhas
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    const linhas: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };
    const pontos: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };
    for (const [id, lista] of Object.entries(trilhas)) {
      const porSessao: Record<string, [number, number][]> = {};
      for (const p of lista) {
        pontos.features.push({ type: "Feature", properties: { cor: COR_STATUS[p.status], motoboy: id }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } });
        if (p.status === "em_corrida") (porSessao[p.sessao_id ?? "sem"] ??= []).push([p.lng, p.lat]);
      }
      for (const coords of Object.values(porSessao)) {
        if (coords.length >= 2) linhas.features.push({ type: "Feature", properties: { motoboy: id }, geometry: { type: "LineString", coordinates: coords } });
      }
    }
    (m.getSource("trilhas") as maplibregl.GeoJSONSource | undefined)?.setData(linhas);
    (m.getSource("pontos") as maplibregl.GeoJSONSource | undefined)?.setData(pontos);
  }, [mapa, trilhas, pronto]);

  // marcadores
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    const vistos = new Set<string>();
    const limites = new maplibregl.LngLatBounds();
    for (const mb of Object.values(motoboys)) {
      if (mb.lat == null || mb.lng == null) continue;
      vistos.add(mb.id);
      limites.extend([mb.lng, mb.lat]);
      const nome = nomes[mb.id] || "Motoboy";
      let marcador = marcadores.current[mb.id];
      if (!marcador) {
        const el = document.createElement("button");
        el.className = "marcador";
        el.addEventListener("click", () => setSeguindo((s) => (s === mb.id ? null : mb.id)));
        marcador = new maplibregl.Marker({ element: el }).setLngLat([mb.lng, mb.lat]).addTo(m);
        marcadores.current[mb.id] = marcador;
      }
      const el = marcador.getElement();
      const foto = fotos[mb.id];
      el.textContent = foto ? "" : nome.trim().charAt(0).toUpperCase();
      el.style.backgroundImage = foto ? `url("${foto}")` : "";
      el.classList.toggle("com-foto", Boolean(foto));
      el.title = `${nome} · ${ROTULO_STATUS[mb.status]}`;
      el.style.setProperty("--cor", COR_STATUS[mb.status]);
      el.dataset.status = mb.status;
      marcador.setLngLat([mb.lng, mb.lat]);
    }
    for (const id of Object.keys(marcadores.current)) {
      if (!vistos.has(id)) { marcadores.current[id].remove(); delete marcadores.current[id]; }
    }
    if (!enquadrado.current && !limites.isEmpty()) {
      m.fitBounds(limites, { padding: { top: 80, bottom: 80, left: 420, right: 80 }, maxZoom: 15, duration: 0 });
      enquadrado.current = true;
    }
  }, [mapa, motoboys, nomes, fotos, pronto]);

  // seguir motoboy
  const alvo = seguindo ? motoboys[seguindo] : null;
  useEffect(() => {
    if (!alvo || alvo.lat == null || alvo.lng == null) return;
    mapa.current?.easeTo({ center: [alvo.lng, alvo.lat], zoom: Math.max(mapa.current.getZoom(), 15), duration: 800 });
  }, [mapa, alvo?.lat, alvo?.lng, alvo]);

  const lista = useMemo(
    () => Object.values(motoboys).sort((a, b) => ORDEM[a.status] - ORDEM[b.status] || (nomes[a.id] ?? "").localeCompare(nomes[b.id] ?? "")),
    [motoboys, nomes],
  );
  const ativos = lista.filter((m) => m.status !== "offline").length;

  return (
    <>
      <aside className="lateral entrar">
        <CabecaPagina icone={IconeMapa} titulo="Mapa ao vivo" subtitulo={`${ativos} em serviço · ${lista.length} motoboys`} />
        <span className={`conexao ${conectado ? "on" : ""}`}>{conectado ? "Tempo real conectado" : "Conectando…"}</span>
        {erro && <p className="erro">{erro}</p>}
        {lista.length === 0 && !erro && <p className="vazio">Nenhum motoboy ainda. Abra o app no celular e fique &quot;Disponível&quot;.</p>}
        {lista.map((mb) => {
          const semSinal = mb.status !== "offline" && (!mb.posicao_em || agora - new Date(mb.posicao_em).getTime() > limiteSemSinalMs(mb));
          return (
            <button key={mb.id} className={`cartao-motoboy ${seguindo === mb.id ? "selecionado" : ""}`} onClick={() => setSeguindo((s) => (s === mb.id ? null : mb.id))}>
              <div className="linha">
                {fotos[mb.id]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={fotos[mb.id]} alt="" className="foto-mini" style={{ borderColor: COR_STATUS[mb.status] }} />
                  : <span className="ponto" style={{ background: COR_STATUS[mb.status] }} />}
                <strong>{nomes[mb.id] || "Motoboy"}</strong>
                {mb.modo_teste && <span className="selo" style={{ color: "#a78bfa" }}><FlaskConical size={11} aria-hidden /> teste</span>}
                <span className="espaco" />
                <span className="selo" style={{ color: COR_STATUS[mb.status] }}>{ROTULO_STATUS[mb.status]}</span>
              </div>
              <div className="detalhes">
                <span><Timer size={12} aria-hidden /> {ha(agora, mb.posicao_em)}</span>
                {mb.precisao_m != null && <span><Crosshair size={12} aria-hidden /> ± {Math.round(mb.precisao_m)} m</span>}
                {mb.bateria != null && <span><BatteryMedium size={12} aria-hidden /> {mb.bateria}%</span>}
                {mb.modo_economia && mb.status === "em_corrida" && <span>Economia</span>}
                <span>{(trilhas[mb.id] ?? []).length} pontos (12 h)</span>
              </div>
              {semSinal && <div className="alerta"><AlertTriangle size={13} aria-hidden /> Sem sinal recente</div>}
              {seguindo === mb.id && <div className="seguindo"><LocateFixed size={13} aria-hidden /> Seguindo no mapa · clique para soltar</div>}
            </button>
          );
        })}
      </aside>
      <div ref={container} className="mapa" />
    </>
  );
}
