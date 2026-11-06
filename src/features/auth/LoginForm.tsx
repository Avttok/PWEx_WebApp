"use client";

import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "@/features/marca/Logo";
import { BotaoTema } from "@/features/tema/BotaoTema";

export function LoginForm({ titulo }: { titulo: string }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) setErro(error.status === 400 ? "E-mail ou senha incorretos." : error.message);
    setCarregando(false);
  }

  return (
    <main className="tela-login">
      <div style={{ position: "fixed", top: 16, right: 16 }}><BotaoTema /></div>
      <form className="caixa-login vidro entrar" onSubmit={entrar}>
        <Logo grande />
        <p className="subtitulo">{titulo}</p>
        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button className="botao-ouro" disabled={carregando}>
          <LogIn size={18} aria-hidden /> {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
