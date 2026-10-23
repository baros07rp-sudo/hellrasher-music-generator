'use strict';
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');const path=require('node:path');const {randomUUID}=require('node:crypto');
class Storage{
 constructor(root){
  this.root=path.resolve(root);fs.mkdirSync(this.root,{recursive:true});
  this.db=new DatabaseSync(path.join(this.root,'library.sqlite'));
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,created TEXT NOT NULL,modified TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0,payload TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS variants(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),created TEXT NOT NULL,name TEXT NOT NULL,favorite INTEGER NOT NULL DEFAULT 0,payload TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),created TEXT NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS presets(id TEXT PRIMARY KEY,name TEXT NOT NULL,payload TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS lyrics_history(id INTEGER PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),created TEXT NOT NULL,lyrics TEXT NOT NULL);`);
  if(!this.db.prepare('PRAGMA table_info(variants)').all().some(c=>c.name==='deleted_at'))this.db.exec('ALTER TABLE variants ADD COLUMN deleted_at TEXT');
  this.db.prepare("UPDATE jobs SET status='interrupted' WHERE status IN ('running','queued')").run();
  for(const row of this.db.prepare('SELECT id,payload FROM variants').all()){const v=JSON.parse(row.payload);if(v.quality?.status==='pending'){v.quality={...v.quality,status:'unavailable',message:'Kontrolu přerušilo ukončení aplikace. Můžete ji spustit znovu.'};this.db.prepare('UPDATE variants SET payload=? WHERE id=?').run(JSON.stringify(v),row.id);}}
 }
 saveProject(p){
  const id=p.id||randomUUID(),now=new Date().toISOString(),previous=this.db.prepare('SELECT * FROM projects WHERE id=?').get(id);
  const value={...p,id,created:previous?.created||now,modified:now};
  this.db.exec('BEGIN IMMEDIATE');try{
   this.db.prepare('INSERT INTO projects(id,name,created,modified,archived,payload) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,modified=excluded.modified,payload=excluded.payload').run(id,p.name,value.created,now,0,JSON.stringify(value));
   if(previous&&JSON.parse(previous.payload).lyrics!==p.lyrics)this.db.prepare('INSERT INTO lyrics_history(project_id,created,lyrics) VALUES(?,?,?)').run(id,now,JSON.parse(previous.payload).lyrics);
   this.db.exec('COMMIT');
  }catch(e){this.db.exec('ROLLBACK');throw e;}
  return value;
 }
 projects(){return this.db.prepare('SELECT * FROM projects ORDER BY modified DESC').all().map(x=>({...JSON.parse(x.payload),archived:!!x.archived}));}
 project(id){const x=this.db.prepare('SELECT payload FROM projects WHERE id=?').get(id);if(!x)throw Error('Projekt nebyl nalezen.');return JSON.parse(x.payload);}
 archive(id,archived){this.project(id);this.db.prepare('UPDATE projects SET archived=? WHERE id=?').run(archived?1:0,id);}
 variants(projectId,trash=false){const where=['deleted_at IS '+(trash?'NOT NULL':'NULL')];if(projectId)where.push('project_id=?');const rows=this.db.prepare('SELECT * FROM variants WHERE '+where.join(' AND ')+' ORDER BY created DESC').all(...(projectId?[projectId]:[]));return rows.map(x=>({...JSON.parse(x.payload),favorite:!!x.favorite,...(x.deleted_at?{deletedAt:x.deleted_at}:{})}));}
 variant(id,includeTrash=false){const x=this.db.prepare('SELECT * FROM variants WHERE id=?').get(id);if(!x)throw Error('Skladba nebyla nalezena.');if(x.deleted_at&&!includeTrash)throw Error('Skladba je v koši. Nejprve ji obnovte.');return {...JSON.parse(x.payload),favorite:!!x.favorite,...(x.deleted_at?{deletedAt:x.deleted_at}:{})};}
 addVariant(v){this.db.prepare('INSERT INTO variants(id,project_id,created,name,favorite,payload) VALUES(?,?,?,?,?,?)').run(v.id,v.projectId,v.created,v.name,0,JSON.stringify(v));return v;}
 setQuality(id,quality){const v={...this.variant(id),quality};this.db.prepare('UPDATE variants SET payload=? WHERE id=?').run(JSON.stringify(v),id);return v;}
 variantIds(ids){if(!Array.isArray(ids)||!ids.length||ids.length>200||ids.some(id=>typeof id!=='string'||!id))throw Error('Vyberte 1–200 skladeb.');return [...new Set(ids)];}
 trashVariants(ids,restore=false){ids=this.variantIds(ids);for(const id of ids)this.variant(id,true);const deleted=restore?null:new Date().toISOString();this.db.exec('BEGIN IMMEDIATE');try{for(const id of ids)this.db.prepare('UPDATE variants SET deleted_at=? WHERE id=?').run(deleted,id);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}return {ids};}
 renameVariant(id,name){if(typeof name!=='string'||!name.trim()||name.trim().length>180)throw Error('Název skladby musí mít 1–180 znaků.');const v=this.variant(id);v.name=name.trim();v.metadata={...v.metadata,title:v.name};this.db.prepare('UPDATE variants SET name=?,payload=? WHERE id=?').run(v.name,JSON.stringify(v),id);return v;}
 purgeVariants(ids){
  ids=this.variantIds(ids);const tracks=ids.map(id=>this.variant(id,true));if(tracks.some(v=>!v.deletedAt))throw Error('Natrvalo lze odstranit jen skladby z koše.');
  const other=this.db.prepare('SELECT id,payload FROM variants').all().filter(r=>!ids.includes(r.id)).map(r=>JSON.parse(r.payload));
  const root=fs.realpathSync(this.root),files=new Map();
  for(const v of tracks)for(const key of ['audio','replay']){if(!v[key])continue;const file=this.audioPath({audio:v[key]});if(other.some(o=>[o.audio,o.replay].filter(Boolean).some(p=>path.resolve(this.root,p)===file)))continue;
   let stat;try{stat=fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}
   if(!stat.isFile()||stat.isSymbolicLink()||!fs.realpathSync(file).startsWith(root+path.sep))throw Error('Soubor skladby vede mimo knihovnu.');files.set(file,stat.size);
  }
  const staging=path.join(this.root,'.purge-'+randomUUID()),moved=[];fs.mkdirSync(staging);this.db.exec('BEGIN IMMEDIATE');
  try{for(const [file,bytes]of files){const temp=path.join(staging,randomUUID());fs.renameSync(file,temp);moved.push({file,temp,bytes});}for(const id of ids)this.db.prepare('DELETE FROM variants WHERE id=?').run(id);this.db.exec('COMMIT');}
  catch(e){this.db.exec('ROLLBACK');for(const item of moved.reverse())fs.renameSync(item.temp,item.file);fs.rmdirSync(staging);throw e;}
  let freedBytes=0,pendingFiles=0;for(const item of moved){try{fs.unlinkSync(item.temp);freedBytes+=item.bytes;}catch{pendingFiles++;}}if(!pendingFiles)fs.rmdirSync(staging);return {ids,freedBytes,pendingFiles};
 }
 updateVariant(id,metadata){const v={...this.variant(id),metadata};this.db.prepare('UPDATE variants SET payload=? WHERE id=?').run(JSON.stringify(v),id);return v;}
 favorite(id,value){this.variant(id);this.db.prepare('UPDATE variants SET favorite=? WHERE id=?').run(value?1:0,id);}
 job(j){this.db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,payload=excluded.payload').run(j.id,j.projectId,j.created,j.status,JSON.stringify(j));return j;}
 jobs(){return this.db.prepare('SELECT * FROM jobs ORDER BY created DESC LIMIT 200').all().map(x=>({...JSON.parse(x.payload),status:x.status}));}
 presets(){return this.db.prepare('SELECT * FROM presets ORDER BY name').all().map(x=>JSON.parse(x.payload));}
 preset(p){const v={...p,id:p.id?.startsWith('builtin-')?randomUUID():p.id||randomUUID()};this.db.prepare('INSERT INTO presets VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,payload=excluded.payload').run(v.id,v.name,JSON.stringify(v));return v;}
 deletePreset(id){this.db.prepare('DELETE FROM presets WHERE id=?').run(id);}
 history(id){return this.db.prepare('SELECT * FROM lyrics_history WHERE project_id=? ORDER BY id DESC LIMIT 100').all(id);}
 trackDir(projectId){this.project(projectId);if(!/^[\w-]+$/.test(projectId))throw Error('Neplatné ID.');const dir=path.join(this.root,'audio',projectId);fs.mkdirSync(dir,{recursive:true});return dir;}
 audioPath(v){const p=path.resolve(this.root,v.audio);if(!p.startsWith(this.root+path.sep))throw Error('Neplatná cesta audia.');return p;}
 close(){this.db.close();}
}
module.exports={Storage};
