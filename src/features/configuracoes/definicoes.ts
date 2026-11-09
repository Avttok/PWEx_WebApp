/**
 * Catálogo dos parâmetros do sistema. A tela de Configurações é gerada a partir daqui:
 * para criar um parâmetro novo, adicione-o aqui e na migração (tabela configuracoes).
 */
export type TipoParametro = "numero" | "booleano" | "opcoes" | "escolha";

/** Onde a regra pode ter exceção (além do padrão global). Vence: motoboy > cliente > tipo de pedido > global. */
export type Escopo = "tipo" | "cliente" | "motoboy";
export const ROTULO_ESCOPO: Record<Escopo, string> = { tipo: "Tipo de pedido", cliente: "Cliente", motoboy: "Motoboy" };

export interface DefParametro {
  chave: string;
  grupo: GrupoParametro;
  rotulo: string;
  descricao: string;
  /** Para interruptores: texto quando desligado (o `descricao` vale para ligado). */
  descricaoDesligado?: string;
  tipo: TipoParametro;
  padrao: number | boolean | string;
  unidade?: string;
  min?: number;
  max?: number;
  passo?: number;
  opcoes?: { valor: number | string; rotulo: string; dica?: string }[];
  /** Escopos que aceitam exceção desta regra. */
  escopos?: Escopo[];
  /** Só o Dev altera. */
  soDev?: boolean;
}

export type GrupoParametro = "cliente" | "mapa" | "pedidos" | "rotas" | "pagamento" | "precocliente" | "faturas" | "despacho" | "planejadas" | "local" | "preco" | "distancia" | "comprovantes" | "rastreamento" | "teste";

export const GRUPOS: Record<GrupoParametro, { titulo: string; descricao: string }> = {
  cliente: { titulo: "Site do cliente", descricao: "Cadastro de empresas, o que o cliente vê e o que ele pode fazer." },
  mapa: { titulo: "Mapa, veículo e simulador", descricao: "Motoboys offline no mapa, dados do veículo e o GPS simulado do modo teste." },
  pedidos: { titulo: "Pedidos", descricao: "O que acontece quando um pedido chega: revisão, Express, cobrança." },
  rotas: { titulo: "Rotas automáticas", descricao: "Como o sistema junta e separa pedidos em rotas e solta para os motoboys." },
  pagamento: { titulo: "Pagamento do motoboy", descricao: "Cálculo por rota, o que o motoboy enxerga e o período do holerite." },
  precocliente: { titulo: "Preço do cliente", descricao: "Orçamento: distância, pontos, volumes, peso, perigoso, Express e urgente." },
  faturas: { titulo: "Cobrança e faturas", descricao: "Crédito com fatura por ciclo ou pagamento antecipado." },
  despacho: { titulo: "Despacho", descricao: "Como as corridas são oferecidas aos motoboys." },
  planejadas: { titulo: "Corridas planejadas", descricao: "Corridas com hora marcada que os motoboys reservam pelo app." },
  local: { titulo: "Etapas por localização", descricao: "Exigir que o motoboy esteja no endereço para avançar." },
  preco: { titulo: "Corridas avulsas e Dev", descricao: "Corridas lançadas à mão pelo gestor, arredondamento e a parte do Dev." },
  distancia: { titulo: "Acréscimo por distância (avulsas)", descricao: "Corridas avulsas longas ficam mais caras, por faixas de distância." },
  comprovantes: { titulo: "Comprovantes padrão", descricao: "O que já vem marcado ao lançar uma corrida." },
  rastreamento: { titulo: "Rastreamento no app", descricao: "Ritmo do GPS. O app aplica ao sincronizar." },
  teste: { titulo: "Modo teste", descricao: "Ferramentas para contas gestor + motoboy em corridas de teste." },
};

export const PARAMETROS: DefParametro[] = [
  // ---------------------------------------------------------------- site do cliente
  { chave: "cadastro_cliente_modo", grupo: "cliente", rotulo: "Empresas se cadastram pelo site", descricao: "Como fica o “Criar conta” do site do cliente.", tipo: "escolha", padrao: "aprovacao",
    opcoes: [{ valor: "aprovacao", rotulo: "Com aprovação", dica: "A conta espera você aprovar em Clientes → Cadastros." }, { valor: "instantaneo", rotulo: "Na hora", dica: "Já pode pedir assim que criar a conta." },
             { valor: "desligado", rotulo: "Desligado", dica: "Só você cria contas de cliente." }] },
  { chave: "cadastro_express_liberado", grupo: "cliente", rotulo: "Cadastro novo já pede Express", descricao: "Ligado: quem se cadastra sozinho já pode pedir para agora.", descricaoDesligado: "Desligado: começa só com agendados até você liberar no cadastro.", tipo: "booleano", padrao: false },
  { chave: "cadastro_cobranca", grupo: "cliente", rotulo: "Cobrança de quem se cadastra", descricao: "Como começa a cobrança de quem criou a conta sozinho.", tipo: "escolha", padrao: "pre_pago",
    opcoes: [{ valor: "pre_pago", rotulo: "Paga antes", dica: "PIX ou cartão antes do pedido sair." }, { valor: "credito", rotulo: "Crédito", dica: "Entra na fatura do ciclo." }] },
  { chave: "cliente_pode_modelos", grupo: "cliente", rotulo: "Cliente salva modelos de pedido", descricao: "Ligado: o cliente guarda pedidos que se repetem e reusa (pode mudar tudo antes de enviar).", tipo: "booleano", padrao: true, escopos: ["cliente"] },
  { chave: "cliente_pode_cancelar", grupo: "cliente", rotulo: "Cliente cancela o pedido", descricao: "Ligado: o cliente cancela enquanto nenhum motoboy pegou.", descricaoDesligado: "Desligado: para cancelar ele fala com você.", tipo: "booleano", padrao: true, escopos: ["cliente"] },
  { chave: "cliente_ve_preco", grupo: "cliente", rotulo: "Quando o cliente vê o preço", descricao: "Na hora: o valor aparece enquanto ele monta o pedido. Depois da revisão: ele só vê o valor quando você aprovar.", tipo: "escolha", padrao: "na_hora", escopos: ["cliente"],
    opcoes: [{ valor: "na_hora", rotulo: "Na hora", dica: "Vê o orçamento enquanto monta o pedido." }, { valor: "apos_revisao", rotulo: "Depois da revisão", dica: "O valor aparece quando você aprovar." }] },
  { chave: "cliente_ve_motoboy", grupo: "cliente", rotulo: "Cliente vê o nome do motoboy", descricao: "Só o primeiro nome.", tipo: "booleano", padrao: true, escopos: ["cliente"] },
  { chave: "cliente_ve_codigo", grupo: "cliente", rotulo: "Cliente vê o código de entrega", descricao: "Para passar a quem recebe.", tipo: "booleano", padrao: true, escopos: ["cliente"] },
  { chave: "cliente_troca_senha", grupo: "cliente", rotulo: "Cliente troca a própria senha", descricao: "Em Minha conta.", tipo: "booleano", padrao: true, escopos: ["cliente"] },
  { chave: "item_categoria_obrigatoria", grupo: "cliente", rotulo: "Todo item precisa de tipo", descricao: "Ligado: o cliente não consegue mandar item “Outro” (sem tipo).", tipo: "booleano", padrao: false },
  { chave: "zona_cliente_exclusiva", grupo: "cliente", rotulo: "Zona exclusiva do cliente", descricao: "Ligado: cliente com zonas próprias usa só as dele (ignora as gerais).", descricaoDesligado: "Desligado: as zonas dele somam com as gerais.", tipo: "booleano", padrao: false, escopos: ["cliente"] },
  // ---------------------------------------------------------------- mapa, veículo e simulador
  { chave: "mapa_offline_some_h", grupo: "mapa", rotulo: "Offline some do mapa após", descricao: "Motoboy offline há mais tempo que isso sai do mapa (continua na lista). 0 = nunca some.", tipo: "numero", padrao: 24, unidade: "h", min: 0, max: 720, passo: 1 },
  { chave: "mapa_offline_esmaecer", grupo: "mapa", rotulo: "Offline vai apagando", descricao: "Ligado: quanto mais tempo sem sinal, mais transparente ele fica no mapa.", tipo: "booleano", padrao: true },
  { chave: "motoboy_edita_veiculo", grupo: "mapa", rotulo: "Motoboy edita o próprio veículo", descricao: "Ligado: placa, cor e CNH no perfil do app.", descricaoDesligado: "Desligado: só você muda (Equipe → motoboy).", tipo: "booleano", padrao: false },
  { chave: "veiculo_obrigatorio", grupo: "mapa", rotulo: "Só pega rota com placa cadastrada", descricao: "Vale para pegar rota no quadro (corridas de teste não contam).", tipo: "booleano", padrao: false },
  { chave: "quadro_mostra_enderecos", grupo: "mapa", rotulo: "Quadro mostra os endereços", descricao: "Ligado: o motoboy vê bairro e endereço de cada parada antes de pegar a rota.", descricaoDesligado: "Desligado: vê só a distância e a quantidade de paradas.", tipo: "booleano", padrao: true },
  { chave: "quadro_mostra_itens", grupo: "mapa", rotulo: "Quadro mostra os itens", descricao: "O que vai em cada entrega, antes de pegar.", tipo: "booleano", padrao: true },
  { chave: "simulador_ligado", grupo: "mapa", rotulo: "Simulador de GPS (modo teste)", descricao: "Ligado: motoboys de teste podem andar sozinhos pela rota (no app e no Mapa do site) para testar o rastreamento.", tipo: "booleano", padrao: true },
  { chave: "simulador_velocidade_kmh", grupo: "mapa", rotulo: "Velocidade do simulador", descricao: "Velocidade inicial (dá para mudar na hora).", tipo: "numero", padrao: 35, unidade: "km/h", min: 5, max: 120, passo: 5 },
  // ---------------------------------------------------------------- pedidos
  { chave: "voltar_revisao_aceitas", grupo: "pedidos", rotulo: "Voltar à revisão com rota aceita", descricao: "Ligado: dá para voltar o pedido à revisão mesmo se o motoboy já aceitou a rota (se nenhuma parada foi feita).", tipo: "booleano", padrao: true },
  { chave: "pedido_revisao_gestor", grupo: "pedidos", rotulo: "Pedido novo passa pelo gestor", descricao: "Ligado: o pedido do cliente espera você aprovar (e ajustar o valor) antes de virar rota.", descricaoDesligado: "Desligado: o pedido vai direto para o roteirizador.", tipo: "booleano", padrao: true, escopos: ["tipo", "cliente"] },
  { chave: "cliente_pode_express", grupo: "pedidos", rotulo: "Cliente pode pedir Express", descricao: "Além do \u201cExpress liberado\u201d do cadastro. Desligado: só pedidos agendados.", tipo: "booleano", padrao: true, escopos: ["tipo", "cliente"] },
  { chave: "agendada_antecedencia_cliente_min", grupo: "pedidos", rotulo: "Antecedência do agendado", descricao: "O cliente só agenda para pelo menos esse tempo depois de agora.", tipo: "numero", padrao: 60, unidade: "min", min: 0, max: 2880, passo: 15, escopos: ["tipo", "cliente"] },

  // ---------------------------------------------------------------- rotas
  { chave: "roteirizador_ligado", grupo: "rotas", rotulo: "Roteirizador automático", descricao: "Ligado: pedidos aprovados viram rotas sozinhos, a cada minuto.", descricaoDesligado: "Desligado: nada vira rota até você ligar de novo.", tipo: "booleano", padrao: true },
  { chave: "roteirizar_agrupar", grupo: "rotas", rotulo: "Juntar pedidos numa rota", descricao: "Ligado: entregas perto umas das outras, na mesma janela, dividem a rota.", descricaoDesligado: "Desligado: cada entrega vira uma rota própria.", tipo: "booleano", padrao: true, escopos: ["tipo", "cliente"] },
  { chave: "rota_janela_min", grupo: "rotas", rotulo: "Janela de horário", descricao: "Pedidos com horários até essa diferença entre si podem dividir a rota.", tipo: "numero", padrao: 30, unidade: "min", min: 0, max: 240, passo: 5 },
  { chave: "rota_raio_coleta_km", grupo: "rotas", rotulo: "Coletas próximas", descricao: "Coletas a até essa distância entre si podem estar na mesma rota.", tipo: "numero", padrao: 2, unidade: "km", min: 0, max: 100, passo: 0.5, escopos: ["tipo", "cliente"] },
  { chave: "rota_raio_entrega_km", grupo: "rotas", rotulo: "Entregas próximas", descricao: "Uma entrega entra na rota se estiver a até essa distância de outra entrega dela.", tipo: "numero", padrao: 3, unidade: "km", min: 0, max: 100, passo: 0.5, escopos: ["tipo", "cliente"] },
  { chave: "rota_max_entregas", grupo: "rotas", rotulo: "Entregas por rota", descricao: "Limite de entregas numa mesma rota.", tipo: "numero", padrao: 5, min: 1, max: 40, escopos: ["tipo", "cliente"] },
  { chave: "rota_max_coletas", grupo: "rotas", rotulo: "Coletas por rota", descricao: "Limite de coletas diferentes numa mesma rota.", tipo: "numero", padrao: 3, min: 1, max: 20, escopos: ["tipo", "cliente"] },
  { chave: "rota_max_km", grupo: "rotas", rotulo: "Distância máxima da rota", descricao: "Da 1ª coleta até qualquer entrega. 0 = sem limite.", tipo: "numero", padrao: 0, unidade: "km", min: 0, max: 500, escopos: ["tipo", "cliente"] },
  { chave: "rota_montar_antes_min", grupo: "rotas", rotulo: "Planejados viram rota", descricao: "Quanto tempo antes do horário um pedido planejado já aparece como rota para reservar.", tipo: "numero", padrao: 1440, unidade: "min", min: 30, max: 10080, passo: 30 },
  { chave: "express_agrupar_espera_min", grupo: "rotas", rotulo: "Segurar o Express para juntar", descricao: "Espera esse tempo depois de aprovado para tentar juntar com outros. 0 = na hora.", tipo: "numero", padrao: 0, unidade: "min", min: 0, max: 60 },
  { chave: "rota_exclusiva_cliente", grupo: "rotas", rotulo: "Rota só deste cliente", descricao: "Ligado: não mistura com pedidos de outros clientes.", tipo: "booleano", padrao: false, escopos: ["tipo", "cliente"] },
  { chave: "perigoso_rota_exclusiva", grupo: "rotas", rotulo: "Perigoso em rota separada", descricao: "Ligado: produtos perigosos (químicos, inflamáveis) nunca dividem a rota com os comuns.", tipo: "booleano", padrao: true },
  { chave: "rota_revisao_gestor", grupo: "rotas", rotulo: "Rota montada espera o gestor", descricao: "Ligado: a rota fica \u201cmontada\u201d até você soltar para os motoboys.", descricaoDesligado: "Desligado: a rota sai sozinha pelo modo de despacho.", tipo: "booleano", padrao: false, escopos: ["tipo", "cliente"] },
  { chave: "despacho_modo", grupo: "rotas", rotulo: "Como a rota chega aos motoboys", descricao: "Planejadas sempre vão ao quadro para reservar (exceto \u201cDireto\u201d).", tipo: "escolha", padrao: "quadro", escopos: ["tipo", "cliente"],
    opcoes: [{ valor: "quadro", rotulo: "Quadro", dica: "Todos veem; o 1º que pegar leva. O melhor fica destacado." }, { valor: "melhor_primeiro", rotulo: "Melhor primeiro", dica: "Alguns segundos só para o melhor; depois vai ao quadro." },
             { valor: "cascata", rotulo: "Cascata", dica: "Um por vez, do mais perto ao mais longe." }, { valor: "direto", rotulo: "Direto", dica: "Espera você escolher o motoboy." }] },
  { chave: "despacho_melhor_segundos", grupo: "rotas", rotulo: "Vez do melhor motoboy", descricao: "No \u201cMelhor primeiro\u201d: quanto tempo só ele vê a rota.", tipo: "numero", padrao: 45, unidade: "s", min: 10, max: 600, escopos: ["tipo", "cliente"] },
  { chave: "fator_rua", grupo: "rotas", rotulo: "Fator de rua", descricao: "Linha reta × este fator até o mapa calcular a distância por ruas.", tipo: "numero", padrao: 1.3, unidade: "×", min: 1, max: 3, passo: 0.05 },

  // ---------------------------------------------------------------- pagamento do motoboy
  { chave: "pag_modo", grupo: "pagamento", rotulo: "Modelo de pagamento", descricao: "", tipo: "escolha", padrao: "rota", escopos: ["tipo", "motoboy"],
    opcoes: [{ valor: "rota", rotulo: "Por rota", dica: "Km da entrega de referência × valor do km + valor por entrega extra." }, { valor: "percentual", rotulo: "Percentual", dica: "Uma parte do valor cobrado do cliente (modelo antigo)." }] },
  { chave: "pag_valor_km", grupo: "pagamento", rotulo: "Valor do km", descricao: "Multiplica o km da entrega de referência.", tipo: "numero", padrao: 2, unidade: "R$", min: 0, max: 50, passo: 0.1, escopos: ["tipo", "motoboy"] },
  { chave: "pag_entrega_extra", grupo: "pagamento", rotulo: "Por entrega a mais", descricao: "Somado para cada entrega além da primeira.", tipo: "numero", padrao: 10, unidade: "R$", min: 0, max: 500, passo: 0.5, escopos: ["tipo", "motoboy"] },
  { chave: "pag_coleta_extra", grupo: "pagamento", rotulo: "Por coleta a mais", descricao: "Somado para cada coleta além da primeira.", tipo: "numero", padrao: 0, unidade: "R$", min: 0, max: 500, passo: 0.5, escopos: ["tipo", "motoboy"] },
  { chave: "pag_fixo_rota", grupo: "pagamento", rotulo: "Fixo por rota", descricao: "Somado em toda rota.", tipo: "numero", padrao: 0, unidade: "R$", min: 0, max: 500, passo: 0.5, escopos: ["tipo", "motoboy"] },
  { chave: "pag_minimo", grupo: "pagamento", rotulo: "Mínimo por rota", descricao: "Nenhuma rota paga menos que isso. 0 = sem mínimo.", tipo: "numero", padrao: 0, unidade: "R$", min: 0, max: 500, passo: 0.5, escopos: ["tipo", "motoboy"] },
  { chave: "pag_km_regra", grupo: "pagamento", rotulo: "Entrega de referência", descricao: "Qual distância vale para o km.", tipo: "escolha", padrao: "mediana", escopos: ["tipo", "motoboy"],
    opcoes: [{ valor: "mediana", rotulo: "Do meio", dica: "A do meio (mediana). Número par: a de cima das duas do meio." }, { valor: "percentil", rotulo: "Percentil", dica: "Ex.: 75% = a que fica a 3/4 do caminho entre a mais perto e a mais longe." },
             { valor: "media", rotulo: "Média", dica: "A média das distâncias." }, { valor: "mais_longe", rotulo: "Mais longe" }, { valor: "mais_perto", rotulo: "Mais perto" }, { valor: "total_rota", rotulo: "Rota inteira", dica: "Os km da rota toda." }] },
  { chave: "pag_km_percentil", grupo: "pagamento", rotulo: "…percentil", descricao: "Só na regra \u201cPercentil\u201d. 50 = do meio; 75 = entre a do meio e a mais longe.", tipo: "numero", padrao: 75, unidade: "%", min: 1, max: 100, passo: 5, escopos: ["tipo", "motoboy"] },
  { chave: "pag_distancia", grupo: "pagamento", rotulo: "Como medir a distância", descricao: "", tipo: "escolha", padrao: "rua", escopos: ["tipo", "motoboy"],
    opcoes: [{ valor: "rua", rotulo: "Coleta → entrega", dica: "Por ruas, da coleta direto até cada entrega." }, { valor: "acumulada", rotulo: "Acumulado na rota", dica: "Km rodados desde a coleta até chegar na entrega, na ordem da rota." }] },
  { chave: "motoboy_ve_valores", grupo: "pagamento", rotulo: "Motoboy vê os valores", descricao: "Ligado: o motoboy vê quanto cada rota paga e os ganhos no app.", descricaoDesligado: "Desligado: o app mostra rotas, entregas e km, sem valores.", tipo: "booleano", padrao: false, escopos: ["motoboy"] },
  { chave: "motoboy_ve_holerite", grupo: "pagamento", rotulo: "Motoboy vê a aba Holerite", descricao: "Ligado: o motoboy vê a aba Holerite no app, com as rotas e a folha de cada período.", descricaoDesligado: "Desligado: a aba some do app dele.", tipo: "booleano", padrao: true, escopos: ["motoboy"] },
  { chave: "motoboy_holerite_quando", grupo: "pagamento", rotulo: "Quando o motoboy vê o valor do holerite", descricao: "Durante o período: ele acompanha o valor das rotas enquanto o holerite está aberto. Só depois de fechar: os valores aparecem quando você fechar o holerite.", tipo: "escolha", padrao: "aberto", escopos: ["motoboy"],
    opcoes: [{ valor: "aberto", rotulo: "Durante o período", dica: "Vê o valor enquanto o holerite está aberto." }, { valor: "fechado", rotulo: "Só depois de fechar", dica: "Os valores aparecem quando você fechar." }] },
  { chave: "motoboy_ve_holerite_valor", grupo: "pagamento", rotulo: "Motoboy vê o total do holerite fechado", descricao: "Ligado: depois que você fecha o holerite, ele vê o total a receber.", tipo: "booleano", padrao: true, escopos: ["motoboy"] },
  { chave: "holerite_periodo", grupo: "pagamento", rotulo: "Período do holerite", descricao: "", tipo: "escolha", padrao: "semanal", escopos: ["motoboy"],
    opcoes: [{ valor: "diario", rotulo: "Diário" }, { valor: "semanal", rotulo: "Semanal" }, { valor: "quinzenal", rotulo: "Quinzenal" }, { valor: "mensal", rotulo: "Mensal" }] },
  { chave: "holerite_inicio_semana", grupo: "pagamento", rotulo: "Semana começa na", descricao: "Para o holerite semanal.", tipo: "opcoes", padrao: 1, escopos: ["motoboy"],
    opcoes: [{ valor: 1, rotulo: "Seg" }, { valor: 2, rotulo: "Ter" }, { valor: 3, rotulo: "Qua" }, { valor: 4, rotulo: "Qui" }, { valor: 5, rotulo: "Sex" }, { valor: 6, rotulo: "Sáb" }, { valor: 7, rotulo: "Dom" }] },

  // ---------------------------------------------------------------- preço do cliente
  { chave: "preco_base", grupo: "precocliente", rotulo: "Saída", descricao: "Valor fixo de todo pedido.", tipo: "numero", padrao: 8, unidade: "R$", min: 0, max: 1000, passo: 0.5, escopos: ["tipo", "cliente"] },
  { chave: "preco_km", grupo: "precocliente", rotulo: "Valor do km", descricao: "Pela distância do pedido (coletas e entregas na melhor ordem).", tipo: "numero", padrao: 2.5, unidade: "R$", min: 0, max: 100, passo: 0.1, escopos: ["tipo", "cliente"] },
  { chave: "preco_coleta_extra", grupo: "precocliente", rotulo: "Por coleta a mais", descricao: "", tipo: "numero", padrao: 5, unidade: "R$", min: 0, max: 500, passo: 0.5, escopos: ["tipo", "cliente"] },
  { chave: "preco_entrega_extra", grupo: "precocliente", rotulo: "Por entrega a mais", descricao: "", tipo: "numero", padrao: 5, unidade: "R$", min: 0, max: 500, passo: 0.5, escopos: ["tipo", "cliente"] },
  { chave: "preco_pacotes_inclusos", grupo: "precocliente", rotulo: "Volumes inclusos", descricao: "Quantos volumes o preço já cobre.", tipo: "numero", padrao: 1, min: 0, max: 1000, escopos: ["tipo", "cliente"] },
  { chave: "preco_pacote_extra", grupo: "precocliente", rotulo: "Por volume a mais", descricao: "", tipo: "numero", padrao: 1, unidade: "R$", min: 0, max: 500, passo: 0.5, escopos: ["tipo", "cliente"] },
  { chave: "preco_kg_incluso", grupo: "precocliente", rotulo: "Peso incluso", descricao: "Vale o maior entre o peso real e o cubado.", tipo: "numero", padrao: 5, unidade: "kg", min: 0, max: 1000, escopos: ["tipo", "cliente"] },
  { chave: "preco_kg", grupo: "precocliente", rotulo: "Por kg a mais", descricao: "", tipo: "numero", padrao: 1, unidade: "R$", min: 0, max: 100, passo: 0.1, escopos: ["tipo", "cliente"] },
  { chave: "cubagem_fator", grupo: "precocliente", rotulo: "Fator de cubagem", descricao: "Peso cubado = comprimento × largura × altura (cm) ÷ este fator. O padrão do mercado é 6000.", tipo: "numero", padrao: 6000, min: 1000, max: 10000, passo: 500 },
  { chave: "preco_perigoso_pct", grupo: "precocliente", rotulo: "Perigoso: acréscimo", descricao: "Sobre o subtotal quando há produto perigoso.", tipo: "numero", padrao: 30, unidade: "%", min: 0, max: 500, escopos: ["tipo", "cliente"] },
  { chave: "preco_perigoso_fixo", grupo: "precocliente", rotulo: "Perigoso: taxa fixa", descricao: "", tipo: "numero", padrao: 10, unidade: "R$", min: 0, max: 1000, passo: 0.5, escopos: ["tipo", "cliente"] },
  { chave: "preco_express_pct", grupo: "precocliente", rotulo: "Express: acréscimo", descricao: "Sobre o subtotal dos pedidos para agora.", tipo: "numero", padrao: 0, unidade: "%", min: 0, max: 500, escopos: ["tipo", "cliente"] },
  { chave: "preco_urgente_pct", grupo: "precocliente", rotulo: "Urgente: acréscimo", descricao: "", tipo: "numero", padrao: 20, unidade: "%", min: 0, max: 500, escopos: ["tipo", "cliente"] },
  { chave: "zona_combinar", grupo: "precocliente", rotulo: "Mais de uma zona", descricao: "Quando os pontos caem em zonas diferentes.", tipo: "escolha", padrao: "maior", escopos: ["tipo", "cliente"],
    opcoes: [{ valor: "maior", rotulo: "Vale a maior" }, { valor: "somar", rotulo: "Soma todas" }] },

  // ---------------------------------------------------------------- faturas
  { chave: "rotear_sem_pagamento", grupo: "faturas", rotulo: "Montar rota sem esperar o pagamento", descricao: "Ligado: pedido pré-pago aprovado já vira rota (o pagamento é cobrado à parte).", descricaoDesligado: "Desligado: pedido pré-pago só vira rota depois do pagamento confirmado.", tipo: "booleano", padrao: false, escopos: ["tipo", "cliente"] },
  { chave: "cobranca_modo", grupo: "faturas", rotulo: "Como o cliente paga", descricao: "", tipo: "escolha", padrao: "credito", escopos: ["tipo", "cliente"],
    opcoes: [{ valor: "credito", rotulo: "Crédito (fatura)", dica: "Faz os pedidos e paga a fatura no fim do ciclo." }, { valor: "pre_pago", rotulo: "Antecipado", dica: "Cada pedido só sai depois de pago." }] },
  { chave: "fatura_ciclo", grupo: "faturas", rotulo: "Ciclo da fatura", descricao: "", tipo: "escolha", padrao: "semanal", escopos: ["cliente"],
    opcoes: [{ valor: "diario", rotulo: "Diário" }, { valor: "semanal", rotulo: "Semanal" }, { valor: "quinzenal", rotulo: "Quinzenal" }, { valor: "mensal", rotulo: "Mensal" }, { valor: "manual", rotulo: "Manual" }] },
  { chave: "fatura_dia_semana", grupo: "faturas", rotulo: "Semanal: fecha no", descricao: "", tipo: "opcoes", padrao: 6, escopos: ["cliente"],
    opcoes: [{ valor: 0, rotulo: "Dom" }, { valor: 1, rotulo: "Seg" }, { valor: 2, rotulo: "Ter" }, { valor: 3, rotulo: "Qua" }, { valor: 4, rotulo: "Qui" }, { valor: 5, rotulo: "Sex" }, { valor: 6, rotulo: "Sáb" }] },
  { chave: "fatura_vencimento_dias", grupo: "faturas", rotulo: "Vencimento", descricao: "Dias depois do fim do ciclo.", tipo: "numero", padrao: 3, unidade: "dias", min: 0, max: 90, escopos: ["cliente"] },
  { chave: "fatura_revisao", grupo: "faturas", rotulo: "Fatura passa pelo gestor", descricao: "Ligado: a fatura nasce como rascunho para você revisar e emitir.", descricaoDesligado: "Desligado: a fatura já sai emitida para o cliente.", tipo: "booleano", padrao: true, escopos: ["cliente"] },

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

  { chave: "repasse_motoboy_pct", grupo: "preco", rotulo: "Repasse ao motoboy (percentual)", descricao: "Só no modelo de pagamento \u201cPercentual\u201d. Ajustável por motoboy (Regras dele), por cliente e por corrida.", tipo: "numero", padrao: 67.5, unidade: "%", min: 0, max: 100, escopos: ["motoboy"] },
  { chave: "dev_pct", grupo: "preco", rotulo: "Parte do Dev", descricao: "Parte do faturamento que vai para o Dev; a gestão fica com o resto e paga os motoboys. Só o Dev altera.", tipo: "numero", padrao: 5, unidade: "%", min: 0, max: 100, passo: 0.5, escopos: ["cliente"], soDev: true },
  { chave: "valor_km_padrao", grupo: "preco", rotulo: "Valor do km (avulso)", descricao: "Usado para clientes avulsos e empresas sem valor próprio.", tipo: "numero", padrao: 2, unidade: "R$", min: 0, max: 100, passo: 0.1 },
  { chave: "valor_minimo", grupo: "preco", rotulo: "Valor mínimo", descricao: "Nenhum pedido ou corrida calculada fica abaixo disso. 0 = sem mínimo.", tipo: "numero", padrao: 0, unidade: "R$", min: 0, max: 1000, passo: 0.5, escopos: ["tipo", "cliente"] },
  { chave: "arredondamento", grupo: "preco", rotulo: "Arredondamento", descricao: "Arredonda o valor calculado para cima.", tipo: "opcoes", padrao: 0, opcoes: [{ valor: 0, rotulo: "Centavos" }, { valor: 0.5, rotulo: "R$ 0,50" }, { valor: 1, rotulo: "R$ 1,00" }, { valor: 5, rotulo: "R$ 5,00" }] },

  { chave: "acrescimo_distancia", grupo: "distancia", rotulo: "Cobrar acréscimo por distância", descricao: "Ligado: corridas longas ficam mais caras, pelas faixas abaixo. Cada corrida ainda pode desligar na criação.", descricaoDesligado: "Desligado: o valor da corrida não muda com a distância.", tipo: "booleano", padrao: true },
  { chave: "acrescimo_coleta_ligado", grupo: "distancia", rotulo: "Cobrar distância do motoboy até a coleta", descricao: "Ligado: motoboy longe da coleta recebe um valor maior (faixas abaixo).", descricaoDesligado: "Desligado: a distância do motoboy até a coleta não muda o valor.", tipo: "booleano", padrao: true },
  { chave: "acrescimo_entrega_ligado", grupo: "distancia", rotulo: "Cobrar percurso longo", descricao: "Ligado: corrida com percurso longo (coleta → entrega) fica mais cara (faixas abaixo).", descricaoDesligado: "Desligado: o tamanho do percurso não muda o valor.", tipo: "booleano", padrao: true },
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

export type ValorParametro = number | boolean | string;
export type Configuracoes = Record<string, ValorParametro>;

export const PADROES: Configuracoes = Object.fromEntries(PARAMETROS.map((p) => [p.chave, p.padrao]));
