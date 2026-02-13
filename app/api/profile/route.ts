import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { z } from "zod";



const supabase = createClient(

  process.env.SUPABASE_URL!,

  process.env.SUPABASE_SERVICE_ROLE_KEY!

);



const ProfileSchema = z.object({

  fid: z.number(),

  username: z.string().min(1),

  pfp: z.string().optional().nullable(),

  city: z.string().optional().nullable(),

  talents: z.string().optional().nullable(),

  address: z.string().min(1),

  signature: z.string().min(1), 

  message: z.string().min(1),  

});



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

    

    // 1. Zod Validasyonu

    const validation = ProfileSchema.safeParse(body);

    if (!validation.success) {

      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });

    }



    const { fid, username, city, talents } = validation.data;



    // 2. KİMLİK KONTROLÜ (GİZLİ HEADER DOĞRULAMA)

    // Frontend'den 'x-farcaster-fid' adıyla gönderdiğimiz header'ı okuyoruz

    const headerFid = req.headers.get("x-farcaster-fid");



    if (!headerFid) {

      return NextResponse.json({ error: "No identity header found" }, { status: 401 });

    }



    // Header'daki FID ile Body'deki FID uyuşuyor mu? 

    // (Biri başkasının FID'si üzerine yazmaya çalışırsa burada patlar)

    if (Number(headerFid) !== Number(fid)) {

      return NextResponse.json({ error: "Identity mismatch! Authorization failed." }, { status: 403 });

    }



    // 3. Veritabanı İşlemi

    const { error: dbError } = await supabase

      .from('profiles')

      .upsert({

        fid: fid,

        username: username,

        city: city || "Global",

        bio: talents || "",

      }, { onConflict: 'fid' });



    if (dbError) throw dbError;



    return NextResponse.json({ success: true });



  } catch (error: any) {

    console.error("Profile POST Error:", error);

    return NextResponse.json({ error: error.message }, { status: 500 });

  }

}