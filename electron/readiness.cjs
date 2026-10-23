'use strict';
async function ensureReady({engine,models,planner,routing,includeMusic=true,includePlanner=true,phase=()=>{}}){
 try{
  if(includeMusic&&engine.ensureInstalled){phase('Připravuji lokální modely '+engine.label);await engine.ensureInstalled();}
  if(includeMusic&&engine.id==='minimax'){
   const state=await models.status(),missing=Object.values(routing).filter(name=>!state.entries.some(e=>e.name===name&&e.installed&&e.integrity!=='failed'));
   if(missing.length){phase('Stahuji hudební modely');await engine.release();await models.download(missing);}
  }
  const p=planner.snapshot();
  if(includePlanner&&p.mode==='local'&&!p.installed){
   if(planner.settings().modelPath)throw Error('Vybraný vlastní plánovací model není dostupný. V AI modelech zvolte jeho soubor nebo výchozí Qwen3.');
   phase('Stahuji model pro přípravu skladby');if(engine.capabilities?.managed||engine.id==='minimax')await engine.release();await planner.install();
  }
 }finally{phase(null);}
}
module.exports={ensureReady};
