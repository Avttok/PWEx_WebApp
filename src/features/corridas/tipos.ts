import type { Modalidade } from "@/features/precos/estrategias";

export type StatusCorrida = "aguardando_motoboy" | "sem_motoboy" | "aceita" | "em_andamento" | "concluida" | "cancelada";
export type TipoParada = "coleta" | "entrega";
export type StatusParada = "pendente" | "a_caminho" | "chegou" | "concluida";

export interface Parada {
  id: string;
  corrida_id: string;
  ordem: number;
  tipo: TipoParada;
  endereco: string;
  lat: number;
  lng: number;
  contato_nome: string | null;
  contato_telefone: string | null;
  instrucoes: string | null;
  status: StatusParada;
  chegou_em: string | null;
  concluida_em: string | null;
  recebedor_nome: string | null;
  foto_path: string | null;
  assinatura_path: string | null;
}

export interface Corrida {
  id: string;
  numero: number;
  empresa_id: string | null;
  status: StatusCorrida;
  modo_despacho: "direto" | "cascata";
  motoboy_designado_id: string | null;
  motoboy_id: string | null;
  exige_foto: boolean;
  exige_assinatura: boolean;
  exige_nome: boolean;
  exige_codigo: boolean;
  codigo_entrega: string | null;
  distancia_planejada_m: number | null;
  duracao_planejada_s: number | null;
  rota_planejada: string | null;
  valor: number | null;
  distancia_real_m: number | null;
  trajeto: string | null;
  observacoes: string | null;
  criada_em: string;
  aceita_em: string | null;
  iniciada_em: string | null;
  concluida_em: string | null;
  cancelada_em: string | null;
  paradas: Parada[];
}

export interface Oferta {
  id: string;
  corrida_id: string;
  motoboy_id: string;
  status: "pendente" | "aceita" | "recusada" | "expirada" | "cancelada";
  distancia_m: number | null;
  expira_em: string;
}

export interface Evento {
  id: number;
  corrida_id: string;
  tipo: string;
  dados: Record<string, unknown>;
  criado_em: string;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  modalidade_preco: Modalidade;
  valor_km: number | null;
  valor_fixo: number | null;
  cliente_ve_ao_vivo: boolean;
  observacoes: string | null;
}

export const ROTULO_CORRIDA: Record<StatusCorrida, string> = {
  aguardando_motoboy: "Procurando motoboy",
  sem_motoboy: "Sem motoboy",
  aceita: "Aceita",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const COR_CORRIDA: Record<StatusCorrida, string> = {
  aguardando_motoboy: "#e9c766",
  sem_motoboy: "#e5484d",
  aceita: "#d4af37",
  em_andamento: "#d4af37",
  concluida: "#2ecc71",
  cancelada: "#8a8a8a",
};

export const ROTULO_PARADA: Record<StatusParada, string> = {
  pendente: "Pendente",
  a_caminho: "A caminho",
  chegou: "No local",
  concluida: "Concluída",
};

export const ATIVAS: StatusCorrida[] = ["aguardando_motoboy", "sem_motoboy", "aceita", "em_andamento"];

export function formatarKm(m: number | null | undefined) {
  return m == null ? "—" : `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export function formatarDuracao(s: number | null | undefined) {
  if (s == null) return "—";
  const min = Math.round(s / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

export function hora(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
}
