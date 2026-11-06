"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { maplibregl } from "./maplibre";

export const ESTILO_MAPA = "https://tiles.openfreemap.org/styles/positron";

/** Cria um mapa MapLibre no elemento e avisa quando está pronto para receber camadas. */
export function useMapa(container: RefObject<HTMLDivElement | null>) {
  const mapa = useRef<maplibregl.Map | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: ESTILO_MAPA,
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
  }, [container]);

  return { mapa, pronto };
}
