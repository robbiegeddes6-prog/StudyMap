import { useState } from 'react';
import { useAuth } from './useAuth';

export function useStripeCheckout() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const startCheckout = async (): Promise<void> => {
    if (!user) throw new Error('Not signed in');
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userEmail: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  return { startCheckout, loading };
}
