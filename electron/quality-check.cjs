'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');const run=promisify(execFile);
const {qualityReport,compareLyrics}=require('./audio-quality.cjs');
const {downloadPinned}=require('./pinned-download.cjs');
class QualityCheck{
 constructor(resources,models,audio,notify=()=>{}){this.folder=fs.existsSync(path.join(resources,'quality','manifest.json'))?path.join(resources,'quality'):path.join(resources,'planner','quality');this.models=path.join(models,'Whisper');this.audio=audio;this.notify=notify;this.active=null;this.download=null;}
 manifest(){return JSON.parse(fs.readFileSync(path.join(this.folder,'manifest.json'),'utf8'));}
 installed(){try{const m=this.manifest();return fs.statSync(path.join(this.models,m.model.name)).size===m.model.size&&m.runtimeFiles.every(a=>fs.statSync(path.join(this.folder,a.name)).size===a.size);}catch{return false;}}
 snapshot(){return {installed:this.installed(),active:this.active,download:this.download,model:'Whisper small · lokální CPU'};}
 async install(){if(this.download)throw Error('Kontrola zpěvu se již stahuje.');this.downloadController=new AbortController();const a=this.manifest().model;this.download={name:a.name,received:0,total:a.size};this.notify();try{await downloadPinned(a,this.models,{signal:this.downloadController.signal,progress:p=>{this.download={name:a.name,...p};this.notify();}});}finally{this.download=null;this.downloadController=null;this.notify();}}
 cancelDownload(){this.downloadController?.abort();}
 cancel(){this.controller?.abort();}
 async check(file,info,request={},snapshot={},id=''){
  if(this.active)throw Error('Právě probíhá kontrola jiné skladby.');this.controller=new AbortController();const signal=this.controller.signal;this.active={id,phase:'Kontroluji zvuk'};this.notify();let report,temp;
  try{
   try{report=qualityReport(await this.audio.measure(file,info,{signal}),info,request,snapshot);}catch(e){if(signal.aborted)throw e;report={version:1,checkedAt:new Date().toISOString(),status:'unavailable',issues:[{code:'analysis-error',severity:'warning',message:'Technickou kontrolu se nepodařilo dokončit: '+e.message}],lyrics:{status:'not-installed'},musicality:'unrated'};}
   if(snapshot.checkLyrics===false){report.lyrics={status:'disabled',message:'Kontrola zpívaných slov je pro tento projekt vypnutá.'};return report;}
   if(snapshot.instrumental||!String(request.lyrics||'').replace(/\[[^\]]*\]/g,'').trim()){report.lyrics={status:'not-requested'};return report;}
   if(!this.installed())return report;
   this.active={id,phase:'Kontroluji zazpívaná slova'};this.notify();temp=await fs.promises.mkdtemp(path.join(os.tmpdir(),'hmg-speech-'));const input=path.join(temp,'input.wav'),output=path.join(temp,'transcript');await this.audio.speechInput(file,input,{signal});
   const lang=request.vocal_language||snapshot.generationPlan?.language||snapshot.lyricLanguage||'auto',language=/^[a-z]{2}$/.test(lang)?lang:'auto';
   // No lyric prompt: priming the recognizer with the expected words biases coverage.
   await run(path.join(this.folder,'whisper-cli.exe'),['-m',path.join(this.models,this.manifest().model.name),'-f',input,'-l',language,'-t','4','-ng','-nt','-mc','0','-bs','1','-bo','1','-sns','-otxt','-of',output],{windowsHide:true,signal,timeout:1200000,maxBuffer:8*1024*1024});
   const transcript=(await fs.promises.readFile(output+'.txt','utf8')).trim();report.lyrics={...compareLyrics(request.lyrics,transcript),model:'whisper-small',language};
   if(report.lyrics.expectedWords>=12&&report.lyrics.wordErrorRate>.35){report.issues.push({code:'lyrics-mismatch',severity:'warning',message:'Rozpoznaný zpěv se liší od zadaných slov. Ověřte označená místa poslechem; přepis může chybovat.'});if(report.status==='ok')report.status='review';}
   return report;
  }catch(e){if(signal.aborted)throw e;if(!report)throw e;report.lyrics={status:'error',message:'Kontrola slov nebyla dokončena: '+e.message};return report;}
  finally{if(temp)await fs.promises.rm(temp,{recursive:true,force:true}).catch(()=>{});this.active=null;this.controller=null;this.notify();}
 }
}
module.exports={QualityCheck};
