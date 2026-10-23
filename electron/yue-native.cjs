'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomInt}=require('node:crypto');
const {Engine}=require('./engine.cjs'),{downloadPinned}=require('./pinned-download.cjs'),{parseMultipart}=require('./multipart.cjs');
class NativeYueEngine extends Engine{
 constructor(folder,models,config={},notify=()=>{},logFile){
  super(folder,path.join(models,'YuE2'),notify,logFile);this.id='yue2-native';this.label='YuE2 3B BF16';this.executable='yue-server.exe';this.runtimeFolders=[path.join(folder,'..','backend')];this.config=config;this.manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));this.capabilities={lyrics:true,tokenize:false,replay:false,cancel:true,managed:true};this.jobs=new Map();this.download=null;
 }
 installed(){return this.manifest.assets.every(a=>{try{return fs.statSync(path.join(this.models,a.name)).size===a.size;}catch{return false;}});}
 arguments(port){const file=role=>path.join(this.models,this.manifest.assets.find(a=>a.role===role).name);return ['--model',file('model'),'--vae',file('vae'),'--host','127.0.0.1','--port',String(port),'--device','CUDA0','--max-batch','1'];}
 async ensureInstalled(){if(this.installed())return;if(this.download)throw Error('Modely YuE2 se již stahují.');await this.release();this.downloadController=new AbortController();try{for(const asset of this.manifest.assets){this.phase='Stahuji '+asset.name;this.download={name:asset.name,received:0,total:asset.size};this.notify();await downloadPinned(asset,this.models,{signal:this.downloadController.signal,progress:p=>{this.download={name:asset.name,...p};this.notify();}});}}finally{this.download=null;this.downloadController=null;this.notify();}}
 cancelDownload(){this.downloadController?.abort();}
 async _start(){
  if(!this.installed())throw Error('Modely YuE2 nejsou úplné. Při tvorbě se stáhnou automaticky.');
  const raw=await super._start(),model=this.manifest.assets.find(a=>a.role==='model').name;
  if(raw.sample_rate!==48000||path.basename(raw.model||'')!==model){this.stop();throw Error('YuE2 vrátil nekompatibilní model nebo formát.');}
  this.props={...raw,selectedModel:model,models:{music:[model]},defaults:{steps:32,seed:-1,lm_seed:-1,lm_cfg:1,output_format:'wav24',peak_clip:0,mp3_bitrate:192}};return this.props;
 }
 async submit(request){
  await this.start();const seed=x=>x>=0?x:randomInt(0,4294967296);
  const body={style:request.caption,lyrics:request.lyrics,cot:'full',duration:request.duration,steps:request.steps??32,seed:seed(request.seed),lm_seed:seed(request.lm_seed),cfg_scale:request.lm_cfg??1,lm_batch_size:1,synth_batch_size:1,output_format:request.output_format||'wav24',peak_clip:request.peak_clip??0,mp3_bitrate:request.mp3_bitrate||192};
  const result=await this.json('/synth',body);if(!result.id)throw Error('YuE2 nevrátil ID úlohy.');this.jobs.set(result.id,body);this.phase='YuE2: melodie, akordy a syntéza';this.notify();return result;
 }
 async result(id){
  const input=this.jobs.get(id);if(!input)throw Error('Neznámá úloha YuE2.');const raw=await super.result(id),tracks=parseMultipart(raw.buffer,raw.type);
  for(const track of tracks){if(track.replay.lyrics!==input.lyrics||track.replay.style!==input.style)throw Error('YuE2 změnil vstupní text nebo styl.');const tokens=String(track.replay.semantic_tokens||'').split(',').filter(Boolean).length,warnings=tokens>=Math.floor(input.duration*25)?['YuE2 vyčerpal časový limit. Konec skladby nebo část textu mohou chybět; zkuste delší rozpočet.']:[];track.replay={...track.replay,backend:this.id,backend_model:this.props.selectedModel,caption:track.replay.style,generation_warnings:warnings,backend_request:{...track.replay}};}
  this.jobs.delete(id);return {tracks};
 }
 snapshot(){return {...super.snapshot(),id:this.id,label:this.label,selectedModel:this.props?.selectedModel,capabilities:this.capabilities,installed:this.installed(),download:this.download,expectedBytes:this.manifest.assets.reduce((n,a)=>n+a.size,0),license:this.manifest.license};}
}
module.exports={NativeYueEngine};
