'use strict';
const prefix='MiniMax-Music3-';
function qualityRouting(entries,gpu={}){
 const total=gpu?.total||16384,full=total>=30000,low=total<14000;
 const desired={lm_model:'language_model-'+(full?'BF16':low?'Q5_K_M':'Q8_0')+'.gguf',depth_model:'rvq_depth_decoder-'+(full?'BF16':'Q8_0')+'.gguf',dit_model:'transformer-'+(full?'F32':'Q8_0')+'.gguf',cond_model:'condition_encoder-F32.gguf',vae_model:'vocoder-F32.gguf'};
 for(const key of Object.keys(desired)){const name=prefix+desired[key];if(!entries.some(e=>e.name===name))throw Error('Kvalitní profil nemá dostupnou komponentu: '+name);desired[key]=name;}
 return desired;
}
function routingWarnings(routing,gpu={}){
 if((gpu?.total||0)>0&&gpu.total<24000&&/BF16/.test(routing.lm_model||''))return ['MiniMax LM BF16 s pracovní pamětí přesahuje možnosti této GPU. Pro běžnou tvorbu použijte automatický profil Q8.'];return [];
}
module.exports={qualityRouting,routingWarnings};
