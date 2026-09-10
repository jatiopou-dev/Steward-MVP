/**
 * Supabase environment configuration.
 *
 * The client constructors throw an opaque error when handed an empty URL or
 * key, and because every dashboard page builds a client, one missing variable
 * takes the whole dashboard down at once with an error that names neither the
 * variable nor the cause. Read the values through here so a misconfigured
 * deployment says which variable is missing.
 */

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** The subset of the environment Supabase needs. */
export interface SupabaseEnvSource {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export class MissingSupabaseEnvError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Supabase is not configured: ${missing.join(' and ')} ` +
        `${missing.length === 1 ? 'is' : 'are'} missing. ` +
        `Set ${missing.length === 1 ? 'it' : 'them'} in the environment for this deployment.`
    );
    this.name = 'MissingSupabaseEnvError';
    this.missing = missing;
  }
}

/** Which of the required variables are absent or blank. */
export function missingSupabaseEnv(env: SupabaseEnvSource): string[] {
  const missing: string[] = [];
  if (!env.NEXT_PUBLIC_SUPABASE_URL?.trim()) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return missing;
}

export function isSupabaseConfigured(env: SupabaseEnvSource): boolean {
  return missingSupabaseEnv(env).length === 0;
}

/** Read the configuration, naming what is missing rather than failing opaquely. */
export function requireSupabaseEnv(
  env: SupabaseEnvSource = process.env as SupabaseEnvSource
): SupabaseEnv {
  const missing = missingSupabaseEnv(env);
  if (missing.length > 0) throw new MissingSupabaseEnvError(missing);
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL as string,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  };
}
