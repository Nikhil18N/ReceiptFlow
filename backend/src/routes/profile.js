const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/profile
 * Returns the user's profile from Supabase.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile not found — return empty
      return res.json({
        success: true,
        data: {
          id: req.userId,
          email: null,
          fullName: null,
          avatarUrl: null,
          createdAt: null,
        },
      });
    }

    if (error) {
      console.error('[profile] Fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch profile.', details: error.message });
    }

    return res.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    console.error('[profile] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

/**
 * PUT /api/profile
 * Update user profile fields. Body: { fullName?, avatarUrl? }
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const { fullName, avatarUrl } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (fullName !== undefined) updates.full_name = fullName;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: req.userId, ...updates })
      .select()
      .single();

    if (error) {
      console.error('[profile] Update error:', error);
      return res.status(500).json({ error: 'Failed to update profile.', details: error.message });
    }

    return res.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    console.error('[profile] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

module.exports = router;
