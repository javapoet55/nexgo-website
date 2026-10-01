// Validates the built site: one H1 per page, metadata, internal links and anchors, no inline scripts (CSP), assets present.
import {readdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');
const files=d=>readdirSync(d).flatMap(n=>statSync(d+'/'+n).isDirectory()?files(d+'/'+n):[d+'/'+n]);
const pages=files(root).filter(f=>f.endsWith('.html'));let links=0;
for(const file of pages){
  const html=readFileSync(file,'utf8');
  assert(html.includes('/support-chat.js') && html.includes('/support-chat.css'),file+' missing support chatbot');
  assert.equal((html.match(/cdn\.amplitude\.com\/script\/a2b6d5293c576970bb6251cbececb5bc\.js/g)||[]).length,1,file+' needs one Amplitude loader');
  assert(html.indexOf('/analytics.js') > html.indexOf('cdn.amplitude.com/script/'),file+' analytics must follow SDK');
  assert(html.indexOf('/analytics.js') < html.indexOf('/app.js'),file+' analytics must precede app events');
  assert.equal((html.match(/<footer[ >]/g)||[]).length,1,file+' must have one shared footer');
  assert(html.includes('<b>Lifestyle</b>'),file+' missing shared Lifestyle footer');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,file+' needs exactly one H1');
  assert(html.includes('name="description"'),file+' description');assert(html.includes('property="og:title"'),file+' og:title');assert(html.includes('id="main"'),file+' main');
  if(!file.endsWith('/404.html'))assert(html.includes('rel="canonical"'),file+' canonical');
  assert(!/<script(?![^>]*\ssrc=)[^>]*>/.test(html),file+' has an inline script (blocked by CSP)');
  assert(!/href="\/pricing(?:["#/?])/.test(html),file+' links to hidden pricing page');
  assert(!html.includes('href="#/'),file+' has a leftover hash route');
  assert(html.includes('href="/tasks"'),file+' missing Products > Tasks nav link');

  assert(html.includes('href="/shopping-lists"'),file+' missing Lifestyle > Shopping Lists nav link');
  assert(html.includes('href="/important-moments"'),file+' missing Lifestyle > Moments nav link');

  const productMenu=html.match(/<div class="dd-m">([\s\S]*?)<\/div>/)?.[1] || '';
  assert(productMenu.startsWith('<a href="/daily-brief"'),file+' Daily Brief must lead Products');
  assert(productMenu.includes('href="/nexdo-ai"'),file+' missing Products > Nexdo AI');
  assert(!/href="\/(?:voice-ai|ask-ai)"/.test(productMenu),file+' contains hidden product menu links');
  assert(productMenu.includes('href="/calendar"'),file+' missing Products > Calendar');
  const lifestyleMenu=[...html.matchAll(/<div class="dd-m">([\s\S]*?)<\/div>/g)][1]?.[1] || '';
  const footerLifestyle=html.match(/<div><b>Lifestyle<\/b>([\s\S]*?)<\/div>/)?.[1] || '';
  for(const route of ['shopping-lists','calorie-tracker','pomodoro','important-moments']){
    assert(lifestyleMenu.includes(`href="/${route}"`),file+' missing Lifestyle > '+route);
    assert(footerLifestyle.includes(`href="/${route}"`),file+' missing footer Lifestyle > '+route);
    assert(!productMenu.includes(`href="/${route}"`),file+' Lifestyle item still in Products');
  }
  const visible=html.replace(/<style[\s\S]*?<\/style>/g,'');
  assert(!/Instacart|store managers|Start your free trial|Cancel anytime/i.test(visible),file+' contains outdated marketing');
  if(!/\/(?:privacy|terms)\/index\.html$/.test(file))assert(!/SOC 2|GDPR Compliant|independent audit|10x|driving.mode|iPhone app (?:is )?coming soon|Calendar connections are part of the roadmap|fully included in your Nexdo plan/i.test(visible),file+' contains unsupported or outdated claims');
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file+' duplicate ids');
  for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const link=m[1];if(/^(https?:|mailto:|data:)/.test(link))continue;
    const [p,hash]=link.split('#');let target=p?(p.startsWith('/')?root+p:resolve(dirname(file),p)):file;
    if(existsSync(target)&&statSync(target).isDirectory())target+='/index.html';
    assert(existsSync(target),`Missing ${link} on ${file}`);
    if(hash)assert(readFileSync(target,'utf8').includes(`id="${hash}"`),`Missing anchor ${link} on ${file}`);links++;
  }
}
assert.equal(pages.length,23,'expected 22 published pages + 404');
assert(!existsSync(root+'/pricing'),'pricing must remain unpublished');
assert(!readFileSync(root+'/sitemap.xml','utf8').includes('/pricing'),'pricing must not appear in sitemap');assert(existsSync(root+'/app.js'));
{const v=readFileSync(root+'/voice-ai/index.html','utf8');
  assert(v.includes('Just say it.')&&v.includes('NexDo gets it done.'),'voice-ai hero');
  assert(v.includes('<title>NexDo Voice AI Assistant | Turn Conversations Into Action</title>'),'voice-ai title');
  assert(/href="https:\/\/app\.nexdoapp\.com\/signup"[^>]*data-event="voice_ai_primary_cta_click"/.test(v),'voice-ai primary CTA');
  for(const t of ['Create Tasks by Voice','Manage Your Day','Ask AI Anything','Take Action','Continuous Conversation','Hands-Free Assistance','See it in action'])assert(v.includes(t),'voice-ai missing '+t);
  assert(v.includes('/assets/voice-v2-assets.png')&&v.includes('id="voice-demo-play"'),'voice asset pack and audio demo');
  assert(/prefers-reduced-motion:reduce\)\{\.va-wv i,\.va-ring\{animation:none\}/.test(v),'voice-ai reduced motion');}
{const v=readFileSync(root+'/shopping-lists/index.html','utf8');
  assert(v.includes('<title>NexDo Shopping Lists | Voice, AI &amp; Smarter Shopping</title>')||v.includes('<title>NexDo Shopping Lists | Voice, AI & Smarter Shopping</title>'),'shopping title');
  assert((v.match(/<h1[ >]/g)||[]).length===1,'shopping one h1');
  for(const t of ['Just say what you need.','your way.','Watch how it works','Current saved list, shared by link','Make everyday simpler','weekly'])assert(v.includes(t),'shopping missing '+t);
  assert(/data-event="shopping_get_started_click"/.test(v),'shopping CTAs');
  assert(v.includes('id="sl-how"'),'shopping how anchor');
  assert(v.includes('/assets/sl2-assets.png'),'shopping supplied asset pack');
  assert(v.includes('class="shopping-page"')&&(/href="\/shopping\.[a-f0-9]{10}\.css"/.test(v)),'shopping scoped styles');}
{const v=readFileSync(root+'/important-moments/index.html','utf8');const txt=v.replace(/<style[\s\S]*?<\/style>/g,'');
  assert((v.match(/<h1[ >]/g)||[]).length===1,'moments one h1');
  for(const t of ['Never miss','what matters','Share &amp; Collaborate','Choose the right time.','Gift Ideas for Mom','Spa Gift Card','starts with remembering.'])assert(txt.includes(t),'moments missing '+t);
  assert(v.includes('class="moments-page"')&&(/href="\/moments\.[a-f0-9]{10}\.css"/.test(v)),'moments scoped styles');
  assert(v.includes('href="/assets/moments-assets.png"'),'moments supplied asset pack');
  assert(!v.includes('/assets/im-design.png'),'moments no longer uses the design screenshot');
  for(const id of ['im-how','im-suggestions'])assert(v.includes('id="'+id+'"'),'moments missing '+id);
  assert(v.includes('data-event="moments_get_started_click"'),'moments signup CTA');}

{const v=readFileSync(root+'/ask-ai/index.html','utf8');const txt=v.replace(/<style[\s\S]*?<\/style>/g,'');
  assert((v.match(/<h1[ >]/g)||[]).length===1,'ask-ai one h1');
  for(const t of ['Your everyday questions.','Try asking','Find time for a workout this week'])assert(txt.includes(t),'ask-ai missing '+t);
  assert(v.includes('/assets/ask-v2-assets.png')&&v.includes('id="ask-how"'),'ask-ai asset pack and how-it-works anchor');}
console.log(`PASS: ${pages.length} files, ${links} internal links/anchors checked.`);

{const v=readFileSync(root+'/nexdo-ai/index.html','utf8');for(const t of ['Talk or Type.','Voice AI','Type AI','See Nexdo AI in action','nai-prompt','/assets/nexdo-ai-pack.png'])assert(v.includes(t),'Nexdo AI missing '+t);for(const f of pages)assert(readFileSync(f,'utf8').includes('href="/nexdo-ai"'),'Nexdo AI navigation missing');}
{ const page=readFileSync(root+'/nexdo-ai/index.html','utf8');
  assert(page.indexOf('id="nai-journey-title"') < page.indexOf('id="how-it-works"'),'new journey must precede Ask Understand Act');
  for(const text of ['From a simple question','real progress.','1. Ask','2. Understand','3. Suggest','4. Take Action','5. Stay on Track','Illustrative conversation'])assert(page.includes(text),'journey missing '+text);
  assert.equal((page.match(/data-nai-example=/g)||[]).length,6,'six example requests');
}

{const features=readFileSync(root+'/features/index.html','utf8');assert.equal((features.match(/class="fx-list"/g)||[]).length,8,'eight module feature lists');assert.equal((features.match(/<h4(?:\s[^>]*)?>/g)||[]).length,40,'five features per module');}
