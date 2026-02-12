"use client";
import { useEffect, useState, useCallback } from "react";
import { sdk } from "@farcaster/frame-sdk"; 
import { useReadContract, useAccount, useConfig } from 'wagmi';
// OnchainKit veya Wagmi'den sendCalls kullanabiliriz, 
// Base Mini App için wagmi/experimental içindeki hook en temizidir.
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

  // --- SDK INIT ---
  useEffect(() => {
    const init = async () => {
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
        setIsSDKLoaded(true);
      } catch (e) { setIsSDKLoaded(true); }
    };
    init();
  }, []);

  // --- TRANSFER FONKSİYONU ---
  const handleTransfer = useCallback(async (recipientAddress: string) => {
    if (!recipientAddress) {
      setStatus("Error: Recipient has no wallet.");
      return;
    }

    try {
      setStatus("Requesting transfer...");
      
      // 1 Houra transfer edelim (Test için sabit, istersen input ekleyebilirsin)
      const amount = parseUnits("1", 18); 

      sendCalls({
        calls: [
          {
            to: HOURA_TOKEN_ADDRESS as `0x${string}`,
            data: encodeFunctionData({
              abi: TOKEN_ABI,
              functionName: 'transfer',
              args: [recipientAddress as `0x${string}`, amount],
            }),
            value: 0n,
          },
        ],
        capabilities: {
          paymasterService: {
            // Opsiyonel: Eğer ilerde gasless (ücretsiz) işlem yapmak istersen burası kullanılır
            url: "https://api.developer.coinbase.com/rpc/v1/base/YOUR_ID" 
          }
        }
      }, {
        onSuccess: (id) => {
          setStatus("Success! Houra sent. ✅");
          setTimeout(() => refetchBalance(), 3000); // Bakiyeyi güncelle
        },
        onError: (err) => {
          console.error(err);
          setStatus("Transfer failed or rejected.");
        }
      });
    } catch (e) {
      setStatus("Transaction error.");
    }
  }, [sendCalls, refetchBalance]);

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

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', marginTop: '50px' }}>Loading Houra...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Houra</h1>
      <p style={{ color: '#666', fontSize: '0.8rem' }}>Time Economy</p>
      
      {/* Bakiye Kartı */}
      <div style={{ padding: '20px', borderRadius: '15px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', marginBottom: '25px' }}>
        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 'bold' }}>MY BALANCE</p>
        <h2 style={{ margin: '5px 0 0 0' }}>{formattedBalance} Houra</h2>
      </div>

      {/* Arama */}
      <input 
        placeholder="Search talent or city..." 
        value={searchQuery} 
        onChange={(e) => setSearchQuery(e.target.value)} 
        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#000', color: '#fff', border: '1px solid #2563eb', boxSizing: 'border-box' }} 
      />

      {/* Sonuçlar */}
      <div style={{ marginTop: '20px' }}>
        {searchResults.map((user) => (
          <div key={user.fid} style={{ padding: '15px', background: '#111', borderRadius: '12px', marginBottom: '10px', border: '1px solid #222' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>@{user.username} 📍 {user.city || "Global"}</p>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '5px 0 10px 0' }}>{user.bio}</p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => sdk.actions.viewProfile({ fid: Number(user.fid) })} 
                style={{ flex: 1, padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
              >
                PROFILE
              </button>
              <button 
                onClick={() => handleTransfer(user.wallet_address)} 
                style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
              >
                SEND 1 HOURA
              </button>
            </div>
          </div>
        ))}
      </div>

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#111', border: '1px solid #2563eb', borderRadius: '10px', textAlign: 'center', fontSize: '0.8rem' }}>
          {status}
        </div>
      )}
    </div>
  );
}