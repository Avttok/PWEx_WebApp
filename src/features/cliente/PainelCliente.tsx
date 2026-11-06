"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarClock, CheckCircle2, Clock, CreditCard, Lock, MapPinned, Package, PackagePlus, Plus, QrCode, Receipt, Wallet, X, Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { geo, type Referencia, type Rota } from "@/features/geo";
import { CampoEndereco } from "@/features/corridas/NovaCorrida";
import { CampoReferencias } from "@/features/corridas/CampoReferencias";
import { MapaCorridas, type PinoParada } from "@/features/corridas/MapaCorridas";
import { COR_CORRIDA, ROTULO_CORRIDA, formatarDuracao, formatarKm, type StatusCorrida } from "@/features/corridas/tipos";
import { moeda } from "@/features/precos/estrategias";
import { paraCampo, sugestaoHorario } from "@/features/corridas/planejadas";
import { toast } from "@/features/ui/toast";

interface Info {
  id: string; nome: string; tipo: "pj" | "pf"; modalidade: "por_km" | "fixo" | "por_zona"; valor_km: number | null; valor_fixo: number | null;
  pode_express: boolean; ve_ao_vivo: boolean; metodos: string[]; endereco: string | null; lat: number | null; lng: number | null;
  instrucoes_coleta: string | null; antecedencia_min: number; valor_minimo: number;
}
interface ParadaP { tipo: "coleta" | "entrega"; endereco: string; status: string; lat: number; lng: number; concluida_em: string | null; recebedor: string | null }
interface Pedido {
  id: string; numero: number; status: StatusCorrida; valor: number | null; pagamento_status: string; pagamento_metodo: string | null;
  agendada_para: string | null; criada_em: string; concluida_em: string | null; pago_em: string | null; distancia_m: number | null;
  codigo_entrega: string | null; rota: string | null; motoboy: string | null; paradas: ParadaP[];
}
interface Ponto { chave: string; tipo: "coleta" | "entrega"; endereco: string; lat: number | null; lng: number | null; contato_nome: string; contato_telefone: string; instrucoes: string; referencias: Referencia[] }

type Aba = "pedidos" | "novo" | "carteira";
const ATIVOS: StatusCorrida[] = ["aguardando_pagamento", "agendada", "reservada", "aguardando_motoboy", "sem_motoboy", "aceita", "em_andamento"];
const METODO: Record<string, { rotulo: string; icone: typeof QrCode }> = { pix: { rotulo: "PIX", icone: QrCode }, cartao: { rotulo: "Cartão", icone: CreditCard } };
let seq = 0;
const ponto = (tipo: "coleta" | "entrega", base: Partial<Ponto> = {}): Ponto =>
  ({ chave: `c${++seq}`, tipo, endereco: "", lat: null, lng: null, contato_nome: "", contato_telefone: "", instrucoes: "", referencias: [], ...base });

const ERROS: Record<string, string> = {
  cliente_so_agendado: "Seu cadastro ainda pede só entregas agendadas. Escolha um horário.",
  horario_muito_proximo: "Escolha um horário com mais antecedência.",
  sem_preco_automatico: "Seu preço é combinado por pedido. Fale com a PW Express para lançar este.",
  corrida_precisa_de_2_paradas: "Informe a coleta e pelo menos uma entrega.",
  nao_pode_cancelar: "Este pedido já está com um motoboy e não pode mais ser cancelado por aqui.",
};
const traduzir = (m: string) => Object.entries(ERROS).find(([k]) => m.includes(k))?.[1] ?? m;
const dataHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

/** Painel do cliente: pedidos, novo pedido (pago antes de sair) e carteira de gastos. */
export function PainelCliente() {
  const [info, setInfo] = useState<Info | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [aba, setAba] = useState<Aba>("pedidos");
  const [aberto, setAberto] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const sb = supabase();
    const [i, p] = await Promise.all([sb.rpc("minha_empresa_info"), sb.rpc("meus_pedidos", { p_dias: 400 })]);
    setInfo((i.data as Info | null) ?? null);
    setPedidos((p.data as Pedido[] | null) ?? []);
  }, []);
  useEffect(() => { void carregar(); const t = setInterval(carregar, 15_000); return () => clearInterval(t); }, [carregar]);

  if (!pedidos) return <p className="subtitulo" style={{ padding: 24 }}>Carregando seus pedidos…</p>;
  if (!info) return <div className="cliente-cartao vidro"><p className="erro">Sua conta ainda não está ligada a um cadastro de cliente. Fale com a PW Express.</p></div>;

  const pedido = pedidos.find((p) => p.id === aberto);
  return (
    <div className="cliente-painel entrar">
      <div className="cliente-cabeca">
        <div>
          <h1 className="display" style={{ margin: 0 }}>{info.nome}</h1>
          <p className="dica" style={{ margin: 0 }}>
            {info.pode_express ? <><Zap size={12} aria-hidden /> Express liberado: peça na hora ou agende.</> : <><CalendarClock size={12} aria-hidden /> Pedidos agendados. O Express é liberado pela PW Express.</>}
          </p>
        </div>
        <button className="botao-ouro" onClick={() => { setAba("novo"); setAberto(null); }}><PackagePlus size={17} aria-hidden /> Novo pedido</button>
      </div>
      <div className="segmentado" style={{ gridTemplateColumns: "repeat(3, 1fr)", maxWidth: 460 }}>
        {([["pedidos", "Pedidos"], ["novo", "Novo pedido"], ["carteira", "Carteira"]] as [Aba, string][]).map(([k, r]) => (
          <button key={k} type="button" className={aba === k ? "ativo" : ""} onClick={() => { setAba(k); setAberto(null); }}>{r}</button>
        ))}
      </div>
      {aba === "pedidos" && (pedido
        ? <DetalhePedido pedido={pedido} info={info} onVoltar={() => setAberto(null)} onMudou={carregar} />
        : <ListaPedidos pedidos={pedidos} onAbrir={setAberto} onNovo={() => setAba("novo")} />)}
      {aba === "novo" && <NovoPedido info={info} onCriado={async (id) => { await carregar(); setAba("pedidos"); setAberto(id); }} />}
      {aba === "carteira" && <CarteiraCliente pedidos={pedidos} />}
    </div>
  );
}

function SeloStatus({ s }: { s: StatusCorrida }) {
  return <span className="selo" style={{ color: COR_CORRIDA[s], borderColor: COR_CORRIDA[s] }}>{s === "agendada" || s === "reservada" ? "Agendado" : ROTULO_CORRIDA[s]}</span>;
}

function ListaPedidos({ pedidos, onAbrir, onNovo }: { pedidos: Pedido[]; onAbrir: (id: string) => void; onNovo: () => void }) {
  const ativos = pedidos.filter((p) => ATIVOS.includes(p.status));
  const outros = pedidos.filter((p) => !ATIVOS.includes(p.status));
  if (!pedidos.length)
    return (
      <div className="cliente-cartao vidro vazio-cliente">
        <Package size={34} aria-hidden />
        <p>Você ainda não fez nenhum pedido.</p>
        <button className="botao-ouro" onClick={onNovo}><Plus size={16} aria-hidden /> Fazer o primeiro</button>
      </div>
    );
  const linha = (p: Pedido) => (
    <button key={p.id} className="cliente-pedido vidro" onClick={() => onAbrir(p.id)}>
      <div className="cliente-pedido-topo"><strong>#{p.numero}</strong><SeloStatus s={p.status} /><span className="espaco" /><strong>{moeda(p.valor)}</strong></div>
      <span className="dica">{p.paradas[0]?.endereco} → {p.paradas[p.paradas.length - 1]?.endereco}</span>
      <span className="dica">{p.agendada_para ? `Agendado para ${dataHora(p.agendada_para)}` : `Pedido em ${dataHora(p.criada_em)}`}{p.motoboy ? ` · ${p.motoboy.split(" ")[0]}` : ""}</span>
    </button>
  );
  return (
    <>
      {ativos.length > 0 && <><h3 className="rotulo">Em andamento</h3><div className="cliente-lista">{ativos.map(linha)}</div></>}
      {outros.length > 0 && <><h3 className="rotulo">Histórico</h3><div className="cliente-lista">{outros.map(linha)}</div></>}
    </>
  );
}

function DetalhePedido({ pedido: p, info, onVoltar, onMudou }: { pedido: Pedido; info: Info; onVoltar: () => void; onMudou: () => void }) {
  const [motoboy, setMotoboy] = useState<{ lat: number; lng: number } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    if (!info.ve_ao_vivo || !["aceita", "em_andamento"].includes(p.status)) { setMotoboy(null); return; }
    let vivo = true;
    async function buscar() {
      const { data } = await supabase().rpc("acompanhar_pedido", { p_corrida: p.id });
      const d = data as { lat: number | null; lng: number | null } | null;
      if (vivo) setMotoboy(d?.lat != null && d?.lng != null ? { lat: d.lat, lng: d.lng } : null);
    }
    void buscar();
    const t = setInterval(buscar, 10_000);
    return () => { vivo = false; clearInterval(t); };
  }, [p.id, p.status, info.ve_ao_vivo]);

  async function cancelar() {
    if (!confirm(`Cancelar o pedido #${p.numero}?`)) return;
    setOcupado(true);
    const { error } = await supabase().rpc("cliente_cancelar_pedido", { p_corrida: p.id });
    setOcupado(false);
    if (error) return toast(traduzir(error.message), "erro");
    toast("Pedido cancelado.", "ok");
    onMudou();
  }
  const pinos: PinoParada[] = p.paradas.map((x, i) => ({ chave: String(i), lat: x.lat, lng: x.lng, tipo: x.tipo, rotulo: String(i + 1), concluida: x.status === "concluida" }));
  const podeCancelar = p.status === "aguardando_pagamento" || p.status === "agendada";

  return (
    <div className="cliente-detalhe">
      <button className="botao-texto" onClick={onVoltar}><ArrowLeft size={15} aria-hidden /> Pedidos</button>
      <div className="cliente-cartao vidro">
        <div className="cliente-pedido-topo"><h2 className="display" style={{ margin: 0 }}>Pedido #{p.numero}</h2><SeloStatus s={p.status} /><span className="espaco" /><strong className="figura" style={{ fontSize: 24 }}>{moeda(p.valor)}</strong></div>
        <div className="cliente-mapa"><MapaCorridas paradas={pinos} rotaPlanejada={p.rota} enquadrar={p.id}
          motoboys={motoboy ? [{ id: "m", nome: p.motoboy ?? "Motoboy", lat: motoboy.lat, lng: motoboy.lng, status: "em_corrida" }] : []} /></div>
        {p.status === "aguardando_pagamento" && (
          <div className="cliente-pagar">
            <Lock size={18} aria-hidden />
            <div>
              <strong>Aguardando pagamento</strong>
              <p className="dica" style={{ margin: 0 }}>
                O pedido só vai para os motoboys depois de pago{p.pagamento_metodo ? ` (${METODO[p.pagamento_metodo]?.rotulo ?? p.pagamento_metodo})` : ""}.
                Enquanto o pagamento online não é ligado, a PW Express confirma o recebimento por aqui.
              </p>
            </div>
          </div>
        )}
        {p.codigo_entrega && !["concluida", "cancelada"].includes(p.status) && <p className="cliente-codigo">Código de entrega: <strong>{p.codigo_entrega}</strong> <span className="dica">passe só para quem vai receber</span></p>}
        <ol className="cliente-paradas">
          {p.paradas.map((x, i) => (
            <li key={i} className={x.status === "concluida" ? "feita" : ""}>
              <span className={`pino-mini ${x.tipo}`}>{i + 1}</span>
              <div><strong>{x.tipo === "coleta" ? "Coleta" : "Entrega"}</strong> · {x.endereco}
                {x.concluida_em && <div className="dica"><CheckCircle2 size={12} aria-hidden /> {dataHora(x.concluida_em)}{x.recebedor ? ` · recebido por ${x.recebedor}` : ""}</div>}
              </div>
            </li>
          ))}
        </ol>
        <p className="dica">
          {formatarKm(p.distancia_m)} · {p.agendada_para ? `agendado para ${dataHora(p.agendada_para)}` : `pedido em ${dataHora(p.criada_em)}`}
          {p.motoboy ? ` · motoboy ${p.motoboy.split(" ")[0]}` : ""}{p.pago_em ? ` · pago em ${dataHora(p.pago_em)}` : ""}
        </p>
        {podeCancelar && <button className="botao-perigo" disabled={ocupado} onClick={cancelar}><X size={15} aria-hidden /> Cancelar pedido</button>}
      </div>
    </div>
  );
}

function NovoPedido({ info, onCriado }: { info: Info; onCriado: (id: string) => void }) {
  const [pontos, setPontos] = useState<Ponto[]>(() => [
    ponto("coleta", info.endereco ? { endereco: info.endereco, lat: info.lat, lng: info.lng, instrucoes: info.instrucoes_coleta ?? "" } : {}),
    ponto("entrega"),
  ]);
  const [agendar, setAgendar] = useState(!info.pode_express);
  const [quando, setQuando] = useState(() => paraCampo(sugestaoHorario(info.antecedencia_min)));
  const [metodo, setMetodo] = useState(info.metodos[0] ?? "pix");
  const [obs, setObs] = useState("");
  const [rota, setRota] = useState<Rota | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const atualizar = (k: string, d: Partial<Ponto>) => setPontos((l) => l.map((p) => (p.chave === k ? { ...p, ...d } : p)));

  const chaveRota = pontos.map((p) => `${p.lat},${p.lng}`).join("|");
  useEffect(() => {
    const ok = pontos.filter((p) => p.lat != null && p.lng != null);
    if (ok.length < 2 || ok.length !== pontos.length) { setRota(null); return; }
    setCalculando(true);
    const t = setTimeout(async () => {
      setRota(await geo.calcularRota(ok.map((p) => ({ lat: p.lat!, lng: p.lng! }))).catch(() => null));
      setCalculando(false);
    }, 400);
    return () => clearTimeout(t);
  }, [chaveRota]); // eslint-disable-line react-hooks/exhaustive-deps

  const estimativa = useMemo(() => {
    const v = info.modalidade === "fixo" ? info.valor_fixo : info.modalidade === "por_km" && rota ? (info.valor_km ?? 0) * rota.distanciaM / 1000 : null;
    return v == null ? null : Math.max(v, info.valor_minimo ?? 0);
  }, [info, rota]);

  async function enviar() {
    setErro(null);
    if (pontos.some((p) => p.lat == null)) return setErro("Localize todos os endereços (escolha da lista ou marque no mapa).");
    if (agendar && !quando) return setErro("Escolha o horário.");
    if (info.modalidade === "por_km" && !rota) return setErro("Aguarde o cálculo da rota.");
    setEnviando(true);
    const { data, error } = await supabase().rpc("cliente_criar_pedido", {
      dados: {
        agendada_para: agendar ? new Date(quando).toISOString() : null, metodo, observacoes: obs.trim() || null,
        distancia_planejada_m: rota?.distanciaM ?? null, duracao_planejada_s: rota?.duracaoS ?? null, rota_planejada: rota?.polyline ?? null,
        paradas: pontos.map((p) => ({ tipo: p.tipo, endereco: p.endereco, lat: p.lat, lng: p.lng, contato_nome: p.contato_nome, contato_telefone: p.contato_telefone, instrucoes: p.instrucoes, referencias: p.referencias })),
      },
    });
    setEnviando(false);
    if (error) return setErro(traduzir(error.message));
    toast("Assim que o pagamento for confirmado, ele vai para os motoboys.", "ok", { titulo: "Pedido criado" });
    onCriado(data as string);
  }

  const pinos: PinoParada[] = pontos.filter((p) => p.lat != null && p.lng != null).map((p, i) => ({ chave: p.chave, lat: p.lat!, lng: p.lng!, tipo: p.tipo, rotulo: String(i + 1) }));
  return (
    <div className="cliente-novo">
      <div className="cliente-cartao vidro">
        <span className="rotulo">Quando</span>
        <div className="segmentado" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button type="button" className={!agendar ? "ativo" : ""} disabled={!info.pode_express} onClick={() => setAgendar(false)}
            title={info.pode_express ? undefined : "Liberado pela PW Express depois dos primeiros pedidos"}><Zap size={14} aria-hidden /> Express (agora)</button>
          <button type="button" className={agendar ? "ativo" : ""} onClick={() => setAgendar(true)}><CalendarClock size={14} aria-hidden /> Agendar</button>
        </div>
        {!info.pode_express && <p className="dica" style={{ margin: 0 }}><Lock size={11} aria-hidden /> O Express (na hora) é liberado pela PW Express. Por enquanto, agende com pelo menos {info.antecedencia_min} min.</p>}
        {agendar && <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} />}

        <span className="rotulo">Endereços</span>
        {pontos.map((p, i) => (
          <div key={p.chave} className={`parada-form ${p.tipo}`}>
            <div className="parada-topo">
              <span className={`pino-mini ${p.tipo}`}>{i + 1}</span>
              <strong>{p.tipo === "coleta" ? "Coleta" : "Entrega"}</strong>
              <span className="espaco" />
              {i > 1 && <button type="button" className="icone" title="Remover" onClick={() => setPontos((l) => l.filter((x) => x.chave !== p.chave))}><X size={14} /></button>}
            </div>
            <CampoEndereco valor={p.endereco} onTexto={(t) => atualizar(p.chave, { endereco: t, lat: null, lng: null })}
              onEscolher={(e) => atualizar(p.chave, { endereco: e.descricao, lat: e.lat, lng: e.lng })} />
            <div className="parada-acoes">
              <button type="button" className={`link ${escolhendo === p.chave ? "ativo" : ""}`} onClick={() => setEscolhendo(escolhendo === p.chave ? null : p.chave)}>
                <MapPinned size={13} aria-hidden /> {escolhendo === p.chave ? "Clique no mapa…" : "Marcar no mapa"}
              </button>
              {p.lat != null ? <span className="ok"><CheckCircle2 size={13} aria-hidden /> Localizado</span> : <span className="pendente">Sem localização</span>}
            </div>
            <div className="parada-extra">
              <input placeholder="Nome de quem entrega/recebe" value={p.contato_nome} onChange={(e) => atualizar(p.chave, { contato_nome: e.target.value })} />
              <input placeholder="Telefone" value={p.contato_telefone} onChange={(e) => atualizar(p.chave, { contato_telefone: e.target.value })} />
              <input placeholder="Instruções (portaria, bloco…)" value={p.instrucoes} onChange={(e) => atualizar(p.chave, { instrucoes: e.target.value })} />
              <CampoReferencias valor={p.referencias} lat={p.lat} lng={p.lng} onMudar={(r) => atualizar(p.chave, { referencias: r })} />
            </div>
          </div>
        ))}
        <button type="button" className="botao-texto" onClick={() => setPontos((l) => [...l, ponto("entrega")])}><Plus size={15} aria-hidden /> Outra entrega</button>
        <textarea placeholder="Observações para o motoboy (opcional)" value={obs} maxLength={500} onChange={(e) => setObs(e.target.value)} />
      </div>

      <div className="cliente-lado">
        <div className="cliente-mapa vidro">
          <MapaCorridas paradas={pinos} rotaPlanejada={rota?.polyline} modoEscolha={escolhendo != null} enquadrar={chaveRota}
            aoClicar={async (lat, lng) => {
              const k = escolhendo; if (!k) return;
              setEscolhendo(null);
              atualizar(k, { lat, lng });
              atualizar(k, { endereco: await geo.enderecoDoPonto(lat, lng) });
            }} />
        </div>
        <div className="cliente-cartao vidro">
          <div className="resumo-rota">
            <div><span className="rotulo">Distância</span><strong>{calculando ? "…" : formatarKm(rota?.distanciaM)}</strong></div>
            <div><span className="rotulo">Tempo</span><strong>{calculando ? "…" : formatarDuracao(rota?.duracaoS)}</strong></div>
            <div><span className="rotulo">Valor</span><strong className="texto-grad">{estimativa != null ? moeda(estimativa) : info.modalidade === "por_zona" ? "Combinado" : "—"}</strong></div>
          </div>
          <span className="rotulo">Pagamento</span>
          <div className="segmentado" style={{ gridTemplateColumns: `repeat(${info.metodos.length}, 1fr)` }}>
            {info.metodos.map((m) => { const M = METODO[m]; if (!M) return null; const I = M.icone; return (
              <button key={m} type="button" className={metodo === m ? "ativo" : ""} onClick={() => setMetodo(m)}><I size={14} aria-hidden /> {M.rotulo}</button>
            ); })}
          </div>
          <p className="dica" style={{ margin: 0 }}><Lock size={11} aria-hidden /> O pedido sai para os motoboys só depois do pagamento confirmado.</p>
          {erro && <p className="erro">{erro}</p>}
          <button className="botao-ouro" disabled={enviando} onClick={enviar}><Receipt size={17} aria-hidden /> {enviando ? "Enviando…" : "Fazer pedido"}</button>
        </div>
      </div>
    </div>
  );
}

function CarteiraCliente({ pedidos }: { pedidos: Pedido[] }) {
  const pagos = pedidos.filter((p) => p.pagamento_status === "pago" && p.status !== "cancelada");
  const pendentes = pedidos.filter((p) => p.status === "aguardando_pagamento");
  const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
  const doMes = pagos.filter((p) => new Date(p.pago_em ?? p.criada_em) >= mes);
  const soma = (l: Pedido[]) => l.reduce((s, p) => s + Number(p.valor ?? 0), 0);
  return (
    <>
      <div className="grade-3">
        <div className="bloco vidro"><span className="rotulo"><Wallet size={12} aria-hidden /> Gasto no mês</span><strong className="figura texto-grad" style={{ fontSize: 26 }}>{moeda(soma(doMes))}</strong><span className="dica">{doMes.length} pedido{doMes.length === 1 ? "" : "s"}</span></div>
        <div className="bloco vidro"><span className="rotulo"><Receipt size={12} aria-hidden /> Total pago</span><strong className="figura" style={{ fontSize: 22 }}>{moeda(soma(pagos))}</strong></div>
        <div className="bloco vidro"><span className="rotulo"><Clock size={12} aria-hidden /> A pagar</span><strong className="figura" style={{ fontSize: 22 }}>{moeda(soma(pendentes))}</strong><span className="dica">{pendentes.length} pedido{pendentes.length === 1 ? "" : "s"}</span></div>
      </div>
      <div className="cliente-cartao vidro">
        <h3 className="rotulo">Pagamentos</h3>
        {pagos.length === 0 && pendentes.length === 0 ? <p className="vazio">Nenhum pagamento ainda.</p> : (
          <table className="tabela"><thead><tr><th>Pedido</th><th>Data</th><th>Forma</th><th>Situação</th><th>Valor</th></tr></thead>
            <tbody>{[...pendentes, ...pagos].map((p) => (
              <tr key={p.id}><td>#{p.numero}</td><td>{dataHora(p.pago_em ?? p.criada_em)}</td><td>{p.pagamento_metodo ? METODO[p.pagamento_metodo]?.rotulo ?? p.pagamento_metodo : "—"}</td>
                <td>{p.pagamento_status === "pago" ? "Pago" : "Aguardando"}</td><td>{moeda(p.valor)}</td></tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}
