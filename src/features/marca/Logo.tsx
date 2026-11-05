export function Logo({ grande = false }: { grande?: boolean }) {
  return (
    <span className={`logo ${grande ? "grande" : ""}`}>
      <span className="logo-pw">PW</span>
      <span className="logo-express">EXPRESS</span>
    </span>
  );
}
