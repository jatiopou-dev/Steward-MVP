import { describe, it, expect } from 'vitest';
import {
  missingSupabaseEnv,
  isSupabaseConfigured,
  requireSupabaseEnv,
  MissingSupabaseEnvError,
} from '@/utils/supabase/env';

const complete = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
};

describe('missingSupabaseEnv', () => {
  it('reports nothing missing when both are set', () => {
    expect(missingSupabaseEnv(complete)).toEqual([]);
  });

  it('names a missing url', () => {
    expect(missingSupabaseEnv({ ...complete, NEXT_PUBLIC_SUPABASE_URL: undefined }))
      .toEqual(['NEXT_PUBLIC_SUPABASE_URL']);
  });

  it('names a missing key', () => {
    expect(missingSupabaseEnv({ ...complete, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined }))
      .toEqual(['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
  });

  it('names both when the environment is empty', () => {
    expect(missingSupabaseEnv({})).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ]);
  });

  it('treats an empty string as missing, which is what || "" produced', () => {
    expect(missingSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }))
      .toHaveLength(2);
  });

  it('treats whitespace as missing', () => {
    expect(missingSupabaseEnv({ ...complete, NEXT_PUBLIC_SUPABASE_URL: '   ' }))
      .toEqual(['NEXT_PUBLIC_SUPABASE_URL']);
  });
});

describe('isSupabaseConfigured', () => {
  it('is true when complete', () => {
    expect(isSupabaseConfigured(complete)).toBe(true);
  });

  it('is false when anything is absent', () => {
    expect(isSupabaseConfigured({})).toBe(false);
  });
});

describe('requireSupabaseEnv', () => {
  it('returns the configuration when complete', () => {
    expect(requireSupabaseEnv(complete)).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    });
  });

  it('throws a named error rather than building a broken client', () => {
    expect(() => requireSupabaseEnv({})).toThrow(MissingSupabaseEnvError);
  });

  it('says which variable is missing', () => {
    expect(() => requireSupabaseEnv({ ...complete, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }))
      .toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('carries the missing names on the error for callers to inspect', () => {
    try {
      requireSupabaseEnv({});
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(MissingSupabaseEnvError);
      expect((e as MissingSupabaseEnvError).missing).toEqual([
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      ]);
    }
  });

  it('reads singular and plural correctly', () => {
    expect(() => requireSupabaseEnv({ ...complete, NEXT_PUBLIC_SUPABASE_URL: '' }))
      .toThrow(/is missing/);
    expect(() => requireSupabaseEnv({})).toThrow(/are missing/);
  });
});
