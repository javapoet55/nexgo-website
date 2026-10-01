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
