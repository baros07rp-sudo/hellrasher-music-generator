import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import{createRequire}from'node:module';
const require=createRequire(import.meta.url),{NativeAceEngine}=require('../electron/ace-native.cjs');
test('Native ACE two-stage contract preserves Czech, caption, seeds and real audio provenance',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'hmg-ace-contract-'));await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify({assets:[]}));let lm,synth;const bytes=Buffer.from('RIFF fixture contract only');
 const server=http.createServer(async(req,res)=>{
  const chunks=[];for await(const c of req)chunks.push(c);const body=chunks.length?JSON.parse(Buffer.concat(chunks)):null;res.setHeader('Content-Type','application/json');
  if(req.url==='/lm'){lm=body;return res.end(JSON.stringify({id:'lm-one'}));}
  if(req.url==='/synth'){synth=body;return res.end(JSON.stringify({id:'synth-one'}));}
  if(req.url==='/job?id=lm-one&result=1')return res.end(JSON.stringify([{...lm,audio_codes:'1,2,3',bpm:86}]));
  if(req.url==='/job?id=synth-one&result=1'){res.setHeader('Content-Type','multipart/mixed; boundary=ace-batch-boundary');return res.end(Buffer.concat([Buffer.from('--ace-batch-boundary\r\nContent-Type: audio/wav\r\n\r\n'),bytes,Buffer.from('\r\n--ace-batch-boundary\r\nContent-Type: application/octet-stream\r\n\r\nlatent\r\n--ace-batch-boundary--\r\n')]));}
  if(req.url?.includes('cancel=1'))return res.end(JSON.stringify({cancelled:true}));
  res.end(JSON.stringify({status:'done'}));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const engine=new NativeAceEngine(folder,folder,{},()=>{});engine.base='http://127.0.0.1:'+server.address().port;engine.process={};engine.props={selectedModel:'acestep-v15-xl-sft-Q8_0'};
  const request={caption:'Gothic metal with distorted guitar riffs and a choir.',lyrics:'[Chorus]\nPříliš žluťoučký kůň',duration:45,bpm:86,timesignature:'6',vocal_language:'cs',seed:123,lm_seed:456,output_format:'wav24',steps:50,dit_cfg:1};
  const {id}=await engine.submit(request);assert.equal(lm.vocal_language,'cs');assert.equal(lm.use_cot_caption,false);assert.equal(lm.lyrics,request.lyrics);assert.equal(lm.lm_seed,456);
  assert.equal((await engine.status(id)).status,'running');assert.equal(synth.caption,request.caption);assert.equal(synth.lyrics,request.lyrics);assert.equal(synth.audio_codes,'1,2,3');assert.equal(synth.inference_steps,50);assert.equal(synth.shift,1);assert.equal((await engine.status(id)).status,'done');
  const result=await engine.result(id);assert.deepEqual(result.tracks[0].audio,bytes);assert.equal(result.tracks[0].replay.backend,'acestep-native');assert.equal(result.tracks[0].replay.vocal_language,'cs');
  const second=await engine.submit(request);await engine.cancel(second.id);assert.equal((await engine.status(second.id)).status,'cancelled');
 }finally{await new Promise(r=>server.close(r));await fs.rm(folder,{recursive:true,force:true});}
});
