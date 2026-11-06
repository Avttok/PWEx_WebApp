/**
 * Contrato dos serviços de mapa. A implementação atual usa OpenStreetMap (grátis, para testes).
 * Para trocar pelo Google, crie outro arquivo com estas funções e mude o export em ./index.ts.
 */
export interface Endereco {
  descricao: string;
  lat: number;
  lng: number;
}

export interface Rota {
  distanciaM: number;
  duracaoS: number;
  polyline: string; // precisão 5
}

export interface ProvedorGeo {
  buscarEnderecos(texto: string): Promise<Endereco[]>;
  enderecoDoPonto(lat: number, lng: number): Promise<string>;
  calcularRota(pontos: { lat: number; lng: number }[]): Promise<Rota | null>;
}
