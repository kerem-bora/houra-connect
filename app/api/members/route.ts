import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Leaderboard
    const { data: lbData, error: lbError } = await supabase
      .from('leaderboard')
      .select('tx_count, rank, wallet_address')
      .order('rank', { ascending: true });

    if (lbError) throw lbError;

    // 2. Profiles
    const { data: profData, error: profError } = await supabase
      .from('profiles')
      .select('username, wallet_address'); 

    if (profError) throw profError;

    // DEBUG LOGS
    console.log("LB Count:", lbData?.length);
    console.log("Prof Count:", profData?.length);

    // 3. Matching
    const results = (lbData || []).map(entry => {
      const p = (profData || []).find(
        u => String(u.wallet_address).toLowerCase() === String(entry.wallet_address).toLowerCase()
      );
      
      return {
        tx_count: entry.tx_count,
        rank: entry.rank,
        wallet_address: entry.wallet_address,
        profiles: p ? { username: p.username } : null
      };
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}