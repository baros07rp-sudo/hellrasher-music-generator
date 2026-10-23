import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import os from'node:os';import path from'node:path';import{createRequire}from'node:module';
const require=createRequire(import.meta.url),{loadSettings}=require('../electron/settings.cjs');

test('Installed model location recovers a saved empty default without changing projects or consent',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hmg-settings-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const user=path.join(root,'user'),prepared=path.join(root,'prepared models'),manifestPath=path.join(root,'manifest.json');fs.mkdirSync(user);fs.mkdirSync(prepared);
 const options={user,root,packaged:true,manifestPath};const defaults=loadSettings(options).settings;
 const siblings=Object.values(defaults.routing).map(rfilename=>({rfilename,size:3}));fs.writeFileSync(manifestPath,JSON.stringify({siblings}));for(const e of siblings)fs.writeFileSync(path.join(prepared,e.rfilename),'abc');
 const ini=`\uFEFF[models]\r\npath=${prepared}\r\ndownload=0\r\n`;fs.writeFileSync(path.join(user,'first-install.ini'),ini,'utf16le');
 const fresh=loadSettings(options);assert.equal(fresh.settings.modelsPath,prepared);assert.equal(fresh.settings.offerDownload,false);assert.equal(fresh.settings.licenseAccepted,false);
 const original={...defaults,onboarded:true,licenseAccepted:true,projectsPath:path.join(root,'my music'),autoplay:true};fs.writeFileSync(path.join(user,'settings.json'),JSON.stringify(original));
 const recovered=loadSettings(options);assert.equal(recovered.recovered,true);assert.equal(recovered.settings.modelsPath,prepared);assert.equal(recovered.settings.projectsPath,original.projectsPath);assert.equal(recovered.settings.licenseAccepted,true);assert.equal(recovered.settings.autoplay,true);assert.deepEqual(recovered.settings.routing,original.routing);
 fs.writeFileSync(path.join(user,'settings.json'),JSON.stringify({...original,modelsPath:path.join(root,'custom')}));assert.equal(loadSettings(options).recovered,false);
 fs.writeFileSync(path.join(user,'settings.json'),JSON.stringify(original));fs.mkdirSync(defaults.modelsPath);for(const e of siblings)fs.writeFileSync(path.join(defaults.modelsPath,e.rfilename),'abc');assert.equal(loadSettings(options).recovered,false);
 fs.unlinkSync(path.join(defaults.modelsPath,siblings[0].rfilename));fs.writeFileSync(path.join(prepared,siblings[0].rfilename),'incomplete');assert.equal(loadSettings(options).recovered,false);
});
