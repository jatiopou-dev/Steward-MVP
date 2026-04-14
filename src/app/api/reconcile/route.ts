import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

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

  // Get the user's org info to feed Claude context about the chart of accounts
  // In a real DB we'd fetch the user's `org_id` from `profiles` and the `denomination_config`
  // For now, we'll give Claude some standard Church categories
  const categories = [
    "General Fund",
    "Building Fund",
    "Missions Outreach",
    "Restricted",
    "Salaries",
    "Facilities",
    "Ministry"
  ];

  try {
    // We send the list to Claude to output a structured map of categories/donors
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20240620'),
      schema: z.object({
        reconciled: z.array(z.object({
          originalReference: z.string().describe("The raw bank statement description"),
          suggestedCategory: z.enum([
            "General Fund",
            "Building Fund",
            "Missions Outreach",
            "Restricted",
            "Salaries",
            "Facilities",
            "Ministry"
          ]).describe("The closet matching church budget category"),
          suggestedProfileName: z.string().optional().describe("If it looks like a person's name (e.g., tithe), extract their name"),
          confidence: z.number().describe("0 to 1 confidence score")
        }))
      }),
      prompt: `You are an AI assistant helping a UK church treasurer reconcile their bank statement.
      
      Here are the transactions:
      ${JSON.stringify(transactions)}
      
      Analyze the descriptions. Map them into one of these strict categories: ${categories.join(', ')}.
      If the description contains a name, like "STANDING ORDER MR J SMITH", extract "J Smith" as the suggestedProfileName.
      If it's a utility bill or maintenance, map to "Facilities". If it's payroll, map to "Salaries". If it's an offering, map to "General Fund".
      `
    });

    return NextResponse.json(object);
  } catch (error: any) {
    console.error("AI Reconciliation Error:", error);
    return NextResponse.json({ error: "Failed to reconcile via AI" }, { status: 500 });
  }
}
