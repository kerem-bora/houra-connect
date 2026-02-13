import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyMessage } from "viem"; // Doğrulama için eklendi

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- VALIDATION SCHEMA (İmza alanları eklendi) ---
const NeedSchema = z.object({
  fid: z.number(),
  username: z.string().min(1).max(50),
  location: z.string().max(100).optional().default("Global"),
  text: z.string().min(3).max(280),
  price: z.union([z.string(), z.number()]).optional().default("1"),
  wallet_address: z.string().startsWith("0x"), // İmza doğrulaması için artık zorunlu
  signature: z.string().min(1), // Client'tan gelen imza
  message: z.string().min(1),   // İmzalanan ham mesaj
});

// --- GET: Fetch All Needs ---
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('needs')
      .select('*') 
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ needs: data });
  } catch (error: any) {
    return NextResponse.json({ error: "Database fetch failed" }, { status: 500 });
  }
}

// --- POST: Create Need with Signature and Limits ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = NeedSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid input", 
        details: validation.error.format() 
      }, { status: 400 });
    }

    const { fid, username, location, text, price, wallet_address, signature, message } = validation.data;

    // --- KRİTİK GÜVENLİK KONTROLÜ (SIGNATURE VERIFICATION) ---
    const isValid = await verifyMessage({
      address: wallet_address as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Signature verification failed!" }, { status: 401 });
    }
    // --------------------------------------------------------

    // --- RATE LIMIT: Max 3 posts per 24 hours ---
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('needs')
      .select('*', { count: 'exact', head: true })
      .eq('fid', fid)
      .gt('created_at', twentyFourHoursAgo);

    if (count !== null && count >= 3) {
      return NextResponse.json({ error: "Daily limit reached (3 posts max)" }, { status: 429 });
    }

    // --- INSERT DATA ---
    const newNeed = {
      fid: Number(fid),
      username,
      location: location || "Global",
      text,
      price: price.toString(),
      wallet_address: wallet_address,
      id: crypto.randomUUID()
    };

    const { error: dbError } = await supabase
      .from('needs')
      .insert([newNeed]);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Post Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// --- DELETE: Secure Delete by ID and FID ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idValue = searchParams.get('id'); 
    const fidValue = searchParams.get('fid');
    
    // Body içinden imza verilerini alıyoruz
    const body = await req.json();
    const { signature, message, address } = body;

    if (!idValue || !fidValue || !signature || !message || !address) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // --- KRİTİK GÜVENLİK KONTROLÜ ---
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Signature verification failed!" }, { status: 401 });
    }
    // --------------------------------

    const { error } = await supabase
      .from('needs')
      .delete()
      .eq('id', idValue)
      .eq('fid', Number(fidValue))
      .eq('wallet_address', address); // Ekstra güvenlik: Adres de eşleşmeli

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Server error during delete" }, { status: 500 });
  }
}