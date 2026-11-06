import type { Endereco, ProvedorGeo, Referencia, Rota } from "./provedor";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";
const OVERPASS = "https://overpass-api.de/api/interpreter";

const TIPOS: Record<string, string> = {
  fuel: "Posto", pharmacy: "Farmácia", supermarket: "Mercado", bank: "Banco", restaurant: "Restaurante", school: "Escola",
  hospital: "Hospital", church: "Igreja", place_of_worship: "Igreja", bakery: "Padaria", cafe: "Café", fast_food: "Lanchonete",
  convenience: "Conveniência", park: "Praça/parque", bus_station: "Rodoviária", police: "Polícia", post_office: "Correios",
};

function metros(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

interface ResultadoNominatim {
  display_name: string;
  lat: string;
  lon: string;
}

function encurtar(nome: string): string {
  // "Rua X, 123, Bairro, Cidade, Região, SC, 89000-000, Brasil" → até a cidade
  return nome.split(", ").filter((p) => p !== "Brasil" && p !== "Região Sul").slice(0, 5).join(", ");
}

export const provedorOsm: ProvedorGeo = {
  async pontosProximos(lat, lng, raioM = 250) {
    const q = `[out:json][timeout:10];(nwr(around:${raioM},${lat},${lng})[name][~"^(amenity|shop|leisure|tourism)$"~"."];);out center 40;`;
    try {
      const r = await fetch(OVERPASS, { method: "POST", body: new URLSearchParams({ data: q }) });
      if (!r.ok) return [];
      const j = (await r.json()) as { elements: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> }[] };
      const vistos = new Set<string>();
      return j.elements
        .map<Referencia | null>((e) => {
          const p = e.center ?? (e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null);
          if (!p || !e.tags.name) return null;
          const t = e.tags.amenity ?? e.tags.shop ?? e.tags.leisure ?? e.tags.tourism ?? "";
          return { nome: e.tags.name, lat: p.lat, lng: p.lon, tipo: TIPOS[t] ?? null, distancia_m: Math.round(metros({ lat, lng }, { lat: p.lat, lng: p.lon })) };
        })
        .filter((x): x is Referencia => x != null && !vistos.has(x.nome.toLowerCase()) && Boolean(vistos.add(x.nome.toLowerCase())))
        .sort((a, b) => (a.distancia_m ?? 0) - (b.distancia_m ?? 0))
        .slice(0, 8);
    } catch {
      return [];
    }
  },

  async buscarEnderecos(texto) {
    if (texto.trim().length < 4) return [];
    const url = `${NOMINATIM}/search?format=jsonv2&countrycodes=br&limit=6&accept-language=pt-BR&q=${encodeURIComponent(texto)}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const lista = (await r.json()) as ResultadoNominatim[];
    return lista.map<Endereco>((x) => ({ descricao: encurtar(x.display_name), lat: Number(x.lat), lng: Number(x.lon) }));
  },

  async enderecoDoPonto(lat, lng) {
    const url = `${NOMINATIM}/reverse?format=jsonv2&accept-language=pt-BR&lat=${lat}&lon=${lng}`;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const j = (await r.json()) as ResultadoNominatim;
      return encurtar(j.display_name);
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  },

  async calcularRota(pontos) {
    if (pontos.length < 2) return null;
    const coords = pontos.map((p) => `${p.lng},${p.lat}`).join(";");
    const r = await fetch(`${OSRM}/route/v1/driving/${coords}?overview=full&geometries=polyline`);
    if (!r.ok) return null;
    const j = (await r.json()) as { code: string; routes?: { distance: number; duration: number; geometry: string }[] };
    const rota = j.routes?.[0];
    if (j.code !== "Ok" || !rota) return null;
    return { distanciaM: Math.round(rota.distance), duracaoS: Math.round(rota.duration), polyline: rota.geometry } satisfies Rota;
  },
};
