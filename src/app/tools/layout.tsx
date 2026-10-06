import type { ReactNode } from "react";
import { requireRepToolsAccess } from "@/lib/rep-tools/access";

export default async function ToolsLayout({ children }: { children: ReactNode }) {
  await requireRepToolsAccess();
  return children;
}
