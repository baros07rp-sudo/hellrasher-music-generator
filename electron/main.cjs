'use strict';
const {app,BrowserWindow,ipcMain,dialog,protocol,net:electronNet,shell}=require('electron');const fs=require('node:fs');const fsp=fs.promises;const path=require('node:path');const os=require('node:os');const {pathToFileURL}=require('node:url');
const {Storage}=require('./storage.cjs');const {gpu}=require('./engine.cjs');const {Models}=require('./models.cjs');const {Audio}=require('./audio.cjs');const {Queue}=require('./queue.cjs');const archives=require('./archive.cjs');const {Planner,localEndpoint}=require('./planner.cjs');const {BACKENDS,createEngine}=require('./backends.cjs');
const {loadSettings}=require('./settings.cjs');
const {ensureReady}=require('./readiness.cjs');
const {qualityRouting,routingWarnings}=require('./model-quality.cjs');
const {ModelLibrary}=require('./model-library.cjs');
const {Updates}=require('./updates.cjs');
const {QualityCheck}=require('./quality-check.cjs');
const appInfo=require('./version.cjs');
const {spawn}=require('node:child_process');
app.setName('Hellrasher Music Generator');
protocol.registerSchemesAsPrivileged([{scheme:'hmg-audio',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
const ROOT=path.resolve(__dirname,'..'),RES=app.isPackaged?process.resourcesPath:path.join(ROOT,'resources');
let win,storage,engine,models,audio,queue,planner,quality,domain,settings,settingsFile,hardware=[],notifyTimer,closing=false,modelAction=false,preparation=null,modelInstall=null,modelInstallError=null,updater;
const userData=process.env.HMG_DATA_PATH||path.join(app.getPath('appData'),'Hellrasher Music Generator');fs.mkdirSync(userData,{recursive:true});app.setPath('userData',userData);
const primaryInstance=app.requestSingleInstanceLock();if(!primaryInstance)app.quit();
app.on('second-instance',()=>{if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.show();win.focus();}});
function notify(){if(notifyTimer)return;notifyTimer=setTimeout(()=>{notifyTimer=null;if(win&&!win.isDestroyed())win.webContents.send('hmg:change');},200);}
function saveSettings(){fs.writeFileSync(settingsFile+'.tmp',JSON.stringify(settings,null,2),'utf8');fs.renameSync(settingsFile+'.tmp',settingsFile);}
function createQueue(){return new Queue(storage,engine,file=>audio.probe(file),notify,{check:(...args)=>quality.check(...args),cancel:()=>quality.cancel()});}
function configureEngine(){engine=createEngine({config:settings.backend,nativeFolder:path.join(RES,'backend'),models:settings.modelsPath,notify,logFile:path.join(app.getPath('userData'),'engine.log')});quality=new QualityCheck(RES,settings.modelsPath,audio,notify);queue=createQueue();}
function configure(){updater ||=new Updates({user:app.getPath('userData'),resources:RES,notify});storage=new Storage(settings.projectsPath);audio=new Audio(path.join(RES,'ffmpeg'));models=new Models(path.join(RES,app.isPackaged?'model-manifest':'models','upstream.json'),settings.modelsPath,notify);planner=new Planner(path.join(RES,'planner'),settings.modelsPath,()=>({...settings.planner,targetBackend:settings.backend.id}),notify);configureEngine();}
function requireIdle(){if(queue.busy()||planner.active||quality.active)throw Error('Nejdříve dokončete přípravu zadání, generování nebo kontrolu skladby.');if(modelInstall||models.active||planner.download||engine.download||quality.download)throw Error('Nejdříve dokončete nebo pozastavte stahování modelů.');}
function preparationPhase(message){preparation=message;notify();}
function musicRouting(){return settings.routingMode==='manual'?settings.routing:qualityRouting(models.entries(),hardware[0]);}
function modelLibrary(){return new ModelLibrary(RES,settings.modelsPath,models);}
async function ready(options={}){return ensureReady({engine,models,planner,routing:musicRouting(),phase:preparationPhase,...options});}
async function prepareProject(project,force=false){
 requireIdle();domain.validateProject(project);const p=storage.saveProject({...project,creationMode:domain.creationMode(project)}),input=domain.generationProject(p);
 if(input.manualCaption!==null)return p;
 await ready({includeMusic:false});if(engine.capabilities.managed)await engine.release();
 const planned=await planner.prepare(input,domain,{force});
 const result=storage.saveProject({...p,name:domain.automaticName({...p,lyrics:planned.lyrics}),lyrics:planned.lyrics,lyricsOrigin:planned.lyricsOrigin,duration:planned.duration,generationPlan:planned.generationPlan});notify();return result;
}
async function fileDialog(kind,options){const r=kind==='save'?await dialog.showSaveDialog(win,options):await dialog.showOpenDialog(win,options);return kind==='save'?r.filePath:r.filePaths?.[0];}
const actions={
 async state(){return {app:appInfo,quality:quality.snapshot(),updates:updater.snapshot(),settings:{...settings,routing:musicRouting()},routingWarnings:routingWarnings(musicRouting(),hardware[0]),modelLibrary:await modelLibrary().status(musicRouting()),modelInstall:modelInstall?{id:modelInstall.id,...(modelInstall.engine?.download||models.active||planner.download||quality.download||{}) ,controller:undefined}:null,modelInstallError,projects:storage.projects(),trashedVariants:storage.variants(undefined,true),variants:storage.variants().map(v=>({...v,request:{...v.request,audio_codes:undefined,semantic_tokens:undefined}})),jobs:storage.jobs().map(({request,snapshot,...j})=>j),presets:[...domain.BUILTIN_PRESETS,...storage.presets()],engine:{...engine.snapshot(),logs:engine.logs.slice(-100)},planner:planner.snapshot(),preparation,backends:BACKENDS,gpu:hardware,models:await models.status(),ram:{total:os.totalmem(),free:os.freemem()},activeJob:queue.active?.id||null};},
 async checkUpdates(){return updater.check();},
 async downloadUpdate(){if(updater.state.status!=='available')throw Error('Nejprve zkontrolujte dostupnou aktualizaci.');updater.download().catch(e=>updater.set({status:'error',error:e.message}));return true;},
 async cancelUpdateDownload(){updater.cancel();},
 async openUpdatePage(){return shell.openExternal(updater.state.releaseURL||'https://github.com/'+appInfo.repository+'/releases');},
 async applyUpdate(){
  requireIdle();if(!app.isPackaged)throw Error('Aktualizaci lze použít v nainstalované aplikaci.');
  const plan=await updater.applyPlan(path.dirname(process.execPath)),helper=path.join(updater.folder,'apply-update.cjs'),planFile=path.join(updater.folder,'install-plan.json');await fsp.writeFile(helper,await fsp.readFile(path.join(__dirname,'apply-update.cjs')));await fsp.writeFile(planFile,JSON.stringify({...plan,parentId:process.pid,runtimeSHA:updater.runtimeSHA}));
  const proc=spawn(process.execPath,[helper,planFile],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},windowsHide:true,detached:true,stdio:'ignore'});
  await new Promise((resolve,reject)=>{proc.once('spawn',resolve);proc.once('error',reject);});proc.unref();setTimeout(()=>app.quit(),250);return true;
 },
 async variant({id}){return storage.variant(id);},
 async checkVariant({id}){requireIdle();const v=storage.variant(id),report=await quality.check(storage.audioPath(v),v.technical,{...v.request,backend:v.backend||v.request.backend||'minimax'},v.snapshot,id);storage.setQuality(id,report);notify();return report;},
 async cancelQualityCheck(){quality.cancel();},
 async waveform({id}){return audio.waveform(storage.audioPath(storage.variant(id)));},
 async save(p){domain.validateProject(p);return storage.saveProject(p);},
 async archive({id,archived}){storage.archive(id,archived);notify();},
 async history({id}){return storage.history(id);},
 async duplicate({id}){const p=storage.project(id);return storage.saveProject({...p,id:undefined,name:p.name+' (kopie)'});},
 async favorite({id,value}){storage.favorite(id,value);notify();},
 async trashVariants({ids}){requireIdle();const result=storage.trashVariants(ids);notify();return result;},
 async restoreVariants({ids}){requireIdle();const result=storage.trashVariants(ids,true);notify();return result;},
 async purgeVariants({ids}){requireIdle();const result=storage.purgeVariants(ids);notify();return result;},
 async renameVariant({id,name}){const result=storage.renameVariant(id,name);notify();return result;},
 async selectBackend({id}){if(!BACKENDS.some(b=>b.id===id))throw Error('Neznámý hudební model.');return actions.settings({backend:{id,model:''}});},
 async installModelPackage({id}){
  requireIdle();if(!modelLibrary().packages(musicRouting()).some(g=>g.id===id))throw Error('Neznámá sada modelů.');
  if(engine.capabilities.managed)await engine.release();await planner.release();const task={id,engine:null};modelInstall=task;modelInstallError=null;settings.downloadError=null;notify();
  (async()=>{if(id==='planner')await planner.install();else if(id==='quality')await quality.install();else if(id==='minimax')await models.download(Object.values(musicRouting()));else{task.engine=createEngine({config:{id,model:''},nativeFolder:path.join(RES,'backend'),models:settings.modelsPath,notify});await task.engine.ensureInstalled();}})().catch(e=>{if(e.name!=='AbortError')modelInstallError=e.message;}).finally(()=>{modelInstall=null;notify();});return true;
 },
 async cancelModelInstall(){modelInstall?.engine?.cancelDownload();engine.cancelDownload?.();models.cancel();planner.cancelDownload();quality.cancelDownload();},
 async removeModelPackage({id,name}){
  requireIdle();const library=modelLibrary();await library.removalPlan(id,name,musicRouting());
  if(engine.capabilities.managed)await engine.release();await planner.release();const result=await library.remove(id,name,musicRouting());models.integrity={};notify();return result;
 },
 async metadata({id,metadata}){for(const k of ['title','artist','album','comment'])if(typeof metadata[k]!=='string'||metadata[k].length>2000)throw Error('Neplatná metadata.');return storage.updateVariant(id,metadata);},
 async preset(p){domain.validateProject(p.project);if(typeof p.name!=='string'||!p.name.trim()||p.name.length>180)throw Error('Neplatný název presetu.');const result=storage.preset({...p,builtin:false});notify();return result;},
 async deletePreset({id}){storage.deletePreset(id);notify();},
 async exportPreset({id}){const p=[...domain.BUILTIN_PRESETS,...storage.presets()].find(x=>x.id===id);if(!p)throw Error('Preset neexistuje.');const file=await fileDialog('save',{defaultPath:p.name+'.hmgpreset.json',filters:[{name:'Preset',extensions:['json']}]});if(file)await fsp.writeFile(file,JSON.stringify({format:'hmg-preset',version:1,...p},null,2),'utf8');return file;},
 async importPreset(){const file=await fileDialog('open',{properties:['openFile'],filters:[{name:'Preset',extensions:['json']}]});if(!file)return null;if((await fsp.stat(file)).size>1024**2)throw Error('Preset je příliš velký.');const p=JSON.parse(await fsp.readFile(file,'utf8'));if(p.format!=='hmg-preset'||p.version!==1)throw Error('Neplatný preset.');return actions.preset({name:p.name,project:p.project});},
 async startEngine(){if(planner.active)throw Error('Právě se připravuje hudební zadání.');return engine.start();},
 async stopEngine(){requireIdle();engine.stop();},
 async prepare({project,force=false}){return prepareProject(project,force);},
 async tokens({project}){domain.validateProject(project);project=domain.generationProject(project);if(!engine.capabilities.tokenize)return {available:false,error:'Tento engine neposkytuje tokenizer.'};try{if(planner.active)throw Error('Nejdříve dokončete přípravu zadání.');await engine.start();return await engine.json('/tokenize',{caption:project.manualCaption??domain.caption(project).enhanced,lyrics:domain.lyricInput(project)});}catch(e){return {available:false,error:e.message};}},
 async generate({project,count=1}){
  if(!settings.licenseAccepted)throw Error('Dokončete úvodního průvodce a přečtěte licenci modelu.');
  requireIdle();domain.validateProject(project);const input=domain.generationProject(project);if(!Number.isInteger(count)||count<1||count>20)throw Error('Počet variant musí být 1–20.');if(!input.concept.trim()&&!input.styles.length&&!input.manualCaption?.trim())throw Error('Popište hudbu, kterou chcete vytvořit.');if(!domain.lyricInput(input).trim()&&(input.autoLyrics===false||input.manualCaption!==null))throw Error('Vložte vlastní text, nebo přepněte na tvorbu ze zadání.');
  await ready({includePlanner:input.manualCaption===null});
  const p=await prepareProject(project);
  if(!p.instrumental&&p.checkLyrics!==false&&!quality.installed()){preparationPhase('Připravuji lokální kontrolu zpěvu');try{await quality.install();}finally{preparationPhase(null);}}
  const props=await engine.start();
  const routing=engine.id==='minimax'?musicRouting():{};if(engine.id==='minimax')for(const k of ['lm','depth','cond','dit','vae'])if(!props.models[k]?.includes(routing[k+'_model']))throw Error('Vybrané modelové komponenty nejsou nainstalované. Otevřete AI modely.');
  const request=domain.buildRequest(p,props.defaults,routing,engine.id);request.backend=engine.id;if(engine.id.startsWith('acestep')){request.backend=engine.id;const plan=domain.caption(p).plan;request.vocal_language=/^[a-z]{2}$/.test(plan.language)?plan.language:'unknown';request.lm_negative_prompt=(plan.exclusions||[]).join(', ');request.bpm=plan.bpm||0;request.timesignature=plan.meter?.split('/')[0]||'';request.keyscale=/^[A-G](?:#|b)? (?:major|minor)$/.test(plan.key)?plan.key:'';}
  if(engine.capabilities.tokenize){const tokens=await engine.json('/tokenize',{caption:request.caption,lyrics:request.lyrics});if(tokens.available&&tokens.count>5000)throw Error(`Hudební plán a text mají ${tokens.count} tokenů; limit je 5 000. Zkraťte zadání. Text se automaticky neořezává.`);}
  return queue.add(p,request,count);
 },
 async rerender({id,technical}){requireIdle();const v=storage.variant(id);if(!engine.capabilities.replay||(v.request.backend||'minimax')!==engine.id)throw Error('Nový render z audio kódů podporuje pouze původní MiniMax engine.');await engine.start();const p=storage.project(v.projectId);const allowed={};for(const k of ['seed','steps','dit_cfg','peak_clip','output_format','mp3_bitrate'])if(k in technical)allowed[k]=technical[k];const snapshot={...v.snapshot,id:p.id,name:v.name,automationMode:'manual',creationMode:'lyrics',durationMode:'manual',duration:v.request.duration??v.snapshot.duration,manualCaption:v.request.caption,technical:{...v.request,...allowed}};const request=domain.buildRequest({...snapshot,lyrics:v.request.lyrics,instrumental:false},engine.props.defaults,musicRouting());request.audio_codes=v.request.audio_codes;request.lm_seed=v.request.lm_seed;return queue.add(snapshot,request,1,'render',id);},
 async cancel({id}){return queue.cancel(id);},
 async retry({id}){requireIdle();const j=storage.jobs().find(x=>x.id===id);if(!j)throw Error('Úloha nenalezena.');if((j.request.backend||'minimax')!==engine.id)throw Error('Zvolte stejný engine jako u původní úlohy.');await engine.start();return queue.add(j.snapshot||storage.project(j.projectId),j.request,1,j.kind,j.sourceId);},
 async importLyrics(){const file=await fileDialog('open',{properties:['openFile'],filters:[{name:'Text UTF-8 / UTF-16',extensions:['txt']}]});if(!file)return null;if((await fsp.stat(file)).size>1024**2)throw Error('Textový soubor je příliš velký.');const b=await fsp.readFile(file);try{const encoding=b[0]===255&&b[1]===254?'utf-16le':b[0]===254&&b[1]===255?'utf-16be':'utf-8';return new TextDecoder(encoding,{fatal:true}).decode(b).replace(/^\uFEFF/,'');}catch{throw Error('Text nemá platné kódování UTF-8 ani UTF-16 s BOM. Uložte jej jako UTF-8, aby zůstala zachována diakritika.');}},
 async exportLyrics({project}){domain.validateProject(project);const file=await fileDialog('save',{defaultPath:project.name+'.txt',filters:[{name:'Text UTF-8',extensions:['txt']}]});if(file)await fsp.writeFile(file,project.lyrics,'utf8');return file;},
 async exportAudio({id,format,metadata}){const v=storage.variant(id);const ext=format.startsWith('wav')?'wav':format;if(!['wav16','wav24','wav32','mp3','flac'].includes(format))throw Error('Neplatný formát.');const file=await fileDialog('save',{defaultPath:path.join(settings.exportPath||app.getPath('music'),(metadata.title||v.name).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.'+ext),filters:[{name:format,extensions:[ext]}]});if(!file)return null;const result=await audio.convert(storage.audioPath(v),file,format,metadata);settings.exportPath=path.dirname(file);saveSettings();storage.updateVariant(id,metadata);return {file,...result};},
 async exportMetadata({id}){const v=storage.variant(id),file=await fileDialog('save',{defaultPath:v.name+'.json',filters:[{name:'Metadata JSON',extensions:['json']}]});if(file)await fsp.writeFile(file,JSON.stringify({...v,aiGenerated:true,model:v.request.backend_model||'MiniMax-Music3'},null,2),'utf8');return file;},
 async exportProject({id}){const p=storage.project(id),file=await fileDialog('save',{defaultPath:p.name+'.hmg',filters:[{name:'Projekt Hellrasher Music Generator',extensions:['hmg']}]});if(file)await archives.exportProject(storage,id,file);return file;},
 async importProject(){const file=await fileDialog('open',{properties:['openFile'],filters:[{name:'Projekt Hellrasher Music Generator',extensions:['hmg']}]});if(!file)return null;return archives.importProject(storage,file,domain.validateProject);},
 async settings(p){if(typeof p.updateChecks==='boolean')settings.updateChecks=p.updateChecks;if(typeof p.autoplay==='boolean')settings.autoplay=p.autoplay;if(typeof p.onboarded==='boolean')settings.onboarded=p.onboarded;if(typeof p.licenseAccepted==='boolean')settings.licenseAccepted=p.licenseAccepted;
  if(p.routingMode!==undefined){requireIdle();if(!['auto','manual'].includes(p.routingMode))throw Error('Neplatný režim modelů.');if(p.routingMode==='manual')settings.routing={...musicRouting()};settings.routingMode=p.routingMode;}
  if(p.routing){requireIdle();for(const k of ['lm_model','depth_model','cond_model','dit_model','vae_model'])if(p.routing[k])models.entry(p.routing[k]);settings.routing={...musicRouting(),...p.routing};settings.routingMode='manual';}
  if(p.planner||p.backend){requireIdle();if(planner.download)throw Error('Nejdříve dokončete stahování plánovače.');
   const nextPlanner={...settings.planner,...p.planner},nextBackend={...settings.backend,...p.backend};
   if(!['local','server','templates'].includes(nextPlanner.mode)||!['auto','cpu'].includes(nextPlanner.acceleration))throw Error('Neplatné nastavení plánovače.');
   nextPlanner.endpoint=localEndpoint(nextPlanner.endpoint);nextBackend.endpoint=localEndpoint(nextBackend.endpoint);
   if(!BACKENDS.some(b=>b.id===nextBackend.id))throw Error('Nepodporovaný hudební engine.');
   for(const c of [nextPlanner,nextBackend])if(typeof c.model!=='string'||c.model.length>200)throw Error('Neplatný název modelu.');
   if(typeof nextPlanner.modelPath!=='string'||nextPlanner.modelPath&&!path.isAbsolute(nextPlanner.modelPath))throw Error('Neplatná cesta k GGUF.');
   if(engine.capabilities.managed)await engine.release();else engine.stop();await planner.release();settings.planner=nextPlanner;settings.backend=nextBackend;configureEngine();
  }
  saveSettings();notify();return settings;
 },
 async folder({kind}){if(!['models','projects','export'].includes(kind))throw Error('Neznámé umístění.');requireIdle();if(models.active||planner.download)throw Error('Nejdříve dokončete stahování.');const folder=await fileDialog('open',{properties:['openDirectory','createDirectory'],title:'Vyberte složku pro '+({models:'modely',projects:'projekty',export:'export'}[kind])});if(!folder)return null;engine.stop();if(kind==='projects')storage.close();settings[kind+'Path']=folder;saveSettings();if(kind==='projects'){storage=new Storage(folder);queue=createQueue();}if(kind==='models'){models.folder=folder;models.integrity={};planner.models=folder;configureEngine();}notify();return folder;},
 async download({names}){requireIdle();engine.stop();models.download(names).catch(e=>{settings.downloadError=e.message;saveSettings();notify();});settings.downloadError=null;return true;},
 async cancelDownload(){models.cancel();},
 async downloadPlanner(){requireIdle();if(engine.capabilities.managed)await engine.release();planner.install().catch(e=>{planner.error=e.message;notify();});return true;},
 async cancelPlannerDownload(){planner.cancelDownload();},
 async plannerModel(){requireIdle();if(planner.download)throw Error('Nejdříve dokončete stahování.');const file=await fileDialog('open',{title:'Vlastní instrukční model GGUF',properties:['openFile'],filters:[{name:'Instrukční jazykový model GGUF',extensions:['gguf']}]});if(!file)return null;await planner.release();settings.planner={...settings.planner,mode:'local',modelPath:file,model:path.basename(file)};saveSettings();notify();return file;},
 async verify({name}){return models.verify(name);},
 async removeModel({name}){return actions.removeModelPackage({id:'minimax',name});},
 async license(){return fsp.readFile(path.join(RES,'legal','MiniMax-Music3-LICENSE.txt'),'utf8');},
 async diagnostics(){const file=await fileDialog('save',{defaultPath:'hmg-diagnostika.txt'});if(file)await fsp.writeFile(file,JSON.stringify({engine:engine.snapshot(),gpu:hardware,platform:process.versions,ram:{total:os.totalmem(),free:os.freemem()}},null,2),'utf8');return file;}
};
if(primaryInstance)app.whenReady().then(async()=>{
 domain=await import('./domain.mjs');const user=process.env.HMG_DATA_PATH||app.getPath('userData');fs.mkdirSync(user,{recursive:true});if(process.env.HMG_DATA_PATH)app.setPath('userData',user);
 settingsFile=path.join(user,'settings.json');const loaded=loadSettings({user,root:ROOT,packaged:app.isPackaged,manifestPath:path.join(RES,app.isPackaged?'model-manifest':'models','upstream.json')});settings=loaded.settings;
 if(loaded.recovered){const backup=settingsFile+'.before-model-path-recovery';if(!fs.existsSync(backup))fs.copyFileSync(settingsFile,backup);}
 saveSettings();configure();
 protocol.handle('hmg-audio',async request=>{try{const id=new URL(request.url).hostname;if(!/^[\w-]+$/.test(id))throw Error();const v=storage.variant(id);return electronNet.fetch(pathToFileURL(storage.audioPath(v)).toString(),{headers:request.headers});}catch{return new Response('Audio nebylo nalezeno',{status:404});}});
 const serial=new Set(['generate','prepare','rerender','retry','checkVariant','settings','folder','download','downloadPlanner','plannerModel','removeModel','startEngine','stopEngine','tokens','selectBackend','installModelPackage','removeModelPackage','trashVariants','restoreVariants','purgeVariants','renameVariant']);
 ipcMain.handle('hmg:call',async(event,action,payload)=>{if(!win||event.sender!==win.webContents||!Object.hasOwn(actions,action))throw Error('Nepovolená operace.');const locked=serial.has(action);if(locked&&modelAction)throw Error('Právě probíhá příprava nebo změna modelu. Počkejte na dokončení.');if(locked)modelAction=true;try{return await actions[action](payload);}finally{if(locked)modelAction=false;}});
 win=new BrowserWindow({width:1580,height:1020,minWidth:1080,minHeight:760,title:'Hellrasher Music Generator',backgroundColor:'#10151c',icon:path.join(ROOT,'dist','brand.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 win.removeMenu();win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());win.webContents.session.setPermissionRequestHandler((_wc,_p,cb)=>cb(false));
 win.webContents.on('render-process-gone',()=>{queue.stop();});
 await win.loadFile(path.join(ROOT,'dist','index.html'));
 hardware=await gpu();notify();if(settings.updateChecks!==false){const check=setTimeout(()=>updater.check(),3500);check.unref();}const monitor=setInterval(async()=>{hardware=await gpu();notify();},3000);monitor.unref();
 win.on('close',()=>{closing=true;quality.cancel();quality.cancelDownload();updater.cancel();modelInstall?.engine?.cancelDownload();engine.cancelDownload?.();models.cancel();planner.cancelDownload();planner.stop();queue.stop();});
 if(process.env.HMG_UI_TEST)win.webContents.openDevTools({mode:'detach'});
}).catch(e=>{dialog.showErrorBox('Hellrasher Music Generator',e.stack||e.message);app.quit();});
app.on('window-all-closed',()=>app.quit());app.on('before-quit',()=>{if(!closing){quality?.cancel();quality?.cancelDownload();modelInstall?.engine?.cancelDownload();engine?.cancelDownload?.();models?.cancel();planner?.cancelDownload();planner?.stop();queue?.stop();}try{storage?.close();}catch{}});

