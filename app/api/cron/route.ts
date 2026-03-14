import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY;
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  // 1. Debug: Secret Control
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized - Secret mismatch" }, { status: 401 });
  }

  try {
    // 2. Basescan
const basescanUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=tokentx&contractaddress=${HOURA_TOKEN_ADDRESS}&page=1&offset=1000&sort=desc&apikey=${BASESCAN_API_KEY}`;

    const response = await fetch(basescanUrl);
    const data = await response.json();

    if (data.status !== "1") {
      return NextResponse.json({ error: "Basescan API Error", details: data.message }, { status: 400 });
    }

    const transactions = data.result || [];
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

    // 3. Data process
    const activityMap: Record<string, number> = {};

    transactions.forEach((tx: any) => {
      const timestamp = parseInt(tx.timeStamp);
      const fromAddress = tx.from.toLowerCase();

      if (timestamp >= thirtyDaysAgo) {
        // Kontratın kendisini ve sıfır adresini dışla
        if (
          fromAddress !== HOURA_TOKEN_ADDRESS.toLowerCase() && 
          fromAddress !== "0x0000000000000000000000000000000000000000"
        ) {
          activityMap[fromAddress] = (activityMap[fromAddress] || 0) + 1;
        }
      }
    });

    const topPerformers = Object.entries(activityMap)
      .map(([address, count]) => ({ 
        wallet_address: address, 
        tx_count: count 
      }))
      .sort((a, b) => b.tx_count - a.tx_count)
      .slice(0, 20);

    if (topPerformers.length === 0) {
      return NextResponse.json({ message: "No activity found in the last 30 days", txCount: transactions.length });
    }

    // 4. Supabase update
  
    const { error: deleteError } = await supabase.from('leaderboard').delete().neq('tx_count', -1);
    if (deleteError) throw new Error(`Delete Error: ${deleteError.message}`);

    // Yeni veriyi ekle
    const { error: insertError } = await supabase
      .from('leaderboard')
      .insert(
        topPerformers.map((item, index) => ({
          wallet_address: item.wallet_address,
          tx_count: item.tx_count,
          rank: index + 1
        }))
      );

    if (insertError) throw new Error(`Insert Error: ${insertError.message}`);

    return NextResponse.json({ 
      success: true, 
      updated_count: topPerformers.length,
      sample_data: topPerformers[0]
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}