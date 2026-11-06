"use client";

import type { Map as Mapa } from "maplibre-gl";
import { resolverCor } from "./cores";
import { estabelecimentosVisiveis, modoRuas, type ModoRuas } from "./estabelecimentos";


/** Categoria do estabelecimento (classe do OpenMapTiles) → ícone. O resto usa o padrão. */
export const ICONE_POI: Record<string, string> = {
  grocery: "mercado", supermarket: "mercado", convenience: "mercado", alcohol_shop: "mercado",
  hospital: "hospital", doctor: "hospital", doctors: "hospital", dentist: "hospital", clinic: "hospital",
  pharmacy: "farmacia", chemist: "farmacia",
  park: "praca", garden: "praca", playground: "praca", pitch: "praca",
  school: "escola", college: "escola", kindergarten: "escola", university: "escola",
  restaurant: "restaurante", fast_food: "restaurante", food_court: "restaurante", bar: "restaurante", pub: "restaurante",
  cafe: "cafe", bakery: "cafe", ice_cream: "cafe",
  fuel: "posto", bank: "banco", atm: "banco", place_of_worship: "igreja", lodging: "hotel",
  police: "policia", post: "correio", car: "carro", car_repair: "carro", bus: "onibus",
};
const ICONES = [...new Set([...Object.values(ICONE_POI), "padrao"])];
export const CAMADAS_POI = ["pwex-poi"];

/** Cores dos rótulos: cidade (cor da marca), bairro (azul) e rua (neutra), no claro e no noturno. */
function cores(escuro: boolean) {
  return {
    cidade: resolverCor(escuro ? "var(--ouro-claro)" : "var(--ouro-escuro)"),
    bairro: escuro ? "#7dd3fc" : "#0369a1",
    vila: escuro ? "#c4b5fd" : "#6d28d9",
    rua: escuro ? "#e7e5e4" : "#44403c",
    halo: escuro ? "#0b0b0d" : "#ffffff",
  };
}

async function carregarIcones(m: Mapa) {
  await Promise.all([...ICONES.map((n) => `poi_${n}`), "placa_rua"].map(async (id) => {
    if (m.hasImage(id)) return;
    try {
      const img = await m.loadImage(`/mapa/${id}.png`);
      if (!m.hasImage(id)) m.addImage(id, img.data, { sdf: id !== "placa_rua", pixelRatio: 2 });
    } catch { /* sem ícone, fica só o texto */ }
  }));
}

/** Estabelecimentos com ícone por tipo (na cor do tema) e o nome embaixo. */
function adicionarPoi(m: Mapa, escuro: boolean) {
  if (!m.getSource("openmaptiles") || m.getLayer("pwex-poi")) return;
  const match: unknown[] = ["match", ["coalesce", ["get", "subclass"], ["get", "class"]]];
  for (const [classe, icone] of Object.entries(ICONE_POI)) match.push(classe, `poi_${icone}`);
  match.push(["match", ["get", "class"], ...Object.entries(ICONE_POI).flatMap(([k, v]) => [k, `poi_${v}`]), "poi_padrao"]);
  m.addLayer({
    id: "pwex-poi", type: "symbol", source: "openmaptiles", "source-layer": "poi", minzoom: 15, filter: ["has", "name"],
    layout: {
      visibility: estabelecimentosVisiveis() ? "visible" : "none",
      "icon-image": match as never, "icon-size": 0.9, "icon-allow-overlap": false,
      "text-field": ["coalesce", ["get", "name:pt"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": 11.5,
      "text-anchor": "top", "text-offset": [0, 1.1], "text-max-width": 9, "text-optional": true,
    },
    paint: {
      "icon-color": resolverCor(escuro ? "var(--ouro-claro)" : "var(--ouro-escuro)"),
      "icon-halo-color": escuro ? "#0b0b0d" : "#ffffff", "icon-halo-width": 2,
      "text-color": resolverCor(escuro ? "var(--ouro-claro)" : "var(--ouro-escuro)"),
      "text-halo-color": escuro ? "#0b0b0d" : "#ffffff", "text-halo-width": 1.4,
    },
  });
}

/** Rótulos de lugares coloridos por tipo e nomes de rua no modo escolhido. */
function aplicarRotulos(m: Mapa, escuro: boolean) {
  const c = cores(escuro);
  for (const camada of m.getStyle().layers ?? []) {
    if (camada.type !== "symbol" || camada.id.startsWith("pwex")) continue;
    const fonte = (camada as { "source-layer"?: string })["source-layer"];
    if (fonte === "place") {
      m.setPaintProperty(camada.id, "text-color", ["match", ["get", "class"],
        ["city", "town", "state", "country"], c.cidade,
        ["suburb", "neighbourhood", "quarter"], c.bairro,
        ["village", "hamlet", "isolated_dwelling"], c.vila, c.rua]);
      m.setPaintProperty(camada.id, "text-halo-color", c.halo);
    }
    if (fonte === "transportation_name") {
      m.setPaintProperty(camada.id, "text-color", c.rua);
      m.setPaintProperty(camada.id, "text-halo-color", c.halo);
    }
  }
  aplicarModoRuas(m, modoRuas());
}

/** Na rua (como sempre), em placas azuis, ou ocultos. */
export function aplicarModoRuas(m: Mapa, modo: ModoRuas) {
  for (const camada of m.getStyle().layers ?? []) {
    if (camada.type !== "symbol" || (camada as { "source-layer"?: string })["source-layer"] !== "transportation_name") continue;
    m.setLayoutProperty(camada.id, "visibility", modo === "oculta" ? "none" : "visible");
    if (modo === "oculta") continue;
    const placa = modo === "placa";
    m.setLayoutProperty(camada.id, "symbol-placement", placa ? "point" : "line");
    m.setLayoutProperty(camada.id, "icon-image", placa ? "placa_rua" : "");
    m.setLayoutProperty(camada.id, "icon-text-fit", placa ? "both" : "none");
    m.setLayoutProperty(camada.id, "icon-text-fit-padding", [3, 6, 3, 6]);
    m.setLayoutProperty(camada.id, "symbol-spacing", placa ? 400 : 250);
    m.setPaintProperty(camada.id, "text-color", placa ? "#ffffff" : cores(document.documentElement.dataset.tema !== "claro").rua);
    m.setPaintProperty(camada.id, "text-halo-width", placa ? 0 : 1.2);
  }
}

/** Tudo do estilo PW Express (chamar no "load" do mapa). */
export async function aplicarEstiloPw(m: Mapa, escuro: boolean) {
  await carregarIcones(m);
  adicionarPoi(m, escuro);
  try { aplicarRotulos(m, escuro); } catch { /* estilo diferente: segue sem mexer */ }
}
