import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyMessage } from "viem";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NeedSchema = z.object({
  fid: z.number(),
  username: z.string().min(1).max(50),
  location: z.string().max(100).optional().default("Global"),
  text: z.string().min(3).max(280),
  price: z.union([z.string(), z.number()]).optional().default("1"),
  wallet_address: z.string().startsWith("0x"),
  signature: z.string().min(1),
  message: z.string().min(1),
});

export async function GET() {
  try {
    const { data, error } = await supabase.from('needs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ needs: data });
  } catch (error: any) {
    return NextResponse.json({ error: "Database fetch failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // --- DEBUG: GELEN VERİ KONTROLÜ ---
    console.log("POST Body:", {
      address: body.wallet_address,
      sigLength: body.signature?.length,
      msg: body.message
    });

    const validation = NeedSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Zod Validation Failed", 
        details: validation.error.format() 
      }, { status: 400 });
    }

    const { fid, username, location, text, price, wallet_address, signature, message } = validation.data;

    // --- DEBUG: DOĞRULAMA ÖNCESİ ---
    try {
      const isValid = await verifyMessage({
        address: wallet_address as `0x${string}`,
        message: message,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        return NextResponse.json({ error: "Signature verification failed (Logic)!" }, { status: 401 });
      }
    } catch (vError: any) {
      console.error("Viem verifyMessage Error:", vError);
      return NextResponse.json({ 
        error: "Viem Error: " + vError.message,
        receivedSigLength: signature.length
      }, { status: 400 });
    }

    // Rate Limit & Insert işlemleri...
    const { count } = await supabase.from('needs').select('*', { count: 'exact', head: true })
      .eq('fid', fid).gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (count !== null && count >= 3) return NextResponse.json({ error: "Daily limit reached" }, { status: 429 });

    const { error: dbError } = await supabase.from('needs').insert([{
      fid, username, location, text, price: price.toString(), wallet_address, id: crypto.randomUUID()
    }]);

    if (dbError) throw dbError;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Full Post Error:", error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idValue = searchParams.get('id'); 
    const fidValue = searchParams.get('fid');
    const body = await req.json();

    // --- DEBUG: DELETE KONTROLÜ ---
    console.log("DELETE Request:", { idValue, fidValue, body });

    if (!idValue || !fidValue || !body.signature || !body.address) {
      return NextResponse.json({ error: "Missing parameters for delete" }, { status: 400 });
    }

    const isValid = await verifyMessage({
      address: body.address as `0x${string}`,
      message: body.message,
      signature: body.signature as `0x${string}`,
    });

    if (!isValid) return NextResponse.json({ error: "Delete Signature Invalid" }, { status: 401 });

    const { error } = await supabase.from('needs').delete()
      .eq('id', idValue).eq('fid', Number(fidValue)).eq('wallet_address', body.address);

    if (error) throw error;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Full Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}