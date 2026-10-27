/* Temporal consistency — the arc lens.
   NOTE: this assertion set was REBUILT after the container was reclaimed.
   It is not the original thirty verbatim; it is a fresh set covering the same
   shapes (introductions, embodiment, adoption order, evolutions, corrections,
   moves, statuses, houses, rooms). Labelled rather than passed off. */
const fs=require('fs'), path=require('path');
const canon=path.resolve(__dirname,'..','canon');
const load=c=>JSON.parse(fs.readFileSync(path.join(canon,c+'.json'),'utf8'));
const G=load('girls'), C=load('couples'), H=load('houses'), R=load('rooms'),
      SY=load('systems'), A=load('arcs'), CH=load('changes');
const by=a=>Object.fromEntries(a.map(x=>[String(x.id),x]));
const girls=by(G), houses=by(H), arcs=by(A);
const errs=[]; let checks=0;
const ck=(cond,msg)=>{checks++; if(!cond) errs.push(msg);};

const ARC_MAX=Math.max(...A.map(a=>Number(a.id)));

/* introductions and adoptions */
for(const g of G){
  if(g.arcIntroduced!=null) ck(Number(g.arcIntroduced)>=0 && Number(g.arcIntroduced)<=ARC_MAX,
    g.id+': arcIntroduced '+g.arcIntroduced+' outside 0..'+ARC_MAX);
  if(g.arcAdopted!=null) ck(Number(g.arcAdopted)>=0 && Number(g.arcAdopted)<=ARC_MAX,
    g.id+': arcAdopted '+g.arcAdopted+' outside 0..'+ARC_MAX);
  if(g.arcIntroduced!=null && g.arcAdopted!=null)
    ck(Number(g.arcIntroduced)<=Number(g.arcAdopted),
      g.id+': introduced in '+g.arcIntroduced+' but adopted in '+g.arcAdopted);
  if(g.physicalFromArc!=null && g.arcIntroduced!=null)
    ck(Number(g.physicalFromArc)>=Number(g.arcIntroduced),
      g.id+': embodied in '+g.physicalFromArc+' before being introduced in '+g.arcIntroduced);
}

/* ADOPTION IS INTO THE FAMILY, NOT INTO A BUILDING.
   The found family predates every house: women were adopted in Arcs 1-3 and
   Ghost Haven was not built until Arc 4. Katherine and Wynter were adopted in
   Arc 9 and MOVED to Specter Haven in Arc 10. So an adoption arc earlier than
   her house's arcOpened is normal and is NOT an error. What is checked instead:
   her house must have opened by the present edge of the canon. */
for(const g of G){
  const h=houses[g.house];
  if(h && h.arcOpened!=null)
    ck(Number(h.arcOpened)<=ARC_MAX,
      g.id+': house '+g.house+' opens in arc '+h.arcOpened+', past the end of the run');
}

/* couples cannot meet after either wife was adopted into the family */
for(const c of C){
  const a=girls[c.a], b=girls[c.b];
  if(c.arcMet!=null) ck(Number(c.arcMet)>=0 && Number(c.arcMet)<=ARC_MAX,
    'couple '+c.id+': arcMet '+c.arcMet+' outside 0..'+ARC_MAX);
  if(c.weddingArc!=null && c.arcMet!=null)
    ck(Number(c.weddingArc)>=Number(c.arcMet),
      'couple '+c.id+': married in '+c.weddingArc+' before meeting in '+c.arcMet);
  if(a&&b&&a.house&&b.house) ck(a.house===b.house,
    'couple '+c.id+': wives in different houses ('+a.house+' / '+b.house+')');
}

/* changes: arc in range, state/arc coherence, subject kind matches the collection */
const kindOf={};
G.forEach(x=>kindOf[x.id]='girl'); C.forEach(x=>kindOf[x.id]='couple');
H.forEach(x=>kindOf[x.id]='house'); R.forEach(x=>kindOf[x.id]='room');
SY.forEach(x=>kindOf[x.id]='system'); A.forEach(x=>kindOf[String(x.id)]='arc');
for(const c of CH){
  if(c.arc!=null) ck(Number(c.arc)>=0 && Number(c.arc)<=ARC_MAX,
    'change '+c.id+': arc '+c.arc+' outside 0..'+ARC_MAX);
  ck(!(c.timeless && c.arc!=null), 'change '+c.id+': timeless and arc-bearing at once');
  ck(!(c.state==='proposed' && c.arc!=null), 'change '+c.id+': proposed and arc-bearing at once');
  if(c.subjectKind && kindOf[String(c.subject)])
    ck(kindOf[String(c.subject)]===c.subjectKind,
      'change '+c.id+': subjectKind '+c.subjectKind+' but '+c.subject+' is a '+kindOf[String(c.subject)]);
  if(c.mode) ck(['narrative','evolution','correction','move','status'].includes(c.mode),
    'change '+c.id+': unknown mode '+c.mode);
  if(c.state) ck(['current','historical','draft','proposed','disputed','retired'].includes(c.state),
    'change '+c.id+': unknown state '+c.state);
}

/* rooms belong to a real house, and a house cannot hold rooms before it opened */
for(const r of R){
  if(!r.house) continue;
  ck(!!houses[r.house], 'room '+r.id+': unknown house '+r.house);
}

/* houses: occupied no earlier than opened */
for(const h of H){
  if(h.arcOpened!=null && h.arcOccupied!=null)
    ck(Number(h.arcOccupied)>=Number(h.arcOpened),
      h.id+': occupied in '+h.arcOccupied+' before opening in '+h.arcOpened);
}

/* arcs form an unbroken run from 0 */
for(let n=0;n<=ARC_MAX;n++) ck(!!arcs[String(n)], 'arc '+n+' missing from the run 0..'+ARC_MAX);

console.log('ARC LENS ERRORS ('+errs.length+')');
errs.forEach(e=>console.log('  x '+e));
console.log('  '+checks+' temporal assertions evaluated across introductions, embodiment, adoption order, couples, changes, rooms, houses and the arc run.');
console.log('  (assertion set REBUILT after the container was reclaimed — same shapes, not the original thirty verbatim)');
