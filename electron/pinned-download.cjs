'use strict';
const fs=require('node:fs');const path=require('node:path');const{createHash}=require('node:crypto');
async function digest(file){const hash=createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function downloadPinned(asset,folder,{signal,progress=()=>{}}={}){
 await fs.promises.mkdir(folder,{recursive:true});const dest=path.join(folder,asset.name),part=dest+'.part';
 if(path.basename(asset.name)!==asset.name||!/^https:\/\//.test(asset.url)||!/^[a-f0-9]{64}$/.test(asset.sha256))throw Error('Neplatný manifest souboru.');
 if((await fs.promises.stat(dest).catch(()=>null))?.size===asset.size&&await digest(dest)===asset.sha256)return dest;
 let offset=(await fs.promises.stat(part).catch(()=>null))?.size||0;if(offset>asset.size){await fs.promises.unlink(part);offset=0;}
 const disk=await fs.promises.statfs(folder);if(Number(disk.bavail)*Number(disk.bsize)<asset.size-offset+512*1024**2)throw Error('Na disku není dost místa pro plánovací model a rezervu.');
 if(offset<asset.size){const response=await fetch(asset.url,{headers:offset?{Range:`bytes=${offset}-`}:{},signal});if(!response.ok)throw Error('Stažení plánovače: HTTP '+response.status);const append=response.status===206&&response.headers.get('content-range')?.startsWith(`bytes ${offset}-`);if(response.status===206&&!append)throw Error('Server vrátil nesprávný rozsah souboru.');if(!append)offset=0;const file=await fs.promises.open(part,append?'a':'w');let last=0;try{for await(const chunk of response.body){await file.writeFile(chunk);offset+=chunk.length;if(offset>asset.size)throw Error('Nesprávná velikost staženého souboru.');if(Date.now()-last>300){progress({received:offset,total:asset.size,phase:'download'});last=Date.now();}}await file.sync();}finally{await file.close();}}
 progress({received:offset,total:asset.size,phase:'verify'});if((await fs.promises.stat(part)).size!==asset.size)throw Error('Stažení je neúplné. Lze pokračovat.');if(await digest(part)!==asset.sha256){await fs.promises.unlink(part);throw Error('Kontrolní součet plánovacího modelu nesouhlasí.');}await fs.promises.rename(part,dest);return dest;
}
module.exports={downloadPinned,digest};
