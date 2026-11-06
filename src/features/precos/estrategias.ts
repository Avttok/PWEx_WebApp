/**
 * Estratégias de preço. Cada modalidade é uma função isolada:
 * para criar uma nova, adicione aqui e no enum modalidade_preco do banco.
 */
export type Modalidade = "por_km" | "fixo" | "por_zona";

export interface RegraPreco {
  modalidade: Modalidade;
  valor_km: number | null;
  valor_fixo: number | null;
}

export const VALOR_KM_PADRAO = 2;

export const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  por_km: "Por km rodado",
  fixo: "Preço fixo",
  por_zona: "Por região/zona",
};

export interface Orcamento {
  valor: number | null; // null = gestor informa manualmente
  explicacao: string;
}

const estrategias: Record<Modalidade, (regra: RegraPreco, distanciaM: number | null) => Orcamento> = {
  por_km(regra, distanciaM) {
    const porKm = Number(regra.valor_km ?? VALOR_KM_PADRAO);
    if (distanciaM == null) return { valor: null, explicacao: "Aguardando cálculo da rota" };
    const km = distanciaM / 1000;
    return { valor: Math.round(km * porKm * 100) / 100, explicacao: `${km.toFixed(1)} km × ${moeda(porKm)}` };
  },
  fixo(regra) {
    return { valor: regra.valor_fixo, explicacao: "Preço fixo do cliente" };
  },
  por_zona() {
    return { valor: null, explicacao: "Por zona: informe o valor" };
  },
};

export function orcar(regra: RegraPreco | null, distanciaM: number | null): Orcamento {
  const r = regra ?? { modalidade: "por_km", valor_km: VALOR_KM_PADRAO, valor_fixo: null };
  return estrategias[r.modalidade](r, distanciaM);
}

export function moeda(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
