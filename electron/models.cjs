'use strict';
const fs=require('node:fs');const fsp=fs.promises;const path=require('node:path');const {createHash}=require('node:crypto');
async function sha256(file){const h=createHash('sha256');for await(const b of fs.createReadStream(file))h.update(b);return h.digest('hex');}
class Models{
 constructor(manifestPath,folder,notify=()=>{}){this.manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8').replace(/^\uFEFF/,''));this.folder=folder;this.notify=notify;this.active=null;this.integrity={};}
 entries(){return this.manifest.siblings.filter(x=>x.rfilename.endsWith('.gguf')).map(x=>({name:x.rfilename,size:x.size,sha256:x.lfs.sha256,component:x.rfilename.includes('language_model')?'lm':x.rfilename.includes('rvq_depth')?'depth':x.rfilename.includes('condition_encoder')?'cond':x.rfilename.includes('transformer')?'dit':'vae',quant:x.rfilename.match(/-(BF16|F32|Q\w+)\.gguf$/)?.[1]}));}
 async status(){await fsp.mkdir(this.folder,{recursive:true});const disk=await fsp.statfs(this.folder);return {folder:this.folder,free:Number(disk.bavail)*Number(disk.bsize),active:this.active?{...this.active,controller:undefined}:null,entries:await Promise.all(this.entries().map(async x=>{const s=await fsp.stat(path.join(this.folder,x.name)).catch(()=>null),p=await fsp.stat(path.join(this.folder,x.name+'.part')).catch(()=>null);return {...x,installed:s?.size===x.size,bytes:s?.size||0,partial:p?.size||0,integrity:this.integrity[x.name]||'unchecked'};}))};}
 entry(name){const x=this.entries().find(x=>x.name===name);if(!x)throw Error('Neznámý model.');return x;}
 async verify(name){const e=this.entry(name),p=path.join(this.folder,name);const ok=(await fsp.stat(p)).size===e.size&&(await sha256(p))===e.sha256;this.integrity[name]=ok?'verified':'failed';this.notify();return ok;}
 async download(names){
  if(this.active)throw Error('Již probíhá stahování modelů.');
  const entries=names.map(n=>this.entry(n));
  const controller=new AbortController();this.active={name:'',received:0,total:0,phase:'download',controller};this.notify();
  try{const state=await this.status();const missing=entries.reduce((a,e)=>a+(state.entries.find(x=>x.name===e.name)?.installed?0:e.size-(state.entries.find(x=>x.name===e.name)?.partial||0)),0);
   if(state.free<missing+1024**3)throw Error('Na disku není dostatek místa (včetně rezervy 1 GiB).');
   for(const e of entries){
   const dest=path.join(this.folder,e.name),part=dest+'.part';
   if((await fsp.stat(dest).catch(()=>null))?.size===e.size){this.active={...this.active,name:e.name,phase:'verify'};this.notify();if(await this.verify(e.name))continue;}
   let offset=(await fsp.stat(part).catch(()=>null))?.size||0;
   this.active={...this.active,name:e.name,total:e.size,received:offset,phase:'download'};this.notify();
   if(offset!==e.size){
    const url=`https://huggingface.co/Serveurperso/MiniMax-Music3-GGUF/resolve/${this.manifest.sha}/${encodeURIComponent(e.name)}?download=true`;
    const response=await fetch(url,{headers:offset?{Range:`bytes=${offset}-`}:{},signal:controller.signal});
    if(!response.ok)throw Error(`Stažení selhalo: HTTP ${response.status}`);
    const append=response.status===206&&response.headers.get('content-range')?.startsWith(`bytes ${offset}-`);
    if(response.status===206&&!append)throw Error('Server vrátil nesprávný rozsah souboru.');
    if(!append)offset=0;
    const file=await fsp.open(part,append?'a':'w');let last=0;
    try{for await(const chunk of response.body){await file.writeFile(chunk);offset+=chunk.length;this.active.received=offset;if(offset>e.size)throw Error('Stažený soubor překročil očekávanou velikost.');if(Date.now()-last>300){this.notify();last=Date.now();}}await file.sync();}finally{await file.close();}
   }
   this.active.phase='verify';this.notify();
   if((await fsp.stat(part)).size!==e.size)throw Error('Stažený soubor je neúplný. Stažení lze obnovit.');
   if(await sha256(part)!==e.sha256){await fsp.unlink(part);throw Error('Kontrolní součet SHA-256 nesouhlasí. Poškozený soubor byl odstraněn.');}
   await fsp.rename(part,dest);this.integrity[e.name]='verified';this.notify();
  }}finally{this.active=null;this.notify();}
 }
 cancel(){this.active?.controller.abort();}
 async remove(name){this.entry(name);if(this.active)throw Error('Nejdříve dokončete nebo zastavte stahování.');await fsp.unlink(path.join(this.folder,name));delete this.integrity[name];}
}
module.exports={Models,sha256};
