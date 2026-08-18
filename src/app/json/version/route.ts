import { NextResponse } from "next/server";

/**
 * Chrome / Cursor sometimes probes the Chrome DevTools `/json/version` path
 * against this Next server. Serve a stub so it does not compile `/_not-found`.
 */
export function GET() {
  return NextResponse.json({
    Browser: "InsightApex",
    "Protocol-Version": "1.3",
  });
}
