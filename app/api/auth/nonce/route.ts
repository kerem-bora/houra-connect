import { NextResponse } from "next/server";
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const config = new Configuration({ apiKey: process.env.NEYNAR_API_KEY! });
const client = new NeynarAPIClient(config);

export async function GET() {
  try {
    // Generate nonce via Neynar SDK
    const response = await client.fetchNonce();
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch nonce" }, { status: 500 });
  }
}
