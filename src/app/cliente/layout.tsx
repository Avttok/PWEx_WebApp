import { AreaCliente } from "@/features/cliente/AreaCliente";

export const metadata = { title: "PW Express · Cliente" };

export default function LayoutCliente({ children }: { children: React.ReactNode }) {
  return <AreaCliente>{children}</AreaCliente>;
}
