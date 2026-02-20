export const onRequestPost = async ({ request, env }) => {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const { name, email, message } = payload || {};
  if (!name || !email || !message) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_TO;
  const from = env.CONTACT_FROM;
  if (!apiKey || !to || !from) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to,
        subject: `Message from adamj.link`,
        reply_to: email,
        text: `From: ${name} <${email}>\n\n${message}`
      })
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Email service unavailable' }), {
      status: 502,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'Email send failed' }), {
      status: 502,
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' }
  });
};
