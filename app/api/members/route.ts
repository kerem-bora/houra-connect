import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Leadership table
    const { data: leaderboard, error: lError } = await supabase
      .from('leaderboard')
      .select('tx_count, rank, wallet_address')
      .order('rank', { ascending: true });

    if (lError) throw lError;

    // 2. Profiles
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('username, address'); 

    if (pError) throw pError;

    // 3. Matching
    const mergedData = leaderboard.map(entry => {
   
      const userProfile = profiles?.find(p => 
        (p.address || "").toLowerCase() === (entry.wallet_address || "").toLowerCase()
      );
      
      return {
        ...entry,
       
        profiles: userProfile ? { username: userProfile.username } : null
      };
    });

    return NextResponse.json(mergedData);
  } catch (error: any) {
    console.error("Manual Merge Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}