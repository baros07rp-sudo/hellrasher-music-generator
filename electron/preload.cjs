const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('hmg',{
 call:(action,payload)=>ipcRenderer.invoke('hmg:call',action,payload),
 onChange:(callback)=>{const listener=()=>callback();ipcRenderer.on('hmg:change',listener);return ()=>ipcRenderer.removeListener('hmg:change',listener);}
});
