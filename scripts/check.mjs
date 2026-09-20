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
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file+' duplicate ids');
  for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const link=m[1];if(/^(https?:|mailto:|data:)/.test(link))continue;
    const [p,hash]=link.split('#');let target=p?(p.startsWith('/')?root+p:resolve(dirname(file),p)):file;
    if(existsSync(target)&&statSync(target).isDirectory())target+='/index.html';
    assert(existsSync(target),`Missing ${link} on ${file}`);
    if(hash)assert(readFileSync(target,'utf8').includes(`id="${hash}"`),`Missing anchor ${link} on ${file}`);links++;
  }
}
assert.equal(pages.length,13,'expected 12 pages + 404');assert(existsSync(root+'/app.js'));
console.log(`PASS: ${pages.length} files, ${links} internal links/anchors checked.`);
