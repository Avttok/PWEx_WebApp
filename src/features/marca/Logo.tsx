/* eslint-disable @next/next/no-img-element */

/** Logo oficial (selo dourado) + nome. Na versão grande, só o selo (ele já traz o nome). */
export function Logo({ grande = false }: { grande?: boolean }) {
  if (grande) {
    return (
      <span className="logo grande">
        <img src="/marca/logo-512.png" alt="PW Express · Agilidade e segurança" className="logo-imagem" width={168} height={168} />
      </span>
    );
  }
  return (
    <span className="logo">
      <img src="/marca/logo-192.png" alt="" className="logo-imagem" width={40} height={40} />
      <span className="logo-texto">
        <span className="logo-pw texto-grad">PW</span>
        <span className="logo-express">Express</span>
      </span>
    </span>
  );
}
