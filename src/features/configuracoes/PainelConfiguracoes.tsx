"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check, FlaskConical, MapPinned, Minus, Plus, Radar, Receipt, Ruler, Search, Settings2, ShieldCheck, TriangleAlert, Wallet, X, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { GRUPOS, PARAMETROS, type DefParametro, type GrupoParametro } from "./definicoes";
import { useConfiguracoes } from "./useConfiguracoes";

const ICONES: Record<GrupoParametro, LucideIcon> = {
  despacho: Radar, local: MapPinned, preco: Wallet, distancia: Ruler, comprovantes: Receipt, rastreamento: ShieldCheck, teste: FlaskConical,
};

type Estado = "salvando" | "salvo" | "erro" | undefined;

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const casas = (passo = 1) => (String(passo).split(".")[1]?.length ?? 0);
const formatar = (n: number, passo?: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: Math.max(2, casas(passo)) });

export function PainelConfiguracoes() {
  const cfg = useConfiguracoes();
  const [grupo, setGrupo] = useState<GrupoParametro>("despacho");
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState<Record<string, Estado>>({});

  async function salvar(p: DefParametro, valor: number | boolean) {
    setEstado((e) => ({ ...e, [p.chave]: "salvando" }));
    const { error } = await supabase().from("configuracoes").update({ valor }).eq("chave", p.chave);
    setEstado((e) => ({ ...e, [p.chave]: error ? "erro" : "salvo" }));
    if (!error) setTimeout(() => setEstado((e) => ({ ...e, [p.chave]: undefined })), 1800);
  }

  const grupos = Object.keys(GRUPOS) as GrupoParametro[];
  const termo = sem(busca.trim());
  const visiveis = useMemo(
    () => (termo ? PARAMETROS.filter((p) => sem(`${p.rotulo} ${p.descricao} ${GRUPOS[p.grupo].titulo}`).includes(termo)) : PARAMETROS.filter((p) => p.grupo === grupo)),
    [termo, grupo],
  );
  const Icone = ICONES[grupo];

  return (
    <>
      <aside className="lateral config-lateral">
        <CabecaPagina icone={Settings2} titulo="Configurações" subtitulo="Valem para todo o sistema · salvas sozinhas" />
        <label className="config-busca">
          <Search size={16} aria-hidden />
          <input placeholder="Buscar ajuste…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {busca && <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca"><X size={15} /></button>}
        </label>
        <nav className="config-grupos" aria-label="Grupos de configuração">
          {grupos.map((g) => {
            const I = ICONES[g];
            const n = PARAMETROS.filter((p) => p.grupo === g).length;
            return (
              <button key={g} type="button" className={`config-grupo ${!termo && grupo === g ? "ativo" : ""}`} onClick={() => { setGrupo(g); setBusca(""); }}>
                <span className="config-grupo-icone"><I size={17} aria-hidden /></span>
                <span className="config-grupo-texto"><strong>{GRUPOS[g].titulo}</strong><span>{GRUPOS[g].descricao}</span></span>
                <span className="config-grupo-n">{n}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="conteudo">
        <div className="config-pagina entrar" key={termo ? "busca" : grupo}>
          <header className="config-titulo">
            {termo ? (
              <><span className="cabeca-icone grad-suave"><Search size={18} aria-hidden /></span>
                <div><h2 className="display">Busca</h2><p className="dica">{visiveis.length} ajuste{visiveis.length === 1 ? "" : "s"} para “{busca.trim()}”</p></div></>
            ) : (
              <><span className="cabeca-icone grad-suave"><Icone size={18} aria-hidden /></span>
                <div><h2 className="display">{GRUPOS[grupo].titulo}</h2><p className="dica">{GRUPOS[grupo].descricao}</p></div></>
            )}
          </header>

          {grupo === "distancia" && !termo && <ExemploAcrescimo cfg={cfg} />}

          <div className="config-lista">
            {visiveis.map((p) => (
              <Parametro key={p.chave} p={p} valor={cfg[p.chave]} estado={estado[p.chave]} mostrarGrupo={Boolean(termo)} onSalvar={(v) => salvar(p, v)} />
            ))}
            {visiveis.length === 0 && <p className="vazio">Nenhum ajuste encontrado.</p>}
          </div>
          {!termo && grupo === "rastreamento" && <p className="dica">O app aplica estes ajustes na próxima sincronização.</p>}
        </div>
      </main>
    </>
  );
}

// ------------------------------------------------------------------ um ajuste

function Parametro({ p, valor, estado, mostrarGrupo, onSalvar }: {
  p: DefParametro; valor: number | boolean; estado: Estado; mostrarGrupo: boolean; onSalvar: (v: number | boolean) => void;
}) {
  const [rascunho, setRascunho] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const passo = p.passo ?? 1;
  const limitar = (n: number) => Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, n));
  const arred = (n: number) => Number(n.toFixed(Math.max(2, casas(passo))));

  function adiar(n: number) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { onSalvar(arred(limitar(n))); setRascunho(null); }, 650);
  }
  function digitar(t: string) {
    setRascunho(t);
    const n = Number(t.replace(",", "."));
    if (t.trim() !== "" && !Number.isNaN(n)) adiar(n);
  }
  function somar(d: number) {
    const atual = rascunho != null ? Number(rascunho.replace(",", ".")) || 0 : Number(valor);
    const n = arred(limitar(atual + d));
    setRascunho(formatar(n, passo));
    adiar(n);
  }

  const status = (
    <span className="config-status" aria-live="polite">
      {estado === "salvo" && <><Check size={14} aria-hidden /> salvo</>}
      {estado === "erro" && <span className="erro"><TriangleAlert size={14} aria-hidden /> erro</span>}
    </span>
  );

  if (p.tipo === "booleano") {
    return (
      <label className="config-item config-item-bool">
        <span className="config-item-texto">
          {mostrarGrupo && <span className="rotulo">{GRUPOS[p.grupo].titulo}</span>}
          <strong>{p.rotulo}</strong>
          {p.descricao && <span className="dica">{p.descricao}</span>}
        </span>
        {status}
        <input type="checkbox" role="switch" checked={Boolean(valor)} onChange={(e) => onSalvar(e.target.checked)} aria-label={p.rotulo} />
      </label>
    );
  }

  return (
    <div className="config-item">
      <span className="config-item-texto">
        {mostrarGrupo && <span className="rotulo">{GRUPOS[p.grupo].titulo}</span>}
        <strong>{p.rotulo}</strong>
        {p.descricao && <span className="dica">{p.descricao}</span>}
      </span>
      <div className="config-controle">
        {status}
        {p.tipo === "opcoes" ? (
          <div className="segmentado config-opcoes" style={{ gridTemplateColumns: `repeat(${p.opcoes!.length}, 1fr)` }}>
            {p.opcoes!.map((o) => (
              <button key={o.valor} type="button" className={Number(valor) === o.valor ? "ativo" : ""} onClick={() => onSalvar(o.valor)}>{o.rotulo}</button>
            ))}
          </div>
        ) : (
          <div className="passo">
            <button type="button" onClick={() => somar(-passo)} aria-label="Diminuir" disabled={p.min != null && Number(valor) <= p.min}><Minus size={16} /></button>
            <span className="passo-campo">
              {p.unidade === "R$" && <span className="unidade">R$</span>}
              <input inputMode="decimal" value={rascunho ?? formatar(Number(valor), passo)} onChange={(e) => digitar(e.target.value)} aria-label={p.rotulo} />
              {p.unidade && p.unidade !== "R$" && <span className="unidade">{p.unidade}</span>}
            </span>
            <button type="button" onClick={() => somar(passo)} aria-label="Aumentar" disabled={p.max != null && Number(valor) >= p.max}><Plus size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ exemplo vivo do acréscimo

function ExemploAcrescimo({ cfg }: { cfg: Record<string, number | boolean> }) {
  const faixa = (km: number, cada: number, fator: number) => (cada > 0 ? Math.floor(km / cada) * fator : 0);
  const ligado = Boolean(cfg.acrescimo_distancia);
  const fc = faixa(250, Number(cfg.acrescimo_coleta_cada_km), Number(cfg.acrescimo_coleta_fator));
  const fe = faixa(450, Number(cfg.acrescimo_entrega_cada_km), Number(cfg.acrescimo_entrega_fator));
  const total = ligado ? 100 * (1 + fc + fe) : 100;
  return (
    <div className="config-exemplo">
      <span className="rotulo">Exemplo</span>
      <p>
        Corrida de <strong>R$ 100,00</strong>, motoboy a <strong>250 km</strong> da coleta e <strong>450 km</strong> de percurso:
      </p>
      <p className="config-exemplo-conta">
        {ligado
          ? <>100 × (1 + {formatar(fc)} da coleta + {formatar(fe)} do percurso) = <strong className="texto-grad">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></>
          : <>Acréscimo desligado: fica <strong>R$ 100,00</strong>.</>}
      </p>
    </div>
  );
}
