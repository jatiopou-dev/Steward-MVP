import {
  Banknote,
  Building2,
  FileSpreadsheet,
  Gift,
  Globe,
  HandCoins,
  Heart,
  Landmark,
  Music,
  PartyPopper,
  Receipt,
  ShieldCheck,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * One icon vocabulary for transaction categories, shared by every
 * surface that lists money moving.
 *
 * These are drawn glyphs rather than emoji: they inherit the current
 * colour and stroke weight, scale with the type scale, and render the
 * same on every platform — where emoji change shape per OS, carry
 * their own colour that fights the palette, and read as decoration
 * in a document people file with a regulator.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Income
  "Regular giving": HandCoins,
  "Tithe & offering": HandCoins,
  "Special offering": Gift,
  Fundraising: PartyPopper,
  Grant: FileSpreadsheet,
  "Hall hire": Building2,
  "Wedding / funeral fees": Landmark,
  "Other income": Banknote,

  // Expenditure
  "Payroll & wages": Users,
  "Building & facilities": Wrench,
  "Ministry & outreach": Heart,
  Administration: FileSpreadsheet,
  "Worship & music": Music,
  Utilities: Zap,
  "Mission giving": Globe,
  Insurance: ShieldCheck,
  "Community events": PartyPopper,
  "Other expense": Receipt,
};

/** Falls back on direction when a category is missing or unrecognised. */
export function categoryIcon(
  category: string | null | undefined,
  isIncome: boolean
): LucideIcon {
  return CATEGORY_ICONS[category ?? ""] ?? (isIncome ? HandCoins : Receipt);
}

export { CATEGORY_ICONS };
