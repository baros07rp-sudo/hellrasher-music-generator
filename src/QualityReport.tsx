import {Check,AlertCircle,Activity,LoaderCircle} from 'lucide-react';
import type {Variant} from './types';
export const qualityLabel=(q:any)=>q?.status==='ok'?'Bez zjištěných problémů':q?.status==='review'?'Ověřit poslechem':q?.status==='pending'?'Čeká na kontrolu':q?.status==='unavailable'?'Kontrola nedokončena':'Zatím bez kontroly';
export function QualityReport({variant:v,onCheck,disabled=false}:{variant:Variant;onCheck?:()=>void;disabled?:boolean}){
 const q=v.quality,speech=q?.lyrics,measured=['ok','review'].includes(q?.status);
 return <details className={'quality-report quality-'+(q?.status||'missing')}><summary>{q?.status==='ok'?<Check size={13}/>:q?.status==='review'?<AlertCircle size={13}/>:q?.status==='pending'?<LoaderCircle size={13} className="spin"/>:<Activity size={13}/>} {qualityLabel(q)}</summary><div className="quality-body">
  <p>Kontrola zvuku a slov. Melodii, emoce a věrnost žánru posuďte poslechem.</p>
  {q?.issues?.map((issue:any,i:number)=><p className={issue.severity==='error'?'error-text':'quality-issue'} key={issue.code+i}>{issue.message}</p>)}{q?.message&&<p>{q.message}</p>}
  {measured&&q.audio&&<div className="quality-facts"><span>Tichá místa: {Math.round(q.audio.silentFraction*100)} %</span><span>Ticho na konci: {q.audio.trailingSilence.toFixed(1)} s</span><span>Špička: {q.audio.peakDbFS.toFixed(1)} dBFS</span></div>}
  {q?.status==='pending'?<p>Kontrola probíhá. Audio už můžete přehrát.</p>:speech?.status==='done'?<><p><strong>Orientační shoda slov: {Math.round((speech.matchedFraction||0)*100)} %</strong><br/>Rozpoznáno {speech.recognizedWords} slov, zadáno {speech.expectedWords}. Chyba může být ve zpěvu i v přepisu.</p><details><summary>Rozpoznaný text a rozdíly</summary><pre>{speech.transcript||'Nebyla rozpoznána žádná slova.'}</pre>{speech.differences?.length>0&&<div className="lyric-differences">{speech.differences.map((d:any,i:number)=><span key={i}>{d.expected||'∅'} → {d.heard||'∅'}</span>)}</div>}</details></>:speech?.status==='not-requested'?<p>Kontrola slov se u instrumentální skladby nepoužívá.</p>:q?.status!=='unavailable'&&<p>{speech?.message||'Pro kontrolu slov nainstalujte Whisper v AI modelech.'}</p>}
  {speech?.status==='unreliable'&&<details><summary>Zobrazit nespolehlivý přepis</summary><pre>{speech.transcript}</pre></details>}
  {onCheck&&<button className="secondary" disabled={disabled} onClick={onCheck}><Activity size={13}/>{q?'Zkontrolovat znovu':'Zkontrolovat skladbu'}</button>}
 </div></details>;
}
