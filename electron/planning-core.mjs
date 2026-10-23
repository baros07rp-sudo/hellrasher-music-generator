import {generationProject} from './creation.mjs';
import {styleIdentity,positiveBrief,explicitExclusions} from './style-guide.mjs';
import {performanceDirection,performanceConflicts} from './performance-direction.mjs';
export const PLAN_VERSION='music-director-7';
const strip=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function planKey(p){
 p=generationProject(p);
 const fields=['concept','styles','lyrics','instrumental','bpm','key','scale','meter','mood','energy','groove','production','space','scenario','bass','percussion','textures','voice','voiceCustom','timbres','performance','vocalInstructions','effects','instruments','sections','durationMode','lyricLanguage','emotionalPerformance','melodicWriting','creationMode','automationMode'];
 const data=JSON.stringify([PLAN_VERSION,...fields.map(k=>p[k]??null),p.durationMode==='auto'?null:p.duration]);let hash=2166136261;for(let i=0;i<data.length;i++)hash=Math.imul(hash^data.charCodeAt(i),16777619);return (hash>>>0).toString(36)+'-'+data.length;
}
export function currentPlan(p){return p.generationPlan?.version===PLAN_VERSION&&p.generationPlan.sourceKey===planKey(p)?p.generationPlan:null;}
export function sectionTag(tag){
 const names=['Pre-Chorus','Post-Chorus','Instrumental','Intro','Verse','Chorus','Bridge','Solo','Outro'];
 const english=names.find(s=>new RegExp('^'+s+'(?:\\s|:|[-–—]|$)','i').test(tag));if(english)return english;
 const plain=strip(tag).trim(),aliases=[[/^(?:finalni\s+)?refren(?:\s|:|$)/,'Chorus'],[/^(?:pre|predrefren)(?:\s|:|$)/,'Pre-Chorus'],[/^sloka(?:\s|:|$)/,'Verse'],[/^(?:uvod|predehra)(?:\s|:|$)/,'Intro'],[/^(?:zaver|dohra)(?:\s|:|$)/,'Outro'],[/^mezihra(?:\s|:|$)/,'Instrumental']];return aliases.find(([r])=>r.test(plain))?.[1]||null;
}
export function lyricAnalysis(p){
 p=generationProject(p);
 const sections=[];let active={type:'Verse',label:'Verse',lines:[],tagged:false};
 for(const raw of (p.instrumental?'':String(p.lyrics||'')).split(/\r?\n/)){const line=raw.trim(),tag=line.match(/^\[([^\]]+)\](.*)$/);if(tag){if(active.lines.length||active.tagged)sections.push(active);active={type:sectionTag(tag[1])||'Verse',label:tag[1],lines:[],tagged:true};if(tag[2].trim())active.lines.push(tag[2].trim());}else if(line)active.lines.push(line);}
 if(active.lines.length||active.tagged||!sections.length&&!p.instrumental)sections.push(active);
 const lines=sections.flatMap(s=>s.lines),words=lines.join(' ').match(/[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu)||[];
 const syllables=words.reduce((n,w)=>{const t=strip(w);const vowels=(t.match(/[aeiouy]/g)||[]).length-(t.match(/ou|au|eu/g)||[]).length;const consonant=(t.match(/(?<=[bcdfghjkmnpqstvwxz])[rl](?=[bcdfghjkmnpqstvwxz])/g)||[]).length;return n+Math.max(1,vowels+consonant);},0);
 const selected=p.lyricLanguage&&p.lyricLanguage!=='auto'?p.lyricLanguage:null;
 const language=p.instrumental?'none':selected||(/\b(?:czech|češtin|česk)/iu.test(p.concept||'')||/[ěščřůťďň]/iu.test(p.lyrics||'')?'cs':/\benglish\b/i.test(p.concept||'')?'en':'auto');
 const warnings=[];if(lines.some(l=>l.length>150))warnings.push('Některé zpívané řádky jsou velmi dlouhé; přirozené frázování může být obtížnější.');
 return {sections,words:words.length,lines:lines.length,syllables,language,warnings};
}
export function inferIntent(p){
 p=generationProject(p);
 const text=p.concept||'',plain=strip(text),positive=positiveBrief(text);
 const genres=styleIdentity(p).genres;
 const bpmRange=text.match(/(\d{2,3})\s*[–—-]\s*(\d{2,3})\s*BPM/i),bpmSingle=text.match(/(\d{2,3})\s*BPM/i);
 const bpm=p.bpm|| (bpmRange?(Number(bpmRange[1])+Number(bpmRange[2]))/2:bpmSingle?Number(bpmSingle[1]):0);
 const meter=p.meter||text.match(/\b[2345679]\/(?:4|8)\b/)?.[0]||'';
 const voice=p.instrumental?'none':p.voice&&p.voice!=='unspecified'?p.voice:(/\bfemale\b|zensk/.test(positive)&&!/\bmale\b|muzsk/.test(positive)?'female':/\bmale\b|muzsk/.test(positive)&&!/\bfemale\b|zensk/.test(positive)?'male':'unspecified');
 const key=[p.key,p.scale].filter(Boolean).join(' ')||(/\bminor\b|moll/.test(positive)?'minor mode':/\bmajor\b|dur\b/.test(positive)?'major mode':'');
 return {genres,bpm,meter,voice,key,slow:/slow|pomalu|pomale|ballad|balad|legato|haunting/.test(plain),rap:/\brap\b|hip.?hop|trap/.test(positive)};
}
export function identityConflicts(p,draft){
 const intent=inferIntent(p),errors=[];
 if(['female','male','none'].includes(intent.voice)&&draft.leadVoice!==intent.voice)errors.push(`leadVoice must be ${intent.voice}`);
 const declared=strip((draft.genres||[]).join(' '));
 for(const genre of intent.genres){const g=strip(genre);for(const family of ['metal','disco','house','techno','trance','jazz','rock','pop','folk','ambient','classical','country','funk','reggae'])if(g.includes(family)&&!declared.includes(family))errors.push(`genres must preserve ${genre}`);}
 if(intent.bpm&&draft.bpm&&Math.abs(intent.bpm-draft.bpm)>1)errors.push(`bpm must be ${intent.bpm}`);
 if(intent.meter&&draft.meter&&intent.meter!==draft.meter)errors.push(`meter must be ${intent.meter}`);
 const language=lyricAnalysis(p).language;if(language==='cs'&&draft.vocalLanguage&&!/^(?:cs|cze|czech|čeština)$/i.test(draft.vocalLanguage))errors.push('vocalLanguage must be Czech (cs)');
 if(draft.global&&draft.vocals&&draft.arrangement){
  const actual=strip([draft.global,draft.vocals,draft.arrangement,draft.melody,draft.expression].filter(Boolean).join(' ')),positive=positiveBrief(p.concept),sounding=positiveBrief(draft.global+' '+draft.arrangement);
  for(const family of styleIdentity(generationProject(p)).families.slice(0,2))if(!styleIdentity({concept:sounding,styles:[]}).families.some(x=>x.id===family.id))errors.push(`the actual caption must describe ${family.label}, not only list it in genres`);
  const choirCheck=actual.replace(/no (?:additional|other|backing) (?:voices|vocals|harmonies) except (?:the )?(?:specified )?(?:female |backing )?(?:choir|choral voices)\b/g,'');
  if(/choir|sbor/.test(positive)&&(/no (?:additional|other|backing) (?:voices|vocals|harmonies)|no (?:choir|harmonies|backing vocals)/.test(choirCheck)||! /choir|choral|sbor/.test(sounding)))errors.push('preserve the explicitly requested backing choir; female-only lead does not prohibit a choir');
  if(/\bmetal\b/.test(positive)&&!/(?:no|without|bez)[^.;\n]*(?:guitar|kytar)/.test(strip(p.concept))&&!/(?:riff|distort|palm.mut|power.chord|chugg|heavy.{0,18}guitar|overdriven)/.test(sounding))errors.push('describe a concrete metal guitar foundation in the actual arrangement');
 }
 errors.push(...performanceConflicts(performanceDirection(generationProject(p),lyricAnalysis(p),intent),draft));
 return [...new Set(errors)];
}
export function estimateDuration(p,draft={}){
 p=generationProject(p);
 const lyrics=lyricAnalysis(p),intent=inferIntent(p);
 if(p.durationMode!=='auto')return {seconds:p.duration,source:'manual',words:lyrics.words,syllables:lyrics.syllables,limited:false,explanation:'Ručně zadaný horní limit.'};
 const explicit=(p.concept||'').match(/(?:song|track|piece|skladb[ayue]?|p[ií]s(?:e|ni)[^\s]*|d[eé]lk[^\s]*|duration|lasting|around|about|p[rř]ibli[zž]n[eě])\s*(?:of|je|asi|kolem|:)?\s*(\d+(?:[.,]\d+)?)\s*(minutes?|mins?|minut[^\s.,;]*|seconds?|secs?|sekund[^\s.,;]*)/iu);
 let requested=explicit?Number(explicit[1].replace(',','.'))*(/^(min)/i.test(explicit[2])?60:1):0;
 let source=explicit?'explicit_prompt':'lyrics_estimate';
 if(!requested){if(p.instrumental||!lyrics.words){requested=draft.suggestedDuration||(/ambient|cinematic|orchestr/i.test(p.concept||'')?180:120);source='instrumental_estimate';}else{
  const bpm=intent.bpm||draft.bpm||(intent.slow?82:intent.rap?100:100),beatSeconds=60/clamp(bpm,35,220),compound=/6\/8|9\/8/.test(intent.meter||draft.meter||'');
  const expressive=intent.slow&&/legato|sustained|long phrases|dlouh.{0,12}fraz/i.test(p.concept||'');
  const beatsPerLine=intent.rap?4:compound?(expressive?6:4):6;
  const phrasing=lyrics.lines*beatsPerLine*beatSeconds*(intent.slow&&p.emotionalPerformance!==false?1.15:1);
  const articulation=lyrics.syllables/(intent.rap?4.0:expressive?1.8:intent.slow?2.35:3.0);
  requested=Math.max(phrasing,articulation)+12+(lyrics.sections.some(s=>s.type==='Bridge')?8:0)+6;
  if(Number.isFinite(draft.suggestedDuration)&&draft.suggestedDuration>0)requested=requested*.7+clamp(draft.suggestedDuration,requested*.8,requested*1.25)*.3;
 }}
 const limited=requested>300,seconds=clamp(Math.round(requested/5)*5,10,300);
 return {seconds,source,words:lyrics.words,syllables:lyrics.syllables,limited,explanation:source==='explicit_prompt'?'Délka rozpoznaná z hudebního zadání.':source==='instrumental_estimate'?'Odhad pro instrumentální vývoj skladby.':`Odhad z ${lyrics.words} slov, ${lyrics.lines} řádků, struktury a tempa; model může skončit dříve.`};
}
export function qualityParameters(p,backend='minimax'){
 p=generationProject(p);
 if(p.qualityProfile==='reference')return {};
 if(backend==='yue2-native')return {steps:32,lm_cfg:1,output_format:'wav24',peak_clip:0};
 if(backend==='acestep-native')return {steps:50,dit_cfg:7,output_format:'wav24',peak_clip:0};
 if(backend!=='minimax')return {};
 return {steps:30,lm_cfg:1.5,lm_top_k:50,dit_cfg:1.7,output_format:'wav24',peak_clip:0};
}
export function promptBrief(p){return (p.concept||'').replace(/[“„"]([^“”„"]{4,})[”"]/g,(whole,quote)=>strip(p.lyrics||'').includes(strip(quote))?'the recurring chorus hook':whole);}
function defaultTimeline(analysis,intent){
 const sections=analysis.sections.length?analysis.sections:intent.voice==='none'?[{type:'Intro'},{type:'Instrumental'},{type:'Outro'}]:[{type:'Intro'},{type:'Verse'},{type:'Chorus'},{type:'Outro'}];
 const genre=intent.genres.join(' / ')||'the requested style';
 return sections.map((s,i)=>{const details={Intro:'Introduce the main motif with a restrained texture.',Verse:'Keep a clear melodic line, sparse accompaniment and space for natural words and breathing. Develop the established motif.', 'Pre-Chorus':'Build tension gradually through harmony, register and instrumental density.',Chorus:'Bring back the same memorable chorus melody. Give the hook an expressive sustained contour; broaden the arrangement within the established genre.',Bridge:'Reduce density for emotional contrast, then lead coherently into the next section.',Outro:'Resolve the established motif and finish naturally.',Instrumental:'Develop the established melodic motif through the lead instruments.',Solo:'Feature a melodic solo that belongs to the established harmonic language.'};return `[${s.type}] ${details[s.type]||'Continue the musical development coherently.'} Preserve ${genre}.`;}).join('\n');
}
export function compilePlan(p,draft={},provider='templates',{backend='minimax'}={}){
 p=generationProject(p);
 const analysis=lyricAnalysis(p),intent=inferIntent(p),duration=estimateDuration(p,draft),warnings=[...analysis.warnings,...(draft.warnings||[])];
 const direction=performanceDirection(p,analysis,intent),melody=direction.melodyEnabled?(draft.melody||direction.melody):'',expression=direction.expressionEnabled?(draft.expression||direction.expression):'';
 if(backend==='yue2-native'&&p.durationMode==='auto'&&duration.source==='lyrics_estimate'){
  const budget=duration.seconds+60;duration.seconds=Math.min(300,budget);duration.limited=duration.limited||budget>300;
  duration.explanation+=' YuE2 dostává navíc 60 sekund pro instrumentální úvod a přirozený závěr.';
 }
 const genres=intent.genres.length?intent.genres:Array.isArray(draft.genres)?draft.genres:[];
 const style=p.styles?.length?p.styles.map((s,i)=>`${i?'Secondary influence':'Primary style'}: ${s.name}${s.weight?` (${s.weight} emphasis, descriptive only)`:''}`).join('. '):genres.length?`Musical identity: ${genres.join(' / ')}.`:'';
 const bpm=intent.bpm||draft.bpm||0,meter=intent.meter||draft.meter||'',key=intent.key||draft.key||'',language=analysis.language==='auto'?(draft.vocalLanguage||'auto'):analysis.language;
 let global=[style,draft.global||promptBrief(p),bpm?`Tempo: ${bpm} BPM.`:'',meter?`Meter: ${meter}.`:'',key?`Tonality: ${key}.`:'',p.mood?`Emotional direction: ${p.mood}.`:'',p.energy?`Dynamic development: ${p.energy}.`:'',p.production?`Production: ${p.production}.`:'',p.scenario?`Listening context: ${p.scenario}.`:'',`Allow approximately ${duration.seconds} seconds for natural phrasing and a resolved ending; this is an upper budget.`].filter(Boolean).join(' ');
 const vocal=p.instrumental?'Instrumental only. No singing, speech or vocal layers. The lead melody is carried by the requested lead instruments.':[
  draft.vocals||'Use an expressive, genre-appropriate lead delivery, with natural phrasing and a stable vocal identity.',intent.voice==='custom'?p.voiceCustom:intent.voice!=='unspecified'?`Lead vocal configuration: ${intent.voice}.`:'',
  language==='cs'?'Singing language: Czech. Use natural Czech diction, intact long and short vowels, clear consonants and word boundaries; preserve the supplied words and diacritics.':language!=='auto'?`Singing language: ${language}. Preserve the supplied lyrics exactly.`:'Use the language of the supplied lyrics without translating them.',
  p.timbres?.length?`Vocal timbre: ${p.timbres.join(', ')}.`:'',p.performance?`Performance: ${p.performance}.`:'',p.vocalInstructions,p.effects?.length?`Vocal production: ${p.effects.join(', ')}.`:''].filter(Boolean).join(' ');
 const instrument=p.instruments?.map(x=>`${x.name}: ${x.role||'supporting'}${x.character?'; '+x.character:''}${x.section?'; enters in '+x.section:''}${x.solo?'; featured solo':''}${x.evolution?'; '+x.evolution:''}`).join('. ');
 const explicitSections=p.sections?.map(s=>`[${s.type}] ${s.direction||'Maintain continuity.'}`).join('\n');
 const tagDirections=analysis.sections.flatMap(s=>{const m=s.label.match(/(?:[:–—]|\s+-\s+)\s*(.+)$/);return m?[`[${s.type}] ${m[1]}`]:[];}).join('\n');
 const form=analysis.sections.map(s=>`[${s.type}]`).join(' → ');
 const arrangement=[draft.arrangement||defaultTimeline(analysis,{...intent,genres}),form?`Sung section order: ${form}. Instrumental transitions follow the creator's description.`:'',instrument,explicitSections,tagDirections,p.groove?`Groove: ${p.groove}.`:'',p.bass?`Bass: ${p.bass}.`:'',p.percussion?`Percussion: ${p.percussion}.`:'',p.textures?`Textures: ${p.textures}.`:'',p.space?`Space: ${p.space}.`:''].filter(Boolean).join('\n');
 // ACE uses a concise natural-language caption, plus dedicated metadata fields.
 // Do not wrap its short draft in MiniMax's repeated prose or duration guidance.
 const ace=backend.startsWith('acestep');
 const yue=backend==='yue2-native';
 let caption=yue?[genres.join(', '),language==='cs'?'Czech':language!=='auto'&&language!=='none'?language:'',draft.global||promptBrief(p),melody,expression,draft.vocals||(p.instrumental?'instrumental':vocal),draft.arrangement||defaultTimeline(analysis,{...intent,genres}),instrument,explicitSections,tagDirections].filter(Boolean).join(', '):ace?[style,draft.global||promptBrief(p),melody,expression,draft.vocals||(p.instrumental?'Instrumental.':vocal),draft.arrangement||defaultTimeline(analysis,{...intent,genres}),instrument,explicitSections,tagDirections,p.groove,p.bass,p.percussion,p.textures,p.space,p.mood,p.production].filter(Boolean).join('\n'):`Global Metadata\n${global}\n\nVocal Details\n${[vocal,melody,expression].filter(Boolean).join(' ')}\n\nArrangement\n${arrangement}`;
 caption=caption.replace(/[“„"]([^“”„"]{4,})[”"]/g,(whole,quote)=>strip(p.lyrics||'').includes(strip(quote))?'the recurring vocal motif':whole);
 // The lyric body remains solely in the lyric input. Never duplicate a line
 // that a local language model accidentally quotes into the music caption.
 for(const line of analysis.sections.flatMap(s=>s.lines)){if(line.length>=15&&caption.includes(line)){caption=caption.split(line).join('the recurring vocal motif');warnings.push('Z popisu byl odstraněn citovaný zpívaný řádek; samotný text zůstává zachovaný.');}}
 if(duration.limited)warnings.push('Odhad přesahuje pět minut. Model dostane maximální povolený rozpočet; dlouhý text nemusí celý zazpívat.');
 return {version:PLAN_VERSION,backend,sourceKey:planKey(p),caption,duration:duration.seconds,durationAnalysis:duration,language,genres,bpm,meter,key,provider,performance:{mode:direction.mode,melody,expression},exclusions:explicitExclusions(p),warnings:[...new Set(warnings)],requirements:Array.isArray(draft.requirements)?draft.requirements:[],created:new Date().toISOString()};
}
