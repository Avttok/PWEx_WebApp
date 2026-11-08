"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Boxes, CalendarClock, CheckCircle2, FlaskConical, MapPinned, PackagePlus, Plus, Receipt, Trash2, UserRound, X, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { geo, type Referencia, type Rota } from "@/features/geo";
import { CampoEndereco } from "@/features/corridas/NovaCorrida";
import { CampoReferencias } from "@/features/corridas/CampoReferencias";
import { MapaCorridas, type PinoParada } from "@/features/corridas/MapaCorridas";
import { useEmpresas } from "@/features/corridas/dados";
import { formatarDuracao, formatarKm } from "@/features/corridas/tipos";
import { paraCampo, sugestaoHorario } from "@/features/corridas/planejadas";
import { useModoTeste } from "@/features/teste/modoTeste";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { toast } from "@/features/ui/toast";
import { moedaBr, traduzir, type Categoria, type Orcamento, type TipoPedido } from "./tipos";

interface Ponto { chave: string; tipo: "coleta" | "entrega"; endereco: string; lat: number | null; lng: number | null; contato_nome: string; contato_telefone: string; instrucoes: string; referencias: Referencia[] }
interface Item { chave: string; descricao: string; categoria_id: string; quantidade: string; peso_kg: string; comprimento_cm: string; largura_cm: string; altura_cm: string; valor_declarado: string; coleta: string; entrega: string }

let seq = 0;
const ponto = (tipo: Ponto["tipo"], base: Partial<Ponto> = {}): Ponto => ({ chave: `p${++seq}`, tipo, endereco: "", lat: null, lng: null, contato_nome: "", contato_telefone: "", instrucoes: "", referencias: [], ...base });
const item = (): Item => ({ chave: `i${++seq}`, descricao: "", categoria_id: "", quantidade: "1", peso_kg: "", comprimento_cm: "", largura_cm: "", altura_cm: "", valor_declarado: "", coleta: "", entrega: "" });
const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

/** Lançar um pedido em nome de um cliente (ou avulso). Vira rota pelo roteirizador. */
export function FormPedido({ onCriado, onVoltar }: { onCriado: (id: string) => void; onVoltar: () => void }) {
  const { empresas } = useEmpresas();
  const { teste } = useModoTeste();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tipos, setTipos] = useState<TipoPedido[]>([]);
  const [cliente, setCliente] = useState<string>("");
  const [avulso, setAvulso] = useState("");
  const [agendar, setAgendar] = useState(false);
  const [horario, setHorario] = useState(() => paraCampo(sugestaoHorario(60)));
  const [tipoPedido, setTipoPedido] = useState("padrao");
  const [urgente, setUrgente] = useState(false);
  const [pontos, setPontos] = useState<Ponto[]>(() => [ponto("coleta"), ponto("entrega")]);
  const [itens, setItens] = useState<Item[]>([]);
  const [obs, setObs] = useState("");
  const [rota, setRota] = useState<Rota | null>(null);
  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const sb = supabase();
    sb.from("categorias_produto").select("*").eq("ativa", true).order("ordem").then(({ data }) => setCategorias((data ?? []) as Categoria[]));
    sb.from("tipos_pedido").select("*").eq("ativo", true).order("ordem").then(({ data }) => setTipos((data ?? []) as TipoPedido[]));
  }, []);
  // coleta padrão do cliente
  useEffect(() => {
    const e = empresas.find((x) => x.id === cliente);
    if (e?.endereco && e.lat != null && pontos[0].tipo === "coleta" && !pontos[0].endereco) {
      setPontos((l) => l.map((p, i) => (i === 0 ? { ...p, endereco: e.endereco!, lat: e.lat, lng: e.lng, instrucoes: e.instrucoes_coleta ?? "" } : p)));
    }
  }, [cliente]); // eslint-disable-line react-hooks/exhaustive-deps

  const atualizar = (k: string, d: Partial<Ponto>) => setPontos((l) => l.map((p) => (p.chave === k ? { ...p, ...d } : p)));
  const mudarItem = (k: string, d: Partial<Item>) => setItens((l) => l.map((x) => (x.chave === k ? { ...x, ...d } : x)));
  const coletas = pontos.map((p, i) => ({ p, i })).filter((x) => x.p.tipo === "coleta");
  const entregas = pontos.map((p, i) => ({ p, i })).filter((x) => x.p.tipo === "entrega");

  // rota pelas ruas (coletas e depois entregas, na ordem digitada)
  const ordenados = useMemo(() => [...pontos.filter((p) => p.tipo === "coleta"), ...pontos.filter((p) => p.tipo === "entrega")], [pontos]);
  const chaveRota = ordenados.map((p) => `${p.lat},${p.lng}`).join("|");
  useEffect(() => {
    const ok = ordenados.filter((p) => p.lat != null);
    if (ok.length < 2 || ok.length !== ordenados.length) { setRota(null); return; }
    const t = setTimeout(async () => setRota(await geo.calcularRota(ok.map((p) => ({ lat: p.lat!, lng: p.lng! }))).catch(() => null)), 500);
    return () => clearTimeout(t);
  }, [chaveRota]); // eslint-disable-line react-hooks/exhaustive-deps

  const dadosItens = itens.filter((x) => x.descricao.trim()).map((x) => ({
    descricao: x.descricao.trim(), categoria_id: x.categoria_id || null, quantidade: Math.max(1, Math.round(n(x.quantidade) ?? 1)), peso_kg: n(x.peso_kg),
    comprimento_cm: n(x.comprimento_cm), largura_cm: n(x.largura_cm), altura_cm: n(x.altura_cm), valor_declarado: n(x.valor_declarado),
    coleta: x.coleta === "" ? null : Number(x.coleta), entrega: x.entrega === "" ? null : Number(x.entrega),
  }));
  const quandoIso = agendar && horario ? new Date(horario).toISOString() : null;
  const chaveOrc = JSON.stringify([cliente, tipoPedido, urgente, quandoIso, rota?.distanciaM, pontos.map((p) => [p.tipo, p.lat, p.lng]), dadosItens]);
  useEffect(() => {
    if (pontos.some((p) => p.lat == null)) { setOrc(null); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase().rpc("orcar_previa", { dados: {
        empresa_id: cliente || null, tipo: agendar ? "planejado" : "express", tipo_pedido: tipoPedido, quando: quandoIso, urgente,
        distancia_m: rota?.distanciaM ?? null, pontos: pontos.map((p) => ({ tipo: p.tipo, lat: p.lat, lng: p.lng })), itens: dadosItens } });
      setOrc((data as Orcamento) ?? null);
    }, 400);
    return () => clearTimeout(t);
  }, [chaveOrc]); // eslint-disable-line react-hooks/exhaustive-deps

  async function criar() {
    if (pontos.some((p) => p.lat == null)) return toast("Localize todos os endereços.", "aviso");
    setEnviando(true);
    const { data, error } = await supabase().rpc("criar_pedido", { dados: {
      empresa_id: cliente || null, cliente_nome: cliente ? null : avulso.trim() || null, quando: quandoIso, urgente, tipo_pedido: tipoPedido, teste,
      observacoes: obs.trim() || null, distancia_m: rota?.distanciaM ?? null,
      pontos: pontos.map(({ chave, ...p }) => { void chave; return p; }), itens: dadosItens } });
    setEnviando(false);
    if (error) return toast(traduzir(error.message), "erro");
    toast("O roteirizador já está montando a rota.", "ok", { titulo: "Pedido criado" });
    onCriado(data as string);
  }

  const pinos: PinoParada[] = pontos.filter((p) => p.lat != null).map((p, i) => ({ chave: p.chave, lat: p.lat!, lng: p.lng!, tipo: p.tipo, rotulo: String(i + 1) }));
  const perigoso = dadosItens.some((x) => categorias.find((k) => k.id === x.categoria_id)?.perigoso);

  return (
    <>
      <aside className="lateral entrar">
        <button className="botao-texto" style={{ alignSelf: "flex-start" }} onClick={onVoltar}><ArrowLeft size={15} aria-hidden /> Pedidos</button>
        <CabecaPagina icone={PackagePlus} titulo="Novo pedido" subtitulo={teste ? "Pedido de teste" : "O sistema monta as rotas sozinho"} />
        <section className="bloco">
          <span className="rotulo">Cliente</span>
          <select value={cliente} onChange={(e) => setCliente(e.target.value)}>
            <option value="">Avulso (sem cadastro)</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          {!cliente && <input placeholder="Nome do cliente avulso" value={avulso} onChange={(e) => setAvulso(e.target.value)} />}
        </section>
        <section className="bloco">
          <span className="rotulo">Quando</span>
          <div className="segmentado" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button type="button" className={!agendar ? "ativo" : ""} onClick={() => setAgendar(false)}><Zap size={14} aria-hidden /> Express</button>
            <button type="button" className={agendar ? "ativo" : ""} onClick={() => setAgendar(true)}><CalendarClock size={14} aria-hidden /> Planejado</button>
          </div>
          {agendar && <input type="datetime-local" value={horario} onChange={(e) => setHorario(e.target.value)} />}
          <label className="campo"><span>Tipo de pedido</span>
            <select value={tipoPedido} onChange={(e) => setTipoPedido(e.target.value)}>{tipos.map((t) => <option key={t.chave} value={t.chave}>{t.nome}</option>)}</select></label>
          <label className="opcao"><span><Zap size={14} aria-hidden style={{ color: "var(--vermelho)" }} /> Urgente</span><input type="checkbox" role="switch" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} /></label>
        </section>
        <section className="bloco">
          <span className="rotulo">Endereços</span>
          {pontos.map((p, i) => (
            <div key={p.chave} className={`parada-form ${p.tipo}`}>
              <div className="parada-topo">
                <span className={`pino-mini ${p.tipo}`}>{i + 1}</span>
                <select value={p.tipo} onChange={(e) => atualizar(p.chave, { tipo: e.target.value as Ponto["tipo"] })}>
                  <option value="coleta">Coleta</option><option value="entrega">Entrega</option>
                </select>
                <span className="espaco" />
                {pontos.length > 2 && <button type="button" className="icone" title="Remover" onClick={() => setPontos((l) => l.filter((x) => x.chave !== p.chave))}><X size={14} /></button>}
              </div>
              <CampoEndereco valor={p.endereco} onTexto={(t) => atualizar(p.chave, { endereco: t, lat: null, lng: null })} onEscolher={(e) => atualizar(p.chave, { endereco: e.descricao, lat: e.lat, lng: e.lng })} />
              <div className="parada-acoes">
                <button type="button" className={`link ${escolhendo === p.chave ? "ativo" : ""}`} onClick={() => setEscolhendo(escolhendo === p.chave ? null : p.chave)}>
                  <MapPinned size={13} aria-hidden /> {escolhendo === p.chave ? "Clique no mapa…" : "Marcar no mapa"}
                </button>
                {p.lat != null ? <span className="ok"><CheckCircle2 size={13} aria-hidden /> Localizado</span> : <span className="pendente">Sem localização</span>}
                <button type="button" className="link" onClick={() => setAberto(aberto === p.chave ? null : p.chave)}><UserRound size={13} aria-hidden /> {aberto === p.chave ? "Menos" : "Contato e referências"}</button>
              </div>
              {aberto === p.chave && (
                <div className="parada-extra">
                  <input placeholder="Nome do contato" value={p.contato_nome} onChange={(e) => atualizar(p.chave, { contato_nome: e.target.value })} />
                  <input placeholder="Telefone" value={p.contato_telefone} onChange={(e) => atualizar(p.chave, { contato_telefone: e.target.value })} />
                  <input placeholder="Instruções (portaria, bloco…)" value={p.instrucoes} onChange={(e) => atualizar(p.chave, { instrucoes: e.target.value })} />
                  <CampoReferencias valor={p.referencias} lat={p.lat} lng={p.lng} onMudar={(r) => atualizar(p.chave, { referencias: r })} />
                </div>
              )}
            </div>
          ))}
          <div className="linha-botoes">
            <button type="button" className="botao-texto" onClick={() => setPontos((l) => [...l, ponto("coleta")])}><Plus size={15} /> Coleta</button>
            <button type="button" className="botao-texto" onClick={() => setPontos((l) => [...l, ponto("entrega")])}><Plus size={15} /> Entrega</button>
          </div>
        </section>
      </aside>
      <main className="conteudo">
        <div className="pedido-form-corpo entrar">
          <div className="pedido-mapa vidro">
            <MapaCorridas paradas={pinos} rotaPlanejada={rota?.polyline} modoEscolha={escolhendo != null} enquadrar={chaveRota}
              aoClicar={async (lat, lng) => { const k = escolhendo; if (!k) return; setEscolhendo(null); atualizar(k, { lat, lng }); atualizar(k, { endereco: await geo.enderecoDoPonto(lat, lng) }); }} />
          </div>
          <section className="formulario vidro">
            <div className="titulo-linha"><h3 className="display" style={{ margin: 0 }}><Boxes size={18} aria-hidden /> Itens</h3>
              <button type="button" className="botao-texto" onClick={() => setItens((l) => [...l, item()])}><Plus size={15} /> Item</button></div>
            {itens.length === 0 && <p className="dica" style={{ margin: 0 }}>Sem itens, o pedido conta como 1 volume sem peso. Adicione os volumes para cobrar peso, medidas e categoria.</p>}
            {itens.map((x) => (
              <div key={x.chave} className="item-form">
                <div className="item-linha">
                  <input placeholder="O que é (ex.: Caixa de som grande)" value={x.descricao} onChange={(e) => mudarItem(x.chave, { descricao: e.target.value })} />
                  <select value={x.categoria_id} onChange={(e) => mudarItem(x.chave, { categoria_id: e.target.value })}>
                    <option value="">Categoria…</option>{categorias.map((k) => <option key={k.id} value={k.id}>{k.perigoso ? "⚠ " : ""}{k.nome}</option>)}
                  </select>
                  <button type="button" className="icone" aria-label="Remover item" onClick={() => setItens((l) => l.filter((y) => y.chave !== x.chave))}><Trash2 size={14} /></button>
                </div>
                <div className="item-numeros">
                  <label><span>Qtd.</span><input inputMode="numeric" value={x.quantidade} onChange={(e) => mudarItem(x.chave, { quantidade: e.target.value })} /></label>
                  <label><span>Peso (kg)</span><input inputMode="decimal" value={x.peso_kg} onChange={(e) => mudarItem(x.chave, { peso_kg: e.target.value })} /></label>
                  <label><span>C (cm)</span><input inputMode="decimal" value={x.comprimento_cm} onChange={(e) => mudarItem(x.chave, { comprimento_cm: e.target.value })} /></label>
                  <label><span>L (cm)</span><input inputMode="decimal" value={x.largura_cm} onChange={(e) => mudarItem(x.chave, { largura_cm: e.target.value })} /></label>
                  <label><span>A (cm)</span><input inputMode="decimal" value={x.altura_cm} onChange={(e) => mudarItem(x.chave, { altura_cm: e.target.value })} /></label>
                  <label><span>Valor (R$)</span><input inputMode="decimal" value={x.valor_declarado} onChange={(e) => mudarItem(x.chave, { valor_declarado: e.target.value })} /></label>
                </div>
                {(coletas.length > 1 || entregas.length > 1) && (
                  <div className="item-numeros">
                    <label><span>Sai de</span><select value={x.coleta} onChange={(e) => mudarItem(x.chave, { coleta: e.target.value })}>
                      <option value="">Qualquer coleta</option>{coletas.map(({ p, i }) => <option key={p.chave} value={i}>{i + 1}. {p.endereco || "Coleta"}</option>)}</select></label>
                    <label><span>Vai para</span><select value={x.entrega} onChange={(e) => mudarItem(x.chave, { entrega: e.target.value })}>
                      <option value="">Todas as entregas</option>{entregas.map(({ p, i }) => <option key={p.chave} value={i}>{i + 1}. {p.endereco || "Entrega"}</option>)}</select></label>
                  </div>
                )}
              </div>
            ))}
            {perigoso && <p className="alerta-perigo"><FlaskConical size={14} aria-hidden /> Produto perigoso: vai com cuidado especial e, se a regra estiver ligada, em rota própria.</p>}
            <textarea placeholder="Observações para o motoboy" value={obs} onChange={(e) => setObs(e.target.value)} />
          </section>
          <section className="formulario vidro">
            <h3 className="display" style={{ margin: 0 }}><Receipt size={18} aria-hidden /> Orçamento</h3>
            <div className="resumo-rota">
              <div><span className="rotulo">Distância</span><strong>{formatarKm(rota?.distanciaM ?? orc?.distancia_m)}</strong></div>
              <div><span className="rotulo">Tempo</span><strong>{formatarDuracao(rota?.duracaoS)}</strong></div>
              <div><span className="rotulo">Total</span><strong className="texto-grad">{orc ? moedaBr(orc.total) : "—"}</strong></div>
            </div>
            {orc ? <OrcamentoDetalhe orc={orc} /> : <p className="dica" style={{ margin: 0 }}>Localize os endereços para calcular.</p>}
            <button className="botao-ouro" disabled={enviando} onClick={criar}><PackagePlus size={17} aria-hidden /> {enviando ? "Criando…" : "Criar pedido"}</button>
          </section>
        </div>
      </main>
    </>
  );
}

/** As linhas do orçamento, como o cliente também vê. */
export function OrcamentoDetalhe({ orc }: { orc: Orcamento }) {
  return (
    <div className="orcamento">
      {orc.linhas.map((l, i) => (
        <div key={i} className="orcamento-linha"><span>{l.rotulo}{l.detalhe && <small>{l.detalhe}</small>}</span><strong>{moedaBr(l.valor)}</strong></div>
      ))}
      {orc.percentuais.map((p, i) => (
        <div key={`p${i}`} className="orcamento-linha pct"><span>{p.rotulo}</span><strong>+{p.pct.toLocaleString("pt-BR")}%</strong></div>
      ))}
      {orc.minimo > 0 && <div className="orcamento-linha pct"><span>Mínimo</span><strong>{moedaBr(orc.minimo)}</strong></div>}
      <div className="orcamento-linha total"><span>Total</span><strong>{moedaBr(orc.total)}</strong></div>
      <p className="dica" style={{ margin: 0 }}>
        {orc.volumes} volume{orc.volumes === 1 ? "" : "s"} · peso real {orc.peso_real_kg.toLocaleString("pt-BR")} kg · cubado {orc.peso_cubado_kg.toLocaleString("pt-BR")} kg
        {orc.perigoso && " · perigoso"}
      </p>
    </div>
  );
}
