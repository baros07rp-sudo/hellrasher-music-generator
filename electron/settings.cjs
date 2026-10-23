'use strict';
const fs=require('node:fs');
const path=require('node:path');

function installerSettings(user){
 try{
  const bytes=fs.readFileSync(path.join(user,'first-install.ini'));
  const ini=bytes.toString(bytes[0]===255&&bytes[1]===254?'utf16le':'utf8').replace(/^\uFEFF/,'');
  const selected=ini.match(/^path=(.+)$/m)?.[1]?.trim();
  return {modelsPath:selected&&path.isAbsolute(selected)?selected:null,offerDownload:!/^download=0\s*$/m.test(ini)};
 }catch{return {};}
}

function completeModelSet(folder,routing,manifestPath){
 try{
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8').replace(/^\uFEFF/,''));
  return ['lm_model','depth_model','dit_model','cond_model','vae_model'].every(key=>{
   const name=routing[key],entry=manifest.siblings.find(e=>e.rfilename===name);
   if(!entry||path.basename(name)!==name)return false;
   const stat=fs.statSync(path.join(folder,name));
   return stat.isFile()&&stat.size===entry.size;
  });
 }catch{return false;}
}

function loadSettings({user,root,packaged,manifestPath}){
 const prefix='MiniMax-Music3-',defaultModels=path.join(user,'Models');
 const defaults={projectsPath:path.join(user,'Projects'),modelsPath:!packaged&&fs.existsSync(path.join(root,'models'))?path.join(root,'models'):defaultModels,onboarded:false,licenseAccepted:false,autoplay:false,routing:{lm_model:prefix+'language_model-Q8_0.gguf',depth_model:prefix+'rvq_depth_decoder-Q8_0.gguf',dit_model:prefix+'transformer-Q8_0.gguf',cond_model:prefix+'condition_encoder-F32.gguf',vae_model:prefix+'vocoder-F32.gguf'}};
 const install=installerSettings(user);let saved;
 try{saved=JSON.parse(fs.readFileSync(path.join(user,'settings.json'),'utf8').replace(/^\uFEFF/,''));}catch{}
 const settings={...defaults,routingMode:'auto',...(saved||{}),routing:{...defaults.routing,...saved?.routing},backend:{id:'minimax',endpoint:'http://127.0.0.1:8001',model:'',...saved?.backend},planner:{mode:'local',acceleration:'auto',endpoint:'http://127.0.0.1:1234',model:'',modelPath:'',...saved?.planner}};
 if(!saved){if(install.modelsPath)settings.modelsPath=install.modelsPath;if('offerDownload'in install)settings.offerDownload=install.offerDownload;}
 // An earlier launch could save the empty default before the installer supplied
 // the real model folder. Recover only that default; keep custom folders intact.
 const recovered=!!saved&&path.resolve(settings.modelsPath)===path.resolve(defaultModels)&&!!install.modelsPath&&path.resolve(install.modelsPath)!==path.resolve(defaultModels)&&!completeModelSet(defaultModels,settings.routing,manifestPath)&&completeModelSet(install.modelsPath,settings.routing,manifestPath);
 if(recovered){settings.modelsPath=install.modelsPath;settings.downloadError=null;}
 return {settings,recovered};
}

module.exports={loadSettings,installerSettings,completeModelSet};
