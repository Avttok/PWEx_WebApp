"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bike, Boxes, CalendarClock, Check, CircleDot, Clock, FileText, FlaskConical, Layers, Lock, MapPinned, Minus, Plus, Radar, Receipt, Route, Ruler, Search, Settings2,
  ShieldCheck, Tags, TriangleAlert, Wallet, X, type LucideIcon,
} from "lucide-react";
import { useConta } from "@/features/conta/conta";
import { Excecoes } from "./Excecoes";
import { CatalogoCategorias, CatalogoHorarios, CatalogoTipos, CatalogoZonas } from "./Catalogos";
import { supabase } from "@/lib/supabase/client";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { GRUPOS, PARAMETROS, type DefParametro, type GrupoParametro, type ValorParametro } from "./definicoes";
import { useConfiguracoes } from "./useConfiguracoes";

const ICONES: Record<GrupoParametro, LucideIcon> = {
  pedidos: FileText, rotas: Route, pagamento: Bike, precocliente: Tags, faturas: Receipt,
  despacho: Radar, planejadas: CalendarClock, local: MapPinned, preco: Wallet, distancia: Ruler, comprovantes: Receipt, rastreamento: ShieldCheck, teste: FlaskConical,
};

type Estado = "salvando" | "salvo" | "erro" | undefined;
type Pagina = GrupoParametro | "excecoes" | "zonas" | "horarios" | "categorias" | "tipos";
const PAGINAS_EXTRAS: { chave: Pagina; titulo: string; descricao: string; icone: LucideIcon }[] = [
  { chave: "excecoes", titulo: "Exceções", descricao: "Regras diferentes para um cliente, um motoboy ou um tipo de pedido.", icone: Layers },
  { chave: "zonas", titulo: "Zonas de preço", descricao: "Raios no mapa com acréscimo (bairros, regiões, cidades).", icone: CircleDot },
  { chave: "horarios", titulo: "Horários de pico", descricao: "Faixas de horário com acréscimo.", icone: Clock },
  { chave: "categorias", titulo: "Categorias de produto", descricao: "Eletrônicos, químicos, frágeis… com taxas próprias.", icone: Boxes },
  { chave: "tipos", titulo: "Tipos de pedido", descricao: "Os tipos que o cliente escolhe (e que podem ter regras próprias).", icone: Tags },
];

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const casas = (passo = 1) => (String(passo).split(".")[1]?.length ?? 0);
const formatar = (n: number, passo?: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: Math.max(2, casas(passo)) });

export function PainelConfiguracoes() {
  const cfg = useConfiguracoes();
  const [grupo, setGrupo] = useState<Pagina>("pedidos");
  const conta = useConta();
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState<Record<string, Estado>>({});

  async function salvar(p: DefParametro, valor: ValorParametro) {
    setEstado((e) => ({ ...e, [p.chave]: "salvando" }));
    const { error } = await supabase().from("configuracoes").update({ valor }).eq("chave", p.chave);
    setEstado((e) => ({ ...e, [p.chave]: error ? "erro" : "salvo" }));
    if (!error) setTimeout(() => setEstado((e) => ({ ...e, [p.chave]: undefined })), 1800);
  }

  const grupos = Object.keys(GRUPOS) as GrupoParametro[];
  const paramDoGrupo = (g: Pagina) => PARAMETROS.filter((p) => p.grupo === g);
  const termo = sem(busca.trim());
  const visiveis = useMemo(
    () => (termo ? PARAMETROS.filter((p) => sem(`${p.rotulo} ${p.descricao} ${GRUPOS[p.grupo].titulo}`).includes(termo)) : paramDoGrupo(grupo)),
    [termo, grupo],
  );
  const extra = PAGINAS_EXTRAS.find((x) => x.chave === grupo);
  const Icone = extra?.icone ?? ICONES[grupo as GrupoParametro];
  const titulo = extra?.titulo ?? GRUPOS[grupo as GrupoParametro]?.titulo;
  const descricao = extra?.descricao ?? GRUPOS[grupo as GrupoParametro]?.descricao;

  return (
    <>
      <aside className="lateral config-lateral">
        <CabecaPagina icone={Settings2} titulo="Configurações" subtitulo="Padrões do sistema · exceções por cliente, motoboy e tipo" />
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
          <span className="rotulo" style={{ margin: "10px 4px 2px" }}>Peças do lego</span>
          {PAGINAS_EXTRAS.map((x) => {
            const I = x.icone;
            return (
              <button key={x.chave} type="button" className={`config-grupo ${!termo && grupo === x.chave ? "ativo" : ""}`} onClick={() => { setGrupo(x.chave); setBusca(""); }}>
                <span className="config-grupo-icone"><I size={17} aria-hidden /></span>
                <span className="config-grupo-texto"><strong>{x.titulo}</strong><span>{x.descricao}</span></span>
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
                <div><h2 className="display">{titulo}</h2><p className="dica">{descricao}</p></div></>
            )}
          </header>

          {grupo === "distancia" && !termo && <ExemploAcrescimo cfg={cfg} />}
          {grupo === "pagamento" && !termo && <ExemploPagamento cfg={cfg} />}

          {!termo && grupo === "excecoes" ? <Excecoes cfg={cfg} />
            : !termo && grupo === "zonas" ? <CatalogoZonas />
            : !termo && grupo === "horarios" ? <CatalogoHorarios />
            : !termo && grupo === "categorias" ? <CatalogoCategorias />
            : !termo && grupo === "tipos" ? <CatalogoTipos />
            : (
              <div className="config-lista">
                {visiveis.map((p) => (
                  <Parametro key={p.chave} p={p} valor={cfg[p.chave]} estado={estado[p.chave]} mostrarGrupo={Boolean(termo)} onSalvar={(v) => salvar(p, v)}
                    bloqueado={p.soDev && !conta.dev} />
                ))}
                {visiveis.length === 0 && <p className="vazio">Nenhum ajuste encontrado.</p>}
              </div>
            )}
          {!termo && grupo === "rastreamento" && <p className="dica">O app aplica estes ajustes na próxima sincronização.</p>}
        </div>
      </main>
    </>
  );
}

// ------------------------------------------------------------------ um ajuste

export function Parametro({ p, valor, estado, mostrarGrupo, onSalvar, bloqueado, extra }: {
  p: DefParametro; valor: ValorParametro; estado: Estado; mostrarGrupo: boolean; onSalvar: (v: ValorParametro) => void;
  bloqueado?: boolean; extra?: ReactNode;
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
      {bloqueado && <span title="Só o Dev altera"><Lock size={13} aria-hidden /> Dev</span>}
      {estado === "salvo" && <><Check size={14} aria-hidden /> salvo</>}
      {estado === "erro" && <span className="erro"><TriangleAlert size={14} aria-hidden /> erro</span>}
    </span>
  );

  if (p.tipo === "escolha") {
    const atual = p.opcoes!.find((o) => o.valor === valor);
    return (
      <div className={`config-item config-item-escolha ${bloqueado ? "bloqueado" : ""}`}>
        <span className="config-item-texto">
          {mostrarGrupo && <span className="rotulo">{GRUPOS[p.grupo].titulo}</span>}
          <strong>{p.rotulo}</strong>
          {(atual?.dica || p.descricao) && <span className="dica">{atual?.dica ?? p.descricao}</span>}
          {extra}
        </span>
        <div className="config-controle">
          {status}
          <div className="escolhas" role="radiogroup" aria-label={p.rotulo}>
            {p.opcoes!.map((o) => (
              <button key={String(o.valor)} type="button" role="radio" aria-checked={valor === o.valor} disabled={bloqueado}
                className={valor === o.valor ? "ativo" : ""} onClick={() => onSalvar(o.valor)} title={o.dica}>{o.rotulo}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (p.tipo === "booleano") {
    return (
      <label className={`config-item config-item-bool ${bloqueado ? "bloqueado" : ""}`}>
        <span className="config-item-texto">
          {mostrarGrupo && <span className="rotulo">{GRUPOS[p.grupo].titulo}</span>}
          <strong>{p.rotulo}</strong>
          {(valor ? p.descricao : p.descricaoDesligado ?? p.descricao) && <span className="dica">{valor ? p.descricao : p.descricaoDesligado ?? p.descricao}</span>}
          {extra}
        </span>
        {status}
        <input type="checkbox" role="switch" checked={Boolean(valor)} disabled={bloqueado} onChange={(e) => onSalvar(e.target.checked)} aria-label={p.rotulo} />
      </label>
    );
  }

  return (
    <div className={`config-item ${bloqueado ? "bloqueado" : ""}`}>
      <span className="config-item-texto">
        {mostrarGrupo && <span className="rotulo">{GRUPOS[p.grupo].titulo}</span>}
        <strong>{p.rotulo}</strong>
        {p.descricao && <span className="dica">{p.descricao}</span>}
        {extra}
      </span>
      <div className="config-controle">
        {status}
        {p.tipo === "opcoes" ? (
          <div className="segmentado config-opcoes" style={{ gridTemplateColumns: `repeat(${p.opcoes!.length}, 1fr)` }}>
            {p.opcoes!.map((o) => (
              <button key={String(o.valor)} type="button" disabled={bloqueado} className={Number(valor) === o.valor ? "ativo" : ""} onClick={() => onSalvar(o.valor)}>{o.rotulo}</button>
            ))}
          </div>
        ) : (
          <div className="passo">
            <button type="button" onClick={() => somar(-passo)} aria-label="Diminuir" disabled={bloqueado || (p.min != null && Number(valor) <= p.min)}><Minus size={16} /></button>
            <span className="passo-campo">
              {p.unidade === "R$" && <span className="unidade">R$</span>}
              <input inputMode="decimal" disabled={bloqueado} value={rascunho ?? formatar(Number(valor), passo)} onChange={(e) => digitar(e.target.value)} aria-label={p.rotulo} />
              {p.unidade && p.unidade !== "R$" && <span className="unidade">{p.unidade}</span>}
            </span>
            <button type="button" onClick={() => somar(passo)} aria-label="Aumentar" disabled={bloqueado || (p.max != null && Number(valor) >= p.max)}><Plus size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ exemplo vivo do acréscimo

/** O cálculo do motoboy com o exemplo de 1 coleta e 5 entregas (3, 9, 12, 15 e 22 km). */
function ExemploPagamento({ cfg }: { cfg: Record<string, ValorParametro> }) {
  const ds = [3, 9, 12, 15, 22];
  const regra = String(cfg.pag_km_regra ?? "mediana");
  const n = ds.length;
  const ref = regra === "media" ? ds.reduce((a, b) => a + b, 0) / n : regra === "mais_longe" ? ds[n - 1] : regra === "mais_perto" ? ds[0]
    : regra === "percentil" ? ds[Math.max(1, Math.ceil((Number(cfg.pag_km_percentil) || 75) / 100 * n)) - 1] : regra === "total_rota" ? 22 : ds[Math.floor(n / 2)];
  const vkm = Number(cfg.pag_valor_km) || 0, vext = Number(cfg.pag_entrega_extra) || 0, fixo = Number(cfg.pag_fixo_rota) || 0, min = Number(cfg.pag_minimo) || 0;
  const total = Math.max(min, fixo + ref * vkm + (n - 1) * vext);
  const m = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (cfg.pag_modo === "percentual") return <div className="config-exemplo"><span className="rotulo">Exemplo</span><p>Modelo percentual: o motoboy recebe {String(cfg.repasse_motoboy_pct)}% do valor cobrado do cliente.</p></div>;
  return (
    <div className="config-exemplo">
      <span className="rotulo">Exemplo</span>
      <p>Rota com <strong>1 coleta</strong> e <strong>5 entregas</strong> a 3, 9, 12, 15 e 22 km:</p>
      <p className="config-exemplo-conta">
        {fixo ? <>{m(fixo)} + </> : null}{ref.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km × {m(vkm)} + 4 × {m(vext)} = <strong className="texto-grad">{m(total)}</strong>
      </p>
    </div>
  );
}

function ExemploAcrescimo({ cfg }: { cfg: Record<string, ValorParametro> }) {
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
