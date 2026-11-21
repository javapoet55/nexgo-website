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
  const source=readFileSync('dist'+url);let img=sharp(source);let width=box?box[2]:900;
  if(box){
   // The viewBox is in the <image>'s declared width/height, which can differ from the file's real pixel
   // size (home-workflow-pack.png is drawn at 2048×711 but is 2129×739). Scale the box into file pixels,
   // or the crop lands short and to the left of the artwork.
   const meta=await sharp(source).metadata();const sx=box[4]?meta.width/box[4]:1,sy=box[5]?meta.height/box[5]:1;
   const left=Math.max(0,Math.round(box[0]*sx)),top=Math.max(0,Math.round(box[1]*sy));
   width=Math.min(meta.width-left,Math.round(box[2]*sx));
   img=img.extract({left,top,width,height:Math.min(meta.height-top,Math.round(box[3]*sy))});
  }
  const bytes=await img.resize({width:Math.min(width,900),withoutEnlargement:true}).webp({quality:88,alphaQuality:100}).toBuffer();
  const name='/assets/home-'+hash(bytes)+'.webp';writeFileSync('dist'+name,bytes);optimized.set(key,name);return name;
 }
 async function walk(n){
  if(n.tagName==='svg'){
   const imgs=n.childNodes?.filter(c=>c.tagName==='image')||[];
   const vb=attr(n,'viewBox')?.split(/\s+/).map(Number);
   if(imgs.length===1&&vb?.length===4&&vb.every(Number.isInteger)){
    const im=imgs[0],url=attr(im,'href');
    if(url?.startsWith('/assets/')&&url.endsWith('.png')){
     const replacement=await imageAsset(url,[...vb,Number(attr(im,'width'))||0,Number(attr(im,'height'))||0]);set(n,'data-artwork',url.split('/').pop());
     set(im,'href',replacement);set(im,'x',vb[0]);set(im,'y',vb[1]);set(im,'width',vb[2]);set(im,'height',vb[3]);
     if((attr(n,'class')||'').includes('hx-pack-phone'))heroImage=replacement;
    }
   }
  }
  if(n.tagName==='img'){
   const url=attr(n,'src');if((attr(n,'class')||'').includes('hx-vector-phone'))heroImage=url;if(url!=='/assets/nexdo-hero-tracked-qr.png'&&url?.startsWith('/assets/')&&/\.(png|webp)$/.test(url)){set(n,'src',await imageAsset(url));set(n,'decoding','async');}
  }
  for(const c of n.childNodes||[])await walk(c);
 }
 await walk(doc);
 let html=serialize(doc);
 const css=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
 html=html.replace(/<style>[\s\S]*?<\/style>/g,'');
 const [{css:clean}]=await new PurgeCSS().purge({content:[{raw:html,extension:'html'},{raw:readFileSync('site/app.js','utf8'),extension:'js'}],css:[{raw:css}],safelist:['open','cur','on'],keyframes:true});
 // Inline the small, pruned stylesheet so first paint does not wait on another request.
 html=html.replace('</head>',`<style data-home-critical>${clean}</style>${heroImage?`<link rel="preload" as="image" href="${heroImage}" fetchpriority="high" media="(min-width:1061px)">`:''}</head>`);
 writeFileSync(file,html);
 console.log(`Homepage CSS: ${Buffer.byteLength(css)} → ${Buffer.byteLength(clean)} bytes; ${optimized.size} optimized image regions.`);
}
