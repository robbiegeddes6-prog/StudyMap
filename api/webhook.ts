import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // bypasses RLS — server only
);

// Collect raw request body for Stripe signature verification
async function getRawBody(req: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Disable Vercel's automatic body parsing — Stripe needs the raw bytes
export const config = { api: { bodyParser: false } };

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('[Stripe] STRIPE_WEBHOOK_SECRET is not set.');
  console.warn('[Stripe] Add your webhook endpoint in the Stripe Dashboard:');
  console.warn('[Stripe]   URL: https://your-vercel-url.vercel.app/api/webhook');
  console.warn('[Stripe]   Events: checkout.session.completed, customer.subscription.deleted');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          stripe_customer_id: session.customer as string,
        })
        .eq('id', userId);

      if (error) {
        console.error('Supabase update error:', error.message);
        return res.status(500).json({ error: 'Failed to update user premium status' });
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ is_premium: false })
        .eq('id', profile.id);
    }
  }

  res.status(200).json({ received: true });
}
