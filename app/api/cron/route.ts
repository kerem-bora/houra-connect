import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto'; 

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');


  try {
    const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET}`);
    const actual = Buffer.from(authHeader ?? "");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toBlock: "latest",
          contractAddresses: [HOURA_TOKEN_ADDRESS],
          category: ["erc20"],
          withMetadata: true,
          excludeZeroValue: true,
          order: "desc"
        }]
      })
    });

    const data = await response.json();
    const transfers = data.result?.transfers || [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityMap: Record<string, number> = {};

    transfers.forEach((tx: any) => {
   
      if (!tx.from || !tx.to || !tx.metadata?.blockTimestamp) return;

      const txDate = new Date(tx.metadata.blockTimestamp);
      if (txDate > thirtyDaysAgo) {
        const from = tx.from.toLowerCase();
        const to = tx.to.toLowerCase();
        activityMap[from] = (activityMap[from] || 0) + 1;
        activityMap[to] = (activityMap[to] || 0) + 1;
      }
    });

    const topPerformers = Object.entries(activityMap)
      .map(([address, count]) => ({ wallet_address: address, tx_count: count }))
      .sort((a, b) => b.tx_count - a.tx_count)
      .slice(0, 20);

    await supabase.from('leaderboard').upsert(
      topPerformers.map((item, index) => ({
        wallet_address: item.wallet_address,
        tx_count: item.tx_count,
        rank: index + 1
      })),
      { onConflict: 'wallet_address' }
    );

    return NextResponse.json({ success: true, count: topPerformers.length });
  } catch (err: any) {
  
    console.error("Cron error:", err.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
