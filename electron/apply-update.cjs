'use strict';
// Standalone helper: runs in the existing Electron runtime's Node mode.
process.noAsar=true; // Treat app.asar as an ordinary file while copying it.
const fs=require('node:fs'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto'),{spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms)),hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function inside(root,relative){
 if(typeof relative!=='string'||!relative.startsWith('resources/')||relative.includes('\\')||relative.includes(':')||relative.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Invalid update path');
 const result=path.resolve(root,...relative.split('/'));if(!result.startsWith(root+path.sep))throw Error('Update path leaves application folder');
 for(let cursor=result;cursor.length>root.length;cursor=path.dirname(cursor)){try{if(fs.lstatSync(cursor).isSymbolicLink())throw Error('Update path contains a symbolic link or junction');}catch(e){if(e.code!=='ENOENT')throw e;}}return result;
}
async function apply(options){
 const appRoot=fs.realpathSync(options.installRoot),stageRoot=fs.realpathSync(options.stage),manifest=JSON.parse(fs.readFileSync(path.join(stageRoot,'update-manifest.json'),'utf8')),folder=path.dirname(stageRoot),log=path.join(folder,'apply.log'),backup=path.join(folder,'rollback-'+randomUUID()),changed=[];
 try{
  if(manifest.format!=='hellrasher-update'||manifest.platform!=='win32-x64'||manifest.runtimeSHA256!==options.runtimeSHA)throw Error('Invalid update manifest');
  const exe=path.join(appRoot,'Hellrasher Music Generator.exe');if(hash(exe)!==options.runtimeSHA)throw Error('Application runtime does not match update');
  const files=manifest.files.map(file=>{const source=inside(stageRoot,file.path),target=inside(appRoot,file.path);if(fs.statSync(source).size!==file.bytes||hash(source)!==file.sha256)throw Error('Staged file verification failed');return {...file,source,target};});
  if(options.parentId){const end=Date.now()+60000;while(true){try{process.kill(options.parentId,0);}catch(e){if(e.code==='ESRCH')break;throw e;}if(Date.now()>end)throw Error('Application did not close');await delay(250);}}
  fs.mkdirSync(backup);
  for(const file of files){
   const existed=fs.existsSync(file.target),saved=inside(backup,file.path);if(existed){fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(file.target,saved);}changed.push({target:file.target,saved,existed});fs.mkdirSync(path.dirname(file.target),{recursive:true});
   const temp=file.target+'.update-'+randomUUID();for(let n=0;n<10;n++){try{fs.copyFileSync(file.source,temp);fs.renameSync(temp,file.target);break;}catch(e){if(n===9)throw e;await delay(500);}}
  }
  fs.writeFileSync(log,'Update applied successfully\n','utf8');
  if(!options.noLaunch){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const child=spawn(exe,[],{cwd:appRoot,env,detached:true,windowsHide:false,stdio:'ignore'});child.unref();}
  return {applied:true};
 }catch(e){for(const item of changed.reverse()){try{if(item.existed)fs.copyFileSync(item.saved,item.target);else if(fs.existsSync(item.target))fs.unlinkSync(item.target);}catch{}}fs.writeFileSync(log,'Update failed: '+e.message+'\n','utf8');throw e;}
}
if(require.main===module)apply(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))).catch(()=>process.exitCode=1);
module.exports={apply,inside};
