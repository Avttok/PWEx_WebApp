"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, FlaskConical, LogOut, Monitor, Moon, Sun, Trash2, UserRoundPen, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTema, type PreferenciaTema } from "@/features/tema/tema";
import { useModoTeste } from "@/features/teste/modoTeste";

interface Props {
  id: string;
  email: string;
  nome: string;
  foto: string | null;
  onSair: () => void;
  onPerfilSalvo: (nome: string, foto: string | null) => void;
}

const TEMAS: { valor: PreferenciaTema; rotulo: string; icone: typeof Sun }[] = [
  { valor: "sistema", rotulo: "Auto", icone: Monitor },
  { valor: "claro", rotulo: "Claro", icone: Sun },
  { valor: "escuro", rotulo: "Noturno", icone: Moon },
];

function Avatar({ nome, foto, classe = "" }: { nome: string; foto: string | null; classe?: string }) {
  return foto
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={foto} alt="" className={`avatar avatar-foto ${classe}`} />
    : <span className={`avatar grad ${classe}`}>{nome.trim().charAt(0).toUpperCase()}</span>;
}

/** Foto do usuário no topo: abre o menu com perfil, tema, modo teste e sair. */
export function MenuPerfil({ id, email, nome, foto, onSair, onPerfilSalvo }: Props) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [erroTeste, setErroTeste] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const { preferencia, definir } = useTema();
  const { teste, definir: definirTeste } = useModoTeste();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); window.removeEventListener("keydown", esc); };
  }, [aberto]);

  async function alternarTeste() {
    setErroTeste(null);
    const erro = await definirTeste(!teste);
    if (erro) setErroTeste(erro);
  }

  return (
    <div className="menu-perfil" ref={caixa}>
      <button type="button" className="botao-avatar" onClick={() => setAberto((a) => !a)} aria-haspopup="menu" aria-expanded={aberto} title={teste ? "Meu perfil · modo teste ligado" : "Meu perfil"}>
        <Avatar nome={nome} foto={foto} />
        {teste && <span className="selo-teste-avatar" aria-label="modo teste"><FlaskConical size={10} aria-hidden /></span>}
      </button>

      {aberto && (
        <div className="menu-perfil-caixa vidro" role="menu">
          <div className="menu-perfil-cabeca">
            <Avatar nome={nome} foto={foto} classe="avatar-grande" />
            <span className="menu-perfil-nome"><strong>{nome}</strong><span>{email}</span></span>
          </div>

          <button type="button" role="menuitem" className="menu-item" onClick={() => { setEditando(true); setAberto(false); }}>
            <UserRoundPen size={17} aria-hidden /> Editar perfil
          </button>

          <div className="menu-secao">
            <span className="rotulo">Tema</span>
            <div className="segmentado">
              {TEMAS.map(({ valor, rotulo, icone: Icone }) => (
                <button key={valor} type="button" className={preferencia === valor ? "ativo" : ""} onClick={() => definir(valor)} aria-pressed={preferencia === valor}>
                  <Icone size={15} aria-hidden /> {rotulo}
                </button>
              ))}
            </div>
          </div>

          <label className="menu-item menu-teste">
            <FlaskConical size={17} aria-hidden />
            <span className="menu-teste-texto"><strong>Modo teste</strong><span>{teste ? "Painel em violeta: só corridas e ganhos de teste" : "Ver e criar só corridas de teste"}</span></span>
            <input type="checkbox" role="switch" checked={teste} onChange={alternarTeste} />
          </label>
          {erroTeste && <p className="erro menu-erro">{erroTeste}</p>}

          <button type="button" role="menuitem" className="menu-item menu-sair" onClick={onSair}>
            <LogOut size={17} aria-hidden /> Sair
          </button>
        </div>
      )}

      {editando && (
        <EditarPerfil id={id} nome={nome} foto={foto} onFechar={() => setEditando(false)}
          onSalvo={(n, f) => { onPerfilSalvo(n, f); setEditando(false); }} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ editor de perfil (janela)

/** Corta no centro e reduz para 512×512 (JPEG), como faz o app. */
async function prepararFoto(arquivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(arquivo);
  const lado = Math.min(bmp.width, bmp.height);
  const tela = document.createElement("canvas");
  tela.width = tela.height = 512;
  tela.getContext("2d")!.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  return new Promise((ok, falha) => tela.toBlob((b) => (b ? ok(b) : falha(new Error("imagem"))), "image/jpeg", 0.86));
}

function EditarPerfil({ id, nome, foto, onFechar, onSalvo }: {
  id: string; nome: string; foto: string | null; onFechar: () => void; onSalvo: (nome: string, foto: string | null) => void;
}) {
  const [novoNome, setNovoNome] = useState(nome);
  const [arquivo, setArquivo] = useState<Blob | null>(null);
  const [previa, setPrevia] = useState<string | null>(foto);
  const [remover, setRemover] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const seletor = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !salvando && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [salvando, onFechar]);

  async function escolher(f: File | undefined) {
    if (!f) return;
    setErro(null);
    try {
      const b = await prepararFoto(f);
      setArquivo(b);
      setRemover(false);
      setPrevia(URL.createObjectURL(b));
    } catch {
      setErro("Não deu para ler essa imagem. Tente JPG ou PNG.");
    }
  }

  async function salvar() {
    const n = novoNome.trim();
    if (n.length < 2 || n.length > 60) return setErro("O nome precisa ter entre 2 e 60 letras.");
    setSalvando(true);
    setErro(null);
    const sb = supabase();
    let url: string | null | undefined; // undefined = não mexe
    if (arquivo) {
      const caminho = `${id}/foto-${Date.now()}.jpg`;
      const up = await sb.storage.from("avatares").upload(caminho, arquivo, { contentType: "image/jpeg", upsert: true });
      if (up.error) { setSalvando(false); return setErro(`Não foi possível enviar a foto (${up.error.message}).`); }
      url = sb.storage.from("avatares").getPublicUrl(caminho).data.publicUrl;
    } else if (remover) url = "";
    const { error } = await sb.rpc("atualizar_meu_perfil", { p_nome: n, ...(url !== undefined ? { p_foto_url: url } : {}) });
    setSalvando(false);
    if (error) return setErro(error.message.includes("nome_invalido") ? "Nome inválido." : error.message);
    onSalvo(n, url === undefined ? foto : url || null);
  }

  return createPortal(
    <div className="modal-fundo" onPointerDown={(e) => e.target === e.currentTarget && !salvando && onFechar()}>
      <div className="modal vidro entrar" role="dialog" aria-modal="true" aria-labelledby="titulo-perfil">
        <button className="botao-icone modal-fechar" onClick={onFechar} disabled={salvando} aria-label="Fechar"><X size={17} /></button>
        <h2 id="titulo-perfil" className="display">Editar perfil</h2>
        <p className="dica" style={{ margin: "4px 0 18px" }}>Nome e foto valem também no app do motoboy.</p>

        <div className="editor-foto">
          <button type="button" className="editor-foto-botao" onClick={() => seletor.current?.click()} aria-label="Trocar foto">
            {previa && !remover
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={previa} alt="" />
              : <span className="avatar grad">{(novoNome || "?").trim().charAt(0).toUpperCase()}</span>}
            <span className="editor-foto-camera"><Camera size={16} aria-hidden /></span>
          </button>
          <div className="editor-foto-acoes">
            <button type="button" className="botao-texto" onClick={() => seletor.current?.click()}><Camera size={15} aria-hidden /> Trocar foto</button>
            {(previa && !remover) && (
              <button type="button" className="botao-texto" onClick={() => { setRemover(true); setArquivo(null); }}><Trash2 size={15} aria-hidden /> Remover</button>
            )}
          </div>
          <input ref={seletor} type="file" accept="image/*" hidden onChange={(e) => escolher(e.target.files?.[0])} />
        </div>

        <label className="campo">
          <span>Nome</span>
          <input value={novoNome} maxLength={60} onChange={(e) => setNovoNome(e.target.value)} autoFocus />
        </label>

        {erro && <p className="erro">{erro}</p>}
        <div className="linha-botoes" style={{ marginTop: 18 }}>
          <button className="botao-texto" onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button className="botao-ouro" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
