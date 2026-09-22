// Builds the static Nexdo marketing site from site/index.html (single source for every page).
import {readFileSync,writeFileSync,mkdirSync,rmSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const voiceJsFile='voice-demo.'+createHash('sha256').update(readFileSync('site/voice.js')).digest('hex').slice(0,10)+'.js';
const aboutCssFile='about.'+createHash('sha256').update(readFileSync('site/about.css')).digest('hex').slice(0,10)+'.css';
const askCssFile='ask.'+createHash('sha256').update(readFileSync('site/ask.css')).digest('hex').slice(0,10)+'.css';
const voiceCssFile='voice.'+createHash('sha256').update(readFileSync('site/voice.css')).digest('hex').slice(0,10)+'.css';
const momentsCssFile='moments.'+createHash('sha256').update(readFileSync('site/moments.css')).digest('hex').slice(0,10)+'.css';
const shoppingCssFile='shopping.'+createHash('sha256').update(readFileSync('site/shopping.css')).digest('hex').slice(0,10)+'.css';
const ORIGIN='https://nexdoapp.com';
const src=readFileSync('site/index.html','utf8');
const pages={
  home:['/','Nexdo — Get More Done with AI','Your AI action and follow-up assistant. Tasks, calendar, real-time voice, and follow-ups in one calm plan.'],
  'voice-ai':['/voice-ai','NexDo Voice AI Assistant | Turn Conversations Into Action','Talk naturally with NexDo to create tasks, manage your day, ask questions, set reminders, and turn conversations into action.'],
  'shopping-lists':['/shopping-lists','NexDo Shopping Lists | Voice, AI & Smarter Shopping','Create shopping lists by voice, get AI suggestions, send your list to Instacart, and share with family — all with NexDo, your AI Action Assistant.'],
  'important-moments':['/important-moments','NexDo Important Moments | Never Miss What Matters','Remember birthdays, anniversaries and milestones. Plan ahead, get thoughtful AI suggestions, and celebrate together with NexDo Important Moments.'],
  'ask-ai':['/ask-ai','NexDo Ask AI | Your Everyday Questions, Real Progress','Ask NexDo about your day by text or voice — get answers from your tasks and calendar, find free time, see what to do next, and take action.'],
  features:['/features','Features — Nexdo','Daily Brief, Tasks + Calendar, real-time voice, action and follow-up, shopping lists, and Important Moments.'],
  'use-cases':['/use-cases','Use cases — Nexdo','How professionals, families, founders, and students use Nexdo to turn intentions into done.'],
  'why-nexdo':['/why-nexdo','Why Nexdo','Planning tools plan. Nexdo acts: call, text, or email straight from a task, and talk to it in real time.'],
  pricing:['/pricing','Pricing — Nexdo','Get 1 year of NexDo Pro or Max free when you sign up by November 30th. Compare plans and features.'],
  help:['/help','Help center — Nexdo','Answers about getting started, the Daily Brief, voice, follow-ups, lists, and your account.'],
  about:['/about','About — NexDo','We are building the assistant that finishes the job.'],
  trust:['/trust','Trust & privacy — Nexdo','How Nexdo treats your tasks, calendar, and conversations, in plain language.'],
  contact:['/contact','Contact — Nexdo','Support, feedback, press, and partnerships.'],
  start:['/start','Get started — Nexdo','Sign in on the web and get your first Daily Brief in under a minute.'],
  privacy:['/privacy','Privacy Policy — Nexdo','How Nexdo collects, uses, stores, shares, and protects your information.'],
  terms:['/terms','Terms of Service — Nexdo','The terms that govern your use of Nexdo.'],
};
// Temporarily unpublished; keep page content and metadata ready to restore.
const hiddenPages=new Set(['pricing']);
for(const key of hiddenPages)delete pages[key];
const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
// hash routes -> real paths
let html=src.replace(/href="#\/home"/g,'href="/"').replace(/href="#\/([a-z-]+)(#[a-z0-9-]+)?"/g,(m,p,a)=>`href="/${p}${a||''}"`);
html=html.replace(/<a\b[^>]*href="\/pricing(?:#[^"]*)?"[^>]*>[\s\S]*?<\/a>/g,'');
// Keep the plan comparison source, but omit it while plans are unpublished.
html=html.replace(/<section id="all-features"[^>]*>[\s\S]*?<\/section>/,'');
html=html.replace('<main class="wrap">','<main class="wrap" id="main">');
// legal: original documents from src/, ids prefixed to stay unique
function legal(key,pre){
  const raw=readFileSync(`src/${key}-original.html`,'utf8');
  const hero=raw.slice(raw.indexOf('<header class="hero legal-hero">'),raw.indexOf('</header>'));
  const meta=(hero.match(/<p class="legal-meta">([\s\S]*?)<\/p>/)||[,''])[1];
  const lede=(hero.match(/<p class="lede"[^>]*>([\s\S]*?)<\/p>/)||[,''])[1];
  const a=raw.indexOf('<section class="wrap legal">'),b=raw.indexOf('<footer');
  let body=raw.slice(a,b).replace(/<section class="wrap legal">/,'<section class="legal">');
  body=body.replace(/\sid="([^"]+)"/g,` id="${pre}$1"`).replace(/href="#([^"]+)"/g,`href="#${pre}$1"`)
    .replaceAll('href="privacy.html"','href="/privacy"').replaceAll('href="terms.html"','href="/terms"')
    .replaceAll('href="index.html"','href="/"').replaceAll('href="pricing.html"','href="/pricing"').replaceAll('href="ai-assistant.html"','href="/features#voice"');
  const title=key==='privacy'?'Privacy Policy':'Terms of Service';
  return `<div class="page" data-page="${key}">\n  <header class="phead"><div class="eyebrow">Legal</div><h1 style="font-size:clamp(34px,5vw,56px)">${title}</h1><p class="lead">${lede}</p><p class="note">${meta}</p></header>\n  <div class="prose legaldoc">${body}</div>\n</div>\n`;
}
const starts=[...html.matchAll(/<div class="page" data-page="([a-z-]+)">/g)];
const mainEnd=html.indexOf('</main>');
const prefix=html.slice(0,starts[0].index),suffix=html.slice(mainEnd);
const chunk={};
starts.forEach((m,i)=>{chunk[m[1]]=html.slice(m.index,i+1<starts.length?starts[i+1].index:mainEnd).replace(/\n<!-- =+ [^>]*-->\s*$/,'\n');});
chunk.privacy=legal('privacy','pp-');chunk.terms=legal('terms','tos-');
const legalCss=`<style>.legaldoc{max-width:860px}.legaldoc .toc{padding:16px 20px;border-radius:18px;background:var(--glass);border:1px solid var(--glass-b);margin-bottom:26px}.legaldoc .toc summary{cursor:pointer;font-weight:700}.legaldoc .toc ol{padding-left:22px;margin-top:10px}.legaldoc .toc a,.legaldoc a{color:var(--tint-ink)}.legaldoc section{padding:0;margin:0 0 30px}.legaldoc h2{font-size:24px;margin:0 0 8px;letter-spacing:-.02em}.legaldoc p,.legaldoc li{margin:0 0 10px}.legaldoc ul,.legaldoc ol{margin:0 0 12px;padding-left:22px}.legaldoc h3{font-size:19px;margin:18px 0 6px}.legaldoc .plus,.legaldoc .glow{display:none}.legaldoc .callout,.legaldoc .contact-card{padding:16px 20px;border-radius:18px;background:var(--tint);margin:14px 0}.legaldoc dl dt{font-weight:700;color:var(--ink)}.legaldoc dl dd{color:var(--muted);margin:0 0 10px}.legaldoc .n{color:var(--tint-ink);font-weight:800;margin-right:6px}</style>`;
function doc(key,body,status){
  const [path,title,desc]=pages[key]||pages.home;
  const url=ORIGIN+(path==='/'?'/':path);
  const pagePrefix=prefix;
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>${esc(title)}</title>\n<meta name="description" content="${esc(desc)}">\n<link rel="canonical" href="${url}">\n<meta property="og:title" content="${esc(title)}">\n<meta property="og:description" content="${esc(desc)}">\n<meta property="og:url" content="${url}">\n<meta property="og:type" content="website">\n<meta name="theme-color" content="#3D29F0">\n<link rel="icon" type="image/png" href="/assets/favicon.png">\n<link rel="apple-touch-icon" href="/assets/nexdo-mark.png">\n${key==='about'?'<link rel="stylesheet" href="/'+aboutCssFile+'">':key==='ask-ai'?'<link rel="stylesheet" href="/'+askCssFile+'">':key==='voice-ai'?'<link rel="stylesheet" href="/'+voiceCssFile+'">':key==='important-moments'?'<link rel="stylesheet" href="/'+momentsCssFile+'">':key==='shopping-lists'?'<link rel="stylesheet" href="/'+shoppingCssFile+'">':''}\n<script src="/app.js" defer></script>${key==='voice-ai'?'<script src="/'+voiceJsFile+'" defer></script>':''}\n</head>\n<body${key==='about'?' class="about-page"':key==='ask-ai'?' class="ask-page"':key==='voice-ai'?' class="voice-page"':key==='important-moments'?' class="moments-page"':key==='shopping-lists'?' class="shopping-page"':''}>\n${pagePrefix}${body.replace(/<div class="page" data-page="([a-z-]+)">/,'<div class="page on" data-page="$1">')}${suffix}\n</body>\n</html>\n`;
}
rmSync('dist',{recursive:true,force:true});mkdirSync('dist/assets',{recursive:true});
for(const key of Object.keys(pages)){
  let body=chunk[key];if(!body)throw new Error('missing page '+key);
  if(key==='privacy'||key==='terms')body=legalCss+body;
  const dir=key==='home'?'dist':`dist/${key}`;mkdirSync(dir,{recursive:true});
  writeFileSync(`${dir}/index.html`,doc(key,body));
}
const nf=`<div class="page" data-page="notfound"><section style="padding-top:60px"><div class="cta glass"><div class="eyebrow">404</div><h1 style="font-size:clamp(34px,5vw,56px)">That page <span class="grad">wandered off.</span></h1><p>The link may be old or mistyped. Everything Nexdo does is one click away.</p><a class="btn primary" href="/">Back to home</a></div></section></div>\n`;
writeFileSync('dist/404.html',doc('home',nf).replace(/<title>[^<]*<\/title>/,'<title>Page not found — Nexdo</title>').replace(/<link rel="canonical"[^>]*>\n/,'<meta name="robots" content="noindex">\n'));
copyFileSync('site/about.css','dist/'+aboutCssFile);
copyFileSync('site/app.js','dist/app.js');
copyFileSync('site/ask.css','dist/'+askCssFile);
copyFileSync('site/voice.css','dist/'+voiceCssFile);
copyFileSync('site/voice.js','dist/'+voiceJsFile);
copyFileSync('site/moments.css','dist/'+momentsCssFile);
copyFileSync('site/shopping.css','dist/'+shoppingCssFile);
for(const f of ['about-v2-assets.png','ask-v2-assets.png','voice-v2-assets.png','hero-v3-assets.png','moments-assets.png','sl2-assets.png','favicon.png','favicon.ico','nexdo-logo.png','nexdo-mark.png','app-today.webp','nexdo-logo-nav.webp','nexdo-logo-full.webp','sl-groceries.png','sl-voice-bg.png','sl-bag.png','sl-family.png'])if(existsSync('assets/'+f))copyFileSync('assets/'+f,'dist/assets/'+f);
writeFileSync('dist/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.values(pages).map(([p])=>`  <url><loc>${ORIGIN}${p==='/'?'/':p}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Built ${Object.keys(pages).length} pages + 404 into dist/`);
