import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key for write access
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY;
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6";

export async function GET(request: Request) {
  // Security check for Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch the last 10,000 token transactions from Basescan
    const basescanUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${HOURA_TOKEN_ADDRESS}&page=1&offset=10000&sort=desc&apikey=${BASESCAN_API_KEY}`;
    
    const response = await fetch(basescanUrl);
    const data = await response.json();

    if (data.status !== "1") {
      throw new Error(`Basescan API Error: ${data.message}`);
    }

    const transactions = data.result;
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

    // 2. Aggregate transactions by sender (from address)
    const activityMap: Record<string, number> = {};

    transactions.forEach((tx: any) => {
      const timestamp = parseInt(tx.timeStamp);
      const fromAddress = tx.from.toLowerCase();

      // Filter: only last 30 days and exclude the contract itself
      if (timestamp >= thirtyDaysAgo) {
        if (
          fromAddress !== HOURA_TOKEN_ADDRESS.toLowerCase() && 
          fromAddress !== "0x0000000000000000000000000000000000000000"
                 ) {
          activityMap[fromAddress] = (activityMap[fromAddress] || 0) + 1;
        }
      }
    });

    // 3. Sort and get top 20
    const topPerformers = Object.entries(activityMap)
      .map(([address, count]) => ({ 
        wallet_address: address, 
        tx_count: count 
      }))
      .sort((a, b) => b.tx_count - a.tx_count)
      .slice(0, 20);

    // 4. Update Database
    // We delete old entries and insert new ones to keep the leaderboard fresh
    const { error: deleteError } = await supabase
      .from('leaderboard')
      .delete()
      .neq('rank', 0); // Clear all

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from('leaderboard')
      .insert(
        topPerformers.map((item, index) => ({
          wallet_address: item.wallet_address,
          tx_count: item.tx_count,
          rank: index + 1
        }))
      );

    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      processed_at: new Date().toISOString(),
      count: topPerformers.length 
    });

  } catch (error: any) {
    console.error("Cron Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}