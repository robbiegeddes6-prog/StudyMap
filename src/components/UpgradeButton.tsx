import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Star } from 'lucide-react';

export function UpgradeButton() {
  const { user, isPremium } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) return;

    if (isPremium) {
      toast.info("You're already a Pro member!");
      return;
    }

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      console.error('Upgrade error:', msg);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (isPremium) {
    return (
      <Button disabled className="bg-primary/20 text-primary border border-primary/30">
        <Star className="w-4 h-4 mr-2" />
        Pro Member ✓
      </Button>
    );
  }

  return (
    <Button onClick={handleUpgrade} disabled={loading}>
      {loading ? 'Redirecting...' : 'Upgrade to Premium'}
    </Button>
  );
}
