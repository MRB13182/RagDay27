module.exports = async function registrationEditSession(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Vary', 'Origin');

  const allowedOrigin = 'https://rdnic27.vercel.app';
  const origin = req.headers.origin;
  if (origin && origin !== allowedOrigin) {
    res.status(403).json({ success: false, message: 'Origin not allowed.' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  try {
    const upstream = await fetch(
      'https://xulkacnjqjnluhmbqbcu.supabase.co/functions/v1/registration-edit-session',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': allowedOrigin,
          ...(req.headers.cookie ? { 'Cookie': req.headers.cookie } : {}),
        },
        body: JSON.stringify(req.body || {}),
        cache: 'no-store',
      }
    );

    const cookieHeader = upstream.headers.get('set-cookie');
    if (cookieHeader) {
      // The browser receives this Set-Cookie from the first-party Vercel origin.
      res.setHeader('Set-Cookie', cookieHeader);
    }

    const responseText = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.end(responseText);
  } catch (error) {
    console.error('registration-edit-session proxy failed', error);
    res.status(502).json({ success: false, message: 'Registration edit service is temporarily unavailable.' });
  }
};
