import {ArrowLeftRight,Play} from 'lucide-react';import {latestComparison} from '../electron/comparison.mjs';import {qualityLabel} from './QualityReport';import {time} from './components';import type {Variant} from './types';
export function ComparisonPanel({tracks,jobs,onListen,onCompare}:{tracks:Variant[];jobs:any[];onListen:(v:Variant)=>void;onCompare:(a:Variant,b:Variant)=>void}){
 const batch=latestComparison(tracks,jobs);if(!batch)return null;const candidates=batch.ordered as Variant[];
 return <section className="comparison-panel" aria-label="Porovnání kompozic"><div className="between"><strong>Porovnání kompozic</strong><small>{candidates.length} / {batch.count}</small></div>
  <p>{batch.pending?`Zbývá dokončit ${batch.pending} kompozic nebo jejich kontrolu.`:batch.failed?'Některé kompozice se nepodařilo dokončit.':batch.complete?'Kontrola dokončena. Porovnejte melodii, žánr a výraz.':'U dostupných skladeb spusťte kontrolu; některé mohou být v koši.'}</p>
  {batch.recommendedId?<p className="comparison-recommendation">Nejméně zjištěných problémů: kompozice {candidates.find(v=>v.id===batch.recommendedId)?.candidateIndex}. {batch.speech?'Zohledněn také orientační přepis slov.':''}</p>:batch.complete&&<p className="muted">Kontrola neurčila jednoznačného favorita.</p>}
  {candidates.map(v=><div className="comparison-row" key={v.id}><div><strong>Kompozice {v.candidateIndex}</strong><small>{time(v.technical.duration)} · {qualityLabel(v.quality)}</small></div><button className="icon" title={'Poslechnout kompozici '+v.candidateIndex} onClick={()=>onListen(v)}><Play size={15}/></button></div>)}
  {candidates.length>=2&&<button className="secondary" onClick={()=>onCompare(candidates[0],candidates[1])}><ArrowLeftRight size={14}/>Porovnat první dvě A/B</button>}
 </section>;
}
