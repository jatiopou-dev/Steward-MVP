export const INCOME_CATEGORIES = [
  "Regular giving",
  "Tithe & offering",
  "Special offering",
  "Fundraising",
  "Grant",
  "Hall hire",
  "Wedding / funeral fees",
  "Other income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Payroll & wages",
  "Building & facilities",
  "Ministry & outreach",
  "Administration",
  "Worship & music",
  "Utilities",
  "Mission giving",
  "Insurance",
  "Community events",
  "Other expense",
] as const;

export const MEMBER_TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Rev", "Prof"];

export const MEMBER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "transfer_in", label: "Transfer in" },
  { value: "transfer_out", label: "Transfer out" },
  { value: "deceased", label: "Deceased" },
] as const;

export const FUND_TYPES = [
  { value: "unrestricted", label: "Unrestricted", chip: "chip-stone" },
  { value: "designated", label: "Designated", chip: "chip-stone" },
  { value: "restricted", label: "Restricted", chip: "chip-gold" },
] as const;

export const FUND_STATUSES = [
  { value: "active", label: "Active", chip: "chip-sage" },
  { value: "monitor", label: "Monitor", chip: "chip-gold" },
  { value: "closed", label: "Closed", chip: "chip-stone" },
] as const;

