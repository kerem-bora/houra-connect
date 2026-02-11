"use client";
import { useEffect, useState } from "react";
// Resmi Mini App SDK'sını içe aktarıyoruz
import { miniapp } from "@farcaster/miniapp-sdk";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { address: wagmiAddress } = useAccount();
  const currentAddress = (wagmiAddress || context?.user?.address || "") as `0x${string}`;

  // --- BALANCE READING (Default to 0) ---
  const { data: rawBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
    query: { enabled: !!currentAddress && isSDKLoaded }
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  // --- SDK INITIALIZATION ---
  useEffect(() => {
    const load = async () => {
      try {
        // Mini App SDK ile context alımı
        const ctx = await miniapp.getContext();
        setContext(ctx);

        if (ctx?.user?.fid) {
          const res = await fetch(`/api/profile?fid=${ctx.user.fid}`);
          const data = await res.json();
          if (data.profile) {
            setCity(data.profile.city || "");
            setTalents(data.profile.bio || "");
          }
        }
        // Uygulamanın hazır olduğunu bildir
        miniapp.ready();
      } catch (e) { console.error("SDK Init Error:", e); }
    };

    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  // --- SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/search?q=${searchQuery}`);
          const data = await res.json();
          setSearchResults(data.users || []);
        } catch (error) { console.error("Search error:", error); } 
        finally { setIsSearching(false); }
      } else { setSearchResults([]); }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // --- PROFILE UPDATE ---
  const handleJoinNetwork = async () => {
    if (!context?.user?.fid) return;
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
      if (res.ok) setStatus("Success! Profile updated. ✅");
      else setStatus("Error: Save failed.");
    } catch (e) { setStatus("Error: Connection failed."); }
  };

  // --- NATIVE PROFILE ACTION (Miniapp SDK) ---
  const handleViewProfile = (fid: number) => {
    // SDK üzerinden resmi profil görüntüleme aksiyonu
    miniapp.viewProfile({ fid });
  };

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', padding: '50px', textAlign: 'center' }}>Loading Houra...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Houra</h1>
      <p style={{ color: '#666', margin: '0 0 20px 0', fontSize: '0.9rem' }}>Time Economy</p>
      
      {/* Balance Card */}
      <div style={{ margin: '20px 0', padding: '20px', borderRadius: '15px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.8 }}>MY BALANCE</p>
        <h2 style={{ margin: '5px 0 0 0', fontSize: '2rem' }}>
          {formattedBalance} <span style={{ fontSize: '1rem' }}>Houra</span>
        </h2>
      </div>

      {/* Profile Section */}
      <details style={{ marginBottom: '30px', background: '#111', borderRadius: '12px', padding: '10px' }}>
        <summary style={{ cursor: 'pointer', padding: '10px', fontWeight: 'bold', color: '#9ca3af' }}>
          {city ? `📍 ${city} | Edit Profile` : "👤 Setup Your Profile"}
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', boxSizing: 'border-box' }} />
          <textarea placeholder="Your Talents" value={talents} onChange={(e) => setTalents(e.target.value)} style={{ width: '100%', padding: '12px', height: '60px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', boxSizing: 'border-box' }} />
          <button onClick={handleJoinNetwork} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer', border: 'none' }}>UPDATE PROFILE</button>
        </div>
      </details>

      <hr style={{ border: '0.5px solid #222', margin: '30px 0' }} />

      {/* Search Section */}
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Search</h3>
        <input placeholder="Search name, city or talent..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #2563eb', background: '#000', color: '#fff', boxSizing: 'border-box', marginBottom: '20px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isSearching && <p style={{ textAlign: 'center', color: '#666' }}>Searching...</p>}
          
          {searchResults.map((user) => (
            <div key={user.fid} style={{ padding: '15px', background: '#111', borderRadius: '12px', border: '1px solid #222' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <img src={user.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="" />
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>@{user.username}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#666' }}>📍 {user.city || "Earth"}</p>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '12px' }}>{user.bio}</p>
              
              <button 
                onClick={() => handleViewProfile(Number(user.fid))}
                style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                VIEW PROFILE
              </button>
            </div>
          ))}
        </div>
      </div>

      {status && <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#111', border: '1px solid #2563eb', borderRadius: '10px', textAlign: 'center', fontSize: '0.9rem' }}>{status}</div>}
    </div>
  );
}