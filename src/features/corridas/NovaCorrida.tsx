"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { geo, type Endereco, type Rota } from "@/features/geo";
import { moeda, orcar, ROTULO_MODALIDADE } from "@/features/precos/estrategias";
import { MapaCorridas, type PinoParada } from "./MapaCorridas";
import { traduzirErro, useEmpresas, useEquipe } from "./dados";
import { formatarDuracao, formatarKm, type TipoParada } from "./tipos";
import { ROTULO_STATUS } from "@/features/rastreamento/tipos";

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
const novaParada = (tipo: TipoParada): ParadaForm => ({
  chave: `p${++seq}`, tipo, endereco: "", lat: null, lng: null, contato_nome: "", contato_telefone: "", instrucoes: "",
});

// ------------------------------------------------------------------ campo de endereço

function CampoEndereco({ valor, onTexto, onEscolher }: {
  valor: string;
  onTexto: (t: string) => void;
  onEscolher: (e: Endereco) => void;
}) {
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
      <input
        value={valor}
        placeholder="Rua, número, cidade"
        onChange={(e) => { digitado.current = true; onTexto(e.target.value); }}
        onFocus={() => setAberto(sugestoes.length > 0)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && (
        <ul className="sugestoes">
          {sugestoes.map((s, i) => (
            <li key={i}>
              <button type="button" onMouseDown={() => { digitado.current = false; onEscolher(s); setAberto(false); }}>
                {s.descricao}
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

  const [empresaId, setEmpresaId] = useState("");
  const [paradas, setParadas] = useState<ParadaForm[]>(() => [novaParada("coleta"), novaParada("entrega")]);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [rota, setRota] = useState<Rota | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [valorManual, setValorManual] = useState<string | null>(null);
  const [exige, setExige] = useState({ foto: false, assinatura: false, nome: true, codigo: false });
  const [modo, setModo] = useState<"cascata" | "direto">("cascata");
  const [motoboyId, setMotoboyId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const empresa = empresas.find((e) => e.id === empresaId) ?? null;
  const favoritosDaEmpresa = favoritos.filter((f) => f.empresa_id === empresaId).map((f) => f.motoboy_id);

  const atualizar = (chave: string, mudanca: Partial<ParadaForm>) =>
    setParadas((lista) => lista.map((p) => (p.chave === chave ? { ...p, ...mudanca } : p)));

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
    if (paradas.some((p) => p.lat == null)) return setErro("Defina a localização de todas as paradas (busque o endereço ou clique no mapa).");
    if (paradas[0].tipo !== "coleta") return setErro("A primeira parada precisa ser uma coleta.");
    if (!paradas.some((p) => p.tipo === "entrega")) return setErro("Inclua pelo menos uma entrega.");
    if (valorFinal == null || Number.isNaN(valorFinal)) return setErro("Informe o valor da corrida.");
    if (modo === "direto" && !motoboyId) return setErro("Escolha o motoboy.");

    setEnviando(true);
    const { data, error } = await supabase().rpc("criar_corrida", {
      dados: {
        empresa_id: empresaId || null,
        modo_despacho: modo,
        motoboy_id: modo === "direto" ? motoboyId : null,
        exige_foto: exige.foto,
        exige_assinatura: exige.assinatura,
        exige_nome: exige.nome,
        exige_codigo: exige.codigo,
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
    () => paradas.flatMap((p, i) =>
      p.lat == null || p.lng == null ? [] : [{ chave: p.chave, lat: p.lat, lng: p.lng, tipo: p.tipo, rotulo: String(i + 1) }]),
    [paradas],
  );

  const motoboysOrdenados = [...equipe].sort((a, b) =>
    Number(favoritosDaEmpresa.includes(b.id)) - Number(favoritosDaEmpresa.includes(a.id)));

  return (
    <>
      <aside className="lateral lateral-larga">
        <div className="lateral-cabecalho">
          <button className="botao-texto" onClick={onVoltar}>← Voltar</button>
          <span className="rotulo">Nova corrida</span>
        </div>

        <section className="bloco">
          <label className="campo">
            <span>Cliente</span>
            <select value={empresaId} onChange={(e) => { setEmpresaId(e.target.value); setValorManual(null); }}>
              <option value="">Avulso (R$ 2,00/km)</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </label>
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
                <button type="button" className="icone" title="Subir" onClick={() => mover(i, -1)}>↑</button>
                <button type="button" className="icone" title="Descer" onClick={() => mover(i, 1)}>↓</button>
                {paradas.length > 2 && (
                  <button type="button" className="icone" title="Remover"
                    onClick={() => setParadas((l) => l.filter((x) => x.chave !== p.chave))}>✕</button>
                )}
              </div>
              <CampoEndereco
                valor={p.endereco}
                onTexto={(t) => atualizar(p.chave, { endereco: t, lat: null, lng: null })}
                onEscolher={(e) => atualizar(p.chave, { endereco: e.descricao, lat: e.lat, lng: e.lng })}
              />
              <div className="parada-acoes">
                <button type="button" className={`link ${escolhendo === p.chave ? "ativo" : ""}`}
                  onClick={() => setEscolhendo(escolhendo === p.chave ? null : p.chave)}>
                  {escolhendo === p.chave ? "Clique no mapa…" : "📍 Marcar no mapa"}
                </button>
                <span className={p.lat != null ? "ok" : "pendente"}>{p.lat != null ? "Localizado" : "Sem localização"}</span>
                <button type="button" className="link" onClick={() => setAberta(aberta === p.chave ? null : p.chave)}>
                  {aberta === p.chave ? "Menos" : "Contato e instruções"}
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
            <button type="button" className="botao-texto" onClick={() => setParadas((l) => [...l, novaParada("coleta")])}>+ Coleta</button>
            <button type="button" className="botao-texto" onClick={() => setParadas((l) => [...l, novaParada("entrega")])}>+ Entrega</button>
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
          <span className="rotulo">Comprovantes na entrega</span>
          <div className="checks">
            {([["nome", "Nome de quem recebeu"], ["foto", "Foto"], ["assinatura", "Assinatura"], ["codigo", "Código de 4 dígitos"]] as const).map(([k, r]) => (
              <label key={k}><input type="checkbox" checked={exige[k]} onChange={(e) => setExige({ ...exige, [k]: e.target.checked })} /> {r}</label>
            ))}
          </div>
        </section>

        <section className="bloco">
          <span className="rotulo">Despacho</span>
          <div className="checks">
            <label><input type="radio" checked={modo === "cascata"} onChange={() => setModo("cascata")} /> Mais próximo da coleta (cascata{favoritosDaEmpresa.length ? ", favoritos primeiro" : ""})</label>
            <label><input type="radio" checked={modo === "direto"} onChange={() => setModo("direto")} /> Motoboy específico</label>
          </div>
          {modo === "direto" && (
            <select value={motoboyId} onChange={(e) => setMotoboyId(e.target.value)}>
              <option value="">Escolha…</option>
              {motoboysOrdenados.map((m) => (
                <option key={m.id} value={m.id}>
                  {favoritosDaEmpresa.includes(m.id) ? "★ " : ""}{m.nome} · {ROTULO_STATUS[m.status]}
                </option>
              ))}
            </select>
          )}
        </section>

        <section className="bloco">
          <label className="campo">
            <span>Observações para o motoboy</span>
            <textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </label>
        </section>

        {erro && <p className="erro">{erro}</p>}
        <button className="botao-ouro" disabled={enviando} onClick={enviar}>
          {enviando ? "Criando…" : `Criar e despachar · ${moeda(valorFinal)}`}
        </button>
      </aside>

      <MapaCorridas
        paradas={pinos}
        rotaPlanejada={rota?.polyline}
        motoboys={equipe.filter((m) => m.status !== "offline" && m.lat != null && m.lng != null)
          .map((m) => ({ id: m.id, nome: m.nome, lat: m.lat!, lng: m.lng!, status: m.status }))}
        aoClicar={aoClicarMapa}
        modoEscolha={escolhendo !== null}
        enquadrar={chaveCoords}
      />
    </>
  );
}
