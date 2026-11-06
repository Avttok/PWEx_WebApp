"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, FlaskConical, MapPin, MapPinned, PackagePlus, Plus, Radar, Receipt, Send, StickyNote, UserRound, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { geo, type Endereco, type Rota } from "@/features/geo";
import { moeda, orcar, ROTULO_MODALIDADE } from "@/features/precos/estrategias";
import { useConfiguracoes } from "@/features/configuracoes/useConfiguracoes";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { ROTULO_STATUS } from "@/features/rastreamento/tipos";
import { MapaCorridas, type PinoParada } from "./MapaCorridas";
import { traduzirErro, useEmpresas, useEquipe } from "./dados";
import { formatarDuracao, formatarKm, type TipoParada } from "./tipos";

interface ParadaForm {
  chave: string;
  tipo: TipoParada;
  endereco: string;
  lat: number | null;
  lng: number | null;
  contato_nome: string;
  contato_telefone: string;
  instrucoes: string;
}

let seq = 0;
const novaParada = (tipo: TipoParada, base: Partial<ParadaForm> = {}): ParadaForm => ({
  chave: `p${++seq}`, tipo, endereco: "", lat: null, lng: null, contato_nome: "", contato_telefone: "", instrucoes: "", ...base,
});

// ------------------------------------------------------------------ campo de endereço

function CampoEndereco({ valor, onTexto, onEscolher }: { valor: string; onTexto: (t: string) => void; onEscolher: (e: Endereco) => void }) {
  const [sugestoes, setSugestoes] = useState<Endereco[]>([]);
  const [aberto, setAberto] = useState(false);
  const digitado = useRef(false);

  useEffect(() => {
    if (!digitado.current) return;
    const t = setTimeout(async () => {
      const r = await geo.buscarEnderecos(valor);
      setSugestoes(r);
      setAberto(r.length > 0);
    }, 600);
    return () => clearTimeout(t);
  }, [valor]);

  return (
    <div className="campo-endereco">
      <input value={valor} placeholder="Rua, número, cidade"
        onChange={(e) => { digitado.current = true; onTexto(e.target.value); }}
        onFocus={() => setAberto(sugestoes.length > 0)}
        onBlur={() => setTimeout(() => setAberto(false), 150)} />
      {aberto && (
        <ul className="sugestoes">
          {sugestoes.map((s, i) => (
            <li key={i}>
              <button type="button" onMouseDown={() => { digitado.current = false; onEscolher(s); setAberto(false); }}>
                <MapPin size={13} aria-hidden style={{ verticalAlign: -2, marginRight: 6 }} />{s.descricao}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ formulário

export function NovaCorrida({ onCriada, onVoltar }: { onCriada: (id: string) => void; onVoltar: () => void }) {
  const { empresas, favoritos } = useEmpresas();
  const equipe = useEquipe();
  const cfg = useConfiguracoes();

  const [empresaId, setEmpresaId] = useState("");
  const [paradas, setParadas] = useState<ParadaForm[]>(() => [novaParada("coleta"), novaParada("entrega")]);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [rota, setRota] = useState<Rota | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [valorManual, setValorManual] = useState<string | null>(null);
  const [exige, setExige] = useState<{ foto: boolean; assinatura: boolean; nome: boolean; codigo: boolean } | null>(null);
  const [noLocal, setNoLocal] = useState<boolean | null>(null);
  const [raio, setRaio] = useState<string | null>(null);
  const [teste, setTeste] = useState(false);
  const [modo, setModo] = useState<"cascata" | "direto">("cascata");
  const [motoboyId, setMotoboyId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // padrões vindos das Configurações (até o gestor mexer)
  const exigeAtual = exige ?? {
    nome: Boolean(cfg.padrao_exige_nome), foto: Boolean(cfg.padrao_exige_foto),
    assinatura: Boolean(cfg.padrao_exige_assinatura), codigo: Boolean(cfg.padrao_exige_codigo),
  };
  const noLocalAtual = noLocal ?? Boolean(cfg.exigir_no_local);
  const raioAtual = raio ?? String(cfg.raio_chegada_m);

  const empresa = empresas.find((e) => e.id === empresaId) ?? null;
  const favoritosDaEmpresa = favoritos.filter((f) => f.empresa_id === empresaId).map((f) => f.motoboy_id);

  const atualizar = (chave: string, mudanca: Partial<ParadaForm>) =>
    setParadas((lista) => lista.map((p) => (p.chave === chave ? { ...p, ...mudanca } : p)));

  function escolherEmpresa(id: string) {
    setEmpresaId(id);
    setValorManual(null);
    const e = empresas.find((x) => x.id === id);
    // coleta padrão da empresa entra na primeira parada (se ela ainda estiver vazia ou veio de outra empresa)
    if (e?.endereco && e.lat != null && e.lng != null) {
      setParadas((l) => l.map((p, i) => (i === 0 && p.tipo === "coleta"
        ? { ...p, endereco: e.endereco!, lat: e.lat, lng: e.lng, contato_nome: e.nome_fantasia ?? e.nome, contato_telefone: e.telefone ?? "", instrucoes: e.instrucoes_coleta ?? "" }
        : p)));
    }
  }

  // rota: recalcula quando as coordenadas mudam
  const chaveCoords = paradas.map((p) => `${p.lat},${p.lng}`).join("|");
  useEffect(() => {
    const pontos = paradas.filter((p) => p.lat != null && p.lng != null) as (ParadaForm & { lat: number; lng: number })[];
    if (pontos.length < 2) { setRota(null); return; }
    let cancelado = false;
    setCalculando(true);
    const t = setTimeout(async () => {
      const r = await geo.calcularRota(pontos).catch(() => null);
      if (!cancelado) { setRota(r); setCalculando(false); }
    }, 400);
    return () => { cancelado = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveCoords]);

  const orcamento = orcar(
    empresa ? { modalidade: empresa.modalidade_preco, valor_km: empresa.valor_km, valor_fixo: empresa.valor_fixo } : null,
    rota?.distanciaM ?? null,
    { valorKmPadrao: Number(cfg.valor_km_padrao), valorMinimo: Number(cfg.valor_minimo), arredondamento: Number(cfg.arredondamento) },
  );
  const valorFinal = valorManual !== null ? Number(valorManual.replace(",", ".")) : orcamento.valor;

  async function aoClicarMapa(lat: number, lng: number) {
    if (!escolhendo) return;
    const chave = escolhendo;
    setEscolhendo(null);
    atualizar(chave, { lat, lng, endereco: "Buscando endereço…" });
    atualizar(chave, { endereco: await geo.enderecoDoPonto(lat, lng) });
  }

  function mover(i: number, direcao: -1 | 1) {
    setParadas((l) => {
      const n = [...l];
      const j = i + direcao;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }

  async function enviar() {
    setErro(null);
    if (paradas.some((p) => p.lat == null)) return setErro("Defina a localização de todas as paradas (busque o endereço ou marque no mapa).");
    if (paradas[0].tipo !== "coleta") return setErro("A primeira parada precisa ser uma coleta.");
    if (!paradas.some((p) => p.tipo === "entrega")) return setErro("Inclua pelo menos uma entrega.");
    if (valorFinal == null || Number.isNaN(valorFinal)) return setErro("Informe o valor da corrida.");
    if (modo === "direto" && !motoboyId) return setErro("Escolha o motoboy.");

    setEnviando(true);
    const { data, error } = await supabase().rpc("criar_corrida", {
      dados: {
        empresa_id: empresaId || null,
        teste,
        modo_despacho: modo,
        motoboy_id: modo === "direto" ? motoboyId : null,
        exige_foto: exigeAtual.foto,
        exige_assinatura: exigeAtual.assinatura,
        exige_nome: exigeAtual.nome,
        exige_codigo: exigeAtual.codigo,
        exigir_no_local: noLocalAtual,
        raio_chegada_m: Number(raioAtual) || Number(cfg.raio_chegada_m),
        distancia_planejada_m: rota?.distanciaM ?? null,
        duracao_planejada_s: rota?.duracaoS ?? null,
        rota_planejada: rota?.polyline ?? null,
        valor: valorFinal,
        observacoes,
        paradas: paradas.map(({ tipo, endereco, lat, lng, contato_nome, contato_telefone, instrucoes }) => ({
          tipo, endereco, lat, lng, contato_nome, contato_telefone, instrucoes,
        })),
      },
    });
    setEnviando(false);
    if (error) return setErro(traduzirErro(error.message));
    onCriada(data as string);
  }

  const pinos: PinoParada[] = useMemo(
    () => paradas.flatMap((p, i) => (p.lat == null || p.lng == null ? [] : [{ chave: p.chave, lat: p.lat, lng: p.lng, tipo: p.tipo, rotulo: String(i + 1) }])),
    [paradas],
  );

  // só aparecem motoboys compatíveis com o tipo da corrida (teste ↔ modo teste)
  const motoboysCompativeis = equipe
    .filter((m) => m.modo_teste === teste)
    .sort((a, b) => Number(favoritosDaEmpresa.includes(b.id)) - Number(favoritosDaEmpresa.includes(a.id)));

  return (
    <>
      <aside className="lateral lateral-larga entrar">
        <div className="lateral-cabecalho">
          <button className="botao-texto" onClick={onVoltar}><ArrowLeft size={15} aria-hidden /> Voltar</button>
        </div>
        <CabecaPagina icone={PackagePlus} titulo="Nova corrida" subtitulo="Defina as paradas, o preço e o despacho" />

        <section className={`bloco ${teste ? "bloco-teste" : ""}`}>
          <label className="opcao">
            <FlaskConical size={17} aria-hidden style={{ color: "#a78bfa" }} />
            <span><strong>Corrida de teste</strong><br /><span className="dica">Só vai para motoboys com o modo teste ligado no app.</span></span>
            <input type="checkbox" checked={teste} onChange={(e) => { setTeste(e.target.checked); setMotoboyId(""); }} />
          </label>
        </section>

        <section className="bloco">
          <label className="campo">
            <span>Cliente</span>
            <select value={empresaId} onChange={(e) => escolherEmpresa(e.target.value)}>
              <option value="">Avulso ({moeda(Number(cfg.valor_km_padrao))}/km)</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}{e.situacao && e.situacao !== "ATIVA" ? ` (${e.situacao})` : ""}</option>)}
            </select>
          </label>
          {empresa?.situacao && empresa.situacao !== "ATIVA" && <p className="erro">Atenção: situação cadastral {empresa.situacao} na Receita.</p>}
        </section>

        <section className="bloco">
          <span className="rotulo">Paradas</span>
          {paradas.map((p, i) => (
            <div key={p.chave} className={`parada-form ${p.tipo}`}>
              <div className="parada-topo">
                <span className={`pino-mini ${p.tipo}`}>{i + 1}</span>
                <select value={p.tipo} onChange={(e) => atualizar(p.chave, { tipo: e.target.value as TipoParada })}>
                  <option value="coleta">Coleta</option>
                  <option value="entrega">Entrega</option>
                </select>
                <span className="espaco" />
                <button type="button" className="icone" title="Subir" onClick={() => mover(i, -1)}><ArrowUp size={14} /></button>
                <button type="button" className="icone" title="Descer" onClick={() => mover(i, 1)}><ArrowDown size={14} /></button>
                {paradas.length > 2 && (
                  <button type="button" className="icone" title="Remover" onClick={() => setParadas((l) => l.filter((x) => x.chave !== p.chave))}><X size={14} /></button>
                )}
              </div>
              <CampoEndereco
                valor={p.endereco}
                onTexto={(t) => atualizar(p.chave, { endereco: t, lat: null, lng: null })}
                onEscolher={(e) => atualizar(p.chave, { endereco: e.descricao, lat: e.lat, lng: e.lng })}
              />
              <div className="parada-acoes">
                <button type="button" className={`link ${escolhendo === p.chave ? "ativo" : ""}`} onClick={() => setEscolhendo(escolhendo === p.chave ? null : p.chave)}>
                  <MapPinned size={13} aria-hidden /> {escolhendo === p.chave ? "Clique no mapa…" : "Marcar no mapa"}
                </button>
                {p.lat != null ? <span className="ok"><CheckCircle2 size={13} aria-hidden /> Localizado</span> : <span className="pendente">Sem localização</span>}
                <button type="button" className="link" onClick={() => setAberta(aberta === p.chave ? null : p.chave)}>
                  <UserRound size={13} aria-hidden /> {aberta === p.chave ? "Menos" : "Contato e instruções"}
                </button>
              </div>
              {aberta === p.chave && (
                <div className="parada-extra">
                  <input placeholder="Nome do contato" value={p.contato_nome} onChange={(e) => atualizar(p.chave, { contato_nome: e.target.value })} />
                  <input placeholder="Telefone" value={p.contato_telefone} onChange={(e) => atualizar(p.chave, { contato_telefone: e.target.value })} />
                  <input placeholder="Instruções (portaria, bloco, referência…)" value={p.instrucoes} onChange={(e) => atualizar(p.chave, { instrucoes: e.target.value })} />
                </div>
              )}
            </div>
          ))}
          <div className="linha-botoes">
            <button type="button" className="botao-texto" onClick={() => setParadas((l) => [...l, novaParada("coleta")])}><Plus size={15} /> Coleta</button>
            <button type="button" className="botao-texto" onClick={() => setParadas((l) => [...l, novaParada("entrega")])}><Plus size={15} /> Entrega</button>
          </div>
        </section>

        <section className="bloco resumo-rota">
          <div><span className="rotulo">Distância</span><strong>{calculando ? "…" : formatarKm(rota?.distanciaM)}</strong></div>
          <div><span className="rotulo">Tempo</span><strong>{calculando ? "…" : formatarDuracao(rota?.duracaoS)}</strong></div>
          <div>
            <span className="rotulo">Valor</span>
            <input className="valor" inputMode="decimal"
              value={valorManual ?? (orcamento.valor != null ? orcamento.valor.toFixed(2).replace(".", ",") : "")}
              placeholder="0,00" onChange={(e) => setValorManual(e.target.value)} />
          </div>
          <p className="dica">
            {empresa ? `${ROTULO_MODALIDADE[empresa.modalidade_preco]} · ` : ""}{orcamento.explicacao}
            {valorManual !== null && <> · <button type="button" className="link" onClick={() => setValorManual(null)}>voltar ao calculado ({moeda(orcamento.valor)})</button></>}
          </p>
        </section>

        <section className="bloco">
          <span className="rotulo"><MapPinned size={12} aria-hidden style={{ verticalAlign: -1 }} /> Localização</span>
          <label className="opcao">
            <span>Exigir que o motoboy esteja no local para avançar as etapas</span>
            <input type="checkbox" checked={noLocalAtual} onChange={(e) => setNoLocal(e.target.checked)} />
          </label>
          {noLocalAtual && (
            <label className="opcao">
              <span className="dica">Raio permitido</span>
              <input inputMode="numeric" style={{ width: 90, textAlign: "right" }} value={raioAtual} onChange={(e) => setRaio(e.target.value.replace(/\D/g, ""))} />
              <span className="unidade">m</span>
            </label>
          )}
        </section>

        <section className="bloco">
          <span className="rotulo"><Receipt size={12} aria-hidden style={{ verticalAlign: -1 }} /> Comprovantes na entrega</span>
          {([["nome", "Nome de quem recebeu"], ["foto", "Foto"], ["assinatura", "Assinatura"], ["codigo", "Código de 4 dígitos"]] as const).map(([k, r]) => (
            <label key={k} className="opcao">
              <span>{r}</span>
              <input type="checkbox" checked={exigeAtual[k]} onChange={(e) => setExige({ ...exigeAtual, [k]: e.target.checked })} />
            </label>
          ))}
        </section>

        <section className="bloco">
          <span className="rotulo"><Radar size={12} aria-hidden style={{ verticalAlign: -1 }} /> Despacho</span>
          <div className="checks">
            <label><input type="radio" checked={modo === "cascata"} onChange={() => setModo("cascata")} /> Mais próximo da coleta (cascata{favoritosDaEmpresa.length && cfg.favoritos_primeiro ? ", favoritos primeiro" : ""})</label>
            <label><input type="radio" checked={modo === "direto"} onChange={() => setModo("direto")} /> Motoboy específico</label>
          </div>
          {modo === "direto" && (
            <>
              <select value={motoboyId} onChange={(e) => setMotoboyId(e.target.value)}>
                <option value="">Escolha…</option>
                {motoboysCompativeis.map((m) => (
                  <option key={m.id} value={m.id}>{favoritosDaEmpresa.includes(m.id) ? "★ " : ""}{m.nome} · {ROTULO_STATUS[m.status]}</option>
                ))}
              </select>
              {motoboysCompativeis.length === 0 && (
                <p className="dica">{teste ? "Nenhum motoboy com o modo teste ligado." : "Nenhum motoboy fora do modo teste."}</p>
              )}
            </>
          )}
        </section>

        <section className="bloco">
          <label className="campo">
            <span><StickyNote size={13} aria-hidden style={{ verticalAlign: -2 }} /> Observações para o motoboy</span>
            <textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </label>
        </section>

        {erro && <p className="erro">{erro}</p>}
        <button className="botao-ouro" disabled={enviando} onClick={enviar}>
          <Send size={17} aria-hidden /> {enviando ? "Criando…" : `${teste ? "Criar teste" : "Criar e despachar"} · ${moeda(valorFinal)}`}
        </button>
      </aside>

      <MapaCorridas
        paradas={pinos}
        rotaPlanejada={rota?.polyline}
        motoboys={equipe.filter((m) => m.status !== "offline" && m.lat != null && m.lng != null && m.modo_teste === teste)
          .map((m) => ({ id: m.id, nome: m.nome, lat: m.lat!, lng: m.lng!, status: m.status }))}
        aoClicar={aoClicarMapa}
        modoEscolha={escolhendo !== null}
        enquadrar={chaveCoords}
      />
    </>
  );
}
