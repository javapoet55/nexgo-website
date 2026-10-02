import http from 'node:http';
import {supportRoute} from './support-server.mjs';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('dist');
const aliases={'/index.html':'/','/welcome':'/','/welcome/':'/','/pricing.html':'/pricing','/privacy.html':'/privacy','/terms.html':'/terms','/ai-assistant.html':'/features#voice','/features/ai-assistant':'/features#voice','/security':'/trust','/support':'/contact','/compare':'/why-nexdo','/compare/asana':'/why-nexdo','/compare/monday':'/why-nexdo','/compare/akiflow':'/why-nexdo','/compare/motion':'/why-nexdo','/compare/todoist':'/why-nexdo'};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"upgrade-insecure-requests; default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://*.amplitude.com; font-src 'self'; connect-src 'self' https://*.amplitude.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'");
const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
const proto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim();
if(proto&&proto!=='https'&&host&&!/^(localhost|127\.0\.0\.1)(:|$)/.test(host)){res.writeHead(301,{Location:'https://'+host+req.url});return res.end();}
res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
if(req.url.split('?')[0]==='/api/support/chat')return supportRoute(req,res);
if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(aliases[path]){res.writeHead(301,{Location:aliases[path]});return res.end();}if(path.length>1&&path.endsWith('/')){res.writeHead(301,{Location:path.slice(0,-1)});return res.end();}let file=resolve(root,'.'+path);if(file!==root&&!file.startsWith(root+'/')){res.writeHead(404);return res.end();}let status=200;try{const s=await stat(file);if(s.isDirectory())file=resolve(file,'index.html');await stat(file);}catch{file=resolve(root,'404.html');status=404;}const extension=extname(file);
res.setHeader('Content-Type',types[extension]||'application/octet-stream');
const fingerprinted=/[.-][a-f0-9]{10}\.(?:webp|css|js)$/.test(file);
res.setHeader('Cache-Control',extension==='.html'?'public, max-age=0, must-revalidate':fingerprinted?'public, max-age=31536000, immutable':'public, max-age=3600');
res.setHeader('Vary','Accept-Encoding');
const accepted=String(req.headers['accept-encoding']||'').split(',').map(v=>{const [name,...params]=v.trim().split(';');const q=params.find(p=>p.trim().startsWith('q='));return {name,q:q?Number(q.trim().slice(2)):1};}).filter(v=>v.q>0).sort((a,b)=>b.q-a.q||((a.name==='br'?-1:0)-(b.name==='br'?-1:0)));
let encoding;
for(const choice of accepted){if(!['br','gzip'].includes(choice.name))continue;const candidate=file+(choice.name==='br'?'.br':'.gz');try{await stat(candidate);file=candidate;encoding=choice.name;break;}catch{}}
const data=await readFile(file);
if(encoding)res.setHeader('Content-Encoding',encoding);
const etag='"'+createHash('sha256').update(data).digest('hex').slice(0,24)+'"';
res.setHeader('ETag',etag);
if(status===200&&req.headers['if-none-match']===etag){res.writeHead(304);return res.end();}
res.setHeader('Content-Length',data.length);res.writeHead(status);res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(400);res.end('Bad request');}
});
server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('NexDo marketing server ready'));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
