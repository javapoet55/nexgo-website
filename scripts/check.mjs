// Validates the built site: one H1 per page, metadata, internal links and anchors, no inline scripts (CSP), assets present.
import {readdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');
const files=d=>readdirSync(d).flatMap(n=>statSync(d+'/'+n).isDirectory()?files(d+'/'+n):[d+'/'+n]);
const pages=files(root).filter(f=>f.endsWith('.html'));let links=0;
for(const file of pages){
  const html=readFileSync(file,'utf8');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,file+' needs exactly one H1');
  assert(html.includes('name="description"'),file+' description');assert(html.includes('property="og:title"'),file+' og:title');assert(html.includes('id="main"'),file+' main');
  if(!file.endsWith('/404.html'))assert(html.includes('rel="canonical"'),file+' canonical');
  assert(!/<script(?![^>]*\ssrc=)[^>]*>/.test(html),file+' has an inline script (blocked by CSP)');
  assert(!html.includes('href="#/'),file+' has a leftover hash route');
  assert(html.includes('href="/voice-ai"'),file+' missing Products > Voice AI nav link');
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file+' duplicate ids');
  for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const link=m[1];if(/^(https?:|mailto:|data:)/.test(link))continue;
    const [p,hash]=link.split('#');let target=p?(p.startsWith('/')?root+p:resolve(dirname(file),p)):file;
    if(existsSync(target)&&statSync(target).isDirectory())target+='/index.html';
    assert(existsSync(target),`Missing ${link} on ${file}`);
    if(hash)assert(readFileSync(target,'utf8').includes(`id="${hash}"`),`Missing anchor ${link} on ${file}`);links++;
  }
}
assert.equal(pages.length,14,'expected 13 pages + 404');assert(existsSync(root+'/app.js'));
{const v=readFileSync(root+'/voice-ai/index.html','utf8');
  assert(v.includes('Just say it.')&&v.includes('NexDo gets it done.'),'voice-ai hero');
  assert(v.includes('<title>NexDo Voice AI Assistant | Turn Conversations Into Action</title>'),'voice-ai title');
  assert(/href="https:\/\/harbour-onsite\.up\.railway\.app\/signup"[^>]*data-event="voice_ai_primary_cta_click"/.test(v),'voice-ai primary CTA');
  for(const t of ['Create Tasks by Voice','Manage Your Day','Ask AI Anything','Take Action','Continuous Conversation','Hands-Free Assistance','See it in action','One conversation. Multiple things done.','Designed for hands-free use'])assert(v.includes(t),'voice-ai missing '+t);
  assert(!/Tap to hear|Safe while driving|when I get home/i.test(v),'voice-ai contains an unsupported claim');
  assert(/prefers-reduced-motion:reduce\)\{\.va-wv i,\.va-ring\{animation:none\}/.test(v),'voice-ai reduced motion');}
console.log(`PASS: ${pages.length} files, ${links} internal links/anchors checked.`);
