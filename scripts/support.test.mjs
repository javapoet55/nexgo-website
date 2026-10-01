import {test} from 'node:test';
import assert from 'node:assert/strict';
import {articles,answerSupport,retrieve} from '../support-server.mjs';
process.env.OPENAI_API_KEY='';
test('published index excludes hidden pricing and contains help FAQs',()=>{assert(!articles.some(a=>a.url.startsWith('/pricing')));assert(articles.filter(a=>a.url.startsWith('/help#')).length>=14);});
test('common questions return the relevant source',async()=>{for(const q of ['Is there a phone app?','Does it connect to my existing calendar?','How do I share a shopping list?']){assert.equal(retrieve(q)[0].title,q);assert.equal((await answerSupport([{role:'user',content:q}])).mode,'articles');}});
test('unrelated questions get an honest fallback',async()=>assert.equal((await answerSupport([{role:'user',content:'Who won the football championship?'}])).mode,'unknown'));
test('overview works without a key',async()=>{const a=await answerSupport([{role:'user',content:'What can NexDo do?'}]);assert.equal(a.mode,'articles');assert.equal(a.sources[0].url,'/');});
test('AI output validates sources and disables response storage',async()=>{const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';const question='Is there a phone app?';const source=retrieve(question)[0];try{globalThis.fetch=async(_,opts)=>{const request=JSON.parse(opts.body);assert.equal(request.store,false);assert.equal(request.tools,undefined);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({supported:true,answer:'The iPhone app is under review.',sourceIds:[source.id]})}]}]});};assert.equal((await answerSupport([{role:'user',content:question}])).mode,'ai');globalThis.fetch=async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({supported:true,answer:'Fake answer',sourceIds:['invented']})}]}]});assert.equal((await answerSupport([{role:'user',content:question}])).mode,'articles');globalThis.fetch=async()=>{throw Error('outage');};assert.equal((await answerSupport([{role:'user',content:question}])).mode,'articles');}finally{globalThis.fetch=original;process.env.OPENAI_API_KEY='';}});
test('customer service questions retrieve published contact details',async()=>{
  const contact=articles.find(a=>a.id==='contact-details');
  assert(contact?.text.includes('support@nextdoapp.com'));
  for(const q of ['how to contact customer service?','What is your support email?','How can I talk to a human?','Can I speak to a person?','How do I reach you?','Do you have a customer service phone number?']){
    assert.equal(retrieve(q)[0].id,contact.id,q);
    const result=await answerSupport([{role:'user',content:q}]);
    assert.equal(result.mode,'articles');
    assert.equal(result.sources[0].url,'/contact');
    assert(result.answer.includes('support@nextdoapp.com'));
  }
});
test('short contact follow-up retains the support source',async()=>{
  const result=await answerSupport([{role:'user',content:'I need customer service'},{role:'assistant',content:'You can contact support.'},{role:'user',content:'How can I contact them?'}]);
  assert.equal(result.sources[0].url,'/contact');
});
test('contact details reach the AI as evidence',async()=>{
  const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';
  try{
    globalThis.fetch=async(_,opts)=>{
      const context=JSON.parse(JSON.parse(opts.body).input);
      const contact=context.articles.find(a=>a.id==='contact-details');
      assert(contact?.text.includes('support@nextdoapp.com'));
      return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({supported:true,answer:'Email support@nextdoapp.com to contact customer support.',sourceIds:[contact.id]})}]}]});
    };
    const result=await answerSupport([{role:'user',content:'how to contact customer service?'}]);
    assert.equal(result.mode,'ai');assert.equal(result.sources[0].url,'/contact');
  }finally{globalThis.fetch=original;process.env.OPENAI_API_KEY='';}
});
test('every published page is indexed with valid source links',async()=>{
  const {readFileSync}=await import('node:fs');
  const coverage=JSON.parse(readFileSync(new URL('../dist/support-coverage.json',import.meta.url)));
  assert.equal(coverage.length,22);
  for(const page of coverage)assert(page.sources>=2,page.url);
  for(const a of articles){
    const [path,anchor]=a.url.split('#');
    const html=readFileSync(new URL('../dist'+(path==='/'?'':path)+'/index.html',import.meta.url),'utf8');
    if(anchor)assert(html.includes(`id="${anchor}"`),a.url);
    assert(a.text.length<=1850,a.id);
    assert(!a.text.includes('display:none'));
  }
});
const questions=[
 ['How does the Daily Brief prioritize my day?','/daily-brief',/priority, deadlines, progress/],
 ['Can I pause a Pomodoro session?','/pomodoro',/pause|Freeze/i],
 ['Does distraction-free mode block calls?','/pomodoro',/does not silence|No\./],
 ['Can I add repeating appointments?','/calendar',/daily, weekly, monthly/],
 ['How do I find a plumber?','/tasks',/plumber/],
 ['How do smart swaps work?','/help',/unavailable/],
 ['Can I share birthdays with my family?','/important-moments',/Share moments|share with family/i],
 ['How do I log meals in calorie tracker?','/calorie-tracker',/sample food log|sample meal log/],
 ['Does my food agent call me automatically?','/calorie-tracker',/verified phone|Verify your phone/],
 ['How do I delete my account?','/privacy',/deletion request/],
 ['Do you sell my data?','/privacy',/does not sell/],
 ['Can I get a refund?','/terms',/refund/],
 ['Is Nexdo always listening?','/help',/active only/],
];
for(const [question,path,evidence]of questions)test('site-wide answer evidence: '+question,()=>{
  assert(retrieve(question).some(a=>a.url.split('#')[0]===path&&evidence.test(a.text)),question);
});
test('calorie passages preserve website demo qualification',()=>{
  for(const a of articles.filter(a=>a.url.startsWith('/calorie-tracker')))assert.match(a.description,/sample walkthrough/);
});
test('unsupported personal-account actions are not fabricated by fallback',async()=>{
  const result=await answerSupport([{role:'user',content:'What is my personal account password?'}]);
  assert(!result.answer.includes('Your password is'));
});
test('service research answers include the complete published workflow',()=>{
  const found=retrieve('How do I find a plumber?');
  assert(found.some(a=>/city\/ZIP/.test(a.text)));
  assert(found.some(a=>/curated businesses/.test(a.text)));
});
test('customer support contacts do not mix conflicting legal-page emails',()=>{
  const found=retrieve('how to contact customer service?');
  assert(found.length>0);assert(found.every(a=>a.url.split('#')[0]==='/contact'));
});

test('customer calorie-count wording retrieves the actual published workflow',async()=>{
  const question='how does calorie count works?';
  const found=retrieve(question);
  assert.equal(found[0].kind,'workflow');
  assert.equal(found[0].url,'/calorie-tracker#how-calorie-tracker-works');
  for(const term of [/Set your daily goals/i,/Log the meals/i,/Review before/i,/Find your daily picture/i])assert.match(found[0].text,term);
  const result=await answerSupport([{role:'user',content:question}]);
  assert.equal(result.mode,'articles');assert.match(result.answer,/Add food manually/i);
});
for(const [module,path]of [['calories','/calorie-tracker'],['calendar','/calendar'],['tasks','/tasks'],['Pomodoro','/pomodoro'],['moments','/important-moments'],['shopping lists','/shopping-lists'],['NexDo AI','/nexdo-ai'],['Daily Brief','/daily-brief']]){
  test(`how-it-works evidence for ${module}`,()=>{
    const found=retrieve(`How does ${module} work?`);
    assert.equal(found[0].kind,'workflow');assert.equal(found[0].url.split('#')[0],path);
  });
  test(`page-context workflow for ${module}`,async()=>{
    const result=await answerSupport([{role:'user',content:'How does this work?'}],path);
    assert.equal(result.mode,'articles');assert.equal(result.sources[0].url.split('#')[0],path);
  });
}
test('explicit module change overrides older conversation and current page',async()=>{
  const result=await answerSupport([{role:'user',content:'How does calorie tracker work?'},{role:'assistant',content:'Read the calorie guide.'},{role:'user',content:'How does Pomodoro work?'}],'/calorie-tracker');
  assert.equal(result.sources[0].url.split('#')[0],'/pomodoro');
});
test('context never becomes an arbitrary external retrieval source',()=>{
  assert.deepEqual(retrieve('How does this work?','https://example.com/private'),retrieve('How does this work?'));
});
test('AI receives the calorie workflow, including logging and review',async()=>{
  const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';
  try{
    globalThis.fetch=async(_,opts)=>{
      const {articles:context}=JSON.parse(JSON.parse(opts.body).input);
      assert.equal(context[0].kind,'workflow');assert.match(context[0].text,/Log the meals/);assert.match(context[0].text,/Review before/);
      return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({supported:true,answer:'Set your goals, log your meals, review the entries, then compare calories and nutrients with your goals.',sourceIds:[context[0].id]})}]}]});
    };
    const result=await answerSupport([{role:'user',content:'how does calorie count works?'}],'/calorie-tracker');
    assert.equal(result.mode,'ai');assert.equal(result.sources[0].url,'/calorie-tracker#how-calorie-tracker-works');
  }finally{globalThis.fetch=original;process.env.OPENAI_API_KEY='';}
});

for(const question of ['How does Pomodoro work?','Can I pause a Pomodoro session?','How does distraction-free mode work?','how does calorie count works?'])test('concise fallback: '+question,async()=>{
 const result=await answerSupport([{role:'user',content:question}]);
 assert.equal(result.mode,'articles');assert(result.answer.length<900);
 assert(!/Here’s what|Try the interactive|Website demo only|HOW IT WORKS|STEP 0|Your next tap/.test(result.answer));
 assert.equal(result.sources.length,1);
 if(question.includes('pause'))assert.match(result.answer,/pause|freeze/i);
 if(question.includes('distraction')){assert.match(result.answer,/does not|No\./);assert(!/Choose a category|5-minute/.test(result.answer));}
});
test('AI failure and overlong output never dump a page',async()=>{
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';
 try{
  for(const kind of ['outage','long','incomplete']){
   globalThis.fetch=async()=>{if(kind==='outage')throw Error('timeout');return Response.json({status:kind==='incomplete'?'incomplete':'completed',output:[{content:[{type:'output_text',text:JSON.stringify({supported:true,answer:'page text '.repeat(150),sourceIds:[retrieve('How does Pomodoro work?')[0].id]})}]}]});};
   const result=await answerSupport([{role:'user',content:'How does Pomodoro work?'}]);
   assert.equal(result.mode,'articles');assert(result.answer.length<900);assert(!/Try the interactive|Website demo/.test(result.answer));
  }
 }finally{globalThis.fetch=original;process.env.OPENAI_API_KEY='';}
});
