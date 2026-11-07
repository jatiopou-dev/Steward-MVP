import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Where Google sends the user back to. Supabase hands us a one-time code in
 * the query string; exchanging it is what actually writes the session cookie,
 * so until this runs the user is still signed out no matter how the consent
 * screen went.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // The provider reports a refusal (consent denied, provider disabled) in the
  // query string rather than as an HTTP error. Carry its wording back to the
  // sign-in page instead of a blank screen.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(providerError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(
        "Google did not return a sign-in code. Please try again."
      )}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(error.message)}`
    );
  }

  // Only follow a relative path: an absolute `next` would let a crafted link
  // bounce a freshly signed-in treasurer off to another host.
  const next = searchParams.get("next");
  const destination =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return NextResponse.redirect(`${origin}${destination}`);
}
