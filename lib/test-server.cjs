const productionHosts = new Set(['base-boing-battle-1.onrender.com', 'base-boing-battle-usa.onrender.com']);

function validateTestServer(value, required = false) {
  if (!value) {
    if (required) throw new Error('Test preview requires NEXT_PUBLIC_TEST_SOCKET_URL. Production fallback is disabled.');
    return '';
  }
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || productionHosts.has(url.hostname)) {
    throw new Error('Test server must be a separate HTTPS origin, not a production game server.');
  }
  return url.origin;
}

function applyTestServer(html, value) {
  const origin = validateTestServer(value);
  if (!origin) return html;
  const literal = JSON.stringify(origin).replace(/</g, '\\u003c');
  for (const region of ['EU', 'US']) {
    const pattern = new RegExp("var SOCKET_" + region + "='[^']+';");
    if (!pattern.test(html)) throw new Error('Missing embedded socket configuration for ' + region);
    html = html.replace(pattern, 'var SOCKET_' + region + '=' + literal + ';');
  }
  return html;
}

module.exports = { validateTestServer, applyTestServer };
