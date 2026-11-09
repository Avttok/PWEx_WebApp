import { redirect } from "next/navigation";

/** A área do cliente mudou para um site próprio (repositório PWEx_WebAppCliente). */
export default function PaginaCliente() {
  const destino = process.env.NEXT_PUBLIC_SITE_CLIENTE_URL;
  if (destino) redirect(destino.replace(/\/$/, "") + "/entrar");
  return (
    <main className="tela-login">
      <div className="caixa-login vidro">
        <p className="subtitulo" style={{ textAlign: "center" }}>A área do cliente agora tem um site próprio. Peça o endereço à PW Express.</p>
      </div>
    </main>
  );
}
