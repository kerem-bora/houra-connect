"use client";


import Link from "next/link";

import { useEffect, useState, useCallback } from "react";
import { useReadContract, useAccount, useConnect, useSignMessage, 
  usePublicClient } from 'wagmi';
import { useSendCalls } from 'wagmi/experimental'; 
import { formatUnits, encodeFunctionData, parseUnits } from 'viem';


// --- CONFIG ---

const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 

const TOKEN_ABI = [

  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] },

  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }

] as const;

const MenuGrid = ({ onItemClick }: { onItemClick: (type: string) => void }) => {
  const menuItems = [
    { id: 'needs', label: 'Needs', color: '#2563eb' },
    { id: 'offers', label: 'Offers', color: '#2563eb' },
    { id: 'active members', label: 'Active Members', color: '#2563eb' },
    { id: 'communities', label: 'Communities', color: '#2563eb' },
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

  

  const { address: currentAddress, isConnected } = useAccount(); 

  const { connect, connectors } = useConnect();

  const { signMessageAsync } = useSignMessage();

  const publicClient = usePublicClient();
  
   const handleSignIn = () => {
    connect({ connector: connectors[0] }); 
  };
  
  const [location, setLocation] = useState("");

  const [offer, setOffer] = useState("");

  const [status, setStatus] = useState("");

  const [isAboutOpen, setIsAboutOpen] = useState(false);  

  const [sendAmount, setSendAmount] = useState("1");

  const [searchQuery, setSearchQuery] = useState("");

  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [offerQuery, setOfferQuery] = useState("");

  const [offerResults, setOfferResults] = useState<any[]>([]);

  const [searchOfferResults, setSearchOfferResults] = useState<any[]>([]);

  const [selectedMember, setSelectedMember] = useState<any>(null);

  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);

  const [needLocation, setNeedLocation] = useState("");

  const [needText, setNeedText] = useState("");

  const [needPrice, setNeedPrice] = useState("1");

  const [needs, setNeeds] = useState<any[]>([]);

  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [nickname, setNickname] = useState(""); 

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



const fetchAllData = useCallback(async () => {
  try {
    const promises: Promise<any>[] = [
      fetch('/api/needs').then(res => res.json()),
      fetch('/api/profile').then(res => res.json())
    ];

    // Eğer cüzdan bağlıysa kullanıcının kendi profilini çek
    if (currentAddress) {
      promises.push(fetch(`/api/profile?address=${currentAddress.toLowerCase()}`).then(res => res.json()));
    }

    const [needsData, membersData, userData] = await Promise.all(promises);
    
    if (needsData) setNeeds(needsData.needs || []);
    if (membersData) setOfferResults(membersData.profiles || []);
    if (userData?.profile) {
      setLocation(userData.profile.city || "");
      setOffer(userData.profile.talents || "");
      setNickname(userData.profile.nick || "");
    }
  } catch (e) { 
    console.error("Fetch Error:", e); 
  }
}, [currentAddress]);



// --- Format username ---

const formatUsername = (user: any) => {
  if (!user) return "Anonymous";

  const nameToDisplay = user.display_name || user.nick || user.username || "Anonymous";

  return nameToDisplay;
};

// --- INIT ---

useEffect(() => {
const init = async () => {
    try {
      await fetchAllData(); 
    } catch (e: any) {
      console.error("Init Error:", e);
    } finally {
      setIsLoading(false); 
  
    }
  };

  init();
}, [fetchAllData]);



// --- LIVE SEARCH LOGIC ---

useEffect(() => {
  
  if (!offerQuery.trim()) {
    setSearchOfferResults([]);
    return;
  }

    const filtered = offerResults.filter((user: any) => {
    const searchTerm = offerQuery.toLowerCase();
    
    return (
      (user.nick?.toLowerCase().includes(searchTerm)) ||
      (user.city?.toLowerCase().includes(searchTerm)) ||
      (user.talents?.toLowerCase().includes(searchTerm)) ||
      (user.bio?.toLowerCase().includes(searchTerm))
    );
  });

  setSearchOfferResults(filtered);
}, [offerQuery, offerResults]);



// --- Active members ---

const [leaderboard, setLeaderboard] = useState<any[]>([]);

const fetchLeaderboardData = useCallback(async () => {
  try {
    const response = await fetch('/api/members');
    const data = await response.json();
    
    if (response.ok) {
      setLeaderboard(data);
    } else {
      console.error("Leaderboard fetch error:", data.error);
    }
  } catch (err) {
    console.error("Network error:", err);
  }
}, []);

useEffect(() => {
  if (activeModal === 'active members') {
    fetchLeaderboardData();
  }
}, [activeModal, fetchLeaderboardData]);


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

      capabilities: {
      paymasterService: {
        url: `https://api.developer.coinbase.com/rpc/v1/base/pzrnQ3H4MpjsKXUCTazE2lDeDrk7tj9E`,
      },
    },

    }, {

      onSuccess: () => {

        setStatus("Success! ✅");

        setSelectedRecipient(null);

        setTimeout(() => { setStatus(""); refetchBalance(); }, 3000);

      }

    });

  }, [sendCalls, refetchBalance, selectedRecipient, sendAmount]);


const handleAddNeed = async () => {
    if (!needText) return setStatus("Please describe your need.");
    if (!currentAddress) return setStatus("Wallet connection missing.");
    
    try {
      setStatus("Posting...");
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"},
        body: JSON.stringify({
          address: currentAddress.toLowerCase(),
          username: nickname || "Anonymous", 
          location: needLocation || "Global",
          text: needText,
          wallet_address: currentAddress.toLowerCase(),
          price: needPrice.toString(),
        }),
      });

      if (res.ok) {
        setStatus("Need posted successfully! ✅");
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
    if (!currentAddress) {
      setStatus("Error: Authentication required");
      return;
    }
    
    try {
      setStatus("Saving changes...");
      const res = await fetch("/api/profile", { 
        method: "POST", 
        headers: { 
          "Content-Type": "application/json" },
        body: JSON.stringify({ 
          address: currentAddress.toLowerCase(),
          nick: nickname,
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
   if (!id || !currentAddress) return;
  
  try {
    setStatus("Deleting...");
    
      const res = await fetch(`/api/needs?id=${id}`, { 
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
       address: currentAddress.toLowerCase() 
      })
    });

    const data = await res.json(); 

    if (res.ok && data.success) {
      setNeeds(prev => prev.filter(n => n.id !== id));
      setStatus("Deleted! ✅");
  
       await fetchAllData(); 
    } else {
      setStatus(`Error: ${data.error || "Delete failed"}`);
    }
  } catch (e) { 
    setStatus("Error deleting"); 
  } finally {
    setTimeout(() => setStatus(""), 3000);
  }
};

  // --- COMPONENTS ---

 const AboutContent = () => (
  <div style={{ background: '#111', border: '1px solid #333', borderRadius: '24px', padding: '25px', maxWidth: '400px', width: '100%', position: 'relative', textAlign: 'left' }}>
    <h2 style={{ marginTop: 0 }}>Welcome to Houra</h2>
    <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>
      Houra is a peer-to-peer <strong>Time Economy</strong> platform where you exchange your skills for time-based tokens.
    </p>
    <div style={{ margin: '20px 0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p>📍 <strong>Profile:</strong> Set your location and what you offer to the community.</p>
      <p>⏳ <strong>Earn:</strong> Help others with their needs and collect Houra tokens.</p>
      <p>🛠️ <strong>Post:</strong> Share what you need and reward those who give their time.</p>
    </div>

    {!isAuthenticated && (
      <>
        <hr style={{ borderColor: '#222' }} />
        <div style={{ margin: '20px 0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p><strong>To Join Houra:</strong></p>
          <p>1. Download the <a href="https://join.base.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontWeight: 'bold', marginLeft: '5px', textDecoration: 'underline' }}> Base app</a> .</p>
          <p>2. Create your wallet.</p>
          <p>3. Search for <strong>"Houra"</strong> in the Base App and open it.</p>
          <p>4. Register by <strong>saving your location and what you offer</strong>.</p>
        </div>
      </>
    )}

    <p style={{ fontSize: '0.8rem', color: '#666', borderTop: '1px solid #222', paddingTop: '15px' }}>
     Read more about <Link href="https://en.wikipedia.org/wiki/Time-based_currency" style={{ color: '#2563eb', marginLeft: '5px', textDecoration: 'underline' }}>
  Time-based currencies
</Link>.
    </p>

    {isAuthenticated && (
      <>
        <hr style={{ borderColor: '#222' }} />
        <div style={{ margin: '20px 0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p><strong>To Join Houra:</strong></p>
          <p>1. Create your Base App wallet.</p>
          <p>2. Register by <strong>saving your location and what you offer</strong>.</p>
        </div>
        <button onClick={() => setIsAboutOpen(false)} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '15px', cursor: 'pointer' }}>
          Got it!
        </button>
      </>
    )}
  </div>
  );


// --- RENDER ---

// Yükleme ekranı
if (isLoading) {
  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Loading Houra...</p>
    </div>
  );
}

if (!isConnected) { 
  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <img src="/houra-logo.png" alt="Houra" style={{ width: '80px', height: '80px', marginBottom: '20px' }} />
      
      <AboutContent />

      <button 
        onClick={handleSignIn}
        style={{ 
          marginTop: '20px', 
          padding: '15px 30px', 
          background: '#fff', 
          color: '#000', 
          borderRadius: '12px', 
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Connect with Base App
      </button>

      <p style={{ marginTop: '30px', fontSize: '0.75rem', color: '#444' }}>Houra Time Economy - 2026</p>
    </div>
  );
}


  return (

    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          <img src="/houra-logo.png" alt="Houra" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />

          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Houra</h1>

        </div>

        <button onClick={() => setIsAboutOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontStyle: 'italic', fontFamily: 'serif', fontSize: '1.1rem' }}>i</button>

      </div>

      {isAboutOpen && (

        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>

          <AboutContent />

        </div>

      )}

      

      {/* 1. SEND PANEL */}

     <p></p>

      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px' }}>

        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>

        {!selectedRecipient ? (

          <div style={{ position: 'relative' }}>

            <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />

            {searchResults.length > 0 && (

              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', borderRadius: '12px', marginTop: '5px', zIndex: 100, border: '1px solid #333', maxHeight: '150px', overflowY: 'auto' }}>

                {searchResults.map(user => (

                  <div key={user.wallet_address || user.address} onClick={() => { setSelectedRecipient(user); setSearchResults([]); setSearchQuery(""); }} style={{ padding: '12px', borderBottom: '1px solid #222', cursor: 'pointer' }}>

                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>{formatUsername(user)}</p>

                  </div>

                ))}

              </div>

            )}

          </div>

        ) : (

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: '10px 15px', borderRadius: '12px' }}>

            <span style={{ fontWeight: 'bold' }}>{formatUsername(selectedRecipient)}</span>

            <button onClick={() => setSelectedRecipient(null)} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '0.8rem', textDecoration: 'underline' }}>Change</button>

          </div>

        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>

          <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} style={{ width: '50%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 'bold', outline: 'none' }} />

          <span style={{ fontSize: '0.8rem' }}>Balance: {formattedBalance}</span>

        </div>

        <button onClick={handleTransfer} disabled={!selectedRecipient} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: selectedRecipient ? '#fff' : 'rgba(255,255,255,0.3)', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '10px' }}>SEND {sendAmount} HOURA</button>

      </div>

<MenuGrid onItemClick={async (type) => {
  setActiveModal(type);
  

  if (type === 'offers' || type === 'needs') {
    try {
      
      await fetchAllData(); 
    } catch (error) {
      
      console.error("Modal data refresh error:", error);
    }
  }
}} />
      {/* 2. SEARCH FOR OFFERS */}

      <div style={{ marginBottom: '20px' }}>

        <h3 style={{ fontSize: '1rem', marginBottom: '10px', color: '#fff' }}>Search for Offers</h3>

        <input placeholder="Search offer, location, or user..." value={offerQuery} onChange={(e) => setOfferQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#111', border: '1px solid #333', color: '#fff', boxSizing: 'border-box' }} />

        {searchOfferResults.length > 0 && (

          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {searchOfferResults.map(user => (

              <div key={user.wallet_address || user.address} style={{ padding: '12px', background: '#111', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                <div>

                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>{formatUsername(user)}</p>

                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>📍 {user.city || "Global"} • {user.bio || "No offer description"}</p>

                </div>

                <button onClick={() => setSelectedMember(user)} style={{
  padding: '6px 12px',
  borderRadius: '20px',
  background: 'rgba(37, 99, 235, 0.1)', // Mavi rengin çok şeffaf hali
  color: '#3b82f6',
  fontSize: '0.7rem',
  border: '1px solid rgba(37, 99, 235, 0.2)',
  letterSpacing: '0.5px'
}}
>VIEW PROFILE</button>

              </div>

            ))}

          </div>

        )}

      </div>



      {/* 3. ADD YOUR NEED */}

      <details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>

        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>➕ Add Your Need</summary>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>

          <div style={{ display: 'flex', gap: '10px' }}>

            <input placeholder="Location" value={needLocation} onChange={(e) => setNeedLocation(e.target.value)} style={{ flex: 1, padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} />

            <button onClick={() => setNeedLocation("Online")} style={{ padding: '0 15px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '10px', fontSize: '0.8rem' }}>Online</button>

          </div>

          <textarea placeholder="What do you need?" value={needText} onChange={(e) => setNeedText(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '60px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

             <label style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Reward:</label>

             <input type="number" value={needPrice} onChange={(e) => setNeedPrice(e.target.value)} style={{ width: '80px', padding: '8px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />

             <span style={{ fontSize: '0.8rem' }}>Houra</span>

          </div>

          <button onClick={handleAddNeed} style={{ padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>POST NEED</button>

        </div>

      </details>



      {/* 4. PROFILE SETTINGS */}

<details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>
  <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>⚙️ Profile Settings</summary>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
    
    
    <input 
      placeholder="Add your nickname (optional)" 
      value={nickname} 
      onChange={(e) => setNickname(e.target.value)} 
      style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} 
    />

    <input 
      placeholder="Location" 
      value={location} 
      onChange={(e) => setLocation(e.target.value)} 
      style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} 
    />

    <textarea 
      placeholder="What do you offer?" 
      value={offer} 
      onChange={(e) => setOffer(e.target.value)} 
      style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '60px' }} 
    />

    <button 
      onClick={handleSaveProfile} 
      disabled={!currentAddress}
      style={{ 
        padding: '12px', 
        background: currentAddress ? '#333' : '#550000', 
        color: '#fff', 
        fontWeight: 'bold', 
        borderRadius: '10px', 
        border: 'none' 
      }}
    >
      {currentAddress ? "SAVE PROFILE" : "Please Connect Base App Wallet First"}
    </button>
  </div>
</details>

{selectedMember && (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(15px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div style={{ background: '#111', border: '1px solid #333', borderRadius: '28px', padding: '30px', width: '100%', maxWidth: '400px', textAlign: 'center', position: 'relative' }}>
      
      <button onClick={() => setSelectedMember(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#666', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>

   
      <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #2563eb, #7e22ce)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>
        {selectedMember.username ? selectedMember.username[0].toUpperCase() : "?"}
      </div>

      <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>{formatUsername(selectedMember)}</h2>
  
     <p style={{ color: '#2563eb', fontWeight: 'bold', margin: '0 0 20px 0', fontSize: '0.9rem' }}>
  {/* Eğer .city yoksa .location alanına bak (fallback) */}
  📍 {selectedMember.city || selectedMember.location || "Somewhere"}
</p>
     
<div style={{ background: '#000', padding: '20px', borderRadius: '20px', marginBottom: '25px', border: '1px solid #222', textAlign: 'left' }}>
  
  <p style={{ fontSize: '0.95rem', color: '#eee', margin: 0, lineHeight: '1.5' }}>
    {/* Eğer .bio yoksa .text alanına bak (fallback) */}
    {selectedMember.bio || selectedMember.text || "No offers yet."}
  </p>
</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
     
        <button 
          onClick={() => {
            setSelectedRecipient(selectedMember);
            setSendAmount("1");
            setSelectedMember(null);
            setActiveModal(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#fff', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
        >
          SEND 1 HOURA ⏳
        </button>

          <button 
  onClick={() => window.open(`https://base.app/profile/${selectedMember.wallet_address || selectedMember.address}`, "_blank")}
  style={{ width: '100%', padding: '10px', borderRadius: '14px', background: 'transparent', color: '#666', fontWeight: '500', border: '1px solid #333', cursor: 'pointer', fontSize: '0.8rem' }}
>
  View Base Profile
</button>
      </div>
    </div>
  </div>
)}

{activeModal && (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div style={{ background: '#111', border: '1px solid #333', borderRadius: '24px', padding: '25px', width: '100%', maxWidth: '450px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
      <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#666', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
      
      <h3 style={{ marginTop: 0, color: '#2563eb', textTransform: 'capitalize' }}>{activeModal}</h3>
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {activeModal === 'needs' && (
          needs.length > 0 ? (
            needs.map((need: any, idx: number) => {
              const ownerProfile = offerResults.find(p => 
  p.wallet_address?.toLowerCase() === need.wallet_address?.toLowerCase()
);
              return (
                <div key={idx} style={{ padding: '16px', background: '#000', borderRadius: '20px', border: '1px solid #222' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{formatUsername(ownerProfile || need)}</span>
                    {currentAddress && need.wallet_address === currentAddress.toLowerCase() ? (
                      <button onClick={() => handleDeleteNeed(need.id)} style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(220, 38, 38, 0.1)', color: '#ef4444', fontSize: '0.7rem', border: '1px solid rgba(220, 38, 38, 0.2)', letterSpacing: '0.5px' }}>Delete</button>
                    ) : (
                      ownerProfile && (
                        <button onClick={() => setSelectedMember(ownerProfile)} style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(37, 99, 235, 0.1)', color: '#3b82f6', fontSize: '0.7rem', border: '1px solid rgba(37, 99, 235, 0.2)', letterSpacing: '0.5px' }}>VIEW PROFILE</button>
                      )
                    )}
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#ccc' }}>{need.text}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#666' }}>📍 {need.location}</span>
                      <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '0.8rem' }}>⏳ {need.price || "1"} Houra</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : <p style={{ color: '#666', textAlign: 'center', fontSize: '0.9rem' }}>No needs found.</p>
        )}

        {activeModal === 'offers' && (
          offerResults.length > 0 ? (
            offerResults.map((user: any, idx: number) => (
              <div key={idx} style={{ padding: '16px', background: '#000', borderRadius: '20px', border: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{formatUsername(user)}</span>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#ccc' }}>{user.bio || "No offer description provided."}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#666' }}>📍 {user.city || "Global"}</span>
                  <button onClick={() => setSelectedMember(user)} style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(37, 99, 235, 0.1)', color: '#3b82f6', fontSize: '0.7rem', border: '1px solid rgba(37, 99, 235, 0.2)', letterSpacing: '0.5px' }}>VIEW PROFILE</button>
                </div>
              </div>
            ))
          ) : <p style={{ color: '#666', textAlign: 'center', fontSize: '0.9rem' }}>No offers found.</p>
        )}

        {activeModal === 'communities' && (
          <a href="https://chat.whatsapp.com/JscmUTY4n83AzalcQrXcEg" target="_blank" rel="noopener noreferrer" style={{ padding: '15px', background: '#000', borderRadius: '12px', border: '1px solid #222', color: '#fff', textDecoration: 'none', display: 'block', textAlign: 'center', fontWeight: 'bold' }}>
            🟣 Adalar-Houra Whatsapp Group
          </a>
        )}

       {activeModal === 'active members' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
    {leaderboard.length > 0 ? (
      leaderboard.map((member, index) => (
        <div key={member.wallet_address} style={{ padding: '12px', background: '#000', borderRadius: '12px', border: index === 0 ? '1px solid #3b82f6' : '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: index === 0 ? '#3b82f6' : '#666' }}>#{index + 1}</span>
            <div>
                <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {formatUsername(member.profiles || member)}
              </div>
              <div style={{ color: '#555', fontSize: '0.7rem' }}>{member.tx_count} Houra exchanges</div>
            </div>
          </div>
        </div>
      ))
    ) : <p style={{ color: '#666', textAlign: 'center', fontSize: '0.9rem' }}>No activity found.</p>}
  </div>
)}
      </div>
    </div>
  </div>
)}

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#000', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 3000 }}>
          {status}
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '0.75rem', color: '#444' }}>Houra Time Economy - 2026</p>
    </div>
  );
}