import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse,serialize} from 'parse5';
const attr=(n,key)=>n.attrs?.find(a=>a.name===key)?.value;
const excluded=n=>attr(n,'data-support-exclude')!==undefined||['script','style','svg','template','nav','footer'].includes(n.tagName)||attr(n,'hidden')!==undefined||attr(n,'aria-hidden')==='true'||/display\s*:\s*none|visibility\s*:\s*hidden/i.test(attr(n,'style')||'');
const text=n=>excluded(n)?'':n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join(' ');
const clean=n=>text(n).replace(/\s+/g,' ').trim();
const find=(n,p)=>p(n)?n:(n.childNodes||[]).map(c=>find(c,p)).find(Boolean);
const idFor=(url,key)=>'support-'+createHash('sha256').update(url+'|'+key).digest('hex').slice(0,12);
export function buildSupportIndex(){
  const articles=[],coverage=[];
  const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
  const files=walk('dist').filter(f=>f.endsWith('/index.html'));
  // Preserve FAQ anchors already shared by the original support chatbot.
  let legacyCount=0;
  for(const file of files){
    if(/\/(privacy|terms)\/index.html$/.test(file))continue;
    let html=readFileSync(file,'utf8');
    if(/<meta name="description" content="[^"]+"/.test(html))legacyCount++;
    if(file==='dist/contact/index.html')legacyCount++;
    html=html.replace(/<details\b([^>]*)>([\s\S]*?)<\/details>/g,(all,attrs,body)=>{
      const title=body.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.replace(/<[^>]*>/g,'').trim();
      if(!title?.endsWith('?'))return all;
      const id=`support-faq-${legacyCount++}`;
      return `<details${attrs}${/\bid=/.test(attrs)?'':` id="${id}"`}>${body}</details>`;
    });
    writeFileSync(file,html);
  }
  for(const file of files.sort()){
    const doc=parse(readFileSync(file,'utf8'));
    const url=file.replace(/^dist/,'').replace(/index.html$/,'').replace(/\/$/,'')||'/';
    const main=find(doc,n=>n.tagName==='main');if(!main)throw Error('Missing main: '+url);
    const pageTitle=clean(find(doc,n=>n.tagName==='title'));
    const description=attr(find(doc,n=>n.tagName==='meta'&&attr(n,'name')==='description'),'content')||'';
    const before=articles.length;
    const add=(title,body,anchor='',kind='section',answerParagraphs=[])=>{
      if(body.length<(kind==='section'?60:20))return;
      // Small passages keep retrieval focused; retain the page description on every passage.
      const paragraphs=body.match(/.{1,1800}(?:\s|$)/g)||[body];
      paragraphs.forEach((part,i)=>articles.push({id:idFor(url,title+'|'+anchor+'|'+i),title,text:part.trim(),url:url+(anchor?'#'+anchor:''),pageTitle,description,kind,answerParagraphs}));
    };
    add(pageTitle,description,'','overview');
    if(url==='/contact')articles.push({id:'contact-details',title:'Contact customer service and support',text:clean(main),url,pageTitle,description,kind:'contact',keywords:'customer service support email contact human person representative agent feedback press partnership'});
    // Keep the published workflow together, rather than losing its steps to heading chunks.
    const workflowIds={'/calorie-tracker':'how-calorie-tracker-works','/calendar':'calendar-how-it-works','/tasks':'tasks-how-it-works','/pomodoro':'pomodoro-how-it-works','/important-moments':'im-how','/shopping-lists':'sl-how','/nexdo-ai':'how-it-works','/daily-brief':'brief-tour'};
    const workflowId=workflowIds[url];
    const workflow=workflowId&&find(main,n=>attr(n,'id')===workflowId);
    if(workflow){
      const paragraphs=[];
      const collect=n=>{if(excluded(n))return;if(n.tagName==='p'){const t=clean(n);if(t.length>65)paragraphs.push(t);return;}for(const c of n.childNodes||[])collect(c);};
      collect(find(workflow,n=>n.tagName==='ol')||workflow);
      add('How it works — '+pageTitle,clean(workflow),workflowId,'workflow',paragraphs.slice(0,4));
    }
    let heading=pageTitle,anchor='',parts=[],answerParts=[];const parents={};
    const flush=()=>{add(heading,parts.join(' ').replace(/\s+/g,' ').trim(),anchor,'section',answerParts);parts=[];answerParts=[];};
    let sequence=0;
    const visit=n=>{
      if(excluded(n))return;
      if(n.tagName==='details'){
        flush();const summary=find(n,x=>x.tagName==='summary');
        const title=summary?clean(summary).replace(/\s*\+$/,''):'';
        if(title.endsWith('?')){
          let id=attr(n,'id');if(!id){id=idFor(url,'faq-'+sequence++);n.attrs.push({name:'id',value:id});}
          const body=(n.childNodes||[]).filter(x=>x!==summary).map(clean).join(' ');
          add(title,body,id,'faq',[body.trim()]);return;
        }
      }
      if(/^h[1-4]$/.test(n.tagName||'')){
        flush();const level=Number(n.tagName[1]);for(const k of Object.keys(parents))if(Number(k)>=level)delete parents[k];
        parents[level]=clean(n);heading=Object.values(parents).join(' — ');
        anchor=attr(n,'id');if(!anchor){anchor=idFor(url,'heading-'+sequence++);n.attrs.push({name:'id',value:anchor});}
        return;
      }
      if(n.tagName==='p'&&clean(n).length>30)answerParts.push(clean(n));
      if(n.nodeName==='#text')parts.push(n.value);
      else for(const child of n.childNodes||[])visit(child);
    };
    visit(main);flush();
    coverage.push({url,sources:articles.length-before});
    writeFileSync(file,serialize(doc));
  }
  if(coverage.length!==22||coverage.some(p=>p.sources<2))throw Error('Incomplete website support coverage');
  writeFileSync('dist/support-articles.json',JSON.stringify(articles));
  writeFileSync('dist/support-coverage.json',JSON.stringify(coverage,null,2));
  console.log(`Indexed ${articles.length} passages across ${coverage.length} published pages.`);
}
