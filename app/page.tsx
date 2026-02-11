"use client";
import { useEffect, useState } from "react";
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
// OnchainKit'in en güncel sürümünde genellikle ana dizinden çekilir
import { useViewProfile } from '@coinbase/onchainkit';

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [profileData, setProfileData] = useState({ city: "", bio: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [status, setStatus] = useState("");

  const { address } = useAccount();

  // --- BALANCE (Direct 0 Logic) ---
  const { data: rawBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  // --- FETCH USER DATA ---
  useEffect(() => {
    const fetchMyProfile = async () => {
      // Not: Mini App ortamında FID'yi OnchainKit üzerinden almak en sağlıklısıdır
      // Şimdilik mevcut mantığını koruyup bio/city senkronizasyonunu düzeltiyoruz
      try {
        const res = await fetch(`/api/profile?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfileData({
              city: data.profile.city || "",
              bio: data.profile.bio || ""
            });
          }
        }
      } catch (e) { console.error(e); }
      setIsLoaded(true);
    };

    if (address) fetchMyProfile();
    else setIsLoaded(true);
  }, [address]);

  // --- SEARCH ---
  useEffect(() => {
    const search = setTimeout(async () => {
      if (searchQuery.length > 1) {
        const res = await fetch(`/api/search?q=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } else setSearchResults([]);
    }, 500);
    return () => clearTimeout(search);
  }, [searchQuery]);

  // --- PROFILE COMPONENT (Native Base App Logic) ---
  const ViewBaseProfile = ({ fid, walletAddress }: { fid: number, walletAddress: string }) => {
    // OnchainKit hook'u: Base App içinde native profil kartını açar
    const viewProfile = useViewProfile({ address: walletAddress as `0x${string}` });

    return (
      <button 
        onClick={viewProfile}
        style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        VIEW PROFILE
      </button>
    );
  };

  if (!isLoaded) return <div style={{ background: '#000', color: '#fff', padding: '50px', textAlign: 'center' }}>Loading Time Economy...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Houra</h1>
      <p style={{ color: '#666', margin: '0 0 20px 0', fontSize: '0.9rem' }}>Time Economy</p>
      
      <div style={{ margin: '20px 0', padding: '20px', borderRadius: '15px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.8 }}>MY BALANCE</p>
        <h2 style={{ margin: '5px 0 0 0', fontSize: '2rem' }}>
          {formattedBalance} <span style={{ fontSize: '1rem' }}>Houra</span>
        </h2>
      </div>

      <details style={{ marginBottom: '30px', background: '#111', borderRadius: '12px', padding: '10px' }}>
        <summary style={{ cursor: 'pointer', padding: '10px', fontWeight: 'bold', color: '#9ca3af' }}>
          {profileData.city ? `📍 ${profileData.city} | Edit` : "👤 Setup Profile"}
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          <input placeholder="City" value={profileData.city} onChange={(e) => setProfileData({...profileData, city: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }} />
          <textarea placeholder="Talents" value={profileData.bio} onChange={(e) => setProfileData({...profileData, bio: e.target.value})} style={{ width: '100%', padding: '12px', height: '60px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }} />
          <button style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px' }}>UPDATE</button>
        </div>
      </details>

      <hr style={{ border: '0.5px solid #222', margin: '30px 0' }} />

      <h3>Search</h3>
      <input placeholder="Search talent or city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #2563eb', background: '#000', color: '#fff', marginBottom: '20px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {searchResults.map((user) => (
          <div key={user.fid} style={{ padding: '15px', background: '#111', borderRadius: '12px', border: '1px solid #222' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>@{user.username} 📍 {user.city || "Global"}</p>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '8px 0 12px 0' }}>{user.bio}</p>
            
            {/* Wallet adresi üzerinden native profil tetikleyici */}
            <ViewBaseProfile fid={user.fid} walletAddress={user.wallet_address} />
          </div>
        ))}
      </div>
    </div>
  );
}