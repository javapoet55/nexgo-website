import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist');
const aliases={'/index.html':'/','/welcome':'/','/welcome/':'/','/pricing.html':'/pricing','/privacy.html':'/privacy','/terms.html':'/terms','/ai-assistant.html':'/features/ai-assistant','/support':'/contact'};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'");
if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(aliases[path]){res.writeHead(301,{Location:aliases[path]});return res.end();}if(path.length>1&&path.endsWith('/')){res.writeHead(301,{Location:path.slice(0,-1)});return res.end();}let file=resolve(root,'.'+path);if(file!==root&&!file.startsWith(root+'/')){res.writeHead(404);return res.end();}let status=200;try{const s=await stat(file);if(s.isDirectory())file=resolve(file,'index.html');await stat(file);}catch{file=resolve(root,'404.html');status=404;}const data=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control',extname(file)==='.html'?'public, max-age=0, must-revalidate':'public, max-age=3600');res.writeHead(status);res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(400);res.end('Bad request');}
});
server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('NexDo marketing server ready'));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
