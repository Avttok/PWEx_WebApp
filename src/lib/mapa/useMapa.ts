"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { maplibregl } from "./maplibre";
import { useTema } from "@/features/tema/tema";
import { useModoTeste } from "@/features/teste/modoTeste";
import { corOuro, resolverCor } from "./cores";
import { useConta } from "@/features/conta/conta";
import { aoMudarEstabelecimentos, estabelecimentosVisiveis } from "./estabelecimentos";

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
  const { teste } = useModoTeste(); // violeta no modo teste: o mapa é refeito com a cor nova
  const { corTema } = useConta(); // vermelho do Dev, idem

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
      // créditos do mapa começam recolhidos (continuam no botão "i")
      container.current?.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show");
      setPronto(true);
    });
    mapa.current = m;
    // botão "Mostrar/Ocultar estabelecimentos" (fica junto do "Mostrar lista")
    const desligar = aoMudarEstabelecimentos(() => {
      const v = estabelecimentosVisiveis() ? "visible" : "none";
      for (const id of CAMADAS_POI) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", v);
    });
    return () => {
      desligar();
      m.remove();
      mapa.current = null;
      setPronto(false);
    };
  }, [container, tema, teste, corTema]);

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
      "circle-color": corOuro(),
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
      // segue o tema (dourado, violeta no teste, vermelho do Dev)
      "text-color": resolverCor(escuro ? "var(--ouro-claro)" : "var(--ouro-escuro)"),
      "text-halo-color": escuro ? "#0b0b0d" : "#ffffff",
      "text-halo-width": 1.4,
    },
  });
}

const CAMADAS_POI = ["pwex-poi", "pwex-poi-ponto"];
const poiVisivel = estabelecimentosVisiveis;
