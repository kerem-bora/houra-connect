"use client";
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk"; 
import { useAccount, useWriteContract, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { parseUnits } from 'viem';

// --- CONFIGURATION ---
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 
const TOKEN_ABI = [
  { 
    name: 'transfer', 
    type: 'function', 
    stateMutability: 'nonpayable', 
    inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], 
    outputs: [{ name: '', type: 'bool' }] 
  }
] as const;

export default function Home() {
  const { address: userAddress, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContract, isPending: isTxPending } = useWriteContract();
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // --- ENSURE BASE NETWORK ---
  useEffect(() => {
    if (isConnected) {
      switchChain({ chainId: base.id });
    }
  }, [isConnected, switchChain]);

  // --- SEND HOURA (Base App Optimized) ---
  const handleSendHoura = async (recipientAddress: string, username: string) => {
    if (!recipientAddress) {
      alert("This user hasn't linked a Base wallet yet.");
      return;
    }

    const amount = prompt(`Enter Houra amount for ${username}:`, "1");
    if (!amount) return;

    try {
      // Base App'in cüzdan modülünü tetiklemek için en temiz wagmi çağrısı
      writeContract({
        address: HOURA_TOKEN_ADDRESS as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, parseUnits(amount, 18)],
      });
    } catch (error) {
      console.error("Wallet Trigger Error:", error);
    }
  };

  // --- MESSAGING (Base/Onchain Social Link) ---
  const openBaseChat = (walletAddress: string) => {
    // Base ekosisteminde cüzdan odaklı mesajlaşma sayfasına yönlendirme
    // Eğer Base App içindeysen, bu tip linkler uygulama içi tarayıcıda cüzdanı tetikte tutar.
    const baseChatUrl = `https://base.org/name/${walletAddress}`; 
    window.open(baseChatUrl, '_blank');
  };

  // Search API fetch (öncekiyle aynı mantık)
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length > 1) {
        const res = await fetch(`/api/search?q=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    };
    search();
  }, [searchQuery]);

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '24px' }}>
      <h1>Houra <span style={{fontSize: 'small', color: '#2563eb'}}>on Base</span></h1>
      
      <input 
        placeholder="Search Base users..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ width: '100%', padding: '15px', borderRadius: '12px', background: '#111', color: '#fff', border: '1px solid #2563eb' }}
      />

      <div style={{ marginTop: '20px' }}>
        {searchResults.map((user) => (
          <div key={user.fid} style={{ padding: '15px', background: '#111', borderRadius: '12px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={user.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <p><strong>{user.username}</strong></p>
              </div>
              <button 
                onClick={() => openBaseChat(user.wallet_address)}
                style={{ background: '#0052FF', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px' }}
              >
                Chat
              </button>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{user.bio}</p>

            <button 
              onClick={() => handleSendHoura(user.wallet_address, user.username)}
              disabled={isTxPending}
              style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', marginTop: '10px' }}
            >
              {isTxPending ? "CONFIRM IN WALLET..." : "SEND HOURA"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}