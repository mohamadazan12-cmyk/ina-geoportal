"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Vercel Serverless Function — catch-all API entry point.
 *
 * Vercel's filesystem routing maps `/api/*` to this file, so the function
 * receives the ORIGINAL request path (`/api/v1/datasets?page=1`). No rewrite
 * is required for API traffic, which avoids any ambiguity about whether a
 * rewrite preserves or replaces the pathname.
 *
 * `api/index.ts` handles the exact `/api` path; this file handles everything
 * nested beneath it. Both import the same side-effect-free Express app.
 */
const app_1 = require("../server/src/app");
const config_1 = require("../server/src/config");
// Fail fast on cold start if the deployment is missing a strong signing key.
(0, config_1.resolveJwtSecret)();
exports.default = app_1.app;
