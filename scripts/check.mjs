import {readdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');
function files(d){return readdirSync(d).flatMap(n=>statSync(d+'/'+n).isDirectory()?files(d+'/'+n):[d+'/'+n]);}
const pages=files(root).filter(f=>f.endsWith('.html')&&!f.endsWith('/404.html'));let checked=0;
for(const file of pages){const html=readFileSync(file,'utf8');assert.equal((html.match(/<h1[ >]/g)||[]).length,1,file+' requires one H1');assert(html.includes('rel="canonical"'));assert(html.includes('name="description"'));assert(html.includes('property="og:title"'));assert(html.includes('id="main"'));for(const slug of ['asana','monday','akiflow','motion','todoist'])assert(html.includes(`href="/compare/${slug}"`));for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){let link=match[1];if(/^(https?:|mailto:|data:)/.test(link))continue;const [urlPath,hash]=link.split('#');const p=urlPath.split('?')[0];let target=p.startsWith('/')?root+p:p?resolve(dirname(file),p):file;if(existsSync(target)&&statSync(target).isDirectory())target+='/index.html';assert(existsSync(target),`Missing ${link} on ${file}`);if(hash){const content=readFileSync(target,'utf8');assert(content.includes(`id="${hash}"`),`Missing anchor ${link} on ${file}`);}checked++;}assert(!/href="#(?:start|signin)"/.test(html));}
for(const font of ['schibsted','instrument'])assert.equal(readFileSync(`assets/${font}.woff2`).subarray(0,4).toString(),'wOF2');
assert.equal(pages.length,14);console.log(`PASS: ${pages.length} pages; ${checked} internal links/assets; headings, metadata, footer comparisons, anchors, fonts.`);
