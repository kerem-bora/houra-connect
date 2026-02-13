import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAppClient } from "@farcaster/auth-client";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Stabil Viem Client: undefined hatalarını engelleyen motor
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const appClient = createAppClient({
  ethereum: {
    async verifyMessage({ address, message, signature }: any) {
      return publicClient.verifyMessage({ address, message, signature });
    },
  } as any,
});

const ProfileSchema = z.object({
  fid: z.number(),
  username: z.string().min(1),
  pfp: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  talents: z.string().optional().nullable(),
  address: z.string().min(1),
});

// Yardımcı Fonksiyon: Farcaster Auth Token Doğrulama
async function verifyFarcasterAuth(req: Request, expectedFid: number) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return false;

    const token = authHeader.split(" ")[1];
    
    const { data, error } = await appClient.verifySignInToken({
      token,
      domain: "houra.vercel.app",
    });

    if (error) {
      console.error("Profile Auth Error:", error);
      return false;
    }

    return data && data.fid === expectedFid;
  } catch (err) {
    console.error("Profile Auth Catch:", err);
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");
    if (!fid) return NextResponse.json({ error: "FID missing" }, { status: 400 });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('fid', Number(fid))
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    const profileData = data ? {
      ...data,
      talents: data.bio 
    } : null;

    return NextResponse.json({ profile: profileData });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const validation = ProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { fid, username, city, talents, address, pfp } = validation.data;

    // BASE/FARCASTER QUICK AUTH DOĞRULAMASI
    const isAuthorized = await verifyFarcasterAuth(req, fid);
    if (!isAuthorized) {
      return NextResponse.json({ 
        error: "Identity verification failed." 
      }, { status: 401 });
    }

    // Veritabanı İşlemi (Upsert)
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        pfp_url: pfp || null,
        wallet_address: address,
        city: city || "Global",
        bio: talents || "",
      }, { onConflict: 'fid' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Profile POST Error:", error);
    return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
  }
}