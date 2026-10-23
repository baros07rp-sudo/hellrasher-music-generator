import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {newProject,buildRequest} from '../electron/domain.mjs';import {creationMode,switchCreationMode,generationProject,automaticName} from '../electron/creation.mjs';import {inferIntent,compilePlan,currentPlan} from '../electron/planning-core.mjs';
const require=createRequire(import.meta.url),{ensureReady}=require('../electron/readiness.cjs');
test('A new prompt controls automatic music even when an old preset has conflicting hidden values',()=>{
 const p={...newProject(),concept:'Acoustic jazz, male lead in Czech, 95 BPM, 3/4, minor key.',lyrics:'[Verse]\nTichý večer přichází',styles:[{name:'Gothic Metal',weight:'strong'}],bpm:110,meter:'6/8',voice:'female',instruments:[{name:'Distorted guitar'}],technical:{steps:200,output_format:'mp3'},manualCaption:'Old preset caption',durationMode:'manual',duration:10};
 const intent=inferIntent(p);assert.deepEqual(intent.genres,['Jazz']);assert.equal(intent.bpm,95);assert.equal(intent.meter,'3/4');assert.equal(intent.voice,'male');const r=buildRequest(p,{steps:30,output_format:'mp3'});assert.match(r.caption,/Jazz/);assert.ok(!r.caption.includes('Distorted guitar'));assert.ok(!r.caption.includes('Old preset caption'));assert.equal(r.steps,30);assert.equal(r.output_format,'wav24');assert.ok(r.duration>10);assert.equal(p.bpm,110);assert.equal(p.manualCaption,'Old preset caption');
 const manual=generationProject({...p,automationMode:'manual'});assert.equal(manual.bpm,110);assert.equal(manual.voice,'female');assert.equal(buildRequest(manual,{output_format:'mp3'}).caption,'Old preset caption');
});
test('Switching between idea and custom lyrics preserves both drafts, including Czech diacritics',()=>{
 const original={...newProject(),lyrics:'[Refrén]\nPříliš žluťoučký kůň',creationMode:'lyrics'};
 let p=switchCreationMode(original,'idea');assert.equal(p.lyrics,'');assert.equal(p.ownLyricsDraft,original.lyrics);
 p={...p,lyrics:'[Chorus]\nNová píseň svítá',lyricsOrigin:{brief:p.concept}};p=switchCreationMode(p,'lyrics');assert.equal(p.lyrics,original.lyrics);p=switchCreationMode(p,'idea');assert.equal(p.lyrics,'[Chorus]\nNová píseň svítá');assert.equal(p.ownLyricsDraft,original.lyrics);
});
test('Changing an idea refreshes AI words; existing custom words remain exact',()=>{
 const auto={...newProject(),creationMode:'idea',concept:'New story',lyrics:'Old AI words',lyricsOrigin:{brief:'Old story'}};assert.equal(generationProject(auto).lyrics,'');assert.equal(auto.lyrics,'Old AI words');
 const own={...auto,creationMode:'lyrics'};assert.equal(generationProject(own).lyrics,'Old AI words');assert.equal(generationProject(own).autoLyrics,false);assert.equal(creationMode({...newProject(),lyrics:'Vlastní slova'}),'lyrics');
});
test('Inactive manual edits do not invalidate an automatic plan; enabling custom controls does',()=>{
 const p={...newProject(),concept:'Czech jazz, male lead, 95 BPM',lyrics:'Tichá noc'};p.generationPlan=compilePlan(p);assert.equal(currentPlan({...p,bpm:160,voice:'female'}),p.generationPlan);assert.equal(currentPlan({...p,automationMode:'manual'}),null);
});
test('First-create preparation downloads only missing music components and the missing default planner',async()=>{
 const calls=[],phases=[];const engine={id:'minimax',release:async()=>calls.push('release')},models={status:async()=>({entries:[{name:'lm',installed:true},{name:'dit',installed:false}]}),download:async names=>calls.push(names)},planner={snapshot:()=>({mode:'local',installed:false}),settings:()=>({modelPath:''}),install:async()=>calls.push('planner')};
 await ensureReady({engine,models,planner,routing:{lm_model:'lm',dit_model:'dit'},phase:p=>phases.push(p)});assert.deepEqual(calls,['release',['dit'],'release','planner']);assert.equal(phases.at(-1),null);
 calls.length=0;models.status=async()=>({entries:[{name:'lm',installed:true},{name:'dit',installed:true}]});planner.snapshot=()=>({mode:'local',installed:true});await ensureReady({engine,models,planner,routing:{lm_model:'lm',dit_model:'dit'}});assert.deepEqual(calls,[]);
});
test('Preparation respects a chosen custom planner and propagates download failures',async()=>{
 const engine={id:'minimax',release:async()=>{}},models={status:async()=>({entries:[]}),download:async()=>{throw Error('Disk full');}},planner={snapshot:()=>({mode:'local',installed:false}),settings:()=>({modelPath:'C:/Models/chosen.gguf'}),install:async()=>assert.fail('Must not replace custom model')};
 await assert.rejects(ensureReady({engine,models,planner,routing:{},includeMusic:false}),/vlastní plánovací model/);await assert.rejects(ensureReady({engine,models,planner,routing:{lm_model:'lm'}}),/Disk full/);
});

test('Automatic naming uses the new lyric without changing a chosen title',()=>{assert.equal(automaticName({...newProject(),lyrics:'[Verse]\nTichá noc se probouzí.'}),'Tichá noc se probouzí');assert.equal(automaticName({...newProject('Můj název'),lyrics:'Nová slova'}),'Můj název');});
