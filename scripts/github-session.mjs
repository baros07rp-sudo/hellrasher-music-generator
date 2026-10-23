// Credentials stay in Git Credential Manager and process memory; never print them.
import {execFileSync} from 'node:child_process';
export const repository='baros07rp-sudo/hellrasher-music-generator';
export async function githubSession(){
 let credential;try{credential=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',windowsHide:true,env:{...process.env,GCM_INTERACTIVE:'never'},stdio:['pipe','pipe','pipe']});}catch{throw Error('Git Credential Manager nemá dostupné přihlášení ke GitHubu.');}
 const token=credential.split(/\r?\n/).find(l=>l.startsWith('password='))?.slice(9);if(!token)throw Error('Přihlášení ke GitHubu není dostupné.');
 const request=async(route,options={})=>{if(!route.startsWith('/'))throw Error('Invalid GitHub API path.');const response=await fetch('https://api.github.com'+route,{...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10',Authorization:'Bearer '+token,...options.headers},signal:AbortSignal.timeout(60000)});if(!response.ok&&response.status!==404)throw Error('GitHub API HTTP '+response.status);return {response,data:response.status===204?null:await response.json()};};
 const {data:user}=await request('/user');if(user.login!=='baros07rp-sudo')throw Error('Přihlášený GitHub účet neodpovídá vybranému účtu.');return {request,token};
}
