"use client";
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk"; 
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';

// --- CONFIGURATION ---
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 
const TOKEN_ABI = [
  { 
    name: 'balanceOf', 
    type: 'function', 
    stateMutability: 'view', 
    inputs: [{ name: 'account', type: 'address' }], 
    outputs: [{ name: 'balance', type: 'uint256' }] 
  }
] as const;

export default function Home() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [city, setCity] = useState("");
  const [talents, setTalents] = useState("");
  const [status, setStatus] = useState("");

  // Arama State'leri
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { address: wagmiAddress } = useAccount();
  const currentAddress = (wagmiAddress || context?.user?.address || "") as `0x${string}`;

  // --- BAKİYE OKUMA ---
  const { data: rawBalance, isPending } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
    query: { enabled: !!currentAddress && isSDKLoaded }
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  // --- SDK VE VERİ YÜKLEME ---
  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);

        if (ctx?.user?.fid) {
          const res = await fetch(`/api/profile?fid=${ctx.user.fid}`);
          const data = await res.json();
          if (data.profile) {
            setCity(data.profile.city || "");
            setTalents(data.profile.bio || "");
          }
        }
        sdk.actions.ready();
      } catch (e) { console.error("Initialization Error:", e); }
    };

    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  // --- ARAMA FONKSİYONU (Debounce) ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/search?q=${searchQuery}`);
          const data = await res.json();
          setSearchResults(data.users || []);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // --- KAYIT FONKSİYONU ---
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
      if (res.ok) setStatus("Success! Welcome to Houra. ✅");
      else setStatus("Error: Database save failed.");
    } catch (e) { setStatus("Error: Connection failed."); }
  };

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', padding: '50px', textAlign: 'center' }}>Loading Houra...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '5px' }}>Houra</h1>
      <p style={{ color: '#666', margin: '0 0 20px 0', fontSize: '0.9rem' }}>Decentralized Time Bank</p>
      
      {/* Balance Card */}
      <div style={{ margin: '20px 0', padding: '20px', borderRadius: '15px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.8 }}>MY BALANCE</p>
        <h2 style={{ margin: '5px 0 0 0', fontSize: '2rem' }}>
          {isPending ? "..." : formattedBalance} <span style={{ fontSize: '1rem' }}>Houra</span>
        </h2>
      </div>

      {/* Profile Edit Section */}
      <details style={{ marginBottom: '30px', background: '#111', borderRadius: '12px', padding: '10px' }}>
        <summary style={{ cursor: 'pointer', padding: '10px', fontWeight: 'bold', color: '#9ca3af' }}>
          {city ? `📍 ${city} | Edit Profile` : "👤 Setup Your Profile"}
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          <input 
            placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', boxSizing: 'border-box' }} 
          />
          <textarea 
            placeholder="Your Talents (e.g. Design, Yoga, Math)" value={talents} onChange={(e) => setTalents(e.target.value)} 
            style={{ width: '100%', padding: '12px', height: '60px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', boxSizing: 'border-box' }} 
          />
          <button 
            onClick={handleJoinNetwork} disabled={status === "Saving..."}
            style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer', border: 'none' }}
          >
            {status === "Saving..." ? "SAVING..." : "UPDATE PROFILE"}
          </button>
          {status && <p style={{ fontSize: '0.8rem', textAlign: 'center', color: status.includes('Success') ? '#4ade80' : '#f87171' }}>{status}</p>}
        </div>
      </details>

      <hr style={{ border: '0.5px solid #222', margin: '30px 0' }} />

      {/* Search Section */}
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>Send Houra</h3>
        <input 
          placeholder="Search by name, city or talent..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #2563eb', background: '#000', color: '#fff', boxSizing: 'border-box', marginBottom: '20px' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isSearching && <p style={{ textAlign: 'center', color: '#666' }}>Searching the network...</p>}
          
          {searchResults.map((user) => (
            <div key={user.fid} style={{ padding: '15px', background: '#111', borderRadius: '12px', border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={user.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="" />
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>@{user.username}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#666' }}>📍 {user.city || "Unknown"}</p>
                  </div>
                </div>
                <button 
                  onClick={() => sdk.actions.openUrl(`https://warpcast.com/~/messaging/create/${user.fid}`)}
                  style={{ background: '#27272a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  Message
                </button>
              </div>
              
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '12px 0' }}>{user.bio}</p>
              
              <button 
                onClick={() => alert("Onchain transfer coming next!")}
                style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                SEND HOURA
              </button>
            </div>
          ))}

          {searchQuery.length > 1 && searchResults.length === 0 && !isSearching && (
            <p style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>No Houra users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}