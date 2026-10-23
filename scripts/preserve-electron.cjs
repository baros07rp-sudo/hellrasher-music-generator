'use strict';
const fs=require('node:fs/promises');const path=require('node:path');const{createHash}=require('node:crypto');
module.exports=async context=>{
 if(context.electronPlatformName!=='win32')throw Error('This distribution targets Windows only.');
 const root=context.packager.projectDir,manifest=JSON.parse(await fs.readFile(path.join(root,'resources/electron-runtime.json'),'utf8'));
 const source=path.join(root,'node_modules/electron/dist/electron.exe'),target=path.join(context.appOutDir,'Hellrasher Music Generator.exe');
 const original=await fs.readFile(source),digest=createHash('sha256').update(original).digest('hex');
 if(digest!==manifest.sha256)throw Error('The Electron runtime differs from the pinned distribution. Verify the runtime before updating its manifest.');
 const uninstall=JSON.parse((await fs.readFile(path.join(root,'resources/installer/manifest.json'),'utf8')).replace(/^\uFEFF/,'')),pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 if(pkg.version!==uninstall.version||createHash('sha256').update(await fs.readFile(path.join(root,'resources/installer',uninstall.file))).digest('hex')!==uninstall.sha256)throw Error('Regenerate and verify the matching uninstaller before changing the product version.');
 // Keep the upstream executable unchanged. Application assets, the window title
 // and the shortcut icon are packaged separately; Windows policies stay intact.
 await fs.copyFile(source,target);
 console.log('Preserved original Electron runtime: '+digest);
};
