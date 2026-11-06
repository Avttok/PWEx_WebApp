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
    m.on("load", () => {
      adicionarEstabelecimentos(m, tema === "escuro");
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
  m.addLayer({
    id: "pwex-poi-ponto",
    type: "circle",
    source: "openmaptiles",
    "source-layer": "poi",
    minzoom: 15,
    filter: ["has", "name"],
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
    },
    paint: {
      "text-color": escuro ? "#e9c766" : "#6b5410",
      "text-halo-color": escuro ? "#0b0b0d" : "#ffffff",
      "text-halo-width": 1.4,
    },
  });
}
