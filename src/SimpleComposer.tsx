import {Sparkles,Music2,FileText,Upload,SlidersHorizontal,LoaderCircle,Check,ChevronDown} from 'lucide-react';
import {creationMode,switchCreationMode} from '../electron/domain.mjs';
import {MusicModelPicker} from './ModelPicker';
import type {Project} from './types';

type Props={project:Project;update:(patch:Partial<Project>)=>void;state:any;working:boolean;currentJob:any;onCreate:()=>void;onImport:()=>void;onModels:()=>void;onSelectModel:(id:string)=>Promise<any>;onCancelDownload:()=>void};
export function SimpleComposer({project,update,state,working,currentJob,onCreate,onImport,onModels,onSelectModel,onCancelDownload}:Props){
 const mode=creationMode(project),automatic=project.automationMode!=='manual';
 const downloading=state.modelInstall||state.engine.download||state.models.active||state.planner.download,job=currentJob||state.jobs.find((j:any)=>j.id===state.activeJob),busy=working||!!job||state.planner.active||!!downloading||!!state.modelInstall||!!state.preparation;
 const music=state.modelLibrary?.find((m:any)=>m.id===state.engine.id),needsModels=music&&!music.installed||state.planner.mode==='local'&&!state.planner.installed;
 const hasBrief=!!project.concept.trim()||project.styles.length>0,needsLyrics=mode==='lyrics'&&!project.instrumental&&!project.lyrics.trim();
 const phase=state.preparation||(downloading?'Připravuji potřebné modely…':state.planner.active?(/text/i.test(state.planner.phase)?'Píšu text písně…':'Připravuji hudbu podle zadání…'):job?(/struktury/.test(state.engine.phase)?'Skládám melodii a strukturu…':/zvuku/.test(state.engine.phase)?'Vytvářím zvuk…':/Dekód|Zápis/.test(state.engine.phase)?'Dokončuji skladbu…':'Tvořím vaši skladbu…'):working?'Připravuji skladbu…':'');
 const switchMode=(value:'idea'|'lyrics')=>update(switchCreationMode(project,value));
 return <section className="quick-composer" aria-label="Jednoduchá tvorba hudby" aria-busy={busy}>
  <MusicModelPicker state={state} disabled={busy} onSelect={onSelectModel} onManage={onModels}/><div className="quick-tabs" role="tablist" aria-label="Způsob tvorby"><button role="tab" aria-selected={mode==='idea'} disabled={busy} onClick={()=>switchMode('idea')}><Sparkles size={16}/> Ze zadání</button><button role="tab" aria-selected={mode==='lyrics'} disabled={busy} onClick={()=>switchMode('lyrics')}><FileText size={16}/> Vlastní text</button></div>
  <fieldset className="quick-body" disabled={busy}>
   <label className="quick-instrumental"><span><Music2 size={15}/> Instrumentální skladba</span><input type="checkbox" role="switch" aria-label="Instrumentální skladba" checked={project.instrumental} onChange={e=>update({instrumental:e.target.checked})}/></label>
   {mode==='lyrics'&&!project.instrumental&&<div className="quick-field"><div className="between"><label htmlFor="quick-lyrics">Text písně</label><button className="text-button" onClick={onImport}><Upload size={13}/> Import TXT</button></div><textarea id="quick-lyrics" aria-label="Text písně" className="quick-lyrics" spellCheck={false} value={project.lyrics} onChange={e=>update({lyrics:e.target.value,creationMode:'lyrics',lyricsOrigin:undefined,autoLyrics:false})} placeholder={'Vložte slova, která se mají zazpívat…\n\n[Sloka]\n…\n[Refrén]\n…'}/><small>Vaše slova zůstanou zachovaná.</small></div>}
   <div className="quick-field"><label htmlFor="quick-brief">{mode==='idea'?'Jakou skladbu chcete?':'Jak má hudba znít?'}</label><textarea id="quick-brief" aria-label="Popis hudby" className="quick-brief" value={project.concept} onChange={e=>update({concept:e.target.value})} placeholder={mode==='idea'?'Například: Emotivní česká píseň o návratu domů, jemný ženský hlas, akustická kytara a silný melodický refrén.':'Například: Temný symfonický metal, ženský český zpěv, klavír, smyčce a velký melodický refrén.'}/><small>{mode==='idea'?(project.instrumental?'Hudba a její průběh vzniknou podle vašeho popisu.':'Text i hudba vzniknou podle vašeho popisu. Pište česky nebo anglicky.'):'Popište styl, náladu a hlas vlastními slovy.'}</small></div>
   {!project.concept&&project.styles.length>0&&<div className="quick-preset">Výchozí styl: {project.styles.map(s=>s.name).join(' + ')}</div>}
   <details className="quick-examples"><summary>Inspirace <ChevronDown size={13}/></summary><div className="chips">{['Melodický pop','Akustická balada','Jazz','Rock','Elektronická hudba','Filmová hudba'].map(s=><button key={s} className="chip" onClick={()=>update({concept:project.concept?project.concept+', '+s:s})}>{s}</button>)}</div></details>
   <details className="quick-title"><summary>Název skladby <small>volitelné</small></summary><input aria-label="Název skladby" value={project.name==='Nový projekt'?'':project.name} placeholder="Název se doplní automaticky" onChange={e=>update({name:e.target.value||'Nový projekt'})}/></details>
   {mode==='idea'&&project.lyricsOrigin&&project.lyrics.trim()&&<details className="quick-generated"><summary>Vytvořený text písně</summary><pre>{project.lyrics}</pre><button className="text-button" onClick={()=>update({...switchCreationMode(project,'lyrics'),lyrics:project.lyrics,lyricsOrigin:undefined})}>Upravit tento text</button></details>}
   {!automatic&&<div className="quick-manual"><strong>Vlastní nastavení je aktivní</strong><p>Při tvorbě se použijí vaše pokročilé hodnoty.</p><button className="text-button" onClick={()=>update({automationMode:'auto'})}>Přepnout na plnou automatiku</button></div>}
  </fieldset>
  <div className="quick-footer">
   <div className="quick-auto"><Check size={14}/><span>{automatic?'Délka, hlas a aranžmá automaticky podle zadání':'Vlastní hudební nastavení'}</span><button className="icon" title="Pokročilé možnosti" disabled={busy} onClick={()=>update({advanced:true})}><SlidersHorizontal size={15}/></button></div>
   <button className="quick-create" disabled={busy||!hasBrief||needsLyrics} onClick={onCreate}>{busy?<LoaderCircle size={20} className="spin"/>:<Sparkles size={20}/>} {busy?'Vytvářím skladbu…':needsModels?'Stáhnout modely a vytvořit':'Vytvořit skladbu'}</button>
   {phase&&<p className="quick-progress" role="status">{phase}</p>}
   {downloading&&<><progress value={downloading.received} max={downloading.total||1}/><small className="muted">První příprava může trvat déle. Další tvorba už použije stažené modely.</small><button className="text-button" onClick={onCancelDownload}>Pozastavit stahování</button></>}
   {!busy&&<div className="quick-bottom"><span>Uložení do projektu probíhá automaticky</span><button className="text-button" onClick={onModels}>{state.engine.label||'Hudební model'}</button></div>}
  </div>
 </section>;
}
