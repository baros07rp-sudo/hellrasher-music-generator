import test from 'node:test';import assert from 'node:assert/strict';
import {newProject} from '../electron/domain.mjs';
import {styleIdentity,styleReference,explicitExclusions} from '../electron/style-guide.mjs';
import {inferIntent,identityConflicts,lyricAnalysis,currentPlan} from '../electron/planning-core.mjs';
test('Disco, Czech diskotéka and electronic subgenres remain distinct from excluded metal',()=>{
 for(const word of ['Disco','Nu-disco','Diskotéka','disko']){
  const p={...newProject(),concept:word+' s ženským hlasem. Bez metalu a zkreslených kytar.'};assert.ok(inferIntent(p).genres.some(g=>/disco/i.test(g)));assert.ok(!inferIntent(p).genres.some(g=>/metal/i.test(g)));assert.ok(styleReference(p).guidance.some(g=>/four-on-the-floor/.test(g)));
  assert.ok(identityConflicts(p,{genres:['Pop'],leadVoice:'female',vocalLanguage:'cs'}).some(e=>/Disco/.test(e)));
 }
 assert.deepEqual(styleIdentity({concept:'Deep house, no metal',styles:[]}).families.map(f=>f.id),['house']);
 assert.deepEqual(styleIdentity({concept:'Gothic disco, no heavy guitars',styles:[]}).families.map(f=>f.id),['disco']);
});
test('Caption content cannot contradict requested backing choir while metadata claims the right genre',()=>{
 const p={...newProject(),concept:'Symphonic gothic metal, female lead only, cathedral choir and heavy guitars. No growls.',lyrics:'[Chorus]\nDnes už vím'};
 const bad={genres:['Symphonic gothic metal'],leadVoice:'female',bpm:0,meter:'',vocalLanguage:'cs',global:'A symphonic gothic metal song.',vocals:'Female lead. No additional voices or harmonies.',arrangement:'A soft piano plays the chorus.'};
 const errors=identityConflicts(p,bad);assert.ok(errors.some(e=>/choir/.test(e)));assert.ok(errors.some(e=>/guitar foundation/.test(e)));
 const good={...bad,vocals:'Female lead with a quiet backing choir.',arrangement:'Palm-muted distorted guitar riffs and a live drum kit support the choir; strings swell in the chorus.'};assert.deepEqual(identityConflicts(p,good),[]);
 assert.ok(identityConflicts(p,{...good,global:'A gentle pop piano ballad.',genres:['Symphonic gothic metal'],arrangement:'Piano and choir.'}).length>0);
});
test('Empty instrumental tags survive structure analysis and obsolete plans are invalidated',()=>{
 const p={...newProject(),concept:'Metal',lyrics:'[Intro]\n[Verse]\nTichý hlas\n[Solo]\n[Outro]'};
 assert.deepEqual(lyricAnalysis(p).sections.map(s=>s.type),['Intro','Verse','Solo','Outro']);assert.equal(lyricAnalysis(p).words,2);assert.equal(currentPlan({...p,generationPlan:{version:'music-director-2'}}),null);
});
test('Negative conditioning comes only from actual exclusions, without broadening instrumental restrictions',()=>{
 assert.deepEqual(explicitExclusions({concept:'Gothic metal. No growls, no pop runs, no cheerful harmony. Not motivational or pop.'}),['growling vocals','pop-style vocal runs','cheerful harmony','pop music']);
 assert.deepEqual(explicitExclusions({concept:'Disco with clean guitar. No metal, no heavy distorted guitars.'}),['metal music','distorted electric guitars']);
 assert.deepEqual(explicitExclusions({concept:'Pop music. No pop runs.'}),['pop-style vocal runs']);
 assert.deepEqual(explicitExclusions({concept:'Metal. No growling vocals.'}),['growling vocals']);
 assert.deepEqual(explicitExclusions({concept:'Heavy metal, not death metal but melodic heavy metal.'}),['death metal']);
});
