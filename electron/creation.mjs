// The simple editor keeps its own lyric drafts and sends a predictable input.
// Hidden manual controls remain saved, but cannot override the current brief.
export function creationMode(p){return p.creationMode||(!p.lyrics?.trim()||p.lyricsOrigin?'idea':'lyrics');}
export function automaticName(p){
 if(p.name&&p.name!=='Nový projekt')return p.name;
 const lyric=String(p.lyrics||'').split(/\r?\n/).map(l=>l.replace(/^\s*\[[^\]]+\]\s*/, '').trim()).find(Boolean);
 const text=(p.instrumental?p.concept:lyric||p.concept)||'Nová skladba';
 return text.split(/[\n.!?]/)[0].trim().split(/\s+/).slice(0,8).join(' ').slice(0,72)||'Nová skladba';
}
export function switchCreationMode(p,mode){
 if(!['idea','lyrics'].includes(mode))throw Error('Neplatný režim tvorby.');
 if(creationMode(p)===mode)return {...p,creationMode:mode};
 if(mode==='idea')return {...p,creationMode:mode,ownLyricsDraft:p.lyrics,lyrics:p.autoLyricsDraft||'',lyricsOrigin:p.autoLyricsOrigin,autoLyrics:true};
 return {...p,creationMode:mode,autoLyricsDraft:p.lyrics,autoLyricsOrigin:p.lyricsOrigin,lyrics:p.ownLyricsDraft??(p.lyricsOrigin?'':p.lyrics),lyricsOrigin:undefined,autoLyrics:false};
}
export function generationProject(p){
 const mode=creationMode(p);let input={...p,creationMode:mode,autoLyrics:mode==='idea'};
 // A new idea needs new words; existing custom lyrics are never rewritten.
 if(mode==='idea'&&p.lyricsOrigin&&p.lyricsOrigin.brief!==p.concept)input={...input,lyrics:'',lyricsOrigin:undefined};
 if(p.automationMode!=='auto')return input;
 const automatic={durationMode:'auto',lyricLanguage:'auto',qualityProfile:'studio',technical:{},manualCaption:null,emotionalPerformance:true,melodicWriting:true};
 if(!p.concept?.trim())return {...input,...automatic}; // structured presets are still valid starting points
 return {...input,...automatic,styles:[],bpm:0,key:'',scale:'',meter:'',mood:'',energy:'',groove:'',production:'',space:'',scenario:'',bass:'',percussion:'',textures:'',voice:'unspecified',voiceCustom:'',timbres:[],performance:'',vocalInstructions:'',effects:[],instruments:[],sections:[]};
}
