import { describe, it, expect } from 'vitest';
import { createOrganisationSchema } from '@/lib/validation/v2';

describe('createOrganisationSchema', () => {
  it('accepts valid church input', () => {
    const result = createOrganisationSchema.safeParse({
      name: 'St Paul Church',
      type: 'church',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe('GB');
      expect(result.data.currency).toBe('GBP');
    }
  });

  it('rejects name shorter than 2 characters', () => {
    const result = createOrganisationSchema.safeParse({ name: 'A', type: 'church' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid org type', () => {
    const result = createOrganisationSchema.safeParse({ name: 'Test', type: 'corporation' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid parent_organisation_id', () => {
    const result = createOrganisationSchema.safeParse({
      name: 'Test',
      type: 'church',
      parent_organisation_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid parent_organisation_id', () => {
    const result = createOrganisationSchema.safeParse({
      name: 'Test',
      type: 'church',
      parent_organisation_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });
});
