'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  acceptMatchSchema,
  getMatchSuggestionsSchema,
  rejectMatchSchema,
  undoMatchSchema,
  type AcceptMatchInput,
  type GetMatchSuggestionsInput,
  type RejectMatchInput,
  type UndoMatchInput,
} from '@/lib/validation/v2';
import type { ActionResult, BankLine, MatchDecision, MemberRole } from '@/lib/types/v2';
import { rankCandidates, type BankLineCandidates, type RankDonation } from '@/lib/reconciliation/candidates';
import { dropRejected, suggestionWindow, type DecidedPair } from '@/lib/reconciliation/decisions';
import { createAuditLog } from './audit';

const MATCH_WRITE_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager'];
// Keeps `.in()` filters well inside URL length limits.
const ID_CHUNK = 100;

async function requireRole(orgId: string, roles: MemberRole[]): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('memberships')
    .select('role')
    .eq('organisation_id', orgId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!data) return null;
  return (roles as string[]).includes(data.role) ? user.id : null;
}

function chunks<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += ID_CHUNK) out.push(items.slice(i, i + ID_CHUNK));
  return out;
}

export interface MatchSuggestions {
  bank_lines: BankLine[];
  suggestions: BankLineCandidates[];
}

/**
 * Top-3 donation candidates for each unmatched bank line dated in the month.
 * Donations with an active accepted match and pairs with an active rejection
 * are left out.
 */
export async function getMatchSuggestions(
  input: GetMatchSuggestionsInput
): Promise<ActionResult<MatchSuggestions>> {
  const parsed = getMatchSuggestionsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, year, month, bank_account_id } = parsed.data;

  const actorId = await requireRole(organisation_id, MATCH_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const supabase = await createClient();
  const window = suggestionWindow(year, month);

  let linesQuery = supabase
    .from('bank_lines')
    .select('*')
    .eq('organisation_id', organisation_id)
    .eq('status', 'unmatched')
    .gte('transaction_date', window.linesFrom)
    .lte('transaction_date', window.linesTo)
    .order('transaction_date');
  if (bank_account_id) linesQuery = linesQuery.eq('bank_account_id', bank_account_id);

  const { data: lines, error: linesError } = await linesQuery;
  if (linesError) return { error: linesError.message };
  const bankLines = (lines ?? []) as BankLine[];
  if (bankLines.length === 0) return { data: { bank_lines: [], suggestions: [] } };

  const { data: donations, error: donationsError } = await supabase
    .from('donations')
    .select('id, transaction_date, amount_pence, source_reference')
    .eq('organisation_id', organisation_id)
    .gte('transaction_date', window.donationsFrom)
    .lte('transaction_date', window.donationsTo);
  if (donationsError) return { error: donationsError.message };
  const donationList = (donations ?? []) as RankDonation[];

  const matched = new Set<string>();
  for (const ids of chunks(donationList.map((d) => d.id))) {
    const { data, error } = await supabase
      .from('match_decisions')
      .select('donation_id')
      .eq('decision', 'accepted')
      .is('undone_at', null)
      .in('donation_id', ids);
    if (error) return { error: error.message };
    for (const row of data ?? []) matched.add(row.donation_id);
  }

  const rejected: DecidedPair[] = [];
  for (const ids of chunks(bankLines.map((l) => l.id))) {
    const { data, error } = await supabase
      .from('match_decisions')
      .select('bank_line_id, donation_id')
      .eq('decision', 'rejected')
      .is('undone_at', null)
      .in('bank_line_id', ids);
    if (error) return { error: error.message };
    rejected.push(...((data ?? []) as DecidedPair[]));
  }

  const ranked = rankCandidates(
    bankLines,
    donationList.filter((d) => !matched.has(d.id)),
    { topN: Number.POSITIVE_INFINITY }
  );

  return { data: { bank_lines: bankLines, suggestions: dropRejected(ranked, rejected) } };
}

export async function acceptMatch(
  input: AcceptMatchInput
): Promise<ActionResult<MatchDecision[]>> {
  const parsed = acceptMatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, donation_id, bank_line_ids, confidence, reasons } = parsed.data;

  const actorId = await requireRole(organisation_id, MATCH_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('accept_bank_match', {
    p_organisation_id: organisation_id,
    p_donation_id: donation_id,
    p_bank_line_ids: bank_line_ids,
    p_actor_id: actorId,
    p_confidence: confidence ?? null,
    p_reasons: reasons ?? [],
  });
  if (error || !data) return { error: error?.message ?? 'Failed to accept match' };

  const decisions = data as MatchDecision[];
  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'reconciliation.match_accepted',
    entity_type: 'match_decision',
    entity_id: decisions[0]?.id,
    new_data: { donation_id, bank_line_ids, confidence: confidence ?? null, reasons: reasons ?? [] },
  });

  return { data: decisions };
}

export async function rejectMatch(
  input: RejectMatchInput
): Promise<ActionResult<MatchDecision>> {
  const parsed = rejectMatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, bank_line_id, donation_id, confidence, reasons } = parsed.data;

  const actorId = await requireRole(organisation_id, MATCH_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('reject_bank_match', {
    p_organisation_id: organisation_id,
    p_bank_line_id: bank_line_id,
    p_donation_id: donation_id,
    p_actor_id: actorId,
    p_confidence: confidence ?? null,
    p_reasons: reasons ?? [],
  });
  if (error || !data) return { error: error?.message ?? 'Failed to reject match' };

  const decision = data as MatchDecision;
  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'reconciliation.match_rejected',
    entity_type: 'match_decision',
    entity_id: decision.id,
    new_data: { donation_id, bank_line_id, confidence: confidence ?? null, reasons: reasons ?? [] },
  });

  return { data: decision };
}

export async function undoMatch(
  input: UndoMatchInput
): Promise<ActionResult<MatchDecision[]>> {
  const parsed = undoMatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, decision_id } = parsed.data;

  const actorId = await requireRole(organisation_id, MATCH_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('undo_match_decision', {
    p_organisation_id: organisation_id,
    p_decision_id: decision_id,
    p_actor_id: actorId,
  });
  if (error || !data) return { error: error?.message ?? 'Failed to undo match decision' };

  const undone = data as MatchDecision[];
  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'reconciliation.match_undone',
    entity_type: 'match_decision',
    entity_id: decision_id,
    previous_data: {
      decisions: undone.map((d) => ({ id: d.id, decision: d.decision, bank_line_id: d.bank_line_id, donation_id: d.donation_id })),
    },
  });

  return { data: undone };
}
