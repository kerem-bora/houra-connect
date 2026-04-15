import { useAccount, useSignMessage } from "wagmi";

export function useAuth() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const login = async () => {
    if (!address) return;

    const message = `Houra'ya giriş yapıyorsunuz.\n\nAdres: ${address}\nZaman: ${Date.now()}`;
    const signature = await signMessageAsync({ message });

    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, message, signature }),
    });
  };

  return { login };
}