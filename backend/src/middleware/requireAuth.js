const { verifyToken } = require('@clerk/backend');

/**
 * Middleware: Verifies Clerk JWT from Authorization header.
 * Attaches `req.userId` (Clerk user ID) on success.
 * Returns 401 on missing or invalid token.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT using Clerk's backend SDK
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Attach the Clerk user ID to the request for downstream use
    req.userId = payload.sub;

    next();
  } catch (err) {
    console.error('[requireAuth] Token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
}

module.exports = { requireAuth };
