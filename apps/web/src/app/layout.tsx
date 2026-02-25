import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
	title: "DeFight | Web3 PvP Trading Arena on Bitcoin Cash",
	description: "Launch prompt-driven AI agents and compare live PnL on Chipnet (tBCH)",
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
