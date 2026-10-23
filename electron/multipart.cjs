'use strict';
function parseMultipart(buffer,contentType,defaultReplay=null){
 const boundary=contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)?.slice(1).find(Boolean);
 if(!boundary||boundary.length>200)throw Error('Backend nevrátil platný multipart boundary.');
 const marker=Buffer.from('--'+boundary), sep=Buffer.from('\r\n\r\n'), parts=[];
 let pos=buffer.indexOf(marker);
 while(pos>=0){
  let start=pos+marker.length;
  if(buffer.subarray(start,start+2).toString()==='--')break;
  if(buffer.subarray(start,start+2).toString()!=='\r\n')throw Error('Poškozená multipart hlavička.');
  start+=2;const headEnd=buffer.indexOf(sep,start);if(headEnd<0||headEnd-start>8192)throw Error('Chybí multipart hlavička.');
  const next=buffer.indexOf(Buffer.from('\r\n--'+boundary),headEnd+4);if(next<0)throw Error('Neúplný výsledek generování.');
  const headers=buffer.subarray(start,headEnd).toString('utf8');
  parts.push({type:headers.match(/Content-Type:\s*([^\r\n]+)/i)?.[1]?.trim(),data:buffer.subarray(headEnd+4,next)});
  pos=next+2;
 }
 const tracks=[];let replay=defaultReplay;
 for(const part of parts){
  if(part.type==='application/json')replay=JSON.parse(part.data.toString('utf8'));
  else if(part.type==='audio/wav'||part.type==='audio/mpeg'){
   if(!replay?.audio_codes&&!replay?.semantic_tokens)throw Error('Chybí replay audio_codes nebo semantic_tokens.');
   tracks.push({replay,audio:part.data,extension:part.type==='audio/wav'?'wav':'mp3'});replay=defaultReplay;
  }
 }
 if(!tracks.length)throw Error('Výsledek neobsahuje audio.');
 return tracks;
}
module.exports={parseMultipart};
