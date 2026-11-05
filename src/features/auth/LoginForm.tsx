"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "@/features/marca/Logo";

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
      <form className="caixa-login" onSubmit={entrar}>
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
        <button className="botao-ouro" disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
