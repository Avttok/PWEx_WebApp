"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bike, Check, Copy, Eye, EyeOff, KeyRound, RefreshCw, ShieldCheck, UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const ERROS: Record<string, string> = {
  servidor_sem_chave: "Falta configurar a chave secreta do Supabase na Vercel (variável SUPABASE_SECRET_KEY). Depois de adicionar, faça um novo deploy.",
  apenas_gestor: "Só gestores podem criar contas.",
  email_invalido: "E-mail inválido.",
  nome_invalido: "O nome precisa ter entre 2 e 60 letras.",
  senha_curta: "A senha precisa ter pelo menos 8 caracteres.",
  sem_papel: "Marque pelo menos um papel (motoboy ou gestor).",
  percentual_invalido: "O repasse precisa ficar entre 0 e 100%.",
  email_existe: "Já existe uma conta com esse e-mail.",
};

/** Chama as rotas do servidor com o token da sessão do gestor. */
async function chamar(rota: string, corpo: unknown): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const { data } = await supabase().auth.getSession();
  try {
    const r = await fetch(rota, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, id: j.id } : { ok: false, erro: ERROS[j.erro] ?? j.detalhe ?? j.erro ?? `Erro ${r.status}` };
  } catch {
    return { ok: false, erro: "Sem conexão com o servidor." };
  }
}

/** Senha fácil de ditar: sem letras parecidas (l/1, O/0). */
function gerarSenha() {
  const letras = "abcdefghjkmnpqrstuvwxyz", numeros = "23456789";
  const pega = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const parte = () => Array.from({ length: 4 }, () => pega(letras)).join("");
  return `${parte()}-${parte()}-${Array.from({ length: 2 }, () => pega(numeros)).join("")}`;
}

function CampoSenha({ valor, onMudar }: { valor: string; onMudar: (s: string) => void }) {
  const [ver, setVer] = useState(true);
  return (
    <div className="campo-senha">
      <input type={ver ? "text" : "password"} value={valor} onChange={(e) => onMudar(e.target.value)} autoComplete="new-password" spellCheck={false} />
      <button type="button" className="botao-icone" onClick={() => setVer((v) => !v)} aria-label={ver ? "Esconder senha" : "Mostrar senha"}>
        {ver ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <button type="button" className="botao-icone" onClick={() => onMudar(gerarSenha())} title="Gerar outra senha" aria-label="Gerar senha"><RefreshCw size={16} /></button>
    </div>
  );
}

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="botao-texto" onClick={async () => { await navigator.clipboard.writeText(texto).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1800); }}>
      {ok ? <><Check size={15} aria-hidden /> Copiado</> : <><Copy size={15} aria-hidden /> Copiar acesso</>}
    </button>
  );
}

function Janela({ titulo, onFechar, travado, children }: { titulo: string; onFechar: () => void; travado: boolean; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !travado && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [travado, onFechar]);
  return createPortal(
    <div className="modal-fundo" onPointerDown={(e) => e.target === e.currentTarget && !travado && onFechar()}>
      <div className="modal vidro entrar" role="dialog" aria-modal="true" aria-label={titulo}>
        <button className="botao-icone modal-fechar" onClick={onFechar} disabled={travado} aria-label="Fechar"><X size={17} /></button>
        <h2 className="display">{titulo}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ------------------------------------------------------------------ nova conta

export function NovaConta({ padraoRepasse, onFechar, onCriada }: { padraoRepasse: number; onFechar: () => void; onCriada: (id: string) => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState(gerarSenha);
  const [motoboy, setMotoboy] = useState(true);
  const [gestor, setGestor] = useState(false);
  const [repasse, setRepasse] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criada, setCriada] = useState<{ id: string } | null>(null);

  async function criar() {
    setErro(null);
    setEnviando(true);
    const r = await chamar("/api/equipe/criar", {
      nome, email, senha, papeis: [motoboy && "motoboy", gestor && "gestor"].filter(Boolean),
      repasse: repasse.trim() === "" ? null : Number(repasse.replace(",", ".")),
    });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro ?? "Não foi possível criar.");
    setCriada({ id: r.id! });
  }

  const acesso = `PW Express\nE-mail: ${email.trim().toLowerCase()}\nSenha: ${senha}`;

  if (criada) {
    return (
      <Janela titulo="Conta criada" onFechar={() => onCriada(criada.id)} travado={false}>
        <p className="dica" style={{ margin: "4px 0 16px" }}>Passe estes dados para {nome.trim().split(" ")[0]}. A senha não aparece de novo.</p>
        <pre className="acesso-criado">{acesso}</pre>
        <div className="linha-botoes" style={{ marginTop: 16 }}>
          <Copiar texto={acesso} />
          <button className="botao-ouro" onClick={() => onCriada(criada.id)}>Pronto</button>
        </div>
      </Janela>
    );
  }

  return (
    <Janela titulo="Nova conta" onFechar={onFechar} travado={enviando}>
      <p className="dica" style={{ margin: "4px 0 16px" }}>A conta já nasce confirmada e pode entrar no app ou no painel na hora.</p>
      <div className="formulario-modal">
        <label className="campo"><span>Nome</span><input value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} autoFocus /></label>
        <label className="campo"><span>E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></label>
        <label className="campo"><span>Senha inicial</span><CampoSenha valor={senha} onMudar={setSenha} /></label>
        <span className="rotulo">Papéis</span>
        <label className="opcao"><span><Bike size={14} style={{ verticalAlign: -2 }} /> Motoboy (usa o app e recebe corridas)</span><input type="checkbox" checked={motoboy} onChange={(e) => setMotoboy(e.target.checked)} /></label>
        <label className="opcao"><span><ShieldCheck size={14} style={{ verticalAlign: -2 }} /> Gestor (acessa este painel)</span><input type="checkbox" checked={gestor} onChange={(e) => setGestor(e.target.checked)} /></label>
        {motoboy && (
          <label className="campo curto"><span>Repasse individual (%)</span>
            <input inputMode="decimal" placeholder={`padrão: ${padraoRepasse}%`} value={repasse} onChange={(e) => setRepasse(e.target.value)} />
          </label>
        )}
      </div>
      {erro && <p className="erro">{erro}</p>}
      <div className="linha-botoes" style={{ marginTop: 18 }}>
        <button className="botao-texto" onClick={onFechar} disabled={enviando}>Cancelar</button>
        <button className="botao-ouro" onClick={criar} disabled={enviando}><UserPlus size={16} aria-hidden /> {enviando ? "Criando…" : "Criar conta"}</button>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------ redefinir senha

export function RedefinirSenha({ id, nome, email }: { id: string; nome: string; email: string }) {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState(gerarSenha);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);

  async function salvar() {
    setErro(null);
    setEnviando(true);
    const r = await chamar("/api/equipe/senha", { id, senha });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro ?? "Não foi possível trocar a senha.");
    setFeito(true);
  }
  const fechar = () => { setAberto(false); setFeito(false); setErro(null); setSenha(gerarSenha()); };
  const acesso = `PW Express\nE-mail: ${email}\nSenha: ${senha}`;

  return (
    <>
      <button type="button" className="botao-texto" onClick={() => setAberto(true)}><KeyRound size={15} aria-hidden /> Definir nova senha</button>
      {aberto && (
        <Janela titulo={feito ? "Senha trocada" : "Nova senha"} onFechar={fechar} travado={enviando}>
          {feito ? (
            <>
              <p className="dica" style={{ margin: "4px 0 16px" }}>A senha antiga de {nome} parou de funcionar. Passe a nova:</p>
              <pre className="acesso-criado">{acesso}</pre>
              <div className="linha-botoes" style={{ marginTop: 16 }}><Copiar texto={acesso} /><button className="botao-ouro" onClick={fechar}>Pronto</button></div>
            </>
          ) : (
            <>
              <p className="dica" style={{ margin: "4px 0 16px" }}>Para quando {nome} esquecer a senha. Quem estiver conectado com a senha antiga continua até sair.</p>
              <label className="campo"><span>Nova senha</span><CampoSenha valor={senha} onMudar={setSenha} /></label>
              {erro && <p className="erro">{erro}</p>}
              <div className="linha-botoes" style={{ marginTop: 18 }}>
                <button className="botao-texto" onClick={fechar} disabled={enviando}>Cancelar</button>
                <button className="botao-ouro" onClick={salvar} disabled={enviando}><KeyRound size={16} aria-hidden /> {enviando ? "Salvando…" : "Trocar senha"}</button>
              </div>
            </>
          )}
        </Janela>
      )}
    </>
  );
}
