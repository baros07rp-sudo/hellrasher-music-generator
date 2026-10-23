import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,lyricInput,buildRequest} from '../electron/domain.mjs';
import {planKey,currentPlan,compilePlan,estimateDuration,inferIntent,lyricAnalysis,identityConflicts} from '../electron/planning-core.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{localEndpoint}=require('../electron/planner.cjs');
test('Explicit genre identity wins over emotional lyric context and excluded pop',()=>{
 const p={...newProject(),concept:'Dark symphonic gothic metal, female lead, 84–88 BPM, 6/8, minor. No motivational pop, no growls.',lyrics:'[Chorus]\nDnes už vítězím'};
 const intent=inferIntent(p);assert.deepEqual(intent.genres,['Symphonic gothic metal']);assert.equal(intent.voice,'female');assert.equal(intent.bpm,86);assert.equal(intent.meter,'6/8');
 assert.ok(identityConflicts(p,{genres:['Pop'],leadVoice:'male',bpm:120,meter:'4/4',vocalLanguage:'en'}).length>=4);
 assert.deepEqual(identityConflicts(p,{genres:['Symphonic gothic metal'],leadVoice:'female',bpm:86,meter:'6/8',vocalLanguage:'cs'}),[]);
});
test('Automatic duration grows with lyric length and leaves deliberate phrasing space',()=>{
 const short={...newProject(),concept:'Slow Czech folk, 80 BPM',lyrics:'[Verse]\nTichý večer přichází\nza oknem se šeří'},long={...short,lyrics:Array(12).fill(short.lyrics).join('\n')};
 assert.ok(estimateDuration(long).seconds>estimateDuration(short).seconds);assert.ok(estimateDuration(long).seconds>100);
 assert.equal(estimateDuration({...long,automationMode:'manual',durationMode:'manual',duration:25}).seconds,25);
 assert.equal(estimateDuration({...long,concept:'Délka skladby 2 minuty.'}).seconds,120);
 assert.equal(estimateDuration({...long,lyrics:Array(100).fill(long.lyrics).join('\n')}).limited,true);
});
test('Changing musical input invalidates AI plan; title changes and auto duration updates preserve it',()=>{
 const p={...newProject(),concept:'Jazz',lyrics:'[Verse]\nTichá noc'},plan=compilePlan(p);p.generationPlan=plan;
 assert.equal(currentPlan({...p,name:'Jiný název',duration:plan.duration}),plan);assert.equal(currentPlan({...p,concept:'Techno'}),null);assert.equal(currentPlan({...p,lyrics:p.lyrics+' dál'}),null);assert.notEqual(planKey(p),planKey({...p,automationMode:'manual',lyricLanguage:'cs'}));
});
test('Same-line lyrics after Czech and English tags survive native normalization',()=>{
 const p={...newProject(),lyrics:'[SLOKA 1] Příliš žluťoučký kůň\r\n[Chorus: rising melody] Já se vrátím'};
 assert.equal(lyricInput(p),'[Verse]\nPříliš žluťoučký kůň\r\n[Chorus]\nJá se vrátím');assert.ok(p.lyrics.includes('[SLOKA 1] Příliš'));assert.equal(lyricAnalysis(p).words,6);
});
test('Manual caption and technical settings take precedence; native studio values do not leak to ACE',()=>{
 const p={...newProject(),concept:'Jazz',automationMode:'manual',instrumental:true,durationMode:'manual',duration:45,manualCaption:'My exact direction',technical:{steps:52,lm_seed:181}};
 const r=buildRequest(p,{steps:30,output_format:'mp3'});assert.equal(r.caption,p.manualCaption);assert.equal(r.steps,52);assert.equal(r.output_format,'wav24');assert.equal(r.duration,45);
 const ace=buildRequest({...p,technical:{}},{steps:8,dit_cfg:1,output_format:'wav16'},{},'acestep');assert.equal(ace.steps,8);assert.equal(ace.dit_cfg,1);assert.equal(ace.lm_cfg,undefined);assert.equal(ace.output_format,'wav16');
});
test('Sung words remain in lyrics rather than being duplicated in a quoted caption',()=>{
 const p={...newProject(),concept:'Gothic metal. Hook “Už se nevrátím”.',lyrics:'[Chorus]\nUž se nevrátím\nTichý večer přichází'};
 const plan=compilePlan(p,{global:'Gothic metal with hook "Už se nevrátím".',vocals:'Female lead with clear Czech diction.',arrangement:'Sing Tichý večer přichází in the verse.'});
 assert.ok(!plan.caption.includes('Už se nevrátím'));assert.ok(!plan.caption.includes('Tichý večer přichází'));assert.equal(p.lyrics,'[Chorus]\nUž se nevrátím\nTichý večer přichází');
});
test('Connections are restricted to local HTTP origins and reject embedded credentials',()=>{
 assert.equal(localEndpoint('http://127.0.0.1:8001/v1'),'http://127.0.0.1:8001');assert.equal(localEndpoint('http://[::1]:1234'),'http://[::1]:1234');
 for(const url of ['https://example.com','http://192.168.1.4:8001','http://localhost.evil.test','http://name:secret@localhost','file:///C:/Models','http://localhost?token=secret'])assert.throws(()=>localEndpoint(url));
});
test('Instrumental planning ignores retained lyrics and builds an instrumental arc',()=>{
 const p={...newProject(),concept:'Minimal ambient piano, no voices',instrumental:true,lyrics:'[Chorus]\nTato slova jsou jen uložená'};
 assert.equal(lyricAnalysis(p).words,0);assert.deepEqual(lyricAnalysis(p).sections,[]);const plan=compilePlan(p);assert.equal(plan.language,'none');assert.match(plan.caption,/\[Instrumental\]/);assert.ok(!plan.caption.includes('Tato slova'));
});
