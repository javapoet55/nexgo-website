import http from 'node:http';
import {recordHeroQrOpen} from './qr-analytics.mjs';
import {supportRoute} from './support-server.mjs';
import {clientAddress,createLimiter,setting} from './abuse-guard.mjs';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('dist');
const aliases={'/index.html':'/','/welcome':'/','/welcome/':'/','/pricing.html':'/pricing','/privacy.html':'/privacy','/terms.html':'/terms','/ai-assistant.html':'/features#voice','/features/ai-assistant':'/features#voice','/security':'/trust','/support':'/contact','/compare':'/why-nexdo','/compare/asana':'/why-nexdo','/compare/monday':'/why-nexdo','/compare/akiflow':'/why-nexdo','/compare/motion':'/why-nexdo','/compare/todoist':'/why-nexdo'};
const types={'.svg':'image/svg+xml','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};

// Only our own hostnames may appear in a redirect this server writes.
const ownHost=/^(?:[a-z0-9-]+\.)*nexdoapp\.com$|^[a-z0-9-]+\.up\.railway\.app$/i;

// Scanner defence. A real visit is a page plus about fifteen files and almost never a missing one.
// A scanner asks for hundreds of files that do not exist, so missing files are what gets counted.
const MINUTE=60_000;
const requests=createLimiter({limit:setting('SITE_REQUESTS_PER_MINUTE',300),windowMs:MINUTE});
const misses=createLimiter({limit:setting('SITE_MISSES_PER_MINUTE',20),windowMs:MINUTE});
const blockMs=setting('SITE_BLOCK_MINUTES',10)*MINUTE;
const blocked=new Map();
const isBlocked=(address,now)=>{const until=blocked.get(address);if(!until)return false;if(until>now)return true;blocked.delete(address);return false;};
/** Count a request for something this site does not have; enough of them blocks the address. */
const strike=(address,now)=>{
  if(!address||misses.take(address,now))return;
  if(blocked.size>=50_000)for(const[k,until]of blocked){if(until<=now||blocked.size>=50_000)blocked.delete(k);else break;}
  if(!blocked.has(address))console.warn(JSON.stringify({event:'scanner_blocked',address,minutes:blockMs/MINUTE}));
  blocked.set(address,now+blockMs);
};
// Nothing published starts with a dot (except /.well-known) or has an extension outside `types`.
const looksLikeProbe=path=>/\/\.(?!well-known(?:\/|$))/.test(path)||(extname(path)!==''&&!types[extname(path).toLowerCase()]);
const plain=(res,status,text,headers={})=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(text),...headers});res.end(text);};

// dist/ never changes while the server runs, so each published file is read and hashed once.
const kinds=new Map();
const kindOf=async file=>{let kind=kinds.get(file);if(kind)return kind;try{kind=(await stat(file)).isDirectory()?'dir':'file';}catch{return null;}kinds.set(file,kind);return kind;};
const loaded=new Map();
const load=async file=>{let entry=loaded.get(file);if(!entry){const data=await readFile(file);entry={data,etag:'"'+createHash('sha256').update(data).digest('hex').slice(0,24)+'"'};loaded.set(file,entry);}return entry;};

let warnedNoAddress=false;
const server=http.createServer(async(req,res)=>{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"upgrade-insecure-requests; default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://*.amplitude.com; font-src 'self'; connect-src 'self' https://*.amplitude.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'");
const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
const proto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim();
if(proto&&proto!=='https'&&ownHost.test(host)){res.writeHead(301,{Location:'https://'+host+req.url});return res.end();}
res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
const now=Date.now();
const address=clientAddress(req);
if(!address&&process.env.NODE_ENV==='production'&&!warnedNoAddress){warnedNoAddress=true;console.warn(JSON.stringify({event:'visitor_address_missing',note:'No usable X-Real-IP header; per-visitor limits are off for these requests.'}));}
if(address&&isBlocked(address,now))return plain(res,429,'Too many requests.',{'Retry-After':String(Math.ceil((blocked.get(address)-now)/1000))});
if(address&&!requests.take(address,now))return plain(res,429,'Too many requests.',{'Retry-After':'60'});
if(req.url.split('?')[0]==='/api/support/chat')return supportRoute(req,res);
if(!['GET','HEAD'].includes(req.method)){strike(address,now);res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
if (/^\/get-app\/?(?:\?|$)/.test(req.url)) {
  const agent = req.headers['user-agent'] || '';
  const platform = req.headers['sec-ch-ua-platform'];
  let destination = '/#hero-store-links';
  if (platform === '"Android"' || /Android/i.test(agent)) {
    destination = 'https://play.google.com/store/apps/details?id=com.pinslots.nexdo';
  } else if (platform === '"iOS"' || /iPhone|iPad|iPod/i.test(agent)) {
    destination = 'https://apps.apple.com/us/app/nexdo-ai-planner/id6812225981';
  }
  res.writeHead(302, {Location: destination, 'Cache-Control': 'no-store', Vary: 'User-Agent, Sec-CH-UA-Platform'});
  res.end();
  if (new URL(req.url, 'http://localhost').searchParams.get('source') === 'hero-qr') {
    recordHeroQrOpen(req, destination);
  }
  return;
}
try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  // A decoded "//host" or "\host" would turn the trailing-slash redirect below into a link to another site.
  if(path.includes('//')||path.includes('\\')||looksLikeProbe(path)){strike(address,now);return plain(res,404,'Not found.');}
  if(aliases[path]){res.writeHead(301,{Location:aliases[path]});return res.end();}
  if(path.length>1&&path.endsWith('/')){res.writeHead(301,{Location:encodeURI(path.slice(0,-1))});return res.end();}
  let file=resolve(root,'.'+path);
  if(file!==root&&!file.startsWith(root+'/')){strike(address,now);return plain(res,404,'Not found.');}
  let status=200;
  if(await kindOf(file)==='dir')file=resolve(file,'index.html');
  if(await kindOf(file)!=='file'){file=resolve(root,'404.html');status=404;strike(address,now);}
  const extension=extname(file);
  res.setHeader('Content-Type',types[extension]||'application/octet-stream');
  const fingerprinted=/[.-][a-f0-9]{10}\.(?:webp|css|js)$/.test(file);
  res.setHeader('Cache-Control',extension==='.html'?'public, max-age=0, must-revalidate':fingerprinted?'public, max-age=31536000, immutable':'public, max-age=3600');
  res.setHeader('Vary','Accept-Encoding');
  const accepted=String(req.headers['accept-encoding']||'').split(',').map(v=>{const [name,...params]=v.trim().split(';');const q=params.find(p=>p.trim().startsWith('q='));return {name,q:q?Number(q.trim().slice(2)):1};}).filter(v=>v.q>0).sort((a,b)=>b.q-a.q||((a.name==='br'?-1:0)-(b.name==='br'?-1:0)));
  let encoding;
  for(const choice of accepted){if(!['br','gzip'].includes(choice.name))continue;const candidate=file+(choice.name==='br'?'.br':'.gz');if(await kindOf(candidate)==='file'){file=candidate;encoding=choice.name;break;}}
  const {data,etag}=await load(file);
  if(encoding)res.setHeader('Content-Encoding',encoding);
  res.setHeader('ETag',etag);
  if(status===200&&req.headers['if-none-match']===etag){res.writeHead(304);return res.end();}
  res.setHeader('Content-Length',data.length);res.writeHead(status);res.end(req.method==='HEAD'?undefined:data);
}catch{if(!res.headersSent){strike(address,now);res.writeHead(400);}res.end('Bad request');}
});
// A request has to arrive promptly; this stops connections held open by slow, partial requests.
server.headersTimeout=15_000;server.requestTimeout=30_000;
server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('NexDo marketing server ready'));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
