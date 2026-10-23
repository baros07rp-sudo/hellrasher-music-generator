'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {Engine}=require('./engine.cjs'),{downloadPinned}=require('./pinned-download.cjs'),{parseMultipart}=require('./multipart.cjs');
class NativeAceEngine extends Engine{
 constructor(folder,models,config,notify,logFile){
  super(folder,path.join(models,'ACE-Step'),notify,logFile);this.id='acestep-native';this.label='ACE-Step 1.5 XL SFT';this.executable='ace-server.exe';this.runtimeFolders=[path.join(folder,'..','backend')];this.config=config;this.jobs=new Map();this.capabilities={lyrics:true,tokenize:false,replay:false,cancel:true,managed:true};this.manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));this.download=null;
 }
 installed(){return this.manifest.assets.every(a=>{try{return fs.statSync(path.join(this.models,a.name)).size===a.size;}catch{return false;}});}
 log(s){super.log(s);if(/\[LM-Phase[12]\]/.test(s))this.phase='ACE-Step: tvorba melodie, struktury a výrazu';if(/\[Synth\]|\[DiT\]/.test(s))this.phase='ACE-Step: syntéza zvuku XL SFT';}
 async ensureInstalled(){if(this.installed())return;if(this.download)throw Error('Modely ACE-Step se již stahují.');await this.release();this.downloadController=new AbortController();try{for(const asset of this.manifest.assets){this.phase='Stahuji '+asset.name;this.download={name:asset.name,received:0,total:asset.size};this.notify();await downloadPinned(asset,this.models,{signal:this.downloadController.signal,progress:p=>{this.download={name:asset.name,...p};this.notify();}});}}finally{this.download=null;this.downloadController=null;this.notify();}}
 cancelDownload(){this.downloadController?.abort();}
 async _start(){
  if(!this.installed())throw Error('Modely ACE-Step nejsou úplné. Tlačítko Vytvořit skladbu je stáhne automaticky.');
  const raw=await super._start(),wanted=this.config.model||this.manifest.defaults?.dit||'acestep-v15-xl-sft-BF16.gguf',model=raw.models?.dit?.find(n=>n===wanted||n.replace(/\.gguf$/,'')===wanted),lm=raw.models?.lm?.find(n=>n.replace(/\.gguf$/,'')==='acestep-5Hz-lm-4B-BF16');
  if(!model||!lm){this.stop();throw Error('Vybrané modely ACE-Step nejsou dostupné.');}
  this.props={...raw,selectedModel:model,selectedLM:lm,models:{...raw.models,music:raw.models.dit},defaults:{steps:/turbo/.test(model)?8:50,dit_cfg:/turbo/.test(model)?1:7,seed:-1,lm_seed:-1,output_format:'wav24',peak_clip:0,mp3_bitrate:192}};
  return this.props;
 }
 async submit(request){
  await this.start();const seed=request.seed>=0?request.seed:require('node:crypto').randomInt(0,4294967296),lmSeed=request.lm_seed>=0?request.lm_seed:require('node:crypto').randomInt(0,4294967296),turbo=/turbo/.test(this.props.selectedModel);
  const body={caption:request.caption,lyrics:request.lyrics,duration:request.duration,bpm:request.bpm||0,keyscale:request.keyscale||'',timesignature:request.timesignature||'',vocal_language:request.vocal_language||'unknown',seed,lm_seed:lmSeed,lm_model:this.props.selectedLM||'acestep-5Hz-lm-4B-BF16.gguf',synth_model:this.props.selectedModel,lm_batch_size:1,synth_batch_size:1,lm_temperature:.85,lm_cfg_scale:2,lm_top_p:.9,lm_top_k:0,lm_negative_prompt:request.lm_negative_prompt||'',use_cot_caption:false,lm_mode:'generate',inference_steps:turbo?8:request.steps??50,guidance_scale:turbo?1:request.dit_cfg??7,shift:turbo?3:1,output_format:request.output_format,peak_clip:request.peak_clip??0,mp3_bitrate:request.mp3_bitrate||192};
  const result=await this.json('/lm',body);const id=randomUUID();this.jobs.set(id,{stage:'lm',nativeId:result.id,body});this.phase='ACE-Step: skládání hudby a českého zpěvu';this.notify();return{id};
 }
 async status(id){
  const job=this.jobs.get(id);if(!job)throw Error('Neznámá úloha ACE-Step.');if(job.cancelled)return{status:'cancelled'};
  const state=await super.status(job.nativeId);if(state.status!=='done'||job.stage==='synth')return state;
  const rows=await this.json('/job?id='+encodeURIComponent(job.nativeId)+'&result=1');if(!Array.isArray(rows)||!rows[0]?.audio_codes)throw Error('ACE-Step nevrátil hudební kódy.');
  const proposed=rows[0];if(proposed.lyrics!==job.body.lyrics)throw Error('ACE-Step změnil vlastní text; syntéza byla zastavena.');
  job.replay={...proposed,...job.body,bpm:job.body.bpm||proposed.bpm,keyscale:job.body.keyscale||proposed.keyscale,timesignature:job.body.timesignature||proposed.timesignature,audio_codes:proposed.audio_codes};
  if(job.cancelled)return{status:'cancelled'};const next=await this.json('/synth',job.replay);job.nativeId=next.id;job.stage='synth';this.phase='ACE-Step: syntéza zvuku XL SFT';this.notify();return{status:'running'};
 }
 async cancel(id){const job=this.jobs.get(id);if(!job)throw Error('Neznámá úloha ACE-Step.');job.cancelled=true;return super.cancel(job.nativeId);}
 async result(id){const job=this.jobs.get(id);if(job?.stage!=='synth')throw Error('Syntéza ACE-Step není dokončená.');const raw=await super.result(job.nativeId);const replay={...job.replay,backend:this.id,backend_model:job.replay.synth_model,backend_request:job.replay};const tracks=parseMultipart(raw.buffer,raw.type,replay);this.jobs.delete(id);return{tracks};}
 snapshot(){return{...super.snapshot(),id:this.id,label:this.label,selectedModel:this.props?.selectedModel,capabilities:this.capabilities,installed:this.installed(),download:this.download,expectedBytes:this.manifest.assets.reduce((n,a)=>n+a.size,0)};}
}
module.exports={NativeAceEngine};
