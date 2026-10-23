export interface Project {
 id?:string;name:string;description:string;created?:string;modified?:string;archived?:boolean;
 styles:{name:string;weight:string}[];concept:string;bpm:number;key:string;scale:string;meter:string;mood:string;energy:string;groove:string;production:string;space:string;scenario:string;bass:string;percussion:string;textures:string;
 voice:string;voiceCustom:string;timbres:string[];performance:string;vocalInstructions:string;effects:string[];
 instruments:{name:string;role?:string;character?:string;section?:string;solo?:boolean;evolution?:string}[];
 lyrics:string;instrumental:boolean;autoLyrics?:boolean;automationMode?:'auto'|'manual';creationMode?:'idea'|'lyrics';ownLyricsDraft?:string;autoLyricsDraft?:string;autoLyricsOrigin?:any;sections:{type:string;label?:string;direction:string}[];duration:number;durationMode?:'auto'|'manual';lyricLanguage?:string;emotionalPerformance?:boolean;melodicWriting?:boolean;qualityProfile?:'studio'|'reference';generationPlan?:any;lyricsOrigin?:any;
 technical:Record<string,any>;manualCaption:string|null;advanced:boolean;closedPanels:string[];tags:string[];
}
export interface Variant {id:string;projectId:string;name:string;created:string;favorite:boolean;deletedAt?:string;backend?:string;technical:{duration:number;sampleRate:number;channels:number;codec:string;bits:number|null;bytes:number};request:Record<string,any>;snapshot:Project;elapsedMs:number;metadata:{title:string;artist:string;album:string;comment:string};kind:string;}
declare global {interface Window{hmg:{call:(action:string,payload?:any)=>Promise<any>;onChange:(callback:()=>void)=>()=>void;};}}
