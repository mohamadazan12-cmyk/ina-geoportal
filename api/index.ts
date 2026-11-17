/**
 * Vercel Serverless Function entry point.
 *
 * Vercel routes every request matching `/api/*` to this function.
 * The Express application itself lives in `server/src/app.ts` and is
 * import-side-effect free (no `.listen()`), which is what makes it safe
 * to load inside a serverless container.
 *
 * `vercel.json` rewrites `/api/(.*)` → `/api` (this file) so that Express
 * sees the original URL path (`/api/v1/...`) and its own router still works.
 */
import { app } from '../server/src/app';
import { resolveJwtSecret } from '../server/src/config';

// Fail fast on cold start if the deployment is missing a strong signing key.
// Vercel surfaces the thrown error in the function logs rather than silently
// issuing tokens signed with a predictable default.
resolveJwtSecret();

export default app;
