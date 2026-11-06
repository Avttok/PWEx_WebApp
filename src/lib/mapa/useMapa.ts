"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { maplibregl } from "./maplibre";
import { useTema } from "@/features/tema/tema";

export const ESTILOS_MAPA = {
  claro: "https://tiles.openfreemap.org/styles/positron",
  escuro: "https://tiles.openfreemap.org/styles/dark",
} as const;

/**
 * Cria um mapa MapLibre no elemento e avisa quando está pronto para receber camadas.
 * Ao trocar o tema o mapa é recriado; quem usa deve recriar camadas e pinos quando `pronto` voltar a true.
 */
export function useMapa(container: RefObject<HTMLDivElement | null>) {
  const mapa = useRef<maplibregl.Map | null>(null);
  const [pronto, setPronto] = useState(false);
  const { tema } = useTema();

  useEffect(() => {
    if (!container.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: ESTILOS_MAPA[tema],
      center: [-49.5, -27.2],
      zoom: 7,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    m.addControl(new BotaoEstabelecimentos(), "bottom-right");
    m.on("load", () => {
      adicionarEstabelecimentos(m, tema === "escuro");
      // créditos do mapa começam recolhidos (continuam no botão "i")
      container.current?.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show");
      setPronto(true);
    });
    mapa.current = m;
    return () => {
      m.remove();
      mapa.current = null;
      setPronto(false);
    };
  }, [container, tema]);

  return { mapa, pronto };
}

/**
 * Nomes de estabelecimentos (comércio, restaurantes, postos…). Os estilos limpos não mostram,
 * mas os dados estão nos mesmos mapas (camada "poi" do OpenMapTiles). Aparecem de perto.
 */
function adicionarEstabelecimentos(m: maplibregl.Map, escuro: boolean) {
  if (!m.getSource("openmaptiles") || m.getLayer("pwex-poi")) return;
  const visibilidade = poiVisivel() ? "visible" : "none";
  m.addLayer({
    id: "pwex-poi-ponto",
    type: "circle",
    source: "openmaptiles",
    "source-layer": "poi",
    minzoom: 15,
    filter: ["has", "name"],
    layout: { visibility: visibilidade },
    paint: {
      "circle-radius": 3,
      "circle-color": escuro ? "#d4af37" : "#b8901f",
      "circle-stroke-color": escuro ? "#0b0b0d" : "#ffffff",
      "circle-stroke-width": 1.2,
    },
  });
  m.addLayer({
    id: "pwex-poi",
    type: "symbol",
    source: "openmaptiles",
    "source-layer": "poi",
    minzoom: 15,
    filter: ["has", "name"],
    layout: {
      "text-field": ["coalesce", ["get", "name:pt"], ["get", "name"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11.5,
      "text-anchor": "top",
      "text-offset": [0, 0.5],
      "text-max-width": 9,
      "text-optional": true,
      visibility: visibilidade,
    },
    paint: {
      "text-color": escuro ? "#e9c766" : "#6b5410",
      "text-halo-color": escuro ? "#0b0b0d" : "#ffffff",
      "text-halo-width": 1.4,
    },
  });
}

// ------------------------------------------------------------------ botão: mostrar/ocultar estabelecimentos

const CHAVE_POI = "pwex-estabelecimentos";
const CAMADAS_POI = ["pwex-poi", "pwex-poi-ponto"];

function poiVisivel(): boolean {
  try { return localStorage.getItem(CHAVE_POI) !== "0"; } catch { return true; }
}

const ICONE_LOJA =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>';

/** Controle do mapa (canto inferior direito) que liga/desliga os nomes de estabelecimentos. */
class BotaoEstabelecimentos implements maplibregl.IControl {
  private caixa?: HTMLDivElement;

  onAdd(m: maplibregl.Map) {
    const caixa = document.createElement("div");
    caixa.className = "maplibregl-ctrl maplibregl-ctrl-group";
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-poi";
    botao.innerHTML = ICONE_LOJA;
    const atualizar = () => {
      const v = poiVisivel();
      botao.classList.toggle("desligado", !v);
      botao.title = v ? "Ocultar estabelecimentos" : "Mostrar estabelecimentos";
      botao.setAttribute("aria-pressed", String(v));
    };
    botao.addEventListener("click", () => {
      const v = !poiVisivel();
      try { localStorage.setItem(CHAVE_POI, v ? "1" : "0"); } catch {}
      for (const id of CAMADAS_POI) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", v ? "visible" : "none");
      atualizar();
    });
    atualizar();
    caixa.appendChild(botao);
    this.caixa = caixa;
    return caixa;
  }

  onRemove() {
    this.caixa?.remove();
  }
}
