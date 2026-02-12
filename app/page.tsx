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
  const [context, setContext] = useState<any>(null);
  const [city, setCity] = useState("");
  const [talents, setTalents] = useState("");
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [sendAmount, setSendAmount] = useState("1"); // Manuel miktar

  const { address: currentAddress } = useAccount();
  const { sendCalls } = useSendCalls();

  // --- BAKİYE OKUMA ---
  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  // --- SDK & PROFİL VERİSİNİ ÇEKME (TAMİR EDİLDİ) ---
  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        if (ctx?.user?.fid) {
          const res = await fetch(`/api/profile?fid=${ctx.user.fid}`);
          if (res.ok) {
            const data = await res.json();
            if (data.profile) {
              setCity(data.profile.city || "");
              setTalents(data.profile.bio || "");
            }
          }
        }
        sdk.actions.ready();
        setIsSDKLoaded(true);
      } catch (e) { setIsSDKLoaded(true); }
    };
    init();
  }, []);

  // --- TRANSFER FONKSİYONU ---
  const handleTransfer = useCallback(async (recipientAddress: string, amount: string) => {
    if (!recipientAddress) return setStatus("Error: No address found.");
    try {
      setStatus("Confirming transfer...");
      const parsedAmount = parseUnits(amount, 18); 

      sendCalls({
        calls: [{
          to: HOURA_TOKEN_ADDRESS as `0x${string}`,
          data: encodeFunctionData({
            abi: TOKEN_ABI,
            functionName: 'transfer',
            args: [recipientAddress as `0x${string}`, parsedAmount],
          }),
          value: 0n,
        }],
      }, {
        onSuccess: () => {
          setStatus(`Success! ${amount} Houra sent. ✅`);
          setTimeout(() => refetchBalance(), 3000);
        },
        onError: () => setStatus("Transfer failed.")
      });
    } catch (e) { setStatus("Invalid amount."); }
  }, [sendCalls, refetchBalance]);

  // --- PROFİL GÜNCELLEME ---
  const handleUpdate = async () => {
    if (!context?.user?.fid) return;
    setStatus("Updating...");
    try {
      await fetch("/api/profile", {
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
      setStatus("Profile Saved! ✅");
    } catch (e) { setStatus("Save failed."); }
  };

  // --- ARAMA ---
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

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Houra</h1>
      <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '20px' }}>Time Economy</p>
      
      {/* --- YENİ TRANSFER PANELİ --- */}
      <div style={{ padding: '20px', borderRadius: '15px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 'bold' }}>TRANSFER PANEL</p>
          <p style={{ margin: 0, fontSize: '0.7rem' }}>My balance: <b>{formattedBalance}</b></p>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <input 
            type="number" 
            value={sendAmount} 
            onChange={(e) => setSendAmount(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.5rem', padding: '10px', borderRadius: '8px', textAlign: 'center' }}
            placeholder="0.0"
          />
          <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
            {["0.5", "1", "2"].map(amt => (
              <button key={amt} onClick={() => setSendAmount(amt)} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer' }}>{amt}</button>
            ))}
          </div>
        </div>
      </div>

      {/* --- PROFİL EDİT (Fixed) --- */}
      <details style={{ background: '#111', padding: '10px', borderRadius: '10px', marginBottom: '25px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>{city ? `📍 ${city} | Edit Profile` : "👤 Setup Your Profile"}</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
          <textarea placeholder="Bio / Talents" value={talents} onChange={(e) => setTalents(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '8px', height: '60px' }} />
          <button onClick={handleUpdate} style={{ padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '8px' }}>SAVE CHANGES</button>
        </div>
      </details>

      {/* --- ARAMA VE LİSTE --- */}
      <input placeholder="Find people to send Houra..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', background: '#000', color: '#fff', border: '1px solid #2563eb', boxSizing: 'border-box' }} />

      <div style={{ marginTop: '20px' }}>
        {searchResults.map((user) => (
          <div key={user.fid} style={{ padding: '15px', background: '#111', borderRadius: '12px', marginBottom: '10px', border: '1px solid #222' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>@{user.username} 📍 {user.city || "Global"}</p>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '5px 0 12px 0' }}>{user.bio}</p>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => sdk.actions.viewProfile({ fid: Number(user.fid) })} style={{ flex: 1, padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>PROFILE</button>
              <button onClick={() => handleTransfer(user.wallet_address, sendAmount)} style={{ flex: 2, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                SEND {sendAmount} HOURA
              </button>
            </div>
          </div>
        ))}
      </div>

      {status && <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#111', border: '1px solid #2563eb', borderRadius: '10px', textAlign: 'center', fontSize: '0.8rem', zIndex: 100 }}>{status}</div>}
    </div>
  );
}