"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bike, FlaskConical, History, Lock, PencilLine, Save, ShieldCheck, UserPlus, Users } from "lucide-react";
import { RegistroMembro } from "./RegistroMembro";
import { BloquearConta, ExcluirConta, NovaConta, RedefinirSenha } from "./ContasEquipe";
import { useSessaoGestor } from "@/features/gestor/AreaGestor";
import { useConta } from "@/features/conta/conta";
import { SelosCargo } from "@/features/conta/Cargos";
import { toast } from "@/features/ui/toast";
import { CodeXml } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { useConfiguracoes } from "@/features/configuracoes/useConfiguracoes";
import { COR_STATUS, ROTULO_STATUS, type StatusMotoboy } from "@/features/rastreamento/tipos";

interface Membro {
  id: string; email: string; nome: string; foto_url: string | null; papeis: string[];
  status: StatusMotoboy | null; modo_teste: boolean; repasse_pct: number | null;
  bloqueado?: boolean; ultimo_acesso?: string | null;
}

export function PainelEquipe() {
  const cfg = useConfiguracoes();
  const eu = useSessaoGestor()?.user.id;
  const [lista, setLista] = useState<Membro[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [gestor, setGestor] = useState(false);
  const [motoboy, setMotoboy] = useState(false);
  const [devPapel, setDevPapel] = useState(false);
  const conta = useConta();
  const [repasse, setRepasse] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [aba, setAba] = useState<"registro" | "editar">("registro");
  const [criando, setCriando] = useState(false);
  const detalhe = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    const { data } = await supabase().rpc("listar_equipe");
    if (data) setLista(data as Membro[]);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const m = lista.find((x) => x.id === sel);
  useEffect(() => {
    if (!m) return;
    setNome(m.nome); setGestor(m.papeis.includes("gestor")); setMotoboy(m.papeis.includes("motoboy")); setDevPapel(m.papeis.includes("dev"));
    setRepasse(m.repasse_pct != null ? String(m.repasse_pct) : ""); setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  async function salvar() {
    if (!m) return;
    const papeis = [devPapel && "dev", gestor && "gestor", motoboy && "motoboy"].filter(Boolean);
    const { error } = await supabase().rpc("editar_membro", {
      p_usuario: m.id, p_nome: nome, p_papeis: papeis, p_repasse: repasse.trim() === "" ? null : Number(repasse.replace(",", ".")),
    });
    if (error) return setMsg({ ok: false, t: error.message === "nao_remova_seu_proprio_acesso" ? "Você não pode tirar seu próprio acesso." : error.message === "percentual_invalido" ? "Repasse deve ficar entre 0 e 100%."
      : error.message === "conta_protegida" ? "Contas Dev só o Dev altera." : error.message === "apenas_dev" ? "Só o Dev dá ou tira o cargo Dev." : error.message });
    setMsg(null);
    toast(`${nome || m.email} atualizado.`, "ok", { titulo: "Salvo" });
    carregar();
  }

  return (
    <>
      <aside className="lateral entrar">
        <CabecaPagina icone={Users} titulo="Equipe" subtitulo={lista.length === 1 ? "1 pessoa" : `${lista.length} pessoas`} />
        {conta.modulo("criar_contas") && <button className="botao-ouro" onClick={() => setCriando(true)}><UserPlus size={17} aria-hidden /> Nova conta</button>}
        {criando && (
          <NovaConta padraoRepasse={Number(cfg.repasse_motoboy_pct)} onFechar={() => setCriando(false)}
            onCriada={async (id) => { setCriando(false); await carregar(); setSel(id); setAba("editar"); }} />
        )}
        {lista.map((x) => (
          <button key={x.id} className={`cartao-motoboy ${sel === x.id ? "selecionado" : ""}`} onClick={() => {
            setSel(x.id);
            // no celular o detalhe fica embaixo da lista: leva até ele
            if (window.matchMedia("(max-width: 860px)").matches) setTimeout(() => detalhe.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
          }}>
            <div className="linha">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.foto_url ? <img src={x.foto_url} alt="" className="foto-mini" style={{ borderColor: "var(--ouro)" }} />
                : <span className="avatar grad" style={{ width: 26, height: 26, fontSize: 11 }}>{(x.nome || x.email).charAt(0).toUpperCase()}</span>}
              <strong>{x.nome || x.email}</strong>
            </div>
            <div className="selos">
              <SelosCargo papeis={x.papeis} teste={x.modo_teste} />
              {x.bloqueado && <span className="selo" style={{ color: "var(--vermelho)" }}><Lock size={11} /> Bloqueado</span>}
            </div>
            <div className="detalhes">
              <span>{x.email}</span>
              {x.status && <span style={{ color: COR_STATUS[x.status] }}>{ROTULO_STATUS[x.status]}</span>}
              {x.repasse_pct != null && <span>repasse {Number(x.repasse_pct)}%</span>}
            </div>
          </button>
        ))}
      </aside>
      <main className="conteudo">
        <div className="formulario vidro entrar" ref={detalhe} style={{ maxWidth: 860 }}>
          {!m ? <p className="vazio">Selecione uma pessoa para ver o registro e editar.</p> : (
            <>
              <div className="membro-cabeca">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.foto_url ? <img src={m.foto_url} alt="" className="avatar avatar-foto membro-avatar" />
                  : <span className="avatar grad membro-avatar">{(m.nome || m.email).charAt(0).toUpperCase()}</span>}
                <div style={{ minWidth: 0 }}>
                  <h2 className="display">{m.nome || m.email}</h2>
                  <p className="dica" style={{ margin: "2px 0 6px" }}>{m.email}</p>
                  <div className="selos">
                    <SelosCargo papeis={m.papeis} teste={m.modo_teste} />
                    {m.bloqueado && <span className="selo" style={{ color: "var(--vermelho)" }}><Lock size={11} /> Bloqueado</span>}
                    {m.status && <span className="selo" style={{ color: COR_STATUS[m.status] }}>{ROTULO_STATUS[m.status]}</span>}
                  </div>
                </div>
              </div>

              <div className="segmentado" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <button type="button" className={aba === "registro" ? "ativo" : ""} onClick={() => setAba("registro")}><History size={15} aria-hidden /> Registro</button>
                <button type="button" className={aba === "editar" ? "ativo" : ""} onClick={() => setAba("editar")}><PencilLine size={15} aria-hidden /> Editar</button>
              </div>

              {aba === "registro" ? <RegistroMembro key={m.id} id={m.id} /> : (m.papeis.includes("dev") && !conta.dev) ? (
                <p className="dica" style={{ margin: 0 }}><CodeXml size={14} style={{ verticalAlign: -2 }} /> Conta Dev: só o Dev altera esta conta.</p>
              ) : (
                <>
                  <label className="campo"><span>Nome de exibição</span><input value={nome} onChange={(e) => setNome(e.target.value)} /></label>
                  <span className="rotulo">Papéis</span>
                  {conta.dev && <label className="opcao"><span><CodeXml size={14} style={{ verticalAlign: -2 }} /> Dev (administra o sistema inteiro)</span><input type="checkbox" checked={devPapel} onChange={(e) => setDevPapel(e.target.checked)} /></label>}
                  <label className="opcao"><span><ShieldCheck size={14} style={{ verticalAlign: -2 }} /> Gestor (acessa este painel)</span><input type="checkbox" checked={gestor} onChange={(e) => setGestor(e.target.checked)} /></label>
                  <label className="opcao"><span><Bike size={14} style={{ verticalAlign: -2 }} /> Motoboy (usa o app e recebe corridas)</span><input type="checkbox" checked={motoboy} onChange={(e) => setMotoboy(e.target.checked)} /></label>
                  {gestor && motoboy && <p className="dica">Gestor + motoboy tem as ferramentas de administrador e o modo teste no app.</p>}
                  {motoboy && (
                    <label className="campo curto"><span>Repasse individual (%)</span>
                      <input inputMode="decimal" placeholder={`padrão: ${cfg.repasse_motoboy_pct}%`} value={repasse} onChange={(e) => setRepasse(e.target.value)} />
                      <span className="dica">Vazio = usa o padrão das Configurações. Vale para corridas aceitas daqui em diante.</span>
                    </label>
                  )}
                  {msg && <p className={msg.ok ? "sucesso" : "erro"}>{msg.t}</p>}
                  <div className="linha-botoes">
                    <RedefinirSenha id={m.id} nome={m.nome || m.email} email={m.email} />
                    <button className="botao-ouro" onClick={salvar}><Save size={16} /> Salvar</button>
                  </div>
                  {m.ultimo_acesso && <p className="dica" style={{ margin: 0 }}>Último acesso: {new Date(m.ultimo_acesso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>}
                  {m.id !== eu ? (
                    <section className="zona-perigo">
                      <span className="rotulo">Zona de perigo</span>
                      <BloquearConta id={m.id} nome={m.nome || m.email} bloqueado={Boolean(m.bloqueado)} onFeito={carregar} />
                      <ExcluirConta id={m.id} nome={m.nome || m.email} email={m.email} onExcluida={async () => { setSel(null); await carregar(); }} />
                    </section>
                  ) : <p className="dica" style={{ margin: 0 }}>Esta é a sua conta: para trocar nome e foto, use o menu da sua foto no topo.</p>}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
