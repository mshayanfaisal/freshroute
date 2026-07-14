/**
 * Base URL of the backend.
 * - Dev: empty string → requests hit "/api" and "/ws", proxied by Vite to :3000.
 * - Prod: set VITE_API_URL to the deployed backend origin, e.g.
 *   https://freshroute-api.onrender.com  (no trailing slash, no /api suffix).
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
