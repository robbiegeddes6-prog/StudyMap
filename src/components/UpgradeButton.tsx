import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function UpgradeButton() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) return;
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
    } catch (err: any) {
      console.error('Upgrade error:', err.message);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Button onClick={handleUpgrade} disabled={loading}>
      {loading ? 'Redirecting...' : 'Upgrade to Premium'}
    </Button>
  );
}
