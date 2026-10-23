'use strict';
const fs=require('node:fs/promises');const path=require('node:path');const {randomUUID,randomInt}=require('node:crypto');const {parseMultipart}=require('./multipart.cjs');const {delay}=require('./engine.cjs');
class Queue{
 constructor(storage,engine,probe,notify=()=>{},checks={}){this.storage=storage;this.engine=engine;this.probe=probe;this.notify=notify;this.checks=checks;this.items=[];this.active=null;this.stopping=false;}
 add(project,request,count=1,kind='composition',sourceId=null){if(!Number.isInteger(count)||count<1||count>20)throw Error('Počet variant musí být 1–20.');const jobs=[],comparisonGroup=randomUUID(),seeds={};for(const s of ['seed','lm_seed'])seeds[s]=request[s]>=0?request[s]:randomInt(0,4294967296);for(let i=0;i<count;i++){
  const r={...request};for(const s of ['seed','lm_seed'])r[s]=(seeds[s]+i)>>>0;
  const j={id:randomUUID(),projectId:project.id,name:project.name,created:new Date().toISOString(),status:'queued',request:r,kind:kind==='composition'&&i>0?'variant':kind,sourceId,snapshot:project,comparisonGroup,candidateIndex:i+1,candidateCount:count};this.storage.job(j);this.items.push(j);jobs.push(j);
 }this.notify();this.work();return jobs;}
 async work(){if(this.active||this.stopping)return;const j=this.items.shift();if(!j)return;
  this.active=j;j.status='running';j.started=new Date().toISOString();this.engine.error=null;this.engine.phase='Příprava úlohy';this.storage.job(j);this.notify();
  try{
   const submit=await this.engine.submit(j.request);j.backendId=submit.id;this.storage.job(j);
   if(j.cancelRequested)await this.engine.cancel(j.backendId);
   while(true){if(this.stopping)throw Error('Aplikace byla ukončena.');if(!this.engine.process)throw Error(this.engine.error||'Engine byl ukončen.');
    const s=await this.engine.status(j.backendId);if(s.status==='done')break;
    if(s.status==='cancelled'){j.status='cancelled';return;}
    if(s.status==='failed')throw Error(this.engine.error||'Generování selhalo. Podrobnosti jsou v diagnostice enginu.');
    await delay(800);
   }
   const result=await this.engine.result(j.backendId),tracks=result.tracks||parseMultipart(result.buffer,result.type),dir=this.storage.trackDir(j.projectId);
   for(const track of tracks){
    const id=randomUUID(),audioFile=path.join(dir,id+'.'+track.extension),replayFile=path.join(dir,id+'.replay.json');
    await fs.writeFile(audioFile+'.part',track.audio);await fs.rename(audioFile+'.part',audioFile);
    await fs.writeFile(replayFile,JSON.stringify(track.replay,null,2),'utf8');const info=await this.probe(audioFile);
    if(!info.duration||info.duration<=0)throw Error('Výstup neobsahuje přehratelné audio.');
    this.storage.addVariant({id,projectId:j.projectId,name:j.name,created:new Date().toISOString(),audio:path.relative(this.storage.root,audioFile),replay:path.relative(this.storage.root,replayFile),request:track.replay,snapshot:j.snapshot,backend:this.engine.id||'minimax',engine:this.engine.props?.version,models:{music:track.replay.backend_model,lm:track.replay.lm_model,depth:track.replay.depth_model,dit:track.replay.dit_model,cond:track.replay.cond_model,vae:track.replay.vae_model},technical:info,elapsedMs:Date.now()-Date.parse(j.started),kind:j.kind,sourceId:j.sourceId,comparisonGroup:j.comparisonGroup,candidateIndex:j.candidateIndex,candidateCount:j.candidateCount,quality:this.checks.check?{status:'pending'}:undefined,metadata:{title:j.name,artist:'',album:'',comment:'AI-generated with '+(this.engine.label||'MiniMax-Music3')}});
    // Save playable audio before optional analysis. A cancelled/failed check
    // must never discard a successfully generated composition.
    if(this.checks.check){j.stage='checking';this.storage.job(j);this.notify();try{const quality=await this.checks.check(audioFile,info,{...track.replay,backend:this.engine.id||'minimax'},j.snapshot,id);this.storage.setQuality(id,quality);}catch(e){this.storage.setQuality(id,{version:1,status:'unavailable',checkedAt:new Date().toISOString(),issues:[],lyrics:{status:'error'},message:j.cancelRequested?'Kontrola byla zrušena. Audio zůstalo uložené.':e.message,musicality:'unrated'});}finally{j.stage='generation';}}
   }j.status='done';this.engine.phase='Připraveno';
  }catch(e){j.status=j.cancelRequested?'cancelled':'failed';j.error=e.message;}
  finally{j.finished=new Date().toISOString();this.storage.job(j);this.active=null;if(this.engine.process)this.engine.phase=j.status==='failed'?'Chyba generování':j.status==='cancelled'?'Zrušeno':'Připraveno';this.notify();if(!this.stopping)setImmediate(()=>this.work());}
 }
 async cancel(id){const i=this.items.findIndex(x=>x.id===id);if(i>=0){const [j]=this.items.splice(i,1);j.status='cancelled';this.storage.job(j);}else if(this.active?.id===id){if(this.active.stage==='checking'){this.active.cancelRequested=true;this.checks.cancel?.();}else{if(this.engine.capabilities?.cancel===false)throw Error('Běžící úlohu zastavte přímo na externím serveru. Jeho API nepodporuje zrušení.');this.active.cancelRequested=true;if(this.active.backendId)await this.engine.cancel(this.active.backendId);}}this.notify();}
 busy(){return !!this.active||!!this.items.length;}
 stop(){this.stopping=true;this.checks.cancel?.();this.engine.stop();}
}
module.exports={Queue};
