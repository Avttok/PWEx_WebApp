import type { Endereco, ProvedorGeo, Rota } from "./provedor";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";

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
