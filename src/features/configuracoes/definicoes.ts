/**
 * Catálogo dos parâmetros do sistema. A tela de Configurações é gerada a partir daqui:
 * para criar um parâmetro novo, adicione-o aqui e na migração (tabela configuracoes).
 */
export type TipoParametro = "numero" | "booleano" | "opcoes";

export interface DefParametro {
  chave: string;
  grupo: GrupoParametro;
  rotulo: string;
  descricao: string;
  /** Para interruptores: texto quando desligado (o `descricao` vale para ligado). */
  descricaoDesligado?: string;
  tipo: TipoParametro;
  padrao: number | boolean;
  unidade?: string;
  min?: number;
  max?: number;
  passo?: number;
  opcoes?: { valor: number; rotulo: string }[];
}

export type GrupoParametro = "despacho" | "planejadas" | "local" | "preco" | "distancia" | "comprovantes" | "rastreamento" | "teste";

export const GRUPOS: Record<GrupoParametro, { titulo: string; descricao: string }> = {
  despacho: { titulo: "Despacho", descricao: "Como as corridas são oferecidas aos motoboys." },
  planejadas: { titulo: "Corridas planejadas", descricao: "Corridas com hora marcada que os motoboys reservam pelo app." },
  local: { titulo: "Etapas por localização", descricao: "Exigir que o motoboy esteja no endereço para avançar." },
  preco: { titulo: "Preço", descricao: "Cálculo do valor da corrida (empresas podem ter regra própria)." },
  distancia: { titulo: "Acréscimo por distância", descricao: "Corridas longas ficam mais caras, por faixas de distância." },
  comprovantes: { titulo: "Comprovantes padrão", descricao: "O que já vem marcado ao lançar uma corrida." },
  rastreamento: { titulo: "Rastreamento no app", descricao: "Ritmo do GPS. O app aplica ao sincronizar." },
  teste: { titulo: "Modo teste", descricao: "Ferramentas para contas gestor + motoboy em corridas de teste." },
};

export const PARAMETROS: DefParametro[] = [
  { chave: "oferta_segundos", grupo: "despacho", rotulo: "Tempo para aceitar", descricao: "Quanto tempo cada motoboy tem para aceitar a corrida antes dela passar ao próximo.", tipo: "numero", padrao: 30, unidade: "s", min: 10, max: 180 },
  { chave: "posicao_max_min", grupo: "despacho", rotulo: "Posição recente", descricao: "Só entra na cascata quem enviou posição dentro desse tempo.", tipo: "numero", padrao: 15, unidade: "min", min: 1, max: 120 },
  { chave: "raio_max_despacho_km", grupo: "despacho", rotulo: "Distância máxima até a coleta", descricao: "Motoboys mais longe que isso não recebem a corrida. 0 = sem limite.", tipo: "numero", padrao: 0, unidade: "km", min: 0, max: 200 },
  { chave: "raio_motoboy_max_km", grupo: "despacho", rotulo: "Raio máximo do motoboy", descricao: "Até quanto cada motoboy pode escolher no raio de disponibilidade dele. Corridas urgentes ignoram o raio.", tipo: "numero", padrao: 100, unidade: "km", min: 1, max: 500, passo: 5 },
  { chave: "offline_auto_min", grupo: "despacho", rotulo: "Offline automático", descricao: "Disponível sem enviar posição há esse tempo vira offline sozinho; volta quando a posição chegar. 0 = desligado.", tipo: "numero", padrao: 30, unidade: "min", min: 0, max: 240, passo: 5 },
  { chave: "favoritos_primeiro", grupo: "despacho", rotulo: "Favoritos da empresa primeiro", descricao: "Na cascata, oferecer antes aos motoboys favoritos do cliente.", tipo: "booleano", padrao: true },

  { chave: "agendada_antecedencia_min", grupo: "planejadas", rotulo: "Antecedência mínima", descricao: "Só dá para planejar corridas que começam pelo menos isso depois de agora.", tipo: "numero", padrao: 30, unidade: "min", min: 5, max: 1440, passo: 5 },
  { chave: "agendada_cancelar_ate_min", grupo: "planejadas", rotulo: "Desistência até", descricao: "Quem reservou pode desistir pelo app até esse tempo antes do horário. Depois, só o gestor libera.", tipo: "numero", padrao: 60, unidade: "min", min: 0, max: 2880, passo: 15 },
  { chave: "agendada_iniciar_antes_min", grupo: "planejadas", rotulo: "Pode iniciar a partir de", descricao: "Quanto tempo antes do horário o motoboy já pode começar a corrida reservada.", tipo: "numero", padrao: 60, unidade: "min", min: 0, max: 600, passo: 15 },
  { chave: "agendada_lembrete_min", grupo: "planejadas", rotulo: "Lembrete ao motoboy", descricao: "Aviso no celular de quem reservou, esse tempo antes do horário.", tipo: "numero", padrao: 30, unidade: "min", min: 5, max: 600, passo: 5 },
  { chave: "agendada_despacho_auto", grupo: "planejadas", rotulo: "Despachar se ninguém reservar", descricao: "Ligado: perto do horário, uma planejada sem reserva vai para o despacho normal (mais próximo).", descricaoDesligado: "Desligado: sem reserva, a corrida fica “sem motoboy” no horário para o gestor resolver.", tipo: "booleano", padrao: true },
  { chave: "agendada_despacho_auto_min", grupo: "planejadas", rotulo: "…quanto tempo antes", descricao: "Quando a planejada sem reserva entra no despacho normal.", tipo: "numero", padrao: 30, unidade: "min", min: 5, max: 600, passo: 5 },
  { chave: "agendada_atraso_min", grupo: "planejadas", rotulo: "Aviso de atraso", descricao: "Se a reservada não for iniciada até esse tempo depois do horário, o gestor e o motoboy são avisados.", tipo: "numero", padrao: 10, unidade: "min", min: 1, max: 240 },
  { chave: "agendada_max_por_motoboy", grupo: "planejadas", rotulo: "Reservas por motoboy", descricao: "Quantas corridas planejadas cada motoboy pode ter reservadas ao mesmo tempo.", tipo: "numero", padrao: 3, min: 1, max: 50 },
  { chave: "agendada_intervalo_min", grupo: "planejadas", rotulo: "Folga entre reservas", descricao: "Tempo mínimo entre duas reservas do mesmo motoboy (além da duração prevista da corrida).", tipo: "numero", padrao: 30, unidade: "min", min: 0, max: 600, passo: 5 },

  { chave: "exigir_no_local", grupo: "local", rotulo: "Exigir estar no local", descricao: "Padrão das novas corridas (pode ser mudado em cada corrida).", tipo: "booleano", padrao: true },
  { chave: "raio_chegada_m", grupo: "local", rotulo: "Raio de chegada", descricao: "Distância máxima do endereço para marcar chegada e concluir.", tipo: "numero", padrao: 150, unidade: "m", min: 20, max: 2000, passo: 10 },
  { chave: "precisao_max_m", grupo: "local", rotulo: "Tolerância ao erro do GPS", descricao: "Quanto da imprecisão informada pelo celular é descontada da distância.", tipo: "numero", padrao: 80, unidade: "m", min: 0, max: 500, passo: 10 },
  { chave: "posicao_valida_s", grupo: "local", rotulo: "Validade da posição", descricao: "Se o app não mandar a posição na hora, usa a última se for mais recente que isso.", tipo: "numero", padrao: 180, unidade: "s", min: 30, max: 900 },

  { chave: "repasse_motoboy_pct", grupo: "preco", rotulo: "Repasse ao motoboy", descricao: "Parte do valor da corrida que fica com o motoboy; o restante fica com a gestão. Congelado no aceite.", tipo: "numero", padrao: 70, unidade: "%", min: 0, max: 100 },
  { chave: "valor_km_padrao", grupo: "preco", rotulo: "Valor do km (avulso)", descricao: "Usado para clientes avulsos e empresas sem valor próprio.", tipo: "numero", padrao: 2, unidade: "R$", min: 0, max: 100, passo: 0.1 },
  { chave: "valor_minimo", grupo: "preco", rotulo: "Valor mínimo", descricao: "Nenhuma corrida calculada fica abaixo disso. 0 = sem mínimo.", tipo: "numero", padrao: 0, unidade: "R$", min: 0, max: 1000, passo: 0.5 },
  { chave: "arredondamento", grupo: "preco", rotulo: "Arredondamento", descricao: "Arredonda o valor calculado para cima.", tipo: "opcoes", padrao: 0, opcoes: [{ valor: 0, rotulo: "Centavos" }, { valor: 0.5, rotulo: "R$ 0,50" }, { valor: 1, rotulo: "R$ 1,00" }, { valor: 5, rotulo: "R$ 5,00" }] },

  { chave: "acrescimo_distancia", grupo: "distancia", rotulo: "Cobrar acréscimo por distância", descricao: "Ligado: corridas longas ficam mais caras, pelas faixas abaixo. Cada corrida ainda pode desligar na criação.", descricaoDesligado: "Desligado: o valor da corrida não muda com a distância.", tipo: "booleano", padrao: true },
  { chave: "acrescimo_coleta_cada_km", grupo: "distancia", rotulo: "Coleta longe do motoboy: a cada", descricao: "Distância do motoboy até a coleta. Cada motoboy vê o valor com a distância dele. 0 = não cobra.", tipo: "numero", padrao: 100, unidade: "km", min: 0, max: 5000, passo: 10 },
  { chave: "acrescimo_coleta_fator", grupo: "distancia", rotulo: "…acrescenta", descricao: "Quanto do valor é somado a cada faixa (0,5 = metade do valor).", tipo: "numero", padrao: 0.5, unidade: "×", min: 0, max: 10, passo: 0.05 },
  { chave: "acrescimo_entrega_cada_km", grupo: "distancia", rotulo: "Entrega longe da coleta: a cada", descricao: "Percurso da coleta até a entrega. 0 = não cobra.", tipo: "numero", padrao: 200, unidade: "km", min: 0, max: 5000, passo: 10 },
  { chave: "acrescimo_entrega_fator", grupo: "distancia", rotulo: "…acrescenta", descricao: "Quanto do valor é somado a cada faixa (0,25 = um quarto do valor).", tipo: "numero", padrao: 0.25, unidade: "×", min: 0, max: 10, passo: 0.05 },

  { chave: "padrao_exige_nome", grupo: "comprovantes", rotulo: "Nome de quem recebeu", descricao: "", tipo: "booleano", padrao: true },
  { chave: "padrao_exige_foto", grupo: "comprovantes", rotulo: "Foto", descricao: "", tipo: "booleano", padrao: false },
  { chave: "padrao_exige_assinatura", grupo: "comprovantes", rotulo: "Assinatura", descricao: "", tipo: "booleano", padrao: false },
  { chave: "padrao_exige_codigo", grupo: "comprovantes", rotulo: "Código de 4 dígitos", descricao: "", tipo: "booleano", padrao: false },

  { chave: "intervalo_corrida_s", grupo: "rastreamento", rotulo: "Intervalo em corrida", descricao: "De quanto em quanto tempo o app envia a posição durante a corrida.", tipo: "numero", padrao: 45, unidade: "s", min: 5, max: 300 },
  { chave: "intervalo_economia_s", grupo: "rastreamento", rotulo: "Intervalo no modo economia", descricao: "Quando o motoboy liga a economia de bateria.", tipo: "numero", padrao: 90, unidade: "s", min: 10, max: 600 },
  { chave: "disponivel_envio_min", grupo: "rastreamento", rotulo: "Sinal quando disponível", descricao: "Envio leve enquanto espera corridas.", tipo: "numero", padrao: 3, unidade: "min", min: 1, max: 30 },
  { chave: "disponivel_distancia_m", grupo: "rastreamento", rotulo: "…ou ao se deslocar", descricao: "Envia antes do tempo se andar essa distância.", tipo: "numero", padrao: 300, unidade: "m", min: 50, max: 5000, passo: 50 },

  { chave: "teste_admin_ignora_local", grupo: "teste", rotulo: "Admin pode ignorar a localização", descricao: "Em corridas de teste, contas gestor + motoboy podem avançar etapas fora do local.", tipo: "booleano", padrao: true },
];

export type Configuracoes = Record<string, number | boolean>;

export const PADROES: Configuracoes = Object.fromEntries(PARAMETROS.map((p) => [p.chave, p.padrao]));
