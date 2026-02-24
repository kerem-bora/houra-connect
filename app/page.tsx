"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { sdk } from "@farcaster/frame-sdk"; 
import { useReadContract, useAccount } from 'wagmi';
import { useSendCalls } from 'wagmi/experimental'; 
import { formatUnits, encodeFunctionData, parseUnits } from 'viem';

// --- CONFIG ---
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 
const TOKEN_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }
] as const;

export default function Home() {
  // --- STATES ---
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isFarcaster, setIsFarcaster] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [location, setLocation] = useState("");
  const [offer, setOffer] = useState("");
  const [status, setStatus] = useState("");
  const [isAboutOpen, setIsAboutOpen] = useState(false);  
  const [sendAmount, setSendAmount] = useState("1");
  
  // Arama State'leri
  const [searchQuery, setSearchQuery] = useState(""); // Transfer için
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [needSearchQuery, setNeedSearchQuery] = useState(""); // Needs araması için
  const [needSearchResults, setNeedSearchResults] = useState<any[]>([]);

  const [offerQuery, setOfferQuery] = useState(""); // Offers araması için
  const [offerResults, setOfferResults] = useState<any[]>([]);

  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  
  // Yeni Need Ekleme State'leri
  const [needLocation, setNeedLocation] = useState("");
  const [needText, setNeedText] = useState("");
  const [needPrice, setNeedPrice] = useState("1");
  
  // Veri Listeleri
  const [needs, setNeeds] = useState<any[]>([]);
  const [lastOffers, setLastOffers] = useState<any[]>([]);

  const { address: currentAddress } = useAccount();
  const { sendCalls } = useSendCalls();

  // --- DATA FETCHING ---
  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  const fetchAllData = useCallback(async (fid?: number) => {
    try {
      if (fid) {
        const profRes = await fetch(`/api/profile?fid=${fid}`);
        const profData = await profRes.json();
        if (profData.profile) {
          setLocation(profData.profile.city || "");
          setOffer(profData.profile.talents || "");
        }
      }
      // En yeni 10 Need getir
      const needsRes = await fetch('/api/needs');
      const needsData = await needsRes.json();
      setNeeds(needsData.needs?.slice(0, 10) || []);

      // Son güncellenen 10 kullanıcı (Offer) getir
      const offersRes = await fetch('/api/search?q='); 
      const offersData = await offersRes.json();
      setLastOffers(offersData.users?.slice(0, 10) || []);

    } catch (e) { console.error("Fetch Error:", e); }
  }, []);

  // --- SDK INIT ---
  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await sdk.context;
        if (ctx?.user?.fid) {
          setContext(ctx);
          setIsFarcaster(true);
          await fetchAllData(ctx.user.fid);
        } else {
          await fetchAllData();
        }
        sdk.actions.ready();
      } catch (e) {
        await fetchAllData();
      } finally {
        setIsSDKLoaded(true);
      }
    };
    init();
  }, [fetchAllData]);

  // --- SEARCH LOGIC (Debounced) ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 1) {
        const res = await fetch(`/api/search?q=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } else setSearchResults([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (needSearchQuery.length > 1) {
        const res = await fetch(`/api/needs?q=${needSearchQuery}`);
        const data = await res.json();
        setNeedSearchResults(data.needs || []);
      } else setNeedSearchResults([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [needSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (offerQuery.length > 1) {
        const res = await fetch(`/api/search?q=${offerQuery}`);
        const data = await res.json();
        setOfferResults(data.users || []);
      } else setOfferResults([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [offerQuery]);

  // --- HANDLERS ---
  const handleTransfer = useCallback(async () => {
    if (!selectedRecipient?.wallet_address) return setStatus("Select recipient");
    sendCalls({
      calls: [{
        to: HOURA_TOKEN_ADDRESS as `0x${string}`,
        data: encodeFunctionData({
          abi: TOKEN_ABI,
          functionName: 'transfer',
          args: [selectedRecipient.wallet_address as `0x${string}`, parseUnits(sendAmount, 18)],
        }),
        value: 0n,
      }],
    }, {
      onSuccess: () => {
        setStatus("Success! ✅");
        setSelectedRecipient(null);
        setTimeout(() => { setStatus(""); refetchBalance(); }, 3000);
      }
    });
  }, [sendCalls, refetchBalance, selectedRecipient, sendAmount]);

  const handleAddNeed = async () => {
    if (!needText) return setStatus("Write your need.");
    if (!context?.user?.fid) return setStatus("Login required.");
    if (!currentAddress) return setStatus("Connect wallet.");
    
    try {
      setStatus("Posting...");
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-farcaster-fid": context.user.fid.toString() },
        body: JSON.stringify({
          fid: context.user.fid,
          username: context.user.username,
          location: needLocation || "Global",
          text: needText,
          wallet_address: currentAddress.toLowerCase(),
          price: needPrice.toString(),
        }),
      });

      if (res.ok) {
        setStatus("Need posted! ✅");
        setNeedText(""); setNeedLocation("");
        fetchAllData(context.user.fid);
        setTimeout(() => setStatus(""), 2000);
      } else {
        const data = await res.json();
        setStatus(`Error: ${data.error || "Failed"}`); 
      }
    } catch (e: any) { setStatus(`Error: ${e.message}`); }
  };

  const handleSaveProfile = async () => {
    if (!context?.user?.fid || !currentAddress) return setStatus("Error: Connection missing");
    try {
      setStatus("Saving...");
      const res = await fetch("/api/profile", { 
        method: "POST", 
        headers: { "Content-Type": "application/json", "x-farcaster-fid": context.user.fid.toString() }, 
        body: JSON.stringify({ 
          fid: Number(context.user.fid), 
          username: context.user.username, 
          city: location, 
          talents: offer, 
          address: currentAddress.toLowerCase() 
        }) 
      });
      if (res.ok) {
        setStatus("Profile Updated! ✅");
        fetchAllData(context.user.fid);
        setTimeout(() => setStatus(""), 2000);
      }
    } catch (e) { setStatus("Error saving profile"); }
  };  

  const handleDeleteNeed = async (id: string) => {
    if (!id || !context?.user?.fid || !currentAddress) return;
    try {
      setStatus("Deleting...");
      const res = await fetch(`/api/needs?id=${id}&fid=${context.user.fid}`, { 
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-farcaster-fid": context.user.fid.toString() },
        body: JSON.stringify({ address: currentAddress.toLowerCase() })
      });
      if (res.ok) {
        setNeeds(prev => prev.filter(n => n.id !== id));
        setStatus("Deleted! ✅");
        setTimeout(() => setStatus(""), 2000);
      }
    } catch (e) { setStatus("Error deleting"); }
  };

  // --- COMPONENTS ---
  const AboutContent = () => (
    <div style={{ background: '#111', border: '1px solid #333', borderRadius: '24px', padding: '25px', maxWidth: '400px', width: '100%', textAlign: 'left' }}>
      <h2 style={{ marginTop: 0 }}>Welcome to Houra</h2>
      <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>Houra is a peer-to-peer <strong>Time Economy</strong> platform.</p>
      <div style={{ margin: '20px 0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p>📍 <strong>Profile:</strong> Set your location and offer.</p>
        <p>⏳ <strong>Earn:</strong> Help others and collect Houra.</p>
        <p>🛠️ <strong>Post:</strong> Share what you need and reward others.</p>
      </div>
      <button onClick={() => setIsAboutOpen(false)} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Got it!</button>
    </div>
  );

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/houra-logo.png" alt="Houra" style={{ width: '40px', height: '40px' }} />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Houra</h1>
        </div>
        <button onClick={() => setIsAboutOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px' }}>i</button>
      </div>

      {isAboutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <AboutContent />
        </div>
      )}
      
      {/* 1. SEND PANEL */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '30px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND:</label>
        {!selectedRecipient ? (
          <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', outline: 'none' }} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
            <span>@{selectedRecipient.username}</span>
            <button onClick={() => setSelectedRecipient(null)} style={{ background: 'none', color: '#fff', fontSize: '0.7rem', border: 'none', textDecoration: 'underline' }}>Change</button>
          </div>
        )}
        {searchResults.length > 0 && !selectedRecipient && (
          <div style={{ background: '#111', borderRadius: '10px', marginTop: '5px', maxHeight: '150px', overflowY: 'auto' }}>
            {searchResults.map(u => <div key={u.fid} onClick={() => setSelectedRecipient(u)} style={{ padding: '10px', borderBottom: '1px solid #222', cursor: 'pointer' }}>@{u.username}</div>)}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', alignItems: 'center' }}>
          <input type="number" value={sendAmount} onChange={(e) => setNeedPrice(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', width: '50%', outline: 'none' }} />
          <span style={{ fontSize: '0.8rem' }}>Bal: {formattedBalance}</span>
        </div>
        <button onClick={handleTransfer} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#fff', color: '#000', fontWeight: 'bold', marginTop: '10px', border: 'none' }}>SEND HOURA</button>
      </div>

      {/* 2. AYARLAR (ADD NEED & PROFILE) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
        <details style={{ background: '#111', padding: '12px', borderRadius: '15px', border: '1px solid #222' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>➕ Add Your Need</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <input placeholder="Location" value={needLocation} onChange={(e) => setNeedLocation(e.target.value)} style={{ padding: '10px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
            <textarea placeholder="What do you need?" value={needText} onChange={(e) => setNeedText(e.target.value)} style={{ padding: '10px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
            <button onClick={handleAddNeed} style={{ padding: '10px', background: '#fff', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none' }}>POST NEED</button>
          </div>
        </details>

        <details style={{ background: '#111', padding: '12px', borderRadius: '15px', border: '1px solid #222' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>⚙️ Profile Settings</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <input placeholder="City" value={location} onChange={(e) => setLocation(e.target.value)} style={{ padding: '10px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
            <textarea placeholder="Your talents" value={offer} onChange={(e) => setOffer(e.target.value)} style={{ padding: '10px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
            <button onClick={handleSaveProfile} style={{ padding: '10px', background: '#333', color: '#fff', borderRadius: '8px', border: 'none' }}>SAVE PROFILE</button>
          </div>
        </details>
      </div>

      <hr style={{ borderColor: '#222', margin: '30px 0' }} />

      {/* 3. LATEST NEEDS */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Latest Needs</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {needs.map((n, i) => (
            <div key={i} style={{ padding: '15px', background: '#111', borderRadius: '15px', border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>@{n.username}</span>
                {Number(n.fid) === Number(context?.user?.fid) && <button onClick={() => handleDeleteNeed(n.id)} style={{ color: '#ff4444', fontSize: '0.7rem', background: 'none', border: 'none', textDecoration: 'underline' }}>Delete</button>}
              </div>
              <p style={{ fontSize: '0.9rem', margin: '8px 0', color: '#ccc' }}>{n.text}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#666' }}>
                <span>📍 {n.location}</span>
                <span style={{ color: '#2563eb', fontWeight: 'bold' }}>⏳ {n.price || "1"} Houra</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. SEARCH FOR NEEDS */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Search for Needs</h3>
        <input placeholder="Search keywords..." value={needSearchQuery} onChange={(e) => setNeedSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#111', border: '1px solid #333', color: '#fff' }} />
        {needSearchResults.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {needSearchResults.map((sn, idx) => <div key={idx} style={{ padding: '10px', background: '#0a0a0a', borderRadius: '10px', border: '1px solid #1e40af', fontSize: '0.85rem' }}><strong>@{sn.username}:</strong> {sn.text}</div>)}
          </div>
        )}
      </div>

      {/* 5. LAST UPDATED OFFERS */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Last Updated Offers</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lastOffers.map((u: any) => (
            <div key={u.fid} style={{ padding: '12px', background: '#111', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>@{u.username}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>📍 {u.city || "Global"} • {u.talents || "No offer"}</p>
              </div>
              <button onClick={() => sdk.actions.viewProfile({ fid: Number(u.fid) })} style={{ color: '#2563eb', border: 'none', background: 'none', fontSize: '0.75rem', fontWeight: 'bold' }}>VIEW</button>
            </div>
          ))}
        </div>
      </div>

      {/* 6. SEARCH FOR OFFERS */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Search for Specific Offers</h3>
        <input placeholder="Search keywords..." value={offerQuery} onChange={(e) => setOfferQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#111', border: '1px solid #333', color: '#fff' }} />
        {offerResults.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {offerResults.map(u => (
              <div key={u.fid} style={{ padding: '12px', background: '#111', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><p style={{ margin: 0, fontWeight: 'bold' }}>@{u.username}</p><p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>{u.talents}</p></div>
                <button onClick={() => sdk.actions.viewProfile({ fid: Number(u.fid) })} style={{ color: '#2563eb', border: 'none', background: 'none', fontSize: '0.75rem' }}>VIEW</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#000', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 3000 }}>{status}</div>
      )}
      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#444' }}>Houra Time Economy © 2026</p>
    </div>
  );
}