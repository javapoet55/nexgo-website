// Keep the authored layout and artwork; ship only the atlas regions the homepage displays.
import sharp from 'sharp';
import {PurgeCSS} from 'purgecss';
import {parse,serialize} from 'parse5';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex').slice(0,10);
export async function optimizeHome(){
 const file='dist/index.html';const original=readFileSync(file,'utf8');const doc=parse(original);
 const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
 const set=(n,k,v)=>{const a=n.attrs.find(a=>a.name===k);if(a)a.value=String(v);else n.attrs.push({name:k,value:String(v)});};
 const optimized=new Map();let heroImage;
 async function imageAsset(url,box){
  const key=url+JSON.stringify(box);if(optimized.has(key))return optimized.get(key);
  let img=sharp(readFileSync('dist'+url));
  if(box)img=img.extract({left:box[0],top:box[1],width:box[2],height:box[3]});
  const bytes=await img.resize({width:box?Math.min(box[2],900):900,withoutEnlargement:true}).webp({quality:88,alphaQuality:100}).toBuffer();
  const name='/assets/home-'+hash(bytes)+'.webp';writeFileSync('dist'+name,bytes);optimized.set(key,name);return name;
 }
 async function walk(n){
  if(n.tagName==='svg'){
   const imgs=n.childNodes?.filter(c=>c.tagName==='image')||[];
   const vb=attr(n,'viewBox')?.split(/\s+/).map(Number);
   if(imgs.length===1&&vb?.length===4&&vb.every(Number.isInteger)){
    const im=imgs[0],url=attr(im,'href');
    if(url?.startsWith('/assets/')&&url.endsWith('.png')){
     const replacement=await imageAsset(url,vb);set(n,'data-artwork',url.split('/').pop());
     set(im,'href',replacement);set(im,'x',vb[0]);set(im,'y',vb[1]);set(im,'width',vb[2]);set(im,'height',vb[3]);
     if((attr(n,'class')||'').includes('hx-pack-phone'))heroImage=replacement;
    }
   }
  }
  if(n.tagName==='img'){
   const url=attr(n,'src');if(url?.startsWith('/assets/')&&/\.(png|webp)$/.test(url)){set(n,'src',await imageAsset(url));set(n,'decoding','async');}
  }
  for(const c of n.childNodes||[])await walk(c);
 }
 await walk(doc);
 let html=serialize(doc);
 const css=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
 html=html.replace(/<style>[\s\S]*?<\/style>/g,'');
 const [{css:clean}]=await new PurgeCSS().purge({content:[{raw:html,extension:'html'},{raw:readFileSync('site/app.js','utf8'),extension:'js'}],css:[{raw:css}],safelist:['open','cur','on'],keyframes:true});
 const name='/home.'+hash(clean)+'.css';writeFileSync('dist'+name,clean);
 html=html.replace('</head>',`<link rel="stylesheet" href="${name}">${heroImage?`<link rel="preload" as="image" href="${heroImage}" fetchpriority="high">`:''}</head>`);
 writeFileSync(file,html);
 console.log(`Homepage CSS: ${Buffer.byteLength(css)} → ${Buffer.byteLength(clean)} bytes; ${optimized.size} optimized image regions.`);
}
