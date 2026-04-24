/**
 * Internal API key guard for protecting payment endpoints from unauthenticated callers.
 * The frontend never sees Paylov tokens — only this service communicates with Paylov directly.
 */
function requireApiKey(req, res, next) {
  const apiKey = process.env.INTERNAL_API_KEY;
  if (!apiKey) return next(); // no key configured → open (dev mode)

  const provided = req.headers['x-api-key'];
  if (!provided || provided !== apiKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

module.exports = { requireApiKey };
