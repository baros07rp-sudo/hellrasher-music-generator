// Rank only comparable measurements within one submitted batch. No musical score.
export function rankCandidates(tracks){
 const complete=tracks.length>1&&tracks.every(v=>['ok','review'].includes(v.quality?.status));
 const speech=complete&&tracks.every(v=>v.quality.lyrics?.status==='done'&&v.quality.lyrics.expectedWords>=12&&v.quality.lyrics.recognizedWords>=12);
 // A missing/unreliable transcript must not win merely by lacking an ASR
 // mismatch warning. Compare lyric errors only when all ASR results qualify.
 const risk=v=>{const q=v.quality;if(!['ok','review'].includes(q?.status))return Infinity;return (q.issues||[]).filter(i=>i.code!=='lyrics-mismatch').reduce((n,i)=>n+(i.severity==='error'?100:10),0);};
 const compare=(a,b)=>risk(a)-risk(b)||(speech&&Math.abs(a.quality.lyrics.wordErrorRate-b.quality.lyrics.wordErrorRate)>=.05?a.quality.lyrics.wordErrorRate-b.quality.lyrics.wordErrorRate:0);
 const ordered=[...tracks].sort((a,b)=>{const difference=compare(a,b);return (Number.isNaN(difference)?0:difference)||(a.candidateIndex||0)-(b.candidateIndex||0);});
 const first=ordered[0],next=ordered[1],recommendedId=complete&&first&&!first.quality.issues?.some(i=>i.severity==='error')&&next&&compare(first,next)<0?first.id:null;
 return {ordered,complete,speech,recommendedId};
}
export function latestComparison(tracks,jobs=[]){
 const groups=new Map();for(const j of jobs)if(j.candidateCount>1&&j.comparisonGroup&&!groups.has(j.comparisonGroup))groups.set(j.comparisonGroup,{id:j.comparisonGroup,created:j.created,count:j.candidateCount});
 for(const v of tracks)if(v.candidateCount>1&&v.comparisonGroup&&!groups.has(v.comparisonGroup))groups.set(v.comparisonGroup,{id:v.comparisonGroup,created:v.created,count:v.candidateCount});
 const group=[...groups.values()].sort((a,b)=>Date.parse(b.created)-Date.parse(a.created))[0];if(!group)return null;
 const batchJobs=jobs.filter(j=>j.comparisonGroup===group.id),pending=batchJobs.filter(j=>['queued','running'].includes(j.status)).length,finished=batchJobs.filter(j=>['failed','cancelled','interrupted'].includes(j.status)).length;
 const candidates=tracks.filter(v=>v.comparisonGroup===group.id),ranking=rankCandidates(candidates),complete=!pending&&candidates.length===group.count&&ranking.complete;
 return {...group,...ranking,complete,pending,failed:finished,recommendedId:complete?ranking.recommendedId:null};
}
