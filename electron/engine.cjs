'use strict';
const {spawn,execFile}=require('node:child_process');const net=require('node:net');const fs=require('node:fs');const path=require('node:path');const {promisify}=require('node:util');
const run=promisify(execFile);const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
async function gpu(){try{const {stdout}=await run('nvidia-smi.exe',['--query-gpu=name,memory.total,memory.used,utilization.gpu,temperature.gpu,driver_version','--format=csv,noheader,nounits'],{windowsHide:true,timeout:5000});return stdout.trim().split(/\r?\n/).map(l=>{const [name,total,used,utilization,temperature,driver]=l.split(',').map(x=>x.trim());return {name,total:Number(total),used:Number(used),utilization:Number(utilization),temperature:Number(temperature),driver};});}catch{return [];}}
async function processMemory(pid){if(!Number.isInteger(pid)||pid<1)return null;try{const {stdout}=await run('powershell.exe',['-NoProfile','-Command',`(Get-Process -Id ${pid} -ErrorAction Stop).WorkingSet64`],{windowsHide:true,timeout:5000});return Number(stdout.trim())||null;}catch{return null;}}
class Engine{
 constructor(folder,models,notify=()=>{},logFile){this.folder=folder;this.models=models;this.notify=notify;this.logFile=logFile;this.process=null;this.starting=null;this.props=null;this.phase='Vypnuto';this.logs=[];this.error=null;this.base=null;}
 arguments(port){return ['--models',this.models,'--host','127.0.0.1','--port',String(port),'--device','CUDA0','--max-batch','1'];}
 log(s){for(const line of s.split(/[\r\n]+/).filter(Boolean)){this.logs.push({time:new Date().toISOString(),line:line.length>1600?line.slice(0,1600)+'…':line});if(this.logs.length>500)this.logs.shift();
   if(/^\[.*\].*(?:out of memory|FATAL|ERROR|failed)|^CUDA.*error/i.test(line))this.error=line;
   if(/^\[(?:Load|WeightCtx|Qwen3|GGUF|LM-KV|BPE)\]|^\[Store\] Load/.test(line))this.phase='Načítání modelu';
   if(/^\[(?:AR|Prompt)\]/.test(line))this.phase='Tvorba hudební struktury';
   if(/^\[Cond/.test(line))this.phase='Kódování podmínek';
   if(/^\[(?:DiT|Synth)\]/.test(line))this.phase='Syntéza zvuku';
   if(/^\[VAE\]/.test(line))this.phase='Dekódování audia';
   if(/^\[Done\]/.test(line))this.phase='Zápis audia';
  }if(this.logFile)fs.appendFileSync(this.logFile,s);this.notify();}
 async start(){if(this.process&&this.props)return this.props;if(this.starting)return this.starting;
  this.starting=this._start().finally(()=>this.starting=null);return this.starting;
 }
 async _start(){
  const exe=path.join(this.folder,this.executable||'mm-server.exe');if(!fs.existsSync(exe))throw Error('Chybí lokální '+path.basename(exe)+'. Nainstalujte úplný balíček aplikace.');
  fs.mkdirSync(this.models,{recursive:true});const port=await freePort();this.base=`http://127.0.0.1:${port}`;this.phase='Spouštění CUDA enginu';this.error=null;
  const proc=spawn(exe,this.arguments(port),{cwd:this.folder,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PATH:[this.folder,...(this.runtimeFolders||[]),process.env.PATH].join(path.delimiter)}});
  this.process=proc;proc.stdout.on('data',b=>this.log(b.toString()));proc.stderr.on('data',b=>this.log(b.toString()));
  proc.on('error',e=>{this.error=e.message;this.notify();});proc.on('exit',(code)=>{if(this.process===proc){this.process=null;this.props=null;this.phase='Vypnuto';if(code)this.error=`Engine skončil s kódem ${code}. Zkuste úspornější kvantizaci.`;this.notify();}});
  for(let n=0;n<120;n++){if(this.process!==proc)throw Error(this.error||'Engine se nespustil.');try{const h=await this.json('/health',undefined,1500);if(h.status==='ok'){this.props=await this.json('/props');this.phase='Připraveno';this.notify();return this.props;}}catch{}await delay(500);}
  this.stop();throw Error('Engine se nespustil do 60 sekund. Zkontrolujte diagnostiku.');
 }
 async json(route,data,timeout=15000){if(!this.base)throw Error('Engine není spuštěn.');const r=await fetch(this.base+route,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error(`Engine HTTP ${r.status}: ${(await r.text()).slice(0,2000)}`);return r.json();}
 async submit(request){await this.start();return this.json('/synth',request);}
 status(id){return this.json('/job?id='+encodeURIComponent(id));}
 cancel(id){return this.json('/job?id='+encodeURIComponent(id)+'&cancel=1',{});}
 async result(id){const r=await fetch(this.base+'/job?id='+encodeURIComponent(id)+'&result=1',{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Výsledek není dostupný.');return {buffer:Buffer.from(await r.arrayBuffer()),type:r.headers.get('content-type')||''};}
 stop(){const p=this.process;this.process=null;this.props=null;p?.kill();this.phase='Vypnuto';this.notify();}
 async release(){const p=this.process;if(!p)return;const exited=()=>p.exitCode!==null||p.signalCode!==null;const done=exited()?Promise.resolve():new Promise(resolve=>p.once('exit',resolve));this.stop();await Promise.race([done,delay(10000)]);if(!exited())throw Error('Hudební engine ještě neuvolnil GPU. Zkuste přípravu za chvíli.');}
 snapshot(){return {running:!!this.process,version:this.props?.version||null,defaults:this.props?.defaults||null,models:this.props?.models||null,phase:this.phase,error:this.error,logs:this.logs};}
}
module.exports={Engine,gpu,delay,processMemory};
