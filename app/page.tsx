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

// --- SUB-COMPONENTS ---
const MenuGrid = ({ onItemClick }: { onItemClick: (type: string) => void }) => {
  const menuItems = [
    { id: 'needs', label: 'Needs', color: '#2563eb' },
    { id: 'offers', label: 'Offers', color: '#2563eb' },
    { id: 'active', label: 'Members', color: '#2563eb' },
    { id: 'groups', label: 'Communities', color: '#2563eb' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '20px 0' }}>
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onItemClick(item.id)}
          style={{
            padding: '15px', borderRadius: '16px', background: '#111',
            border: `1px solid ${item.color}44`, color: item.color,
            fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default function Home() {
  // --- STATES ---
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isFarcaster, setIsFarcaster] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<"needs" | "groups" | "offers" | "active" | null>(null);
  const [location, setLocation] = useState("");
  const [offer, setOffer] = useState("");
  const [status, setStatus] = useState("");
  const [isAboutOpen, setIsAboutOpen] = useState(false);  
  const [sendAmount, setSendAmount] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [offerQuery, setOfferQuery] = useState("");
  const [offerResults, setOfferResults] = useState<any[]>([]); // null yerine [] yapıldı
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

  // --- SEARCH LOGIC ---
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

  const handleAddNeed = async () => {
    if (!needText) return setStatus("Write your need.");
    if (!context?.user?.fid) return setStatus("Base or Farcaster login required.");
    if (!currentAddress) return setStatus("Connect wallet first.");
    
    try {
      setStatus("Posting...");
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-farcaster-fid": context.user.fid.toString() 
        },
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
        const nRes = await fetch('/api/needs');
        const nData = await nRes.json();
        setNeeds(nData.needs || []);
        setTimeout(() => setStatus(""), 2000);
      } else {
        const data = await res.json();
        setStatus(`Error: ${data.error || "Failed"}`); 
      }
    } catch (e: any) { setStatus(`Error: ${e.message}`); }
  };

  const handleSaveProfile = async () => {
    if (!context?.user?.fid || !currentAddress) {
      setStatus("Error: Connection missing");
      return;
    }
    
    try {
      setStatus("Saving...");
      const res = await fetch("/api/profile", { 
        method: "POST", 
        headers: { 
          "Content-Type": "application/json",
          "x-farcaster-fid": context.user.fid.toString()
        }, 
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
        setTimeout(() => setStatus(""), 2000);
      } else {
        const errData = await res.json();
        setStatus(`Error: ${errData.error || "Failed"}`);
      }
    } catch (e) { 
      setStatus("Error saving profile"); 
    }
  };  

  const handleDeleteNeed = async (id: string) => {
    if (!id || !context?.user?.fid || !currentAddress) return;
    
    try {
      setStatus("Deleting...");
      const res = await fetch(`/api/needs?id=${id}&fid=${context.user.fid}`, { 
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "x-farcaster-fid": context.user.fid.toString() 
        },
        body: JSON.stringify({
          address: currentAddress.toLowerCase()
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

  const AboutContent = () => (
    <div style={{ background: '#111', border: '1px solid #333', borderRadius: '24px', padding: '25px', maxWidth: '400px', width: '100%', position: 'relative', textAlign: 'left' }}>
      <h2 style={{ marginTop: 0 }}>Welcome to Houra</h2>
      <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>
        Houra is a peer-to-peer <strong>Time Economy</strong> platform where you exchange your skills for time-based tokens.
      </p>
      {/* ... diğer About içerikleri ... */}
      <button onClick={() => setIsAboutOpen(false)} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '15px', cursor: 'pointer' }}>
        Got it!
      </button>
    </div>
  );

  const randomOffers = offerResults.length > 0 
    ? [...offerResults].sort(() => 0.5 - Math.random()).slice(0, 10) 
    : [];

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;

  if (!isFarcaster) {
    return (
      <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/houra-logo.png" alt="Houra" style={{ width: '80px', marginBottom: '20px' }} />
        <AboutContent />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Üst Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/houra-logo.png" alt="Houra" style={{ width: '40px' }} />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Houra</h1>
        </div>
        <button onClick={() => setIsAboutOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px' }}>i</button>
      </div>

      {isAboutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <AboutContent />
        </div>
      )}

      {/* Transfer Paneli */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #2563eb 0%, #7e22ce 100%)', marginBottom: '20px', marginTop: '20px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
        {!selectedRecipient ? (
          <div style={{ position: 'relative' }}>
            <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} />
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', borderRadius: '12px', zIndex: 100 }}>
                {searchResults.map(user => (
                  <div key={user.fid} onClick={() => { setSelectedRecipient(user); setSearchResults([]); }} style={{ padding: '12px', borderBottom: '1px solid #222' }}>
                    @{user.username}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
            <span>@{selectedRecipient.username}</span>
            <button onClick={() => setSelectedRecipient(null)} style={{ background: 'none', color: '#fff', border: 'none' }}>Change</button>
          </div>
        )}
        <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 'bold', marginTop: '10px' }} />
        <button onClick={handleTransfer} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: '#fff', color: '#000', fontWeight: 'bold', marginTop: '10px' }}>SEND</button>
      </div>

      <MenuGrid onItemClick={(type) => setActiveModal(type as any)} />

      {/* Profile & Need Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
         {/* Buraya sizin "Details" bloklarınız gelecek (Add Need, Profile Settings vb.) */}
      </div>

      {/* Modal Logic */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', padding: '25px', borderRadius: '24px', width: '100%', position: 'relative' }}>
            <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: 10, right: 10, color: '#fff' }}>✕</button>
            {/* Modal İçeriği */}
            <h3 style={{ color: '#2563eb' }}>{activeModal.toUpperCase()}</h3>
          </div>
        </div>
      )}

      {status && <div style={{ position: 'fixed', bottom: 20, left: 20, right: 20, background: '#000', border: '1px solid #2563eb', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>{status}</div>}
    </div>
  );
}