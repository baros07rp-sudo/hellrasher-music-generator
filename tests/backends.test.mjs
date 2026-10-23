import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{AceStepEngine}=require('../electron/backends.cjs');
async function fixture(handler,run){const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{await run('http://127.0.0.1:'+server.address().port);}finally{await new Promise(resolve=>server.close(resolve));}}
function send(res,data){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,code:200,error:null}));}
test('ACE documented API contract: discovery, exact Czech lyrics, turbo controls, task polling, binary result and provenance',async()=>{
 let submitted;const fixtureBytes=Buffer.from('RIFF contract fixture, not AI music');
 await fixture(async(req,res)=>{
  if(req.url==='/health')return send(res,{status:'ok',version:'contract-fixture'});
  if(req.url==='/v1/models')return send(res,{models:[{name:'acestep-v15-turbo',is_default:true},{name:'acestep-v15-base'}],default_model:'acestep-v15-turbo'});
  const chunks=[];for await(const c of req)chunks.push(c);const body=chunks.length?JSON.parse(Buffer.concat(chunks)):{};
  if(req.url==='/release_task'){submitted=body;return send(res,{task_id:'fixture-task'});}
  if(req.url==='/query_result'){assert.deepEqual(body.task_id_list,['fixture-task']);return send(res,[{task_id:'fixture-task',status:1,result:JSON.stringify([{file:'/v1/audio?path=fixture.wav',seed:99}])}]);}
  if(req.url.startsWith('/v1/audio')){res.setHeader('Content-Type','audio/wav');return res.end(fixtureBytes);}res.writeHead(404).end();
 },async endpoint=>{
  const engine=new AceStepEngine({endpoint});const props=await engine.start();assert.equal(props.defaults.steps,8);assert.equal(engine.capabilities.replay,false);assert.equal(engine.capabilities.cancel,false);
  const lyrics='[Verse]\nPříliš žluťoučký kůň';await engine.submit({caption:'Acoustic folk, Czech female lead',lyrics,duration:95,vocal_language:'cs',steps:8,dit_cfg:9,seed:99,output_format:'wav16'});
  assert.equal(submitted.lyrics,lyrics);assert.equal(submitted.vocal_language,'cs');assert.equal(submitted.guidance_scale,1);assert.equal(submitted.audio_duration,95);assert.equal(submitted.thinking,true);assert.equal(submitted.use_format,false);
  assert.equal((await engine.status('fixture-task')).status,'done');const result=await engine.result('fixture-task');assert.deepEqual(result.tracks[0].audio,fixtureBytes);assert.equal(result.tracks[0].replay.backend_model,'acestep-v15-turbo');assert.equal(result.tracks[0].replay.backend_request.lyrics,lyrics);await assert.rejects(engine.cancel('fixture-task'),/neumožňuje/);engine.stop();
 });
});
test('ACE refuses a result URL outside the connected audio endpoint',async()=>{
 const engine=new AceStepEngine({endpoint:'http://127.0.0.1:8001'});engine.jobs.set('bad',{request:{},body:{},results:[{file:'https://example.com/collect'}]});await assert.rejects(engine.result('bad'),/nepovolenou/);
 engine.jobs.set('bad',{request:{},body:{},results:[{file:'http://127.0.0.1:8001/admin'}]});await assert.rejects(engine.result('bad'),/nepovolenou/);
});
test('ACE does not silently choose a different model when selected weights are unavailable',async()=>{
 await fixture((req,res)=>send(res,req.url==='/health'?{status:'ok'}:{models:[{name:'acestep-v15-turbo'}],default_model:'acestep-v15-turbo'}),async endpoint=>{const engine=new AceStepEngine({endpoint,model:'missing-base'});await assert.rejects(engine.start(),/není.*dostupný/);assert.equal(engine.process,null);});
});
