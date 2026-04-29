import type { NextRequest } from "next/server";
import { createAuthenticatedHandler, successResponse, errorResponse } from "@/lib/api/handler";
import type { AuthenticatedApiContext } from "@/lib/api/handler";
import { validatePassword } from "@/lib/utils/validation";

type ChangePasswordBody = {
	currentPassword?: string;
	newPassword?: string;
};

export const PATCH = createAuthenticatedHandler(
	async (ctx: AuthenticatedApiContext, body: ChangePasswordBody) => {
		const { currentPassword, newPassword } = body;
		const { user, correlationId } = ctx;

		if (!currentPassword || !newPassword) {
			return errorResponse("Current password and new password are required", 400, { correlationId });
		}

		if (!user.email) {
			return errorResponse("Authenticated user email is unavailable", 400, { correlationId });
		}

		const validation = validatePassword(newPassword);
		if (!validation.isValid) {
			return errorResponse(validation.errors[0] || "Password does not meet requirements", 400, { correlationId });
		}

		if (currentPassword === newPassword) {
			return errorResponse("New password must be different from current password", 400, { correlationId });
		}

		const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
		if (!apiKey) {
			return errorResponse("Server configuration error", 500, { correlationId });
		}

		try {
			const verifyRes = await fetch(
				`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: user.email,
						password: currentPassword,
						returnSecureToken: true,
					}),
				}
			);

			const verifyData = await verifyRes.json().catch(() => ({}));
			if (!verifyRes.ok || !verifyData?.idToken) {
				const code = String(verifyData?.error?.message || "");
				if (code.includes("INVALID_PASSWORD") || code.includes("INVALID_LOGIN_CREDENTIALS")) {
					return errorResponse("Current password is incorrect", 401, { correlationId, code: "INVALID_PASSWORD" });
				}
				return errorResponse("Failed to verify current password", 401, { correlationId });
			}

			const updateRes = await fetch(
				`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						idToken: verifyData.idToken,
						password: newPassword,
						returnSecureToken: false,
					}),
				}
			);

			const updateData = await updateRes.json().catch(() => ({}));
			if (!updateRes.ok) {
				const code = String(updateData?.error?.message || "");
				if (code.includes("WEAK_PASSWORD")) {
					return errorResponse("Password does not meet requirements", 400, { correlationId, code: "WEAK_PASSWORD" });
				}
				return errorResponse("Failed to update password", 500, { correlationId });
			}

			return successResponse({ ok: true }, 200, correlationId);
		} catch (error) {
			console.error("auth/password PATCH error", { correlationId, error });
			return errorResponse("Failed to update password", 500, { correlationId });
		}
	},
	{
		rateLimit: { identifier: "auth_change_password", maxRequests: 10 },
	}
);

export async function POST(request: NextRequest) {
	return PATCH(request);
}
