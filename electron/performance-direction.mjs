import {positiveBrief} from './style-guide.mjs';
export function performanceDirection(project,analysis,intent){
 const text=positiveBrief(project.concept),hasChorus=analysis.sections.some(s=>s.type==='Chorus');
 const mode=project.instrumental?(/ambient|drone|meditation/.test(text)&&!/melod|motif|theme/.test(text)?'texture':'instrumental'):intent.rap?'rhythmic':'sung';
 const melodyEnabled=project.melodicWriting!==false,expressionEnabled=project.emotionalPerformance!==false;
 const melody=mode==='texture'?'Retain a recognizable evolving texture with subtle returns; preserve the requested stillness and form.':mode==='rhythmic'?'Give the flow a recognizable rhythmic phrase with deliberate accents, rests and returning cadence. Preserve explicitly sung hooks.':mode==='instrumental'?'Give the requested lead instrument a recognizable short motif, an answering phrase and coherent returns with small variations.':`Build a distinctive singable motif with a clear rise or fall, an answering phrase and breathing space.${hasChorus?' Let the chorus return to that same hook; develop its final return without replacing the tune.':' Develop the motif within the supplied form.'}`;
 const expression=mode==='texture'?'Shape subtle changes of timbre, register and harmonic tension in the requested mood.':mode==='rhythmic'?'Shape the delivery with accent, timing, breath and purposeful pauses, matching the requested mood and groove.':`Shape phrases through restrained and more intense delivery, breath, harmonic tension and release in the requested mood.${hasChorus?' Create audible contrast between verse and chorus, then let the final return carry the emotional peak appropriate to that mood.':' Give the supplied form a coherent expressive arc and natural ending.'}`;
 return {mode,hasChorus,melodyEnabled,expressionEnabled,melody:melodyEnabled?melody:'',expression:expressionEnabled?expression:'',precedence:'Explicit creator instructions, genre, vocal form, restraint and exclusions always win. Do not add sung sections, words, instruments, belting or a triumphant mood by default.'};
}
export function performanceConflicts(direction,draft){
 const errors=[];
 if(direction.melodyEnabled&&draft.melody&&(!/motif|hook|theme|phrase|flow|cadence|texture/i.test(draft.melody)||!/ris|ascend|fall|descend|step|leap|return|recur|repeat|answer|sustain|breath|rest|paus|evolv|vary|variat/i.test(draft.melody)))errors.push('melody must describe a concrete motif or rhythmic/textural identity and how it returns, varies or forms a phrase; adjectives alone are insufficient');
 if(direction.expressionEnabled&&draft.expression&&!/breath|paus|dynamic|tension|release|restrain|intimat|soft|swell|build|contrast|accent|timing|register|timbre|articul|crescendo|quiet|intens/i.test(draft.expression))errors.push('expression must describe audible phrase delivery or a dynamic/tension arc in the requested mood');
 return errors;
}
