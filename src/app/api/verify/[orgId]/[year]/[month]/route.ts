import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { hashAnchorPayload } from '@/lib/blockchain/anchor';
import type { AnchorPayload } from '@/lib/types/v2';

// Public endpoint — no auth required.
// GET /api/verify/:orgId/:year/:month
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; year: string; month: string }> }
) {
  const { orgId, year, month } = await params;

  const yearInt = parseInt(year, 10);
  const monthInt = parseInt(month, 10);

  if (
    !orgId ||
    isNaN(yearInt) || yearInt < 2000 || yearInt > 2100 ||
    isNaN(monthInt) || monthInt < 1 || monthInt > 12
  ) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: period } = await admin
    .from('reconciliation_periods')
    .select('id')
    .eq('organisation_id', orgId)
    .eq('year', yearInt)
    .eq('month', monthInt)
    .maybeSingle();

  if (!period) {
    return NextResponse.json({ error: 'Period not found' }, { status: 404 });
  }

  const { data: anchor } = await admin
    .from('chain_anchors')
    .select('*')
    .eq('period_id', period.id)
    .eq('organisation_id', orgId)
    .maybeSingle();

  if (!anchor) {
    return NextResponse.json({ error: 'No anchor found for this period' }, { status: 404 });
  }

  const recomputedHash = hashAnchorPayload(anchor.anchor_data as AnchorPayload);
  const verified = recomputedHash === anchor.anchor_hash;

  const explorerBase =
    anchor.chain === 'base'
      ? 'https://basescan.org/tx'
      : 'https://polygonscan.com/tx';

  return NextResponse.json({
    verified,
    anchor_hash: anchor.anchor_hash,
    tx_hash: anchor.tx_hash,
    block_number: anchor.block_number,
    chain: anchor.chain,
    chain_id: anchor.chain_id,
    anchored_at: anchor.anchored_at,
    explorer_url: `${explorerBase}/${anchor.tx_hash}`,
  });
}
