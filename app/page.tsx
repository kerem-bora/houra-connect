"use client";
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk"; 
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';

const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 
const TOKEN_ABI = [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }] as const;

export default function Home() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [city, setCity] = useState("");
  const [talents, setTalents] = useState("");
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const { address: wagmiAddress } = useAccount();
  const currentAddress = (wagmiAddress || context?.user?.address || "") as `0x${string}`;

  // Bakiye Okuma
  const { data: rawBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
  });

  const formattedBalance = rawBalance !== undefined ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() : "0";

  // SDK ve Veri Yükleme (Bio/City Buraya Sabitlendi)
  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        
        // Önce Context, sonra veri çekme!
        if (ctx?.user?.fid) {
          const res = await fetch(`/api/profile?fid=${ctx.user.fid}`);
          const data = await res.json();
          if (data.profile) {
            setCity(data.profile.city || "");
            setTalents(data.profile.bio || "");
          }
        }
        sdk.actions.ready();
        setIsSDKLoaded(true);
      } catch (e) { console.error(e); setIsSDKLoaded(true); }
    };
    init();
  }, []);

  // Arama Fonksiyonu
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 1) {
        const res = await fetch(`/api/search?q=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Profil Güncelleme
  const handleUpdate = async () => {
    if (!context?.user?.fid) return;
    setStatus("Saving...");
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fid: context.user.fid, username: context.user.username, pfp: context.user.pfpUrl, city, talents, address: currentAddress }),
    });
    setStatus("Saved! ✅");
  };

  // NATIVE VIEW PROFILE (Hatasız Yöntem)
  const openProfile = (fid: number) => {
    // Base App içinde profil kartını açan en güncel v2 komutu
    if (typeof window !== "undefined") {
      sdk.actions.viewProfile({ fid });
    }
  };

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>Houra</h1>
      <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '20px' }}>Time Economy</p>
      
      <div style={{ padding: '20px', borderRadius: '15px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', marginBottom: '25px' }}>
        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 'bold' }}>MY BALANCE</p>
        <h2 style={{ margin: '5px 0 0 0' }}>{formattedBalance} Houra</h2>
      </div>

      <details style={{ background: '#111', padding: '10px', borderRadius: '10px', marginBottom: '20px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>{city ? `📍 ${city}` : "👤 Edit Profile"}</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ padding: '10px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '5px' }} />
          <textarea placeholder="Talents" value={talents} onChange={(e) => setTalents(e.target.value)} style={{ padding: '10px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '5px' }} />
          <button onClick={handleUpdate} style={{ padding: '10px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '5px' }}>UPDATE</button>
        </div>
      </details>

      <input placeholder="Search talent or city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#000', color: '#fff', border: '1px solid #2563eb', boxSizing: 'border-box' }} />

      <div style={{ marginTop: '20px' }}>
        {searchResults.map((user) => (
          <div key={user.fid} style={{ padding: '15px', background: '#111', borderRadius: '12px', marginBottom: '10px', border: '1px solid #222' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>@{user.username} 📍 {user.city || "Global"}</p>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '5px 0 10px 0' }}>{user.bio}</p>
            <button onClick={() => openProfile(Number(user.fid))} style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>VIEW PROFILE</button>
          </div>
        ))}
      </div>
      {status && <p style={{ textAlign: 'center', fontSize: '0.8rem' }}>{status}</p>}
    </div>
  );
}