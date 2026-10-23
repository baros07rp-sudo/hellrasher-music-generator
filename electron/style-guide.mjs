// Musical reference cues, never replacements for the creator's explicit controls.
// See docs/GENRE_TUNING.cs.md for sources and the limits of text conditioning.
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function positiveBrief(text){
 return normalize(text).replace(/\b(?:no|not|without|avoid|never|bez|zadn[aeiy]?)\b[^.;!\n]*?(?=\b(?:but|with|ale|s)\b|[.;!\n]|$)/g,' ');
}
export function explicitExclusions(project){
 const text=normalize(project.concept),clauses=[...text.matchAll(/\b(?:no|not|without|avoid|never|bez|zadn[aeiy]?)\b([^.;!\n]*?)(?=\b(?:but|with|ale|s)\b|[.;!\n]|$)/g)].map(m=>m[1]).join('; '),out=[];
 // Only grounded, recognized exclusions enter a negative conditioning channel.
 // Free-form exclusions still remain in the creator brief and musical caption.
 const add=(re,label)=>{if(re.test(clauses))out.push(label);};
 add(/\bgrowl\w*|\bvrce\w*/,'growling vocals');
 add(/\bpop[ -]?(?:style )?(?:runs|vocal runs)|popov\w*\s+(?:beh|koloratur)/,'pop-style vocal runs');
 add(/cheerful harmony|vesel\w*\s+harmon/,'cheerful harmony');
 add(/\bpop\b(?![ -]?(?:style )?(?:runs|vocal|singing|phrasing|delivery))|popov\w*\s+hudb/,'pop music');
 const metal=clauses.match(/\b(?:(death|black|heavy|power|symphonic|gothic|nu|folk)\s+)?metal(?:u|oveho|ovych)?\b/);if(metal)out.push(metal[1]?metal[1]+' metal':'metal music');
 add(/\bdisco|\bdisko|\bdiskotek/,'disco music');
 add(/\brap\b|rapovan/,'rap vocals');
 if(clauses.split(/[,;]/).some(c=>/^\s*(?:(?:no|not|without|bez)\s+)?(?:all\s+)?(?:singing|vocals|voices|zpev\w*)\s*$/.test(c)))out.push('singing voices');
 // A distorted-guitar exclusion must not suppress the clean disco guitar.
 if(/(?:guitar|kytar)/.test(clauses)){if(/(?:distort|heavy|zkreslen)/.test(clauses))out.push('distorted electric guitars');else if(/acoustic|akustick/.test(clauses))out.push('acoustic guitar');else out.push('guitar sounds');}
 return [...new Set(out)];
}
const families=[
 ['metal',/\b(?:metal(?:core|ov\w*)?|heavy metal|ghotic metal)\b/,'Metal','Distorted electric guitar riffs, electric bass and a physical acoustic drum kit carry the heavy band passages. Define the actual riff articulation, kick/snare pattern and contrast between tight muted attacks and ringing chords. Orchestral layers support that band foundation when requested.'],
 ['disco',/\b(?:nu[ -]?disco|disco|disko\w*|diskotek\w*)\b/,'Disco','A steady four-on-the-floor kick, offbeat hi-hat, snare or clap backbeat, syncopated melodic bass and clipped rhythmic chord stabs establish the dance groove. Distinguish retro live-band disco from electronic nu-disco according to the brief.'],
 ['house',/\b(?:deep house|house|houseov\w*)\b/,'House','An even club kick pulse, offbeat hats and a looping syncopated bass groove form the foundation. Build and release energy through subtraction, filtering and layers while retaining the requested house pulse.'],
 ['techno',/\b(?:techno|technov\w*)\b/,'Techno','A persistent electronic kick and tightly repeated percussive or synthetic motif drive the piece. Evolve timbre, density and tension over the pulse; use only the requested vocal form.'],
 ['trance',/\btrance\b/,'Trance','A steady dance kick supports a repeating arpeggiated synth figure, sustained harmonic tension and spacious melodic development. Shape the breakdown and return around the requested form.'],
 ['drum-and-bass',/\b(?:drum\s*(?:and|&)\s*bass|dnb)\b/,'Drum and bass','Fast broken drum patterns, syncopated snares and a deep articulated bass line define the groove. Maintain the breakbeat identity during melodic and vocal passages.'],
 ['electronic',/\b(?:edm|electronic|elektronick\w*|hardstyle|dubstep)\b/,'Electronic','Specify the requested electronic drum pattern, bass synthesis and lead sound. Preserve the named subgenre and its groove through builds and changes in density.'],
 ['jazz',/\b(?:jazz\w*|swing|bebop|bossa nova)\b/,'Jazz','An articulated rhythm section, harmonic voice leading and conversational instrumental phrasing define the ensemble. Use swing only when requested or appropriate to the named subgenre; preserve acoustic or electronic constraints.'],
 ['hip-hop',/\b(?:hip[ -]?hop|rap|trap|drill|boom bap)\b/,'Hip-hop','The drum pocket, bass and rhythmic vocal phrasing carry the identity. Distinguish rapped delivery from sung hooks; retain the requested flow and avoid imposing a sung pop chorus on rap.'],
 ['rock',/\b(?:rock\w*|punk\w*|post[ -]?hardcore)\b/,'Rock','A guitar and bass rhythm section with a live drum backbeat carries the arrangement. Describe the requested guitar attack, groove and verse/chorus contrast within the named rock subgenre.'],
 ['funk',/\bfunk\w*\b/,'Funk','Interlocking syncopated bass, short rhythmic guitar or keyboard accents and a tight drum pocket create the groove. Leave rhythmic gaps and let the lead phrases converse with the band.'],
 ['soul',/\b(?:soul|r&b|rnb|gospel)\b/,'Soul / R&B','Expressive vocal phrasing, harmonic voice leading and an intentional rhythm-section pocket carry the song. Use the requested classic or modern instrumentation and preserve space for the lead.'],
 ['folk',/\b(?:folk\w*|lidov\w*|celtic|keltsk\w*)\b/,'Folk','Acoustic instrumental attack, a clear narrative melody and breathing space between phrases anchor the song. Preserve the requested regional instruments and dance or ballad rhythm.'],
 ['country',/\b(?:country|americana|bluegrass)\b/,'Country','The requested acoustic or electric string ensemble supports a clear narrative vocal and a defined country rhythm. Retain the named subgenre instead of adding unrelated pop production.'],
 ['reggae',/\b(?:reggae|ska|dub|dancehall)\b/,'Reggae','Define the offbeat chord articulation, bass pocket and drum accent appropriate to the requested reggae, ska, dub or dancehall style.'],
 ['latin',/\b(?:latin|salsa|bachata|reggaeton|samba)\b/,'Latin','Use the specific requested Latin rhythm and its percussion pattern. Describe the interplay between bass, harmonic accompaniment and vocal phrases without replacing it with a generic dance beat.'],
 ['classical',/\b(?:classical|klasick\w*|baroque|barok\w*|opera|komorni|chamber)\b/,'Classical','Instrumental voice leading, thematic development and acoustic ensemble dynamics shape the form. Follow the named period, ensemble and vocal form.'],
 ['orchestral',/\b(?:orchestral|orchestralni|film score|trailer music)\b/,'Orchestral','Develop a recurring motif through orchestral register, voicing and changes of instrumental density. Keep requested acoustic orchestral timbres and dynamic transitions audible.'],
 ['ambient',/\b(?:ambient\w*|drone|meditation|meditac\w*)\b/,'Ambient','Sustained evolving timbres and gradual harmonic or textural movement carry the form. Do not invent a drum groove or sung chorus when they are absent from the brief.'],
 ['pop',/\b(?:pop|popov\w*|k[ -]?pop|j[ -]?pop)\b/,'Pop','A recognizable melodic hook and coherent verse/chorus phrasing sit over the requested rhythm and production palette. Preserve the named pop subgenre and emotional character.']
];
export function styleIdentity(project){
 const selected=project.styles?.map(s=>s.name).filter(Boolean)||[];
 const text=selected.length?normalize(selected.join('. ')):positiveBrief(project.concept);
 const hits=families.flatMap(([id,re,label,cues])=>{const match=text.match(re);return match?[{id,label,cues,index:match.index}]:[];}).sort((a,b)=>a.index-b.index);
 // A metal subgenre is not a rock fusion merely because its description mentions a rock kit.
 if(hits.some(x=>x.id==='metal')){const i=hits.findIndex(x=>x.id==='rock');if(i>=0&&!/\b(?:metal\s*(?:\/|\+|and|with)\s*rock|rock\s*(?:\/|\+|and|with)\s*metal)\b/.test(text))hits.splice(i,1);}
 const labels=selected.length?selected:hits.map(x=>x.label);
 if(!selected.length&&hits.some(x=>x.id==='metal')){
  const index=hits.findIndex(x=>x.id==='metal');
  labels[index]=/symphon|symfon/.test(text)&&/gothic|ghotic|gotick/.test(text)?'Symphonic gothic metal':/symphon|symfon/.test(text)?'Symphonic metal':/gothic|ghotic|gotick/.test(text)?'Gothic metal':/power metal/.test(text)?'Power metal':/heavy metal/.test(text)?'Heavy metal':'Metal';
 }
 return {genres:labels,families:hits.map(({index,...x})=>x),positive:text};
}
export function styleReference(project){
 const identity=styleIdentity(project);
 return {families:identity.families.map(x=>x.id),guidance:identity.families.slice(0,2).map(x=>x.cues),precedence:'These are optional style reference cues, not new user requirements. Explicit instrumentation exclusions, tempo, meter, vocal configuration and local section instructions always win. Give the primary genre the rhythmic and instrumental foundation; use secondary styles only in their requested roles.'};
}
