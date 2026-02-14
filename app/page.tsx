"use client";

import { useEffect, useState, useCallback } from "react";
// OnchainKit'in yeni nesil doğrulama hook'u
import { useAuthenticate } from '@coinbase/onchainkit/minikit'; 
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
  // --- ONCHAINKIT AUTH ---
  const { user: authUser, authenticate } = useAuthenticate();

  // --- STATES ---
  const [location, setLocation] = useState("");
  const [offer, setOffer] = useState("");
  const [status, setStatus] = useState("");
  const [isAboutOpen, setIsAboutOpen] = useState(false);  
  const [sendAmount, setSendAmount] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [offerQuery, setOfferQuery] = useState("");
  const [offerResults, setOfferResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [needLocation, setNeedLocation] = useState("");
  const [needText, setNeedText] = useState("");
  const [needPrice, setNeedPrice] = useState("1");
  const [needs, setNeeds] = useState<any[]>([]);

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
      const needsRes = await fetch('/api/needs');
      const needsData = await needsRes.json();
      setNeeds(needsData.needs || []);
    } catch (e) { console.error("Fetch Error:", e); }
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    // authUser varsa otomatik yükle, yoksa sadece genel verileri getir
    if (authUser?.fid) {
      fetchAllData(Number(authUser.fid));
    } else {
      fetchAllData();
    }
  }, [authUser, fetchAllData]);

  // --- SEARCH LOGIC (Existing) ---
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

  // GÜVENLİ POST İŞLEMİ
  const handleAddNeed = async () => {
    if (!needText) return setStatus("Write your need.");
    
    try {
      setStatus("Authenticating...");
      // Her kritik işlemde güncel imza alıyoruz
      const auth = authUser || await authenticate();
      if (!auth) return setStatus("Authentication required.");

      setStatus("Posting...");
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: auth.fid,
          message: auth.message,
          signature: auth.signature,
          username: auth.username,
          location: needLocation || "Global",
          text: needText,
          wallet_address: currentAddress, 
          price: needPrice.toString(),
        }),
      });

      if (res.ok) {
        setStatus("Need posted! ✅");
        setNeedText(""); setNeedLocation("");
        fetchAllData();
        setTimeout(() => setStatus(""), 2000);
      } else {
        const data = await res.json();
        setStatus(`Error: ${data.error || "Failed"}`); 
      }
    } catch (e: any) { setStatus(`Error: ${e.message}`); }
  };

  // GÜVENLİ PROFİL KAYDI
  const handleSaveProfile = async () => {
    try {
      setStatus("Authenticating...");
      const auth = authUser || await authenticate();
      if (!auth) return setStatus("Authentication required.");

      setStatus("Saving...");
      const res = await fetch("/api/profile", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          fid: auth.fid, 
          message: auth.message,
          signature: auth.signature,
          username: auth.username, 
          city: location, 
          talents: offer, 
          address: currentAddress
        }) 
      });
      
      if (res.ok) {
        setStatus("Profile Updated! ✅");
        setTimeout(() => setStatus(""), 2000);
      } else {
        const errData = await res.json();
        setStatus(`Error: ${errData.error || "Failed"}`);
      }
    } catch (e) { 
      setStatus("Error saving profile"); 
    }
  };      

  // GÜVENLİ SİLME İŞLEMİ
  const handleDeleteNeed = async (id: string) => {
    try {
      setStatus("Authenticating...");
      const auth = authUser || await authenticate();
      if (!auth) return;

      setStatus("Deleting...");
      const res = await fetch(`/api/needs?id=${id}`, { 
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: auth.fid,
          message: auth.message,
          signature: auth.signature
        })
      });

      if (res.ok) {
        setNeeds(prev => prev.filter(n => n.id !== id));
        setStatus("Deleted! ✅");
        setTimeout(() => setStatus(""), 2000);
      } else {
        const err = await res.json();
        setStatus(err.error || "Delete failed");
      }
    } catch (e) { setStatus("Error deleting"); }
  };

  // --- RENDER ---
  // authUser yoksa login ekranı gösterilebilir. Şimdilik arayüzü koruyorum.
  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/houra-logo.png" alt="Houra" style={{ width: '40px', height: '40px' }} />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Houra</h1>
        </div>
        {!authUser ? (
          <button onClick={() => authenticate()} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold' }}>Login</button>
        ) : (
          <button onClick={() => setIsAboutOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px' }}>i</button>
        )}
      </div>

      {/* SEND PANEL (Kısaltıldı) */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
        {!selectedRecipient ? (
          <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
            <span>@{selectedRecipient.username}</span>
            <button onClick={() => setSelectedRecipient(null)} style={{ background: 'none', color: '#fff', border: 'none' }}>Change</button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
          <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 'bold', outline: 'none', width: '50%' }} />
          <span>Bal: {formattedBalance}</span>
        </div>
        <button onClick={handleTransfer} disabled={!selectedRecipient} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: '#fff', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '10px' }}>SEND</button>
      </div>

      {/* ACTIONS (Add Need & Profile) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <details style={{ background: '#111', padding: '12px', borderRadius: '15px' }}>
          <summary style={{ cursor: 'pointer', color: '#9ca3af' }}>➕ Add Your Need</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
             <input placeholder="Location" value={needLocation} onChange={(e) => setNeedLocation(e.target.value)} style={{ padding: '12px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '10px' }} />
             <textarea placeholder="What do you need?" value={needText} onChange={(e) => setNeedText(e.target.value)} style={{ padding: '12px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '10px' }} />
             <button onClick={handleAddNeed} style={{ padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>POST</button>
          </div>
        </details>

        <details style={{ background: '#111', padding: '12px', borderRadius: '15px' }}>
          <summary style={{ cursor: 'pointer', color: '#9ca3af' }}>⚙️ Profile Settings</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
             <input placeholder="City" value={location} onChange={(e) => setLocation(e.target.value)} style={{ padding: '12px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '10px' }} />
             <textarea placeholder="Talents" value={offer} onChange={(e) => setOffer(e.target.value)} style={{ padding: '12px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '10px' }} />
             <button onClick={handleSaveProfile} style={{ padding: '12px', background: '#333', color: '#fff', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>SAVE</button>
          </div>
        </details>
      </div>

      {/* LATEST NEEDS */}
      <h3 style={{ marginTop: '20px' }}>Latest Needs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {needs.map((need: any) => (
          <div key={need.id} style={{ padding: '16px', background: '#111', borderRadius: '20px', border: '1px solid #222' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>@{need.username}</span>
              {authUser?.fid && Number(need.fid) === Number(authUser.fid) && (
                <button onClick={() => handleDeleteNeed(need.id)} style={{ color: '#ff4444', background: 'none', border: 'none', textDecoration: 'underline', fontSize: '0.7rem' }}>Delete</button>
              )}
            </div>
            <p style={{ color: '#ccc', fontSize: '0.9rem' }}>{need.text}</p>
            <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>⏳ {need.price} Houra • 📍 {need.location}</span>
          </div>
        ))}
      </div>

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#000', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center' }}>
          {status}
        </div>
      )}
    </div>
  );
}