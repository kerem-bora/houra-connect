import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Veritabanına yaz/güncelle
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        fid: body.fid,
        username: body.username,
        avatar_url: body.avatar_url,
        city: body.city,
        bio: body.bio,
        wallet_address: body.wallet_address
      });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
