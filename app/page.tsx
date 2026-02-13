"use client";
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
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isFarcaster, setIsFarcaster] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [location, setLocation] = useState("");
  const [offer, setOffer] = useState("");
  const [status, setStatus] = useState("");
  const [isAboutOpen, setIsAboutOpen] = useState(false); 
  
  // States
  const [sendAmount, setSendAmount] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [offerQuery, setOfferQuery] = useState("");
  const [offerResults, setOfferResults] = useState<any[]>([]);
  const [needLocation, setNeedLocation] = useState("");
  const [needText, setNeedText] = useState("");
  const [needPrice, setNeedPrice] = useState("1");
  const [needs, setNeeds] = useState<any[]>([]);

  const { address: currentAddress } = useAccount();
  const { sendCalls } = useSendCalls();

  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  // --- FETCH LOGIC: Profil ve Needs Senkronizasyonu ---
  const fetchAllData = useCallback(async (fid?: number) => {
    try {
      // 1. Needs listesini her zaman çek
      const needsRes = await fetch('/api/needs');
      const needsData = await needsRes.json();
      if (needsData.needs) setNeeds(needsData.needs);

      // 2. Profil Çekme (Eğer FID varsa)
      if (fid) {
        const profRes = await fetch(`/api/profile?fid=${fid}`);
        const profData = await profRes.json();
        
        if (profData.profile) {
          setLocation(profData.profile.city || "");
          // ÖNEMLİ: API'den gelen field 'talents' ise onu setliyoruz
          setOffer(profData.profile.talents || profData.profile.bio || "");
        }
      }
    } catch (e) { 
      console.error("Veri çekme hatası:", e); 
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        
        // Context geldiyse FID ile, gelmediyse genel çek
        const userFid = ctx?.user?.fid;
        if (userFid) {
          setIsFarcaster(true);
          await fetchAllData(userFid);
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

  // --- ACTIONS ---
  const handleAddNeed = async () => {
    if (!needText) return setStatus("Write your need.");
    if (needText.length > 280) return setStatus("Max 280 characters.");
    if (!context?.user?.fid) return setStatus("Farcaster login required.");

    setStatus("Posting...");
    try {
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: Number(context.user.fid),
          username: context.user.username,
          location: needLocation || "Global",
          text: needText,
          wallet_address: currentAddress || "", 
          price: needPrice.toString()
        }),
      });

      if (res.ok) {
        setStatus("Need posted! ✅");
        setNeedText(""); 
        setNeedLocation("");
        await fetchAllData(context.user.fid); // Listeyi ve profili tazele
        setTimeout(() => setStatus(""), 2000);
      } else {
        const data = await res.json();
        setStatus(`Error: ${data.error || "Failed"}`);
      }
    } catch (e) { setStatus("Error"); }
  };

  const handleSaveProfile = async () => {
    if (!context?.user?.fid) return setStatus("Farcaster context missing.");
    setStatus("Saving...");
    try {
      const res = await fetch("/api/profile", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          fid: context.user.fid, 
          username: context.user.username, 
          pfp: context.user.pfpUrl, 
          city: location, 
          talents: offer, 
          address: currentAddress || "" 
        }) 
      });
      if (res.ok) {
        setStatus("Profile Saved! ✅");
        setTimeout(() => setStatus(""), 2000);
      }
    } catch (e) { setStatus("Save error"); }
  };

  const handleDeleteNeed = async (id: string) => {
    if (!id || !context?.user?.fid) return;
    setStatus("Deleting...");
    try {
      const res = await fetch(`/api/needs?id=${id}&fid=${context.user.fid}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNeeds(prev => prev.filter(n => n.id !== id));
        setStatus("Deleted! ✅");
        setTimeout(() => setStatus(""), 2000);
      }
    } catch (e) { setStatus("Delete error"); }
  };

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/houra-logo.png" alt="Houra" style={{ width: '40px', height: '40px' }} />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Houra</h1>
        </div>
        <button onClick={() => setIsAboutOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px' }}>i</button>
      </div>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '25px', marginLeft: '52px' }}>Time Economy</p>

      {/* 1. SEND PANEL */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
        {!selectedRecipient ? (
          <div style={{ position: 'relative' }}>
            <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: '10px 15px', borderRadius: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>@{selectedRecipient.username}</span>
            <button onClick={() => setSelectedRecipient(null)} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '0.8rem' }}>Change</button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
          <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} style={{ width: '50%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 'bold', outline: 'none' }} />
          <span style={{ fontSize: '0.8rem' }}>Bal: {formattedBalance}</span>
        </div>
        <button style={{ width: '100%', padding: '15px', borderRadius: '16px', background: selectedRecipient ? '#fff' : 'rgba(255,255,255,0.3)', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '10px' }}>SEND {sendAmount} HOURA</button>
      </div>

      {/* 2. ADD NEED */}
      <details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>➕ Add Your Need</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <input placeholder="Location" value={needLocation} onChange={(e) => setNeedLocation(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} />
          <textarea 
            placeholder="What do you need? (Max 280 chars)" 
            value={needText} 
            maxLength={280}
            onChange={(e) => setNeedText(e.target.value)} 
            style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '80px', resize: 'none' }} 
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: needText.length >= 280 ? 'red' : '#666' }}>{needText.length}/280</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input type="number" value={needPrice} onChange={(e) => setNeedPrice(e.target.value)} style={{ width: '50px', padding: '5px', background: '#000', color: '#fff', border: '1px solid #333' }} />
              <span style={{ fontSize: '0.8rem' }}>Houra</span>
            </div>
          </div>
          <button onClick={handleAddNeed} style={{ padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>POST NEED</button>
        </div>
      </details>

      {/* 3. PROFILE SETTINGS */}
      <details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>⚙️ Profile Settings</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} />
          <textarea placeholder="What do you offer?" value={offer} onChange={(e) => setOffer(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '60px' }} />
          <button onClick={handleSaveProfile} style={{ padding: '12px', background: '#333', color: '#fff', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>SAVE PROFILE</button>
        </div>
      </details>

      {/* 4. LATEST NEEDS */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Latest Needs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '100px' }}>
        {needs.length === 0 ? (
          <p style={{ color: '#444', textAlign: 'center' }}>No needs found yet.</p>
        ) : (
          needs.map((need: any) => (
            <div key={need.id} style={{ padding: '16px', background: '#111', borderRadius: '20px', border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>@{need.username}</span>
                {context?.user?.fid && Number(need.fid) === Number(context.user.fid) && (
                  <button onClick={() => handleDeleteNeed(need.id)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.7rem', cursor: 'pointer' }}>Delete</button>
                )}
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ccc' }}>{need.text}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#666' }}>📍 {need.location} • <span style={{ color: '#2563eb' }}>⏳ {need.price} Houra</span></span>
                <button onClick={() => sdk.actions.viewProfile({ fid: Number(need.fid) })} style={{ color: '#2563eb', background: 'none', border: 'none', fontSize: '0.75rem', fontWeight: 'bold' }}>VIEW</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* STATUS BAR */}
      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#111', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 1000 }}>
          {status}
        </div>
      )}
    </div>
  );
}