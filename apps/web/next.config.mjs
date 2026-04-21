import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
 * Workspace-level .env.local loader.
 *
 * Next.js only reads .env.local from its project directory (apps/web/).
 * Our monorepo keeps a single source of truth at workspace root so
 * AIOX agents, Vitest, Supabase CLI all share the same env.
 *
 * This loader runs at config evaluation time (Node.js startup before
 * Next serves any request) so all process.env reads downstream see
 * the workspace-root values.
 *
 * Precedence: apps/web/.env.local (if exists) > workspace root > Vercel env.
 * In Vercel production build, neither .env.local file exists — vars come
 * from Vercel Dashboard (already configured in Story 1.1).
 */
const rootEnvPath = path.resolve(process.cwd(), '../../.env.local');
try {
  const content = readFileSync(rootEnvPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && match[1] && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] ?? '').trim();
    }
  }
} catch {
  // No root .env.local — OK, falls back to apps/web/.env.local or Vercel env
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile workspace packages
  transpilePackages: ['@softhair/db'],
};

export default nextConfig;
