import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "TFT-Tactician · 国服战术台", description: "本地计算、阶段记录与阵容转型助手" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
