import { toast as notify } from "@/hooks/use-toast";

type WalletErrorLike = {
	code?: string | number;
	reason?: string;
	message?: string;
	info?: {
		error?: {
			code?: string | number;
			message?: string;
		};
	};
};

export function isUserRejectedWalletAction(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}

	const e = error as WalletErrorLike;
	const code = e.code;
	const nestedCode = e.info?.error?.code;
	const rawMessage = `${e.reason || ""} ${e.message || ""} ${e.info?.error?.message || ""}`.toLowerCase();

	return (
		code === "ACTION_REJECTED"
		|| code === 4001
		|| nestedCode === 4001
		|| rawMessage.includes("user rejected")
		|| rawMessage.includes("user denied")
		|| rawMessage.includes("ethers-user-denied")
	);
}

export function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	if (typeof error === "string" && error.trim()) {
		return error;
	}
	return fallback;
}

export async function runSafeAction(
	action: () => Promise<void>,
	options?: {
		fallbackMessage?: string;
		rejectedMessage?: string;
	},
): Promise<void> {
	try {
		await action();
	} catch (error) {
		if (isUserRejectedWalletAction(error)) {
			notify({
				title: "Info",
				description: options?.rejectedMessage || "Wallet action cancelled by user.",
				variant: "default",
				duration: 5000,
			});
			return;
		}

		notify({
			title: "Error",
			description: getErrorMessage(error, options?.fallbackMessage || "Operation failed"),
			variant: "destructive",
			duration: 5000,
		});
	}
}
