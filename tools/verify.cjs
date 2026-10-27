/* Referential integrity across the seed sources. */
const fs=require('fs'), path=require('path');
const canon=path.resolve(__dirname,'..','canon');
const load=c=>JSON.parse(fs.readFileSync(path.join(canon,c+'.json'),'utf8'));
const G=load('girls'), C=load('couples'), H=load('houses'), R=load('rooms'),
      SY=load('systems'), A=load('arcs'), CH=load('changes'), Q=load('questions');
const errs=[], warns=[];

const girls={}; for(const g of G) girls[g.id]=g;
const couples={}; for(const c of C) couples[c.id]=c;

const all={};
for(const i of Object.keys(girls)) all[i]='girl';
for(const i of Object.keys(couples)) all[i]='couple';
H.forEach(h=>all[h.id]='house');
SY.forEach(s=>all[s.id]='system');
R.forEach(r=>all[r.id]='room');
A.forEach(a=>all[String(a.id)]='arc');
CH.forEach(c=>all[c.id]='change');

for(const g of G){
  if(!g.partner) continue;
  if(!girls[g.partner]) errs.push('DANGLING partner '+g.id+' -> '+g.partner);
  else if(girls[g.partner].partner !== g.id) errs.push('NON-RECIPROCAL '+g.id+' <-> '+g.partner);
}
for(const c of C){
  if(!girls[c.a]) errs.push('couple '+c.id+' dangling a='+c.a);
  if(!girls[c.b]) errs.push('couple '+c.id+' dangling b='+c.b);
  if(girls[c.a] && girls[c.a].partner !== c.b) errs.push('couple '+c.id+': '+c.a+' partner is '+girls[c.a].partner);
}
const inCouple={};
C.forEach(c=>{inCouple[c.a]=(inCouple[c.a]||0)+1; inCouple[c.b]=(inCouple[c.b]||0)+1;});
for(const id of Object.keys(girls)){
  if(!inCouple[id]){ if(girls[id].partner) errs.push('girl has a partner but no couple record: '+id);
                     else warns.push('no pairing recorded: '+id); }
  else if(inCouple[id]>1) errs.push('girl in '+inCouple[id]+' couples: '+id);
}
for(const c of CH){
  if(!all[String(c.subject)]) errs.push('change '+c.id+' subject unresolved: '+c.subject);
  (c.links||[]).forEach(l=>{ if(!all[String(l)]) errs.push('change '+c.id+' link unresolved: '+l); });
  if(c.state==='proposed' && c.arc!=null && c.arc!==undefined)
    errs.push('change '+c.id+' is proposed but carries arc '+c.arc);
  if(c.timeless && c.arc!=null && c.arc!==undefined)
    errs.push('change '+c.id+' is timeless but carries arc '+c.arc);
}
for(const q of Q) if(!all[String(q.subject)]) errs.push('question '+q.id+' subject unresolved: '+q.subject);
for(const g of G) (g.seeAlso||[]).forEach(x=>{ if(!all[String(x)]) errs.push('girl '+g.id+' seeAlso unresolved: '+x); });
for(const s of SY) (s.seeAlso||[]).forEach(x=>{ if(!all[String(x)]) errs.push('system '+s.id+' seeAlso unresolved: '+x); });
for(const r of R) (r.seeAlso||[]).forEach(x=>{ if(!all[String(x)]) errs.push('room '+r.id+' seeAlso unresolved: '+x); });

console.log('girls '+G.length+' couples '+C.length+' rooms '+R.length+' systems '+SY.length+' changes '+CH.length+' questions '+Q.length);
console.log('\nERRORS ('+errs.length+')'); errs.forEach(e=>console.log('  x '+e));
console.log('\nWARNINGS ('+warns.length+')'); warns.forEach(w=>console.log('  ! '+w));
