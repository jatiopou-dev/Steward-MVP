export function isDeclarationActive(
  declaration: {
    effective_from: string;
    effective_to: string | null;
    revoked_at: string | null;
  },
  transaction_date: string
): boolean {
  if (declaration.revoked_at) return false;
  if (declaration.effective_from > transaction_date) return false;
  if (declaration.effective_to !== null && declaration.effective_to < transaction_date) return false;
  return true;
}
