"use client";
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk"; 
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';

// --- CONFIGURATION ---
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 
const TOKEN_ABI = [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }] as const;

export default function Home() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [city, setCity] = useState("");
  const [talents, setTalents] = useState("");
  const [status, setStatus] = useState("");

  const { address: wagmiAddress } = useAccount();
  const currentAddress = wagmiAddress || context?.user?.address;

  // --- BAKİYE OKUMA ---
  const { data: rawBalance, isPending } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [currentAddress as `0x${string}`],
    query: { enabled: !!currentAddress && isSDKLoaded }
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);

// --- VERİTABANINDAN BİLGİLERİ GETİR ---
        if (ctx?.user?.fid) {
          const res = await fetch(`/api/profile?fid=${ctx.user.fid}`);
          const data = await res.json();
          if (data.profile) {
            setCity(data.profile.city || "");
            setTalents(data.profile.bio || ""); // Tabloda bio olarak yazıyor..          }
        }

        sdk.actions.ready();
      } catch (e) { console.error(e); }
    };
    if (sdk && !isSDKLoaded) { setIsSDKLoaded(true); load(); }
  }, [isSDKLoaded]);


  // --- DOĞRUDAN KAYIT FONKSİYONU ---
  const handleJoinNetwork = async () => {
    if (!context?.user?.fid) {
      setStatus("Error: Farcaster user not detected.");
      return;
    }

    setStatus("Saving...");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: context.user.fid,
          username: context.user.username,
          pfp: context.user.pfpUrl,
          city,
          talents,
          address: currentAddress 
        }),
      });

      if (res.ok) {
        setStatus("Success! Welcome to Houra. ✅");
      } else {
        setStatus("Error: Database save failed.");
      }
    } catch (e) {
      setStatus("Error: Connection failed.");
    }
  };

  if (!isSDKLoaded) return <div style={{ backgroundColor: '#000', color: '#fff', padding: '50px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Houra</h1>
      
      {/* Balance Card */}
      <div style={{ margin: '20px 0', padding: '20px', borderRadius: '15px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold' }}>BALANCE</p>
        <h2 style={{ margin: '5px 0 0 0', fontSize: '2rem' }}>{isPending ? "..." : formattedBalance} Houra</h2>
      </div>

      {/* Profile Row */}
      <div style={{ margin: '10px 0', padding: '15px', borderRadius: '15px', background: '#18181b', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <img src={context?.user?.pfpUrl} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="" />
        <p style={{ margin: 0, fontWeight: 'bold' }}>@{context?.user?.username}</p>
      </div>

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#fff' }} />
        <textarea placeholder="Your Talents" value={talents} onChange={(e) => setTalents(e.target.value)} style={{ width: '100%', padding: '12px', height: '80px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#fff' }} />
        
        <button 
          onClick={handleJoinNetwork}
          disabled={status === "Saving..."}
          style={{ width: '100%', padding: '15px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer' }}
        >
          {status === "Saving..." ? "SAVING..." : "UPDATE PROFILE"}
        </button>
      </div>

      {status && <p style={{ textAlign: 'center', marginTop: '10px', color: status.includes('Success') ? '#4ade80' : '#f87171' }}>{status}</p>}
    </div>
  );
}