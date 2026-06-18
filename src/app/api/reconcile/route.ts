import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const ledgerCategories = [
  "Regular giving",
  "Tithe & offering",
  "Special offering",
  "Fundraising",
  "Grant",
  "Hall hire",
  "Wedding / funeral fees",
  "Other income",
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

export async function POST(req: Request) {
  // Extract transactions from request body
  const { transactions } = await req.json();

  if (!transactions || !Array.isArray(transactions)) {
    return NextResponse.json({ error: "Invalid payload. 'transactions' array required." }, { status: 400 });
  }

  // Retrieve user session
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      schema: z.object({
        reconciled: z.array(z.object({
          originalReference: z.string().describe("The raw bank statement description"),
          suggestedCategory: z.enum(ledgerCategories).describe("The closest matching ledger category"),
          suggestedProfileName: z.string().optional().describe("If it looks like a person's name (e.g., tithe), extract their name"),
          confidence: z.number().describe("0 to 1 confidence score")
        }))
      }),
      prompt: `You are an AI assistant helping a UK church treasurer reconcile their bank statement.
      
      Here are the transactions:
      ${JSON.stringify(transactions)}
      
      Return exactly one result for every transaction, in the same order.
      Analyze the descriptions and amount signs. Map them into one of these strict categories: ${ledgerCategories.join(', ')}.
      If the description contains a name, like "STANDING ORDER MR J SMITH", extract "J Smith" as the suggestedProfileName.
      Positive amounts are income categories and negative amounts are expense categories.
      `
    });

    return NextResponse.json(object);
  } catch (error: unknown) {
    console.error("AI Reconciliation Error:", error);
    return NextResponse.json({ error: "Failed to reconcile via AI" }, { status: 500 });
  }
}
