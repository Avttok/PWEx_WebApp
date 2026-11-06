"use client";

import { useCallback, useEffect, useState } from "react";
import { Bike, FlaskConical, Info, Save, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { useConfiguracoes } from "@/features/configuracoes/useConfiguracoes";
import { COR_STATUS, ROTULO_STATUS, type StatusMotoboy } from "@/features/rastreamento/tipos";

interface Membro {
  id: string; email: string; nome: string; foto_url: string | null; papeis: string[];
  status: StatusMotoboy | null; modo_teste: boolean; repasse_pct: number | null;
}

export function PainelEquipe() {
  const cfg = useConfiguracoes();
  const [lista, setLista] = useState<Membro[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [gestor, setGestor] = useState(false);
  const [motoboy, setMotoboy] = useState(false);
  const [repasse, setRepasse] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const carregar = useCallback(async () => {
    const { data } = await supabase().rpc("listar_equipe");
    if (data) setLista(data as Membro[]);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const m = lista.find((x) => x.id === sel);
  useEffect(() => {
    if (!m) return;
    setNome(m.nome); setGestor(m.papeis.includes("gestor")); setMotoboy(m.papeis.includes("motoboy"));
    setRepasse(m.repasse_pct != null ? String(m.repasse_pct) : ""); setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  async function salvar() {
    if (!m) return;
    const papeis = [gestor && "gestor", motoboy && "motoboy"].filter(Boolean);
    const { error } = await supabase().rpc("editar_membro", {
      p_usuario: m.id, p_nome: nome, p_papeis: papeis, p_repasse: repasse.trim() === "" ? null : Number(repasse.replace(",", ".")),
    });
    if (error) return setMsg({ ok: false, t: error.message === "nao_remova_seu_proprio_acesso" ? "Você não pode tirar seu próprio acesso de gestor." : error.message === "percentual_invalido" ? "Repasse deve ficar entre 0 e 100%." : error.message });
    setMsg({ ok: true, t: "Salvo." });
    carregar();
  }

  return (
    <>
      <aside className="lateral entrar">
        <CabecaPagina icone={Users} titulo="Equipe" subtitulo={`${lista.length} pessoas`} />
        {lista.map((x) => (
          <button key={x.id} className={`cartao-motoboy ${sel === x.id ? "selecionado" : ""}`} onClick={() => setSel(x.id)}>
            <div className="linha">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.foto_url ? <img src={x.foto_url} alt="" className="foto-mini" style={{ borderColor: "var(--ouro)" }} />
                : <span className="avatar grad" style={{ width: 26, height: 26, fontSize: 11 }}>{(x.nome || x.email).charAt(0).toUpperCase()}</span>}
              <strong>{x.nome || x.email}</strong>
              <span className="espaco" />
              {x.papeis.includes("gestor") && <span className="selo" style={{ color: "var(--ouro)" }}><ShieldCheck size={11} /> gestor</span>}
              {x.papeis.includes("motoboy") && <span className="selo" style={{ color: "var(--texto-2)" }}><Bike size={11} /> motoboy</span>}
            </div>
            <div className="detalhes">
              <span>{x.email}</span>
              {x.status && <span style={{ color: COR_STATUS[x.status] }}>{ROTULO_STATUS[x.status]}</span>}
              {x.modo_teste && <span style={{ color: "#a78bfa" }}><FlaskConical size={11} /> teste</span>}
              {x.repasse_pct != null && <span>repasse {Number(x.repasse_pct)}%</span>}
            </div>
          </button>
        ))}
        <p className="dica" style={{ display: "flex", gap: 6 }}><Info size={14} style={{ flexShrink: 0 }} /> Para criar uma conta: Supabase → Authentication → Users → Add user (Auto Confirm). Ela aparece aqui para você definir os papéis.</p>
      </aside>
      <main className="conteudo">
        <div className="formulario vidro entrar">
          {!m ? <p className="vazio">Selecione uma pessoa.</p> : (
            <>
              <h2 className="display">{m.nome || m.email}</h2>
              <p className="dica">{m.email}</p>
              <label className="campo"><span>Nome de exibição</span><input value={nome} onChange={(e) => setNome(e.target.value)} /></label>
              <span className="rotulo">Papéis</span>
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
              <div className="linha-botoes"><button className="botao-ouro" onClick={salvar}><Save size={16} /> Salvar</button></div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
