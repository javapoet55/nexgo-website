import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

// Starts the real server on its own port. Each test uses its own visitor address so limits never overlap.
async function startServer(env = {}) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, ['server.mjs'], {env: {...process.env, PORT: String(port), OPENAI_API_KEY: '', QR_ANALYTICS_URL: '', ...env}, stdio: ['ignore', 'pipe', 'pipe']});
  let log = '';
  child.stderr.on('data', chunk => { log += chunk; });
  for await (const chunk of child.stdout) if (String(chunk).includes('ready')) break;
  const request = (path, {method = 'GET', headers = {}, body} = {}) => new Promise((resolve, reject) => {
    const sent = Object.fromEntries(Object.entries(headers).filter(([, value]) => value !== undefined));
    const req = http.request({host: '127.0.0.1', port, path, method, headers: sent}, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString()}));
    });
    req.on('error', reject);
    req.end(body);
  });
  return {request, log: () => log, stop: async () => { child.kill(); await once(child, 'exit'); }};
}
const ask = (server, headers = {}, question = 'How do tasks work?') => server.request('/api/support/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json', Origin: 'http://127.0.0.1', Host: '127.0.0.1', ...headers},
  body: JSON.stringify({messages: [{role: 'user', content: question}]}),
});

test('no path can turn a redirect into a link to another site', async () => {
  const server = await startServer();
  try {
    for (const path of ['/%2Fevil.example/', '/%2F%2Fevil.example/', '/%5Cevil.example/', '/%2F%5Cevil.example/', '/features/%2F%2Fevil.example/']) {
      const res = await server.request(path, {headers: {'X-Real-IP': '198.51.100.1'}});
      assert.equal(res.status, 404, path);
      assert.equal(res.headers.location, undefined, path);
    }
    const slash = await server.request('/features/', {headers: {'X-Real-IP': '198.51.100.2'}});
    assert.equal(slash.status, 301);
    assert.equal(slash.headers.location, '/features');
    // The http->https redirect only ever names our own hosts.
    const foreign = await server.request('/x', {headers: {'X-Forwarded-Proto': 'http', 'X-Forwarded-Host': 'evil.example'}});
    assert.equal(foreign.headers.location, undefined);
    const ours = await server.request('/tasks', {headers: {'X-Forwarded-Proto': 'http', 'X-Forwarded-Host': 'www.nexdoapp.com'}});
    assert.equal(ours.headers.location, 'https://www.nexdoapp.com/tasks');
  } finally { await server.stop(); }
});

test('pages and files still load, with security headers', async () => {
  const server = await startServer();
  try {
    const visitor = {'X-Real-IP': '198.51.100.3'};
    for (const path of ['/', '/tasks', '/contact', '/robots.txt', '/sitemap.xml', '/app.js', '/assets/nexdo-mark.png', '/assets/inter-latin.woff2']) {
      assert.equal((await server.request(path, {headers: visitor})).status, 200, path);
    }
    const home = await server.request('/', {headers: {...visitor, 'Accept-Encoding': 'br'}});
    assert.equal(home.headers['content-encoding'], 'br');
    assert.match(home.headers['content-security-policy'], /frame-ancestors 'none'/);
    assert.equal((await server.request('/', {headers: {...visitor, 'Accept-Encoding': 'br', 'If-None-Match': home.headers.etag}})).status, 304);
    assert.equal((await server.request('/get-app', {headers: {...visitor, 'User-Agent': 'Android'}})).headers.location, 'https://play.google.com/store/apps/details?id=com.pinslots.nexdo');
    const missing = await server.request('/no-such-page', {headers: visitor});
    assert.equal(missing.status, 404);
    assert.match(missing.headers['content-type'], /text\/html/);
  } finally { await server.stop(); }
});

test('scanner probes get a tiny answer and internal build files are not published', async () => {
  const server = await startServer();
  try {
    let n = 10;
    for (const path of ['/.env', '/.git/config', '/wp-config.php.bak', '/backup.sql', '/config.yml', '/support-articles.json', '/support-coverage.json', '/index.html.br', '/..%2f..%2fserver.mjs']) {
      const res = await server.request(path, {headers: {'X-Real-IP': '198.51.100.' + n++}});
      assert.equal(res.status, 404, path);
      assert.equal(res.body, 'Not found.', path);
    }
    assert.equal((await server.request('/.well-known/security.txt', {headers: {'X-Real-IP': '198.51.100.40'}})).headers['content-type'], 'text/html; charset=utf-8');
  } finally { await server.stop(); }
});

test('an address that keeps asking for missing files is blocked; other visitors are not', async () => {
  const server = await startServer({SITE_MISSES_PER_MINUTE: '5'});
  try {
    const scanner = {'X-Real-IP': '203.0.113.50'};
    const statuses = [];
    for (let i = 0; i < 8; i++) statuses.push((await server.request('/.env.' + i, {headers: scanner})).status);
    assert.deepEqual(statuses, [404, 404, 404, 404, 404, 404, 429, 429]);
    const blocked = await server.request('/', {headers: scanner});
    assert.equal(blocked.status, 429);
    assert(Number(blocked.headers['retry-after']) > 500);
    // A made-up X-Forwarded-For does not get the scanner a fresh allowance...
    assert.equal((await server.request('/', {headers: {...scanner, 'X-Forwarded-For': '8.8.8.8'}})).status, 429);
    // ...and does not let it get somebody else blocked.
    assert.equal((await server.request('/', {headers: {'X-Real-IP': '8.8.8.8'}})).status, 200);
    assert.match(server.log(), /scanner_blocked/);
    // Non-GET probes (xmlrpc.php, graphql...) count too.
    const poster = {'X-Real-IP': '203.0.113.51'};
    const posts = [];
    for (let i = 0; i < 7; i++) posts.push((await server.request('/xmlrpc.php', {method: 'POST', headers: poster})).status);
    assert.deepEqual(posts, [405, 405, 405, 405, 405, 405, 429]);
  } finally { await server.stop(); }
});

test('requests with no visitor address are served and never blocked', async () => {
  const server = await startServer({SITE_MISSES_PER_MINUTE: '2', SITE_REQUESTS_PER_MINUTE: '3'});
  try {
    for (let i = 0; i < 8; i++) assert.equal((await server.request('/.env')).status, 404);
    assert.equal((await server.request('/')).status, 200);
  } finally { await server.stop(); }
});

test('one address cannot flood the site', async () => {
  const server = await startServer({SITE_REQUESTS_PER_MINUTE: '6'});
  try {
    const statuses = [];
    for (let i = 0; i < 8; i++) statuses.push((await server.request('/', {headers: {'X-Real-IP': '203.0.113.60'}})).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 200, 429, 429]);
    assert.equal((await server.request('/', {headers: {'X-Real-IP': '2001:db8:aa:bb::1'}})).status, 200);
  } finally { await server.stop(); }
});

test('support chat only answers our own pages', async () => {
  const server = await startServer();
  try {
    const visitor = n => ({'X-Real-IP': '203.0.113.' + n});
    assert.equal((await ask(server, {...visitor(70), Origin: undefined})).status, 403, 'a script with no Origin');
    assert.equal((await ask(server, {...visitor(71), Origin: 'https://evil.example'})).status, 403, 'another site');
    assert.equal((await ask(server, {...visitor(72), 'Sec-Fetch-Site': 'cross-site'})).status, 403, 'cross-site fetch');
    assert.equal((await ask(server, {...visitor(73), Origin: undefined, 'Sec-Fetch-Site': 'same-origin'})).status, 200);
    const ok = await ask(server, {...visitor(74), Origin: 'https://www.nexdoapp.com', 'X-Forwarded-Host': 'www.nexdoapp.com'});
    assert.equal(ok.status, 200);
    assert.equal(JSON.parse(ok.body).mode, 'articles');
  } finally { await server.stop(); }
});

test('support chat limits each visitor by the trusted address, not by X-Forwarded-For', async () => {
  const server = await startServer({SUPPORT_VISITOR_MINUTE_LIMIT: '4'});
  try {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await ask(server, {'X-Real-IP': '203.0.113.80', 'X-Forwarded-For': `198.18.0.${i}, 203.0.113.80`})).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 429, 429]);
    assert.equal((await ask(server, {'X-Real-IP': '203.0.113.81'})).status, 200, 'another visitor is unaffected');
  } finally { await server.stop(); }
});

test('paid AI answers stop at the budget and the visitor still gets a published answer', async () => {
  let calls = 0;
  const realFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = 'test';
  process.env.SUPPORT_AI_VISITOR_DAILY_LIMIT = '2';
  process.env.SUPPORT_AI_DAILY_LIMIT = '3';
  const {supportRoute} = await import('../support-server.mjs');
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses');
    calls++;
    const id = JSON.parse(JSON.parse(init.body).input).articles[0].id;
    return Response.json({status: 'completed', output: [{content: [{type: 'output_text', text: JSON.stringify({supported: true, answer: 'From the model.', sourceIds: [id]})}]}]});
  };
  const post = address => new Promise(resolve => {
    const body = Buffer.from(JSON.stringify({messages: [{role: 'user', content: 'How do tasks work?'}]}));
    const req = (async function* () { yield body; })();
    Object.assign(req, {method: 'POST', headers: {'content-type': 'application/json', origin: 'https://www.nexdoapp.com', host: 'www.nexdoapp.com', 'x-real-ip': address}});
    supportRoute(req, {writeHead(status) { this.status = status; }, end(text) { resolve({status: this.status, ...JSON.parse(text)}); }});
  });
  try {
    const first = [await post('192.0.2.1'), await post('192.0.2.1'), await post('192.0.2.1'), await post('192.0.2.1')];
    assert.deepEqual(first.map(r => [r.status, r.mode]), [[200, 'ai'], [200, 'ai'], [200, 'articles'], [200, 'articles']], 'per-visitor AI allowance');
    assert.equal(calls, 2);
    const second = [await post('192.0.2.2'), await post('192.0.2.2')];
    assert.deepEqual(second.map(r => r.mode), ['ai', 'articles'], 'whole-site daily AI budget');
    assert.equal((await post('192.0.2.3')).mode, 'articles');
    assert.equal(calls, 3, 'the model is never called past the daily budget');
  } finally { globalThis.fetch = realFetch; process.env.OPENAI_API_KEY = ''; }
});

test('QR opens are counted once per scan burst, not once per request', async () => {
  let recorded = 0;
  const sink = http.createServer((req, res) => { recorded++; req.resume(); res.writeHead(204); res.end(); });
  await new Promise(resolve => sink.listen(0, '127.0.0.1', resolve));
  const server = await startServer({QR_ANALYTICS_URL: `http://127.0.0.1:${sink.address().port}/`, QR_ANALYTICS_TOKEN: 't'});
  try {
    const phone = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)'};
    for (let i = 0; i < 25; i++) assert.equal((await server.request('/get-app?source=hero-qr', {headers: {...phone, 'X-Real-IP': '203.0.113.90'}})).status, 302);
    await server.request('/get-app?source=hero-qr', {headers: {...phone, 'X-Real-IP': '203.0.113.91'}});
    await new Promise(resolve => setTimeout(resolve, 400));
    assert.equal(recorded, 4, 'three for the repeating address, one for the other');
  } finally { await server.stop(); sink.close(); }
});
