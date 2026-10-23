'use strict';
// Measurements describe technical defects, never musical taste or emotion.
const db=value=>20*Math.log10(Math.max(value,1e-9));
class PcmMeasurements{
 constructor(sampleRate,channels){this.rate=sampleRate;this.channels=channels;this.window=Math.max(channels,Math.round(sampleRate*.1)*channels);this.samples=0;this.sum=0;this.peak=0;this.invalid=0;this.over=0;this.flat=0;this.rail=Array(channels).fill(0);this.railSign=Array(channels).fill(0);this.windowSamples=0;this.windowSum=0;this.windowPeak=0;this.silence=0;this.run=0;this.longest=0;this.leading=0;this.heard=false;this.tail=Buffer.alloc(0);}
 push(chunk){const bytes=this.tail.length?Buffer.concat([this.tail,chunk]):chunk,end=bytes.length-bytes.length%4;for(let i=0;i<end;i+=4){let x=bytes.readFloatLE(i);if(!Number.isFinite(x)){this.invalid++;x=0;}const a=Math.abs(x),channel=this.samples%this.channels,sign=Math.sign(x);if(a>=.99997&&a<=1.0001){this.rail[channel]=this.railSign[channel]===sign?this.rail[channel]+1:1;this.railSign[channel]=sign;if(this.rail[channel]>=4)this.flat++;}else this.rail[channel]=0;this.samples++;this.sum+=x*x;this.peak=Math.max(this.peak,a);if(a>1.0001)this.over++;this.windowSamples++;this.windowSum+=x*x;this.windowPeak=Math.max(this.windowPeak,a);if(this.windowSamples===this.window)this.finishWindow();}this.tail=Buffer.from(bytes.subarray(end));}
 finishWindow(){if(!this.windowSamples)return;const seconds=this.windowSamples/this.channels/this.rate,quiet=db(Math.sqrt(this.windowSum/this.windowSamples)) < -60 && db(this.windowPeak)<-45;if(quiet){this.silence+=seconds;this.run+=seconds;if(!this.heard)this.leading+=seconds;this.longest=Math.max(this.longest,this.run);}else{this.heard=true;this.run=0;}this.windowSamples=0;this.windowSum=0;this.windowPeak=0;}
 result(){this.finishWindow();const duration=this.samples/this.channels/this.rate;return {decodedDuration:duration,peakDbFS:db(this.peak),rmsDbFS:db(Math.sqrt(this.sum/Math.max(1,this.samples))),overRangeFraction:this.over/Math.max(1,this.samples),flatTopFraction:this.flat/Math.max(1,this.samples),nonFiniteSamples:this.invalid,silentFraction:this.silence/Math.max(.001,duration),leadingSilence:this.leading,trailingSilence:this.run,longestSilence:this.longest,samples:this.samples};}
}
function qualityReport(audio,info,request={},snapshot={}){
 const issues=[],add=(code,severity,message)=>issues.push({code,severity,message});
 if(!audio.samples||audio.nonFiniteSamples)add('invalid-samples','error','Audio obsahuje neplatné nebo chybějící vzorky.');
 if(audio.samples&&audio.peakDbFS < -70)add('silent','error','Ve výstupu není slyšitelný signál.');
 else if(audio.silentFraction>.9)add('mostly-silent','warning','Většinu výstupu tvoří ticho nebo velmi slabý signál.');
 if(audio.overRangeFraction>.0001)add('over-range','warning','Část vzorků přesahuje digitální rozsah. Při přehrávání může vznikat zkreslení.');
 if(audio.flatTopFraction>.001)add('flat-peaks','warning','Signál má opakovaně ořezané špičky. Poslechem ověřte, zda je zkreslení záměrné.');
 // Reaching 0 dBFS alone is normal after peak normalization, including metal.
 if(audio.leadingSilence>=12)add('leading-silence','warning',`Začátek obsahuje přibližně ${Math.round(audio.leadingSilence)} s ticha.`);
 if(audio.trailingSilence>=8)add('trailing-silence','warning',`Konec obsahuje přibližně ${Math.round(audio.trailingSilence)} s ticha.`);
 if(audio.longestSilence>=12&&audio.longestSilence>Math.max(audio.leadingSilence,audio.trailingSilence)+.2)add('internal-silence','warning','Uvnitř skladby je dlouhá velmi tichá pasáž. Ověřte ji poslechem.');
 if(Math.abs(audio.decodedDuration-info.duration)>Math.max(1,info.duration*.01))add('decode-duration','warning','Přečtené audio má jinou délku než údaj v souboru.');
 const lyrics=String(request.lyrics||'').replace(/\[[^\]]*\]/g,'').trim(),words=lyrics.split(/\s+/).filter(Boolean).length;
 if(!snapshot.instrumental&&words>=30&&info.duration<Math.max(12,Number(request.duration||0)*.35))add('short-vocals','warning','Výstup je vzhledem k délce textu a časovému rozpočtu velmi krátký. Část slov může chybět.');
 const backend=request.backend||'',budget=Math.floor(Number(request.duration)*25);
 const tokens=backend==='yue2-native'?String(request.semantic_tokens||'').split(',').filter(Boolean).length:backend==='minimax'?Math.floor(String(request.audio_codes||'').split(',').filter(Boolean).length/8):0;
 if(budget>0&&tokens>=budget)add('token-limit','warning','Generování dosáhlo časového limitu; ověřte poslední slova a zakončení.');
 for(const message of request.generation_warnings||[])if(!issues.some(i=>i.code==='token-limit'))add('engine-warning','warning',message);
 return {version:1,checkedAt:new Date().toISOString(),status:issues.length?'review':'ok',issues,audio,lyrics:{status:snapshot.instrumental||!lyrics?'not-requested':'not-installed'},musicality:'unrated'};
}
function words(text){return String(text||'').normalize('NFC').toLocaleLowerCase('cs').replace(/\[[^\]]*\]/g,' ').match(/[\p{L}\p{N}]+/gu)||[];}
function compareLyrics(expected,transcript){
 const lines=String(transcript||'').split(/\r?\n/).filter(l=>l.trim()),nonSpeech=lines.filter(l=>/^\s*[\[(].*[\])]\s*$/.test(l)).length;
 const a=words(expected),b=words(transcript);if(a.length>3000||b.length>6000)throw Error('Text je příliš dlouhý pro kontrolu.');
 const counts=new Map();for(const w of b)counts.set(w,(counts.get(w)||0)+1);const largest=Math.max(0,...counts.values());
 if((lines.length&&nonSpeech/lines.length>.8)||(b.length>=20&&largest/b.length>.65))return {status:'unreliable',transcript,message:'Rozpoznávač se opakuje nebo vrací jen popisy zvuků. Tento přepis se nepoužije pro výběr kompozice.',assessment:'orientational'};
 const width=b.length+1,table=new Uint16Array((a.length+1)*width);for(let i=0;i<=a.length;i++)table[i*width]=i;for(let j=0;j<=b.length;j++)table[j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)table[i*width+j]=Math.min(table[(i-1)*width+j]+1,table[i*width+j-1]+1,table[(i-1)*width+j-1]+(a[i-1]===b[j-1]?0:1));
 let i=a.length,j=b.length,matches=0;const differences=[];
 while(i||j){const v=table[i*width+j];if(i&&j&&v===table[(i-1)*width+j-1]+(a[i-1]===b[j-1]?0:1)){if(a[i-1]===b[j-1])matches++;else differences.push({expected:a[i-1],heard:b[j-1],type:'substitution'});i--;j--;}else if(i&&v===table[(i-1)*width+j]+1){differences.push({expected:a[i-1],heard:'',type:'missing'});i--;}else{differences.push({expected:'',heard:b[j-1],type:'extra'});j--;}}
 return {status:'done',transcript,expectedWords:a.length,recognizedWords:b.length,wordErrorRate:a.length?table[a.length*width+b.length]/a.length:null,matchedFraction:a.length?matches/a.length:null,differences:differences.reverse().slice(0,160),assessment:'orientational'};
}
module.exports={PcmMeasurements,qualityReport,compareLyrics};
