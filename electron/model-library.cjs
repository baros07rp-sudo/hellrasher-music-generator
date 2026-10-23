'use strict';
const fs=require('node:fs'),fsp=fs.promises,path=require('node:path');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
class ModelLibrary{
 constructor(resources,folder,mini){this.resources=resources;this.folder=folder;this.mini=mini;}
 packages(routing={}){
  const ace=read(path.join(this.resources,'ace/manifest.json')),yue=read(path.join(this.resources,'yue/manifest.json')),planner=read(path.join(this.resources,'planner/manifest.json'));
  return [
   {id:'acestep-native',name:'ACE-Step XL SFT',precision:'BF16',kind:'music',recommended:true,description:'Plná přesnost, český jazyk a řízení struktury. Doporučený výchozí model pro tuto sestavu.',folder:'ACE-Step',license:'MIT / Apache-2.0',assets:[...ace.assets.map(a=>({...a,required:true})),...(ace.compatibilityAssets||[]).map(a=>({...a,required:false}))]},
   {id:'yue2-native',name:'YuE2',precision:'3B BF16',kind:'music',description:'Vlastní plán melodie a akordů. Další charakter zvuku; český zpěv může být méně přesný.',folder:'YuE2',license:'CC BY-NC 4.0 · nekomerční',assets:yue.assets.map(a=>({...a,required:true}))},
   {id:'minimax',name:'MiniMax-Music3',precision:'Automatická přesnost',kind:'music',description:'Alternativní kompozice a zvuk. Přesnost komponent se přizpůsobí paměti grafiky.',folder:'',license:'MiniMax Music3 Community License',assets:this.mini.entries().map(a=>({...a,required:Object.values(routing).includes(a.name)}))},
   {id:'planner',name:'Qwen3 · hudební režie',precision:'8B Q5_K_M',kind:'planner',description:'Připravuje text, styl a délku pro všechny hudební modely.',folder:'PromptPlanner',license:'Apache-2.0',assets:[{...planner.model,required:true}]}
  ];
 }
 async status(routing){return Promise.all(this.packages(routing).map(async group=>{
  const assets=await Promise.all(group.assets.map(async a=>{const dest=path.join(this.folder,group.folder,a.name),stat=await fsp.stat(dest).catch(()=>null),partial=await fsp.stat(dest+'.part').catch(()=>null);return {name:a.name,size:a.size,required:a.required,installed:stat?.size===a.size,present:!!stat,bytes:stat?.size||0,partial:partial?.size||0};}));
  const required=assets.filter(a=>a.required);return {...group,assets,installed:required.length>0&&required.every(a=>a.installed),installedCount:assets.filter(a=>a.present).length,bytes:assets.reduce((n,a)=>n+a.bytes+a.partial,0),expectedBytes:required.reduce((n,a)=>n+a.size,0)};
 }));}
 async removalPlan(id,name,routing){
  const group=this.packages(routing).find(g=>g.id===id);if(!group)throw Error('Neznámá sada modelů.');
  const assets=name?group.assets.filter(a=>a.name===name):group.assets;if(!assets.length)throw Error('Neznámý soubor modelu.');
  const root=await fsp.realpath(this.folder),files=[];
  for(const asset of assets){if(path.basename(asset.name)!==asset.name)throw Error('Neplatný manifest modelu.');for(const suffix of ['','.part']){
   const file=path.resolve(this.folder,group.folder,asset.name+suffix);let stat;try{stat=await fsp.lstat(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}
   const real=await fsp.realpath(file);if(!file.startsWith(path.resolve(this.folder)+path.sep)||!real.startsWith(root+path.sep)||stat.isSymbolicLink()||!stat.isFile())throw Error('Model vede mimo vybranou složku nebo není běžným souborem.');
   files.push({file,bytes:stat.size});
  }}return files;
 }
 async remove(id,name,routing){const files=await this.removalPlan(id,name,routing);let freedBytes=0;for(const item of files){try{await fsp.unlink(item.file);freedBytes+=item.bytes;}catch(e){throw Error('Soubor modelu nelze odstranit: '+path.basename(item.file)+'. '+e.message);}}return {files:files.length,freedBytes};}
}
module.exports={ModelLibrary};
