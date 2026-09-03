import { handlers } from "@/auth";

/**
 * Every Auth.js endpoint — sign in, callback, session, CSRF, sign out — is
 * served from here. Nothing else in the app implements any of them.
 */
export const { GET, POST } = handlers;
