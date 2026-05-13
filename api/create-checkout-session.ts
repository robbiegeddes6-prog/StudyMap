import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, userEmail } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const siteUrl = process.env.VITE_SITE_URL || 'http://localhost:5173';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/settings?upgraded=true`,
      cancel_url: `${siteUrl}/settings`,
      customer_email: userEmail,
      metadata: { userId },
    });

    res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
