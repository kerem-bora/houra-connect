import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSession } from "@/lib/getSession";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NeedSchema = z.object({
  location: z
    .string()
    .max(100)
    .optional()
    .default("Global")
    .transform(val => val.trim().replace(/<[^>]*>/g, "")),
  text: z
    .string()
    .min(3)
    .max(280)
    .transform(val => val.trim().replace(/<[^>]*>/g, "")),
  price: z.coerce.string().default("1"),

});

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

export async function POST(req: Request) {
  try {

    const session = await getSession();
    if (!session.isLoggedIn || !session.address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const wallet_address = session.address;

    const body = await req.json();
    const validation = NeedSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { location, text, price } = validation.data;

    const { count } = await supabase.from('needs')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_address', wallet_address)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (count !== null && count >= 3) {
      return NextResponse.json({ error: "Daily limit reached (3 max)" }, { status: 429 });
    }

    const { error: dbError } = await supabase.from('needs').insert([{
      location,
      text,
      price,
      wallet_address,
      id: crypto.randomUUID()
    }]);

    if (dbError) throw dbError;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Needs POST Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
 
    const session = await getSession();
    if (!session.isLoggedIn || !session.address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const wallet_address = session.address;

    const { searchParams } = new URL(req.url);
    const idValue = searchParams.get('id');

    if (!idValue) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const { error } = await supabase.from('needs')
      .delete()
      .eq('id', idValue)
      .eq('wallet_address', wallet_address);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Deleted successfully" });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
