import {currentPlan,compilePlan,sectionTag,estimateDuration,qualityParameters} from './planning-core.mjs';
import {generationProject} from './creation.mjs';
export {generationProject,creationMode,switchCreationMode,automaticName} from './creation.mjs';
export {currentPlan,compilePlan,estimateDuration,qualityParameters} from './planning-core.mjs';
export const MODEL_NAME='MiniMax-Music3';
export const SECTIONS=['Intro','Verse','Pre-Chorus','Chorus','Post-Chorus','Bridge','Instrumental','Solo','Outro'];
export const GENRES={
 'Pop':['Pop','Dance Pop','Synth Pop','Indie Pop','K-Pop','J-Pop'],
 'Rock':['Rock','Hard Rock','Alternative Rock','Indie Rock','Progressive Rock'],
 'Metal':['Metal','Heavy Metal','Power Metal','Symphonic Metal','Gothic Metal','Death Metal','Black Metal','Folk Metal'],
 'Punk':['Punk','Pop Punk','Hardcore','Post-Hardcore','Emo'],
 'Hip-Hop':['Hip-Hop','Rap','Trap','Drill','Boom Bap'],
 'Soul & Funk':['R&B','Soul','Neo-Soul','Funk','Disco'],
 'Electronic':['EDM','House','Deep House','Techno','Trance','Dubstep','Drum & Bass','Hardstyle','Synthwave','Retrowave','Vaporwave','Chillwave'],
 'Jazz & Blues':['Jazz','Swing','Bebop','Smooth Jazz','Blues'],
 'Classical':['Classical','Baroque','Romantic','Opera','Chamber Music'],
 'Cinematic':['Cinematic','Film Score','Trailer Music','Orchestral'],
 'Folk & Country':['Folk','Celtic','Country','Bluegrass','Acoustic','Americana'],
 'Reggae':['Reggae','Ska','Dub','Dancehall'],
 'Latin':['Latin','Salsa','Bachata','Reggaeton','Samba','Bossa Nova'],
 'Ambient':['Ambient','Drone','Meditation','Lo-Fi','Chillout'],
 'Vocal':['Gospel','Spiritual','Choir'],
 'World':['World Music','Traditional','Regional','Czech Folk','Slovak Folk','Brass Band','Polka'],
 'Experimental':['Experimental','Industrial','Avant-Garde'],
 'Stage':['Children’s Music','Musical Theatre','Theatre Music']
};
export const INSTRUMENTS={
 'Kytary':['Acoustic guitar','Electric guitar','Classical guitar','12-string guitar'],
 'Baskytary':['Electric bass','Double bass','Synth bass'],
 'Bicí a perkuse':['Drum kit','Electronic drums','Hand percussion','Cajón','Timpani'],
 'Klávesy a klavíry':['Grand piano','Electric piano','Organ','Harpsichord'],
 'Syntezátory':['Analog synthesizer','Pads','Arpeggiator','FM synthesizer'],
 'Smyčce':['Violin','Viola','Cello','String ensemble'],
 'Dřevěné dechové':['Flute','Clarinet','Oboe','Bassoon','Saxophone'],
 'Žestě':['Trumpet','Trombone','French horn','Tuba'],
 'Lidové a etnické':['Harp','Accordion','Bagpipes','Dulcimer','Sitar','Koto','Erhu','Banjo','Mandolin'],
 'Orchestr':['Orchestra','Chamber ensemble','Orchestral percussion'],
 'Elektronické prvky':['Sub bass','Noise risers','Granular textures','Samples']
};
export const VOICES=[['unspecified','Dle zadání'],['male','Mužský'],['female','Ženský'],['multiple voices','Vícehlas'],['duet','Duet'],['choir','Sbor'],['youthful vocal character','Dětský charakter'],['custom','Vlastní popis']];
export const TIMBRES=[['soft','Jemný'],['deep','Hluboký'],['high register','Vysoký'],['raspy','Chraplavý'],['breathy','Dechový'],['powerful','Silný'],['operatic','Operní'],['soulful','Soulový'],['rock delivery','Rockový'],['rap','Rap'],['spoken passages','Mluvené pasáže'],['growling','Growling'],['screaming','Screaming'],['falsetto','Falsetto'],['vibrato','Vibrato']];
export const PERFORMANCES=[['intimate','Intimní'],['emotional','Emotivní'],['aggressive','Agresivní'],['melancholic','Melancholický'],['energetic','Energický'],['calm','Klidný'],['dramatic','Dramatický'],['playful','Hravý']];
export const EFFECTS=[['dry studio recording','Suchý studiový zvuk'],['reverb','Reverb'],['delay','Delay'],['vocal harmonies','Vícehlasé harmonie'],['double-tracked vocals','Zdvojené vokály'],['backing vocals','Doprovodné hlasy'],['layered choir','Sborové vrstvy'],['vintage production','Vintage charakter'],['modern production','Moderní produkce']];

export function newProject(name='Nový projekt'){
 return {name,description:'',styles:[],concept:'',bpm:0,key:'',scale:'',meter:'',mood:'',energy:'',groove:'',production:'',space:'',scenario:'',bass:'',percussion:'',textures:'',voice:'unspecified',voiceCustom:'',timbres:[],performance:'',vocalInstructions:'',effects:[],instruments:[],lyrics:'',instrumental:false,autoLyrics:true,automationMode:'auto',sections:[],duration:60,durationMode:'auto',lyricLanguage:'auto',emotionalPerformance:true,melodicWriting:true,qualityProfile:'studio',technical:{},manualCaption:null,advanced:false,closedPanels:[],tags:[]};
}
// Only controlled values are translated. Unrestricted user text is preserved verbatim.
export function caption(p){
 p=generationProject(p);
 const basic=[p.styles.map(s=>s.name).join(' + '),p.concept].filter(Boolean).join('. ');const plan=currentPlan(p)||compilePlan(p);return {basic,enhanced:plan.caption,plan};
}
export function interpretBrief(text){
 const rules=[[/energick/iu,'Energetic performance'],[/tanečn/iu,'Dance-oriented groove'],[/žensk.{0,12}(zpěv|hlas|vokál)/iu,'Female lead vocals'],[/mužsk.{0,12}(zpěv|hlas|vokál)/iu,'Male lead vocals'],[/výrazn.{0,15}refrén/iu,'A memorable, prominent chorus'],[/postupn.{0,15}gradac/iu,'A gradual build in energy and instrumentation'],[/modern.{0,15}bas/iu,'Modern bass sound'],[/akustick/iu,'Natural acoustic instrumentation'],[/melanchol/iu,'Melancholic mood'],[/klidn|relaxačn/iu,'Calm, restrained energy'],[/orchestr/iu,'Orchestral arrangement'],[/klavír|piano/iu,'Piano instrumentation'],[/kytar/iu,'Guitar instrumentation'],[/smyčc/iu,'String instrumentation'],[/bez zpěvu|instrumentáln/iu,'Instrumental music without vocals']];
 const matched=rules.filter(([r])=>r.test(text)).map(([,s])=>s);
 return matched.length?`Musical interpretation from a deterministic Czech template: ${matched.join('; ')}. Original creator brief (preserved): ${text}`:text;
}
function normalizedTag(tag){return sectionTag(tag);}
export function extractTagDirections(lyrics){
 return lyrics.split(/\r?\n/).map(line=>line.match(/^\[([^\]]+)\]\s*$/)?.[1]).filter(Boolean).flatMap(tag=>{const canonical=normalizedTag(tag);if(canonical&&tag.toLowerCase()===canonical.toLowerCase())return [];return [`Section direction (${canonical||'custom section'}): ${tag}`];});
}
export function lyricInput(p,backend='minimax'){return p.instrumental?'[Instrumental]':p.lyrics.replace(/^[ \t]*\[([^\]\r\n]+)\]([^\r\n]*)$/gm,(all,tag,body)=>{const direction=backend.startsWith('acestep')?tag.match(/(?:[:–—]|\s+-\s+)\s*(.+)$/)?.[1]:null;return '['+(normalizedTag(tag)||'Verse')+(direction?' - '+direction:'')+']'+(body.trim()?'\n'+body.trim():'');});}
export function validateProject(p){
 if(!p || typeof p!=='object')throw Error('Neplatný projekt.');
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>180)throw Error('Název musí mít 1–180 znaků.');
 for(const key of ['description','concept','lyrics','key','scale','meter','mood','energy','groove','production','space','scenario','bass','percussion','textures','voice','voiceCustom','performance','vocalInstructions'])if(typeof p[key]!=='string'||p[key].length>100000)throw Error(`Neplatné pole ${key}.`);
 if(!Number.isFinite(p.duration)||p.duration<1||p.duration>300)throw Error('Délka musí být 1–300 sekund.');
 for(const key of ['styles','sections','instruments','timbres','effects'])if(!Array.isArray(p[key])||p[key].length>200)throw Error(`Neplatné pole ${key}.`);
 const text=(x,max=4000)=>typeof x==='string'&&x.length<=max;
 if(p.id!==undefined&&(!text(p.id,80)||!/^[\w-]+$/.test(p.id)))throw Error('Neplatné ID projektu.');
 if(p.styles.some(s=>!s||!text(s.name)||!text(s.weight)))throw Error('Neplatný hudební styl.');
 if(p.instruments.some(s=>!s||!text(s.name)||['role','character','section','evolution'].some(k=>s[k]!==undefined&&!text(s[k]))))throw Error('Neplatná instrumentace.');
 if(p.sections.some(s=>!s||!SECTIONS.includes(s.type)||!text(s.direction)||s.label!==undefined&&!text(s.label)))throw Error('Neplatná hudební sekce.');
 if([...p.timbres,...p.effects].some(s=>!text(s)))throw Error('Neplatné vokální nastavení.');
 if(!p.technical||typeof p.technical!=='object'||Array.isArray(p.technical))throw Error('Neplatné technické parametry.');
 if(p.durationMode!==undefined&&!['auto','manual'].includes(p.durationMode))throw Error('Neplatný režim délky.');
 if(p.automationMode!==undefined&&!['auto','manual'].includes(p.automationMode))throw Error('Neplatná automatizace.');
 if(p.creationMode!==undefined&&!['idea','lyrics'].includes(p.creationMode))throw Error('Neplatný režim textu.');
 for(const key of ['ownLyricsDraft','autoLyricsDraft'])if(p[key]!==undefined&&(typeof p[key]!=='string'||p[key].length>100000))throw Error('Neplatný koncept textu.');
 if(p.lyricLanguage!==undefined&&(typeof p.lyricLanguage!=='string'||!/^(auto|[a-z]{2,3})$/.test(p.lyricLanguage)))throw Error('Neplatný jazyk zpěvu.');
 if(typeof p.instrumental!=='boolean'||typeof p.advanced!=='boolean'||!Array.isArray(p.closedPanels)||p.closedPanels.some(s=>!text(s,100)))throw Error('Neplatná konfigurace projektu.');
 if(p.manualCaption!==null&&(typeof p.manualCaption!=='string'||p.manualCaption.length>100000))throw Error('Neplatný prompt.');
 return p;
}
export function buildRequest(p,defaults={},routing={},backend='minimax'){
 validateProject(p);
 p=generationProject(p);
 const text=p.manualCaption??caption(p).enhanced;
 if(!p.concept.trim()&&!p.styles.length&&!p.manualCaption?.trim())throw Error('Zadejte hudební popis nebo styl.');
 if(!lyricInput(p,backend).trim())throw Error('Vložte text skladby nebo zapněte instrumentální režim.');
 const plan=currentPlan(p);const r={...defaults,...qualityParameters(p,backend),...p.technical,caption:text,lyrics:lyricInput(p,backend),duration:p.durationMode==='auto'?(plan?.duration||estimateDuration(p).seconds):p.duration,...routing};
 r.lm_batch_size=1;r.synth_batch_size=1; // sequential GPU queue, never parallel variants
 const limits={steps:[2,200],seed:[-1,4294967295],lm_seed:[-1,4294967295],lm_cfg:[0,20],lm_top_k:[1,200000],dit_cfg:[0,20],peak_clip:[0,999],mp3_bitrate:[32,320]};
 for(const [k,[min,max]] of Object.entries(limits))if(k in r && (!Number.isFinite(r[k])||r[k]<min||r[k]>max))throw Error(`Parametr ${k}: povolený rozsah ${min}–${max}.`);
 if(!['mp3','wav16','wav24','wav32'].includes(r.output_format))throw Error('Nepodporovaný výstupní formát.');
 delete r.audio_codes;
 return r;
}
export function splitLyrics(text){
 const lines=text.split(/\r?\n/), out=[];let current={type:'Verse',text:''};
 for(const line of lines){const match=line.match(/^\[([^\]]+)\]\s*$/);if(match){if(current.text||out.length)out.push(current);current={type:normalizedTag(match[1])||'Verse',label:SECTIONS.some(s=>s.toLowerCase()===match[1].toLowerCase())?'':match[1],text:''};}else current.text+=(current.text?'\n':'')+line;}
 if(current.text||out.length)out.push(current);return out;
}
export const BUILTIN_PRESETS=[
 ['Modern Pop','Pop',110,'female','Synth bass','Modern, clear and balanced'],['Acoustic Pop','Acoustic',90,'unspecified','Acoustic guitar','Warm acoustic production'],
 ['Cinematic Orchestra','Orchestral',0,'unspecified','Orchestra','Wide cinematic dynamics'],['Jazz Club','Jazz',95,'unspecified','Grand piano','Intimate live room'],
 ['Blues Rock','Blues',100,'unspecified','Electric guitar','Warm tube amplification'],['Classic Heavy Metal','Heavy Metal',135,'unspecified','Electric guitar','Punchy drums and articulate guitars'],
 ['Gothic Metal','Gothic Metal',110,'unspecified','String ensemble','Dark atmospheric production'],['Melodic EDM','EDM',128,'unspecified','Analog synthesizer','Modern electronic production'],
 ['Progressive House','House',126,'unspecified','Arpeggiator','Evolving dance arrangement'],['Hip-Hop / Trap','Trap',140,'unspecified','Sub bass','Tight transients and deep bass'],
 ['Soul Ballad','Soul',72,'unspecified','Electric piano','Warm expressive dynamics'],['Country Acoustic','Country',95,'unspecified','Acoustic guitar','Natural acoustic sound'],
 ['Celtic Folk','Celtic',100,'unspecified','Harp','Organic folk ensemble'],['Latin Dance','Latin',110,'unspecified','Hand percussion','Rhythmic and bright'],
 ['Ambient Meditation','Ambient',0,'unspecified','Pads','Spacious slow evolution'],['Classical Piano','Classical',0,'unspecified','Grand piano','Natural concert room'],
 ['Epic Trailer','Trailer Music',100,'unspecified','Orchestra','Broad dynamic arc']
].map(([name,style,bpm,voice,instrument,production])=>{const p=newProject(name);Object.assign(p,{styles:[{name:style,weight:''}],bpm,voice,production,instrumental:['Orchestral','Ambient','Classical','Trailer Music','Jazz'].includes(style),instruments:[{name:instrument,role:'lead'}]});return {id:`builtin-${name}`,name,builtin:true,project:p};});
