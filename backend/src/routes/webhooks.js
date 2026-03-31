const express = require('express');
const { Webhook } = require('svix');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Supabase client with Service Role Key (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /webhooks/clerk
 *
 * Receives Clerk webhook events and syncs user data to the Supabase
 * `profiles` table.
 *
 * Handles:
 *  - user.created  → INSERT into profiles
 *  - user.updated  → UPDATE profiles
 *  - user.deleted  → DELETE from profiles (cascades to expenses)
 *
 * Security: Clerk signs every webhook payload with a secret via Svix.
 * We verify the signature before processing anything.
 *
 * IMPORTANT: This route must receive the RAW request body (Buffer),
 * not the parsed JSON. See index.js where express.raw() is applied
 * specifically to this path.
 */
router.post('/', async (req, res) => {
  // ── 1. Verify Svix signature ─────────────────────────────────────────────
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[webhook] CLERK_WEBHOOK_SECRET is not set.');
    return res.status(500).json({ error: 'Webhook secret not configured.' });
  }

  const svixId        = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing Svix signature headers.' });
  }

  let event;
  try {
    const wh = new Webhook(webhookSecret);
    // req.body is a Buffer because of express.raw() in index.js
    event = wh.verify(req.body, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const { type, data } = event;
  console.log(`[webhook] Received event: ${type} for user: ${data.id}`);

  // ── 2. Route by event type ───────────────────────────────────────────────
  try {
    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const primaryEmail = data.email_addresses?.find(
          (e) => e.id === data.primary_email_address_id
        )?.email_address ?? null;

        const fullName = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(' ') || null;

        const { error } = await supabase
          .from('profiles')
          .upsert(
            {
              id:         data.id,
              email:      primaryEmail,
              full_name:  fullName,
              avatar_url: data.image_url ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (error) {
          console.error(`[webhook] Supabase upsert error (${type}):`, error);
          return res.status(500).json({ error: 'Database error during upsert.' });
        }

        console.log(`[webhook] Profile upserted for user: ${data.id}`);
        break;
      }

      case 'user.deleted': {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', data.id);

        if (error) {
          console.error('[webhook] Supabase delete error:', error);
          return res.status(500).json({ error: 'Database error during delete.' });
        }

        console.log(`[webhook] Profile deleted for user: ${data.id}`);
        break;
      }

      default:
        // Acknowledge unhandled event types gracefully
        console.log(`[webhook] Unhandled event type: ${type} — ignoring.`);
    }
  } catch (err) {
    console.error('[webhook] Unexpected handler error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }

  // Always return 200 so Clerk doesn't retry
  return res.status(200).json({ received: true });
});

module.exports = router;
