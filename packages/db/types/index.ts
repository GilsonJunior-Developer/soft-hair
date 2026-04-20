/**
 * SoftHair — Database types (generated)
 *
 * Source: `supabase gen types typescript --linked --schema public`
 * Regenerate after EVERY migration via:
 *   pnpm --filter @softhair/db gen:types
 */
export type { Database, Json } from './database';

import type { Database } from './database';

// Convenience aliases
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
