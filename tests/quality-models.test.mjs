import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
import {newProject,buildRequest,lyricInput} from '../electron/domain.mjs';import {compilePlan,identityConflicts} from '../electron/planning-core.mjs';
const require=createRequire(import.meta.url),{qualityRouting,routingWarnings}=require('../electron/model-quality.cjs'),{Models}=require('../electron/models.cjs'),{NativeYueEngine}=require('../electron/yue-native.cjs');

test('A requested choir remains valid when the planner excludes other backing vocals',()=>{
 const p={...newProject(),concept:'Symphonic gothic metal, female lead with backing choir.'},draft={genres:['gothic metal'],leadVoice:'female',global:'Gothic metal with choir.',vocals:'No backing vocals except specified choir.',arrangement:'Heavy distorted guitars, drums and choir.'};
 assert.deepEqual(identityConflicts(p,draft),[]);assert.ok(identityConflicts(p,{...draft,vocals:'No backing vocals and no choir.'}).some(s=>s.includes('choir')));
 const r=buildRequest({...p,lyrics:'Vracím se domů'},{output_format:'mp3'},{},'acestep-native');assert.equal(r.steps,50);assert.equal(r.dit_cfg,7);assert.equal(r.output_format,'wav24');
});

test('Automatic 16GB MiniMax quality uses Q8 for LM and depth even when BF16 files are installed',()=>{
 const entries=new Models('resources/models/upstream.json','.').entries();const safe=qualityRouting(entries,{total:16311});
 for(const role of ['lm','depth','dit'])assert.match(safe[role+'_model'],/Q8_0/);for(const role of ['cond','vae'])assert.match(safe[role+'_model'],/F32/);
 const native=qualityRouting(entries,{total:32768});assert.match(native.lm_model,/BF16/);assert.match(native.depth_model,/BF16/);assert.match(native.dit_model,/F32/);
 assert.equal(routingWarnings(native,{total:16311}).length,1);assert.equal(routingWarnings(safe,{total:16311}).length,0);
});

test('ACE retains section performance directions while MiniMax receives its supported canonical tags',()=>{
 const p={...newProject(),concept:'Gothic metal',lyrics:'[Verse - whispered]\nVracím se domů\n[Pre-Chorus]\nUž nejsem sám\n[Chorus: soaring]\nZůstávám dál'};
 assert.match(lyricInput(p,'acestep-native'),/\[Verse - whispered\]\nVracím se domů/);assert.match(lyricInput(p,'acestep-native'),/\[Pre-Chorus\]/);assert.match(lyricInput(p,'acestep-native'),/\[Chorus - soaring\]/);
 assert.ok(!lyricInput(p).includes('whispered'));assert.match(compilePlan(p,{},'templates',{backend:'acestep-native'}).caption,/whispered/);assert.ok(p.lyrics.includes('[Verse - whispered]'));
});

test('YuE2 uses its own concise style format and sampling rather than MiniMax synthesis controls',()=>{
 const p={...newProject(),concept:'Disco, female Czech lead',lyrics:'[Chorus]\nVracím se domů'},draft={global:'Disco with syncopated bass and dance drums.',vocals:'Expressive female Czech lead.',arrangement:'Verse grows into a melodic chorus.'};p.generationPlan=compilePlan(p,draft,'fixture',{backend:'yue2-native'});
 const r=buildRequest(p,{steps:32,output_format:'mp3'},{},'yue2-native');assert.equal(r.steps,32);assert.equal(r.lm_cfg,1);assert.equal(r.dit_cfg,undefined);assert.equal(r.output_format,'wav24');assert.match(r.caption,/Czech/);assert.ok(!r.caption.includes('Global Metadata'));
 assert.equal(p.generationPlan.duration,compilePlan(p,draft,'fixture',{backend:'acestep-native'}).duration+60);
 assert.equal(compilePlan({...p,concept:'Délka skladby 45 sekund.'},draft,'fixture',{backend:'yue2-native'}).duration,45);
});

test('Native YuE2 contract preserves exact Czech lyrics, full symbolic planning and model provenance',async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'hmg-yue-contract-'));t.after(()=>fs.rmSync(folder,{force:true,recursive:true}));fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({assets:[]}));let body,fixtureTokens='1,2,3';
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');if(req.url==='/synth'){const chunks=[];for await(const c of req)chunks.push(c);body=JSON.parse(Buffer.concat(chunks));return res.end(JSON.stringify({id:'song'}));}
  if(req.url==='/job?id=song&result=1'){const replay={...body,abc:'X:1\nK:Am\nA B c d',semantic_tokens:fixtureTokens};res.setHeader('Content-Type','multipart/mixed; boundary=yue');return res.end('--yue\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(replay)+'\r\n--yue\r\nContent-Type: audio/wav\r\n\r\nRIFF fixture\r\n--yue--\r\n');}
  res.end(JSON.stringify({status:'done'}));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const engine=new NativeYueEngine(folder,folder);engine.base='http://127.0.0.1:'+server.address().port;engine.process={};engine.props={selectedModel:'YuE2-3B-BF16.gguf'};
 const r={caption:'Czech, gothic metal, female lead',lyrics:'[Verse]\nPříliš žluťoučký kůň',duration:45,steps:32,seed:123,lm_seed:456,output_format:'wav24'};const {id}=await engine.submit(r);
 assert.equal(body.style,r.caption);assert.equal(body.lyrics,r.lyrics);assert.equal(body.cot,'full');assert.equal(body.cfg_scale,1);assert.equal(body.lm_seed,456);assert.equal(body.lm_batch_size,1);
 const result=await engine.result(id);assert.equal(result.tracks[0].replay.backend,'yue2-native');assert.equal(result.tracks[0].replay.semantic_tokens,'1,2,3');assert.match(result.tracks[0].replay.abc,/K:Am/);assert.equal(result.tracks[0].replay.lyrics,r.lyrics);assert.equal(result.tracks[0].audio.toString(),'RIFF fixture');
 assert.deepEqual(result.tracks[0].replay.generation_warnings,[]);fixtureTokens=Array(1125).fill('1').join(',');const capped=await engine.submit(r);assert.equal((await engine.result(capped.id)).tracks[0].replay.generation_warnings.length,1);
});
