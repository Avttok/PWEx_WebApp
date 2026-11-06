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
    m.on("load", () => setPronto(true));
    mapa.current = m;
    return () => {
      m.remove();
      mapa.current = null;
      setPronto(false);
    };
  }, [container, tema]);

  return { mapa, pronto };
}
