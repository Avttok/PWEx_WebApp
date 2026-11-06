import { ChevronsRight } from "lucide-react";

export function Logo({ grande = false }: { grande?: boolean }) {
  return (
    <span className={`logo ${grande ? "grande" : ""}`}>
      <span className="logo-selo grad"><ChevronsRight size={grande ? 30 : 20} strokeWidth={2.6} aria-hidden /></span>
      <span className="logo-texto">
        <span className="logo-pw texto-grad">PW</span>
        <span className="logo-express">EXPRESS</span>
      </span>
    </span>
  );
}
