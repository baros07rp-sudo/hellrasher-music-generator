export const trackBackend=v=>v.backend||v.request?.backend||'minimax';
export const backendLabel=id=>({'acestep-native':'ACE-Step XL SFT','yue2-native':'YuE2','minimax':'MiniMax-Music3','acestep':'ACE-Step API'}[id]||id);
const normalized=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('cs');
export function filterTracks(tracks,{search='',model='all',favorites=false,sort='newest'}={}){
 const text=normalized(search);return tracks.filter(v=>(!favorites||v.favorite)&&(model==='all'||trackBackend(v)===model)&&normalized([v.name,v.metadata?.title,v.snapshot?.concept,...(v.snapshot?.styles||[]).map(s=>s.name)].join(' ')).includes(text)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'cs'):sort==='duration'?(b.technical?.duration||0)-(a.technical?.duration||0):sort==='oldest'?Date.parse(a.created)-Date.parse(b.created):Date.parse(b.created)-Date.parse(a.created));
}
