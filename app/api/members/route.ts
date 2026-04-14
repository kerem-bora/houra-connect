import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Leaderboard verilerini çek
    const { data: lbData, error: lbError } = await supabase
      .from('leaderboard')
      .select('tx_count, rank, wallet_address')
      .order('rank', { ascending: true });

    if (lbError) throw lbError;

    // 2. Profilleri çek - FID KOLONU BURADAN KALDIRILDI
    const { data: profData, error: profError } = await supabase
      .from('profiles')
      .select('nick, wallet_address, city');

    if (profError) {
      console.error("Profile fetch error:", profError);
      // Profil çekilemese bile leaderboard verisini bozmamak için boş dizi atayalım
    }

    // 3. Eşleştirme ve Veri Formatlama
    const results = (lbData || []).map(entry => {
      const p = (profData || []).find(
        u => String(u.wallet_address).toLowerCase() === String(entry.wallet_address).toLowerCase()
      );
      
      return {
        tx_count: entry.tx_count,
        rank: entry.rank,
        wallet_address: entry.wallet_address,
        // fid: p?.fid, <--- BU SATIR SİLİNDİ (Hata kaynağı buydu)
        profiles: p ? { 
          nick: p.nick,
          display_name: p.nick || "Anonymous",
          city: p.city ?? null
        } : null
      };
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Members Route Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}