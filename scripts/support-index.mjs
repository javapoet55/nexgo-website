import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const clean=s=>s.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
export function buildSupportIndex(){
  const articles=[];
  const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
  for(const file of walk('dist').filter(f=>f.endsWith('/index.html'))){
    let html=readFileSync(file,'utf8'); const url=file.replace(/^dist/,'').replace(/index.html$/,'').replace(/\/$/,'')||'/';
    if(['/privacy','/terms'].includes(url))continue;
    const title=clean(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]||'NexDo');
    const description=clean(html.match(/<meta name="description" content="([^"]*)"/)?.[1]||'');
    if(description)articles.push({id:`page-${articles.length}`,title,text:description,url});
    let main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
    if(url==='/contact')articles.push({id:'contact-details',title:'Contact customer service and support',text:clean(main),url,keywords:'customer service support email contact human person representative agent feedback press partnership'});
    main=main.replace(/<details\b([^>]*)>([\s\S]*?)<\/details>/g,(all,attrs,body)=>{
      const question=clean(body.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1]||'');
      const answer=clean(body.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/,''));
      if(!question||!answer||!question.endsWith('?'))return all;
      const id=attrs.match(/\bid="([^"]+)"/)?.[1]||`support-faq-${articles.length}`;
      articles.push({id:`faq-${articles.length}`,title:question,text:answer,url:`${url}#${id}`});
      return `<details${attrs}${/\bid=/.test(attrs)?'':` id="${id}"`}>${body}</details>`;
    });
    html=html.replace(/(<main\b[^>]*>)[\s\S]*?(<\/main>)/,(_,a,b)=>a+main+b);
    writeFileSync(file,html);
  }
  if(articles.filter(a=>a.url.startsWith('/help#')).length<10)throw Error('Help indexing failed');
  writeFileSync('dist/support-articles.json',JSON.stringify(articles));
  console.log(`Indexed ${articles.length} published support sources; hidden pages excluded.`);
}
