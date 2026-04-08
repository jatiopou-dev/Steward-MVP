/**
 * HMRC Gift Aid Engine Utility
 * 
 * Automates the calculation of the 25% tax top-up for eligible donations
 * and generates a compliant CSV format for the HMRC Charities Online portal.
 */

export interface Transaction {
  id: string;
  amountPence: number;
  date: Date;
  isGiftAidClaimed: boolean;
  member: {
    title: string;
    firstName: string;
    surname: string;
    houseNameOrNumber: string;
    postcode: string;
    isGiftAidEligible: boolean;
  };
}

/**
 * Calculates the total claimable Gift Aid (25% top-up) for a given set of transactions.
 * Returns the amount in pence.
 */
export function calculateClaimableGiftAid(transactions: Transaction[]): number {
  const eligibleSum = transactions
    .filter(
      (tx) => tx.member.isGiftAidEligible && !tx.isGiftAidClaimed
    )
    .reduce((sum, tx) => sum + tx.amountPence, 0);

  // HMRC adds 25p for every £1 donated (25% of the base donation)
  return eligibleSum * 0.25;
}

/**
 * Generates a compliant HMRC Charities Online CSV string.
 * Format requires exact ordering: Title, First name, Surname, House name or number, Postcode, Aggregated donation, Donation date, Amount
 */
export function generateHmrcCsv(transactions: Transaction[]): string {
  const claimable = transactions.filter(
    (tx) => tx.member.isGiftAidEligible && !tx.isGiftAidClaimed
  );

  const headers = [
    "Title",
    "First name",
    "Surname",
    "House name or number",
    "Postcode",
    "Aggregated donation",
    "Donation date",
    "Amount"
  ];

  const rows = claimable.map(tx => {
    // Format date as DD/MM/YYYY per HMRC standards
    const d = tx.date;
    const formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    const amountPounds = (tx.amountPence / 100).toFixed(2);

    return [
      `"${tx.member.title}"`,
      `"${tx.member.firstName}"`,
      `"${tx.member.surname}"`,
      `"${tx.member.houseNameOrNumber}"`,
      `"${tx.member.postcode}"`,
      `""`, // Aggregated donation is null for individual entries
      `"${formattedDate}"`,
      `"${amountPounds}"`
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
