'use strict';
const path=require('node:path');const {execFile,spawn}=require('node:child_process');const {promisify}=require('node:util');const run=promisify(execFile);
const {PcmMeasurements}=require('./audio-quality.cjs');
class Audio{
 constructor(folder){this.folder=folder;}
 async probe(file){const {stdout}=await run(path.join(this.folder,'ffprobe.exe'),['-v','error','-show_format','-show_streams','-of','json',file],{windowsHide:true,timeout:30000,maxBuffer:4*1024*1024});const p=JSON.parse(stdout),s=p.streams.find(x=>x.codec_type==='audio');if(!s)throw Error('Soubor nemá zvukovou stopu.');return {duration:Number(p.format.duration||s.duration),sampleRate:Number(s.sample_rate),channels:s.channels,codec:s.codec_name,bits:Number(s.bits_per_raw_sample||s.bits_per_sample)||null,bytes:Number(p.format.size)};}
 async waveform(file){const {stdout}=await run(path.join(this.folder,'ffmpeg.exe'),['-v','error','-nostdin','-i',file,'-map','0:a:0','-ac','2','-ar','4000','-f','f32le','pipe:1'],{windowsHide:true,timeout:120000,maxBuffer:24*1024*1024,encoding:'buffer'});const count=Math.floor(stdout.length/4);if(!count)throw Error('Audio neobsahuje vzorky pro waveform.');const bins=720,step=Math.ceil(count/bins);return Array.from({length:bins},(_,i)=>{let peak=0;for(let j=i*step;j<Math.min((i+1)*step,count);j++){const x=stdout.readFloatLE(j*4);if(Number.isFinite(x))peak=Math.max(peak,Math.abs(x));}return peak;});}
 async measure(file,info,{signal}={}){
  if(!Number.isFinite(info.sampleRate)||info.sampleRate<8000||info.sampleRate>192000||!Number.isInteger(info.channels)||info.channels<1||info.channels>8||info.duration>1800)throw Error('Audio má nepodporovaný rozsah pro kontrolu.');
  const meter=new PcmMeasurements(info.sampleRate,info.channels);
  return new Promise((resolve,reject)=>{
   const proc=spawn(path.join(this.folder,'ffmpeg.exe'),['-v','error','-nostdin','-i',file,'-map','0:a:0','-ac',String(info.channels),'-ar',String(info.sampleRate),'-c:a','pcm_f32le','-f','f32le','pipe:1'],{windowsHide:true,signal});let error='';
   const timer=setTimeout(()=>{proc.kill();reject(Error('Kontrola audia překročila časový limit.'));},120000);
   proc.stdout.on('data',chunk=>meter.push(chunk));proc.stderr.on('data',chunk=>{error=(error+chunk.toString()).slice(-2000);});proc.once('error',e=>{clearTimeout(timer);reject(e);});proc.once('close',code=>{clearTimeout(timer);if(code!==0)reject(Error('Audio nelze celé dekódovat: '+error));else resolve(meter.result());});
  });
 }
 async speechInput(input,output,{signal}={}){await run(path.join(this.folder,'ffmpeg.exe'),['-v','error','-nostdin','-y','-i',input,'-map','0:a:0','-ac','1','-ar','16000','-c:a','pcm_s16le',output],{windowsHide:true,timeout:120000,maxBuffer:1024*1024,signal});}
 async convert(input,output,format,metadata={}){
  const formats={wav16:['-c:a','pcm_s16le'],wav24:['-c:a','pcm_s24le'],wav32:['-c:a','pcm_f32le'],mp3:['-c:a','libmp3lame','-b:a','320k'],flac:['-c:a','flac','-sample_fmt','s32']};
  if(!formats[format])throw Error('Nepodporovaný export.');
  const args=['-v','error','-nostdin','-y','-i',input,'-map','0:a:0',...formats[format]];
  for(const k of ['title','artist','album','comment'])if(metadata[k])args.push('-metadata',`${k}=${String(metadata[k]).slice(0,2000)}`);
  args.push(output);await run(path.join(this.folder,'ffmpeg.exe'),args,{windowsHide:true,timeout:300000,maxBuffer:4*1024*1024});return this.probe(output);
 }
}
module.exports={Audio};
