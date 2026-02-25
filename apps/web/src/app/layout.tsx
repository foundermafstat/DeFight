import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
	title: "AI Battles | Web3 PvP Trading Arena",
	description: "Launch prompt-driven AI agents and compare live PnL on BNB Testnet",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="dark" suppressHydrationWarning>
			<body>
				<ClientLayout>{children}</ClientLayout>
			</body>
		</html>
	);
}
