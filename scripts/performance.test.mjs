import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
const html=readFileSync('dist/index.html','utf8');
test('homepage image budget and stable cropped artwork dimensions',()=>{
 const assets=[...new Set([...html.matchAll(/(?:href|src)="(\/assets\/home-[a-f0-9]{10}\.webp)"/g)].map(m=>m[1]))];
 assert(assets.length>10);assert(assets.reduce((n,p)=>n+statSync('dist'+p).size,0)<400000);
 for(const m of html.matchAll(/<svg[^>]*data-artwork=[\s\S]*?<\/svg>/g))assert(/<image[^>]* x="[\d]+"[^>]* y="[\d]+"/.test(m[0]));
 assert(/rel="preload" as="image"[^>]*fetchpriority="high"/.test(html));
});
test('homepage CSS removes other product styles and preserves menu states',()=>{
 const css=html.match(/<style data-home-critical(?:="")?>([\s\S]*?)<\/style>/)[1];
 assert(css.length<40000);assert(!css.includes('.va-ring'));assert(css.includes('.dd.open'));assert(css.includes('.menu.open'));assert(css.includes('prefers-reduced-motion'));assert(css.includes('scaleY'));
});
test('compressed representations decode to the original HTML',()=>{
 for(const [suffix,decode] of [['br',brotliDecompressSync],['gz',gunzipSync]])assert.equal(decode(readFileSync('dist/index.html.'+suffix)).toString(),html);
});
