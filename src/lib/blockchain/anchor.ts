import { createHash } from 'crypto';
import { createWalletClient, createPublicClient, http } from 'viem';
import { polygon, base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { AnchorPayload } from '@/lib/types/v2';

// Builds a deterministic anchor payload.
// donation_ids and audit_log_ids are sorted ascending — same data always produces same JSON.
export function buildAnchorPayload(params: {
  organisation_id: string;
  period_id: string;
  year: number;
  month: number;
  total_pence: number;
  donation_count: number;
  donation_ids: string[];
  audit_log_ids: string[];
  closed_by: string;
  closed_at: string;
  prev_anchor_tx_hash: string | null;
}): AnchorPayload {
  return {
    steward_version: '1',
    organisation_id: params.organisation_id,
    period_id: params.period_id,
    year: params.year,
    month: params.month,
    total_pence: params.total_pence,
    donation_count: params.donation_count,
    donation_ids: [...params.donation_ids].sort(),
    audit_log_ids: [...params.audit_log_ids].sort(),
    closed_by: params.closed_by,
    closed_at: params.closed_at,
    prev_anchor_tx_hash: params.prev_anchor_tx_hash,
  };
}

// SHA-256 of JSON.stringify(payload) — returns hex string.
export function hashAnchorPayload(payload: AnchorPayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// Submits a zero-value tx to the burn address with hash as hex calldata.
// Waits for 1-block confirmation. Returns tx_hash and block_number.
// Reads chain config from env: ANCHOR_CHAIN, ANCHOR_CHAIN_ID, ANCHOR_RPC_URL,
// ANCHOR_WALLET_PRIVATE_KEY, ANCHOR_BURN_ADDRESS.
export async function submitAnchorTx(
  hash: string
): Promise<{ tx_hash: string; block_number: number }> {
  const chainName = process.env.ANCHOR_CHAIN ?? 'polygon';
  const rpcUrl = process.env.ANCHOR_RPC_URL;
  const rawKey = process.env.ANCHOR_WALLET_PRIVATE_KEY;
  const burnAddress = (process.env.ANCHOR_BURN_ADDRESS ?? '0x000000000000000000000000000000000000dEaD') as `0x${string}`;

  if (!rpcUrl) throw new Error('ANCHOR_RPC_URL not set');
  if (!rawKey) throw new Error('ANCHOR_WALLET_PRIVATE_KEY not set');

  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const chain = chainName === 'base' ? base : polygon;

  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl);

  const walletClient = createWalletClient({ account, chain, transport });
  const publicClient = createPublicClient({ chain, transport });

  const txHash = await walletClient.sendTransaction({
    to: burnAddress,
    value: BigInt(0),
    data: `0x${hash}` as `0x${string}`,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    tx_hash: txHash,
    block_number: Number(receipt.blockNumber),
  };
}
