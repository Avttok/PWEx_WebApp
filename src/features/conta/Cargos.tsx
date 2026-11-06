import { Bike, CodeXml, FlaskConical, ShieldCheck, UserRound } from "lucide-react";
import type { Papel } from "./conta";

/** Ícone e cor de cada cargo (mesmos do app). */
export const CARGO: Record<Papel, { rotulo: string; icone: typeof Bike; cor: string }> = {
  dev: { rotulo: "Dev", icone: CodeXml, cor: "var(--cor-dev)" },
  gestor: { rotulo: "Gestor", icone: ShieldCheck, cor: "var(--ouro)" },
  motoboy: { rotulo: "Motoboy", icone: Bike, cor: "var(--texto-2)" },
  cliente: { rotulo: "Cliente", icone: UserRound, cor: "var(--texto-2)" },
};
export const ORDEM_CARGOS: Papel[] = ["dev", "gestor", "motoboy", "cliente"];

/** Fichas dos cargos de alguém (Dev, Gestor, Motoboy) + modo teste. */
export function SelosCargo({ papeis, teste = false }: { papeis: string[]; teste?: boolean }) {
  return (
    <span className="selos-cargo">
      {ORDEM_CARGOS.filter((p) => papeis.includes(p)).map((p) => {
        const { rotulo, icone: Icone, cor } = CARGO[p];
        return <span key={p} className={`selo selo-cargo cargo-${p}`} style={{ color: cor }}><Icone size={11} aria-hidden /> {rotulo}</span>;
      })}
      {teste && <span className="selo selo-cargo" style={{ color: "#a78bfa" }}><FlaskConical size={11} aria-hidden /> Teste</span>}
    </span>
  );
}
