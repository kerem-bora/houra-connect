"use client";
import { useEffect, useState } from "react";
import sdk from "@farcaster/frame-sdk";
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

// --- CONFIGURATION ---
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 
const TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const;

export default function Home() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [city, setCity] = useState("");
  const [talents, setTalents] = useState("");
  const [status, setStatus] = useState("");

  // --- BAKİYE OKUMA (WAGMI) ---
  const { data: rawBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [context?.user?.address as `0x${string}`],
    query: {
      enabled: !!context?.user?.address, // Sadece adres varsa çalıştır
    }
  });

  const formattedBalance = rawBalance ? formatUnits(rawBalance as bigint, 18) : "0";

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        sdk.actions.ready();
      } catch (e) {
        console.error("SDK Initialization Error:", e);
      }
    };

    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  const handleJoinNetwork = async () => {
    if (!context?.user?.fid) {
      setStatus("Error: Farcaster user not detected.");
      return;
    }

    setStatus("Requesting signature...");
    try {
      const nonceRes = await fetch("/api/auth/nonce");
      const { nonce } = await nonceRes.json();
      const { message, signature } = await sdk.actions.signIn({ nonce });

      setStatus("Verifying...");
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          signature,
          nonce,
          fid: context.user.fid,
          username: context.user.username,
          pfp: context.user.pfpUrl,
          city,
          talents,
          address: context.user.address // Cüzdan adresini DB'ye eklemek önemli
        }),
      });

      if (res.ok) {
        setStatus("Success! Welcome to Houra. ✅");
      } else {
        const errorData = await res.json();
        setStatus(`Error: ${errorData.error || "Verification failed."}`);
      }
    } catch (e: any) {
      console.error(e);
      setStatus(e.message || "Transaction cancelled or failed.");
    }
  };

  if (!isSDKLoaded) {
    return (
      <div style={{ backgroundColor: '#000', color: '#fff', padding: '50px', textAlign: 'center' }}>
        Loading Time Bank...
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Houra</h1>
      <p style={{ color: '#9ca3af' }}>Time Economy</p>

      {/* Balance Card */}
      <div style={{ 
        margin: '20px 0', 
        padding: '20px', 
        borderRadius: '15px', 
        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
      }}>
        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9, fontWeight: 'bold', textTransform: 'uppercase' }}>Your Balance</p>
        <h2 style={{ margin: '5px 0 0 0', fontSize: '2rem' }}>{Number(formattedBalance).toLocaleString()} <span style={{ fontSize: '1rem' }}>Houra</span></h2>
      </div>

      {/* Profile Section */}
      <div style={{ margin: '10px 0', padding: '15px', borderRadius: '15px', background: '#18181b', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <img src={context?.user?.pfpUrl} style={{ width: '50px', height: '50px', borderRadius: '50%' }} alt="pfp" />
        <div>
          <p style={{ margin: 0, fontWeight: 'bold' }}>@{context?.user?.username}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>FID: {context?.user?.fid}</p>
        </div>
      </div>

      {/* Input Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        <input 
          placeholder="City" 
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#18181b', color: '#fff', boxSizing: 'border-box' }}
        />
        <textarea 
          placeholder="
