'use strict';
const fs=process.versions.electron?require('original-fs'):require('node:fs'),fsp=fs.promises,path=require('node:path'),{createHash,randomUUID}=require('node:crypto'),{unzipSync}=require('fflate');
const {version,repository}=require('./version.cjs');
const MAX_ARCHIVE=512*1024**2,MAX_UNPACKED=1024**3;
const sha=b=>createHash('sha256').update(b).digest('hex');
function newer(candidate,current){const parse=s=>/^v?(\d+)\.(\d+)\.(\d+)$/.exec(s)?.slice(1).map(Number),a=parse(candidate),b=parse(current);if(!a||!b)throw Error('Neplatné číslo verze aktualizace.');for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i];return false;}
function allowedFile(name){return typeof name==='string'&&!name.includes('\\')&&!name.includes(':')&&!name.split('/').some(s=>!s||s==='.'||s==='..')&&(name==='resources/app.asar'||name==='resources/brand.ico'||/^resources\/(?:ace|yue|planner|legal|model-manifest)\/[\w./ @()+-]+$/i.test(name));}
function validateManifest(manifest,expectedVersion,runtimeSHA){
 if(manifest.format!=='hellrasher-update'||manifest.version!==expectedVersion||manifest.platform!=='win32-x64'||manifest.runtimeSHA256!==runtimeSHA||!Array.isArray(manifest.files)||!manifest.files.length||manifest.files.length>2000)throw Error('Balíček není kompatibilní s touto aplikací.');
 const names=new Set();let bytes=0;for(const file of manifest.files){if(!allowedFile(file.path)||names.has(file.path.toLowerCase())||!Number.isSafeInteger(file.bytes)||file.bytes<0||!/^[a-f0-9]{64}$/.test(file.sha256))throw Error('Aktualizace obsahuje neplatnou cestu nebo kontrolní součet.');names.add(file.path.toLowerCase());bytes+=file.bytes;}
 if(!names.has('resources/app.asar')||bytes>MAX_UNPACKED)throw Error('Aktualizační balíček má neplatný obsah.');return manifest;
}
class Updates{
 constructor({user,resources,notify=()=>{},fetcher=fetch,currentVersion=version}){
  this.folder=path.join(user,'Updates');this.resources=resources;this.notify=notify;this.fetch=fetcher;this.version=currentVersion;this.runtimeSHA=JSON.parse(fs.readFileSync(path.join(resources,'electron-runtime.json'),'utf8')).sha256;this.state={status:'idle',currentVersion:this.version};this.controller=null;
  try{const pending=JSON.parse(fs.readFileSync(path.join(this.folder,'pending.json'),'utf8'));if(newer(pending.version,this.version))this.state={...this.state,status:'ready',version:pending.version,stage:pending.stage,releaseURL:pending.releaseURL};}catch{}
 }
 snapshot(){const {stage,...publicState}=this.state;return {...publicState,repository,repositoryURL:'https://github.com/'+repository};}
 set(patch){this.state={...this.state,...patch};this.notify();}
 releaseURL(url){const u=new URL(url);if(u.origin!=='https://github.com'||!u.pathname.startsWith('/'+repository+'/releases/')||u.username||u.password||u.search||u.hash)throw Error('Neplatná adresa vydání.');return u.href;}
 async check(){if(['downloading','ready'].includes(this.state.status))return this.snapshot();this.set({status:'checking',error:null});try{
  const r=await this.fetch('https://api.github.com/repos/'+repository+'/releases/latest',{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'},signal:AbortSignal.timeout(20000)});
  if(r.status===404){this.set({status:'no_release',checked:new Date().toISOString()});return this.snapshot();}if(!r.ok)throw Error('GitHub HTTP '+r.status);
  const release=await r.json(),latest=String(release.tag_name||'').replace(/^v/,''),releaseURL=this.releaseURL(release.html_url);if(release.draft||release.prerelease)throw Error('Vydání není stabilní.');
  if(!newer(latest,this.version)){this.set({status:'up_to_date',version:latest,releaseURL,checked:new Date().toISOString()});return this.snapshot();}
  const asset=release.assets?.find(a=>a.name===`Hellrasher-Music-Generator-Update-v${latest}.zip`);if(!asset||!/^sha256:[a-f0-9]{64}$/.test(asset.digest)||asset.size>MAX_ARCHIVE)throw Error('Vydání zatím neobsahuje ověřený aktualizační balíček.');
  const url=new URL(asset.browser_download_url);if(url.origin!=='https://github.com'||!url.pathname.startsWith('/'+repository+'/releases/download/')||url.username||url.password||url.search||url.hash)throw Error('Neplatná adresa aktualizačního balíčku.');
  this.asset={url:url.href,sha256:asset.digest.slice(7),bytes:asset.size};this.set({status:'available',version:latest,releaseURL,bytes:asset.size,notes:String(release.body||'').slice(0,12000),checked:new Date().toISOString()});
 }catch(e){this.set({status:'error',error:e.message});}return this.snapshot();}
 async download(){if(this.state.status!=='available'||!this.asset)throw Error('Nejprve vyhledejte dostupnou aktualizaci.');this.controller=new AbortController();this.set({status:'downloading',received:0,error:null});const version=this.state.version;
  try{const r=await this.fetch(this.asset.url,{signal:this.controller.signal});if(!r.ok)throw Error('Stažení aktualizace HTTP '+r.status);const chunks=[];let received=0,last=0;for await(const chunk of r.body){received+=chunk.length;if(received>this.asset.bytes||received>MAX_ARCHIVE)throw Error('Aktualizace překročila povolenou velikost.');chunks.push(Buffer.from(chunk));if(Date.now()-last>200){this.set({received});last=Date.now();}}
   const data=Buffer.concat(chunks);if(data.length!==this.asset.bytes||sha(data)!==this.asset.sha256)throw Error('Kontrolní součet stažené aktualizace nesouhlasí.');
   let total=0;const entries=new Set(),unpacked=unzipSync(data,{filter:e=>{total+=e.originalSize;if(total>MAX_UNPACKED||entries.has(e.name)||!allowedFile(e.name)&&e.name!=='update-manifest.json')throw Error('Balíček obsahuje nebezpečnou nebo duplicitní cestu.');entries.add(e.name);return true;}});
   if(!unpacked['update-manifest.json']||unpacked['update-manifest.json'].length>1024**2)throw Error('Chybí platný manifest aktualizace.');const manifest=validateManifest(JSON.parse(Buffer.from(unpacked['update-manifest.json']).toString('utf8')),version,this.runtimeSHA);
   if(entries.size!==manifest.files.length+1)throw Error('Obsah aktualizace neodpovídá manifestu.');
   for(const file of manifest.files){const bytes=unpacked[file.path];if(!bytes||bytes.length!==file.bytes||sha(bytes)!==file.sha256)throw Error('Kontrolní součet souboru nesouhlasí: '+file.path);}
   const stage=path.join(this.folder,'stage-'+randomUUID());await fsp.mkdir(stage,{recursive:true});for(const file of manifest.files){const dest=path.join(stage,...file.path.split('/'));await fsp.mkdir(path.dirname(dest),{recursive:true});await fsp.writeFile(dest,unpacked[file.path]);}await fsp.writeFile(path.join(stage,'update-manifest.json'),JSON.stringify(manifest));
   await fsp.writeFile(path.join(this.folder,'pending.json'),JSON.stringify({version,stage,releaseURL:this.state.releaseURL}));this.set({status:'ready',stage,received:data.length});
  }catch(e){this.set({status:e.name==='AbortError'?'available':'error',error:e.name==='AbortError'?null:e.message});}finally{this.controller=null;}return this.snapshot();
 }
 cancel(){this.controller?.abort();}
 async applyPlan(installRoot){
  if(this.state.status!=='ready')throw Error('Aktualizace není připravená.');const stage=await fsp.realpath(this.state.stage),root=await fsp.realpath(this.folder);if(!stage.startsWith(root+path.sep))throw Error('Neplatná složka aktualizace.');
  const manifest=validateManifest(JSON.parse(await fsp.readFile(path.join(stage,'update-manifest.json'),'utf8')),this.state.version,this.runtimeSHA);
  for(const file of manifest.files){const full=await fsp.realpath(path.join(stage,...file.path.split('/')));if(!full.startsWith(stage+path.sep)||sha(await fsp.readFile(full))!==file.sha256)throw Error('Připravené soubory aktualizace byly změněny.');}
  if(sha(await fsp.readFile(path.join(installRoot,'Hellrasher Music Generator.exe')))!==this.runtimeSHA)throw Error('Spouštěč aplikace neodpovídá této aktualizaci.');return {stage,manifest:path.join(stage,'update-manifest.json'),installRoot};
 }
}
module.exports={Updates,newer,allowedFile,validateManifest};
