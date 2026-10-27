/* Silent-overwrite scanner. Catches the two ways these sources quietly discard data:
     A) two records sharing an id inside one collection
     B) two keys of the same name inside one object literal (JS keeps the LAST) */
const fs=require('fs'), path=require('path');
const src=path.join(__dirname,'..','src');
const files=['02-seed-a.js','03-seed-girls.js','04-seed-couples.js'];
let problems=0;

const code=files.map(f=>fs.readFileSync(path.join(src,f),'utf8')).join('\n').replace('<script>','');
const sb={};
new Function('sb', code+'\nfor(const k of ["DEEP","STUB_ROWS","HOUSES","ARCS","SYSTEMS","ROOMS","CHANGES","QUESTIONS","COUPLES","COUPLE_ROWS"]){try{sb[k]=eval(k)}catch(e){}}')(sb);
const lists={
  girls:[...(sb.DEEP||[]).map(g=>g.id), ...(sb.STUB_ROWS||[]).map(r=>r[0])],
  couples:[...(sb.COUPLES||[]).map(c=>c.id), ...(sb.COUPLE_ROWS||[]).map(r=>r[0])],
  systems:(sb.SYSTEMS||[]).map(x=>x.id), rooms:(sb.ROOMS||[]).map(x=>x.id),
  arcs:(sb.ARCS||[]).map(x=>String(x.id)), changes:(sb.CHANGES||[]).map(x=>x.id),
  questions:(sb.QUESTIONS||[]).map(x=>x.id), houses:(sb.HOUSES||[]).map(x=>x.id),
};
for(const [coll,ids] of Object.entries(lists)){
  const seen=new Set(), dup=new Set();
  for(const i of ids){ if(seen.has(i)) dup.add(i); seen.add(i); }
  if(dup.size){ problems+=dup.size; console.log('DUPLICATE IDS · '+coll+' · '+[...dup].join(', ')); }
}

for(const f of files){
  const lines=fs.readFileSync(path.join(src,f),'utf8').split('\n');
  let entry=null, keys=null, openedAt=0;
  const entryNames=new Map();
  for(let n=0;n<lines.length;n++){
    const L=lines[n];
    const open=/^ {0,4}(?:\{\s*id:"([^"]+)"|"([^"]+)"\s*:\s*\{)/.exec(L);
    if(open){
      const name=open[1]||open[2];
      if(entryNames.has(name)){ problems++; console.log('DUPLICATE ENTRY · '+f+' · "'+name+'" opens again at line '+(n+1)+', first at line '+entryNames.get(name)+' — the LATER one wins and the earlier record is DISCARDED'); }
      else entryNames.set(name, n+1);
      entry=name; keys=new Map(); openedAt=n+1;
      const inline=[...L.slice(open[0].length).matchAll(/(?:^|[{,]\s*)("?)([A-Za-z_$][\w$]*)\1\s*:/g)];
      for(const m of inline) keys.set(m[2], n+1);
      continue;
    }
    if(/^\s{0,4}[}\]];?\s*$/.test(L)){ entry=null; keys=null; continue; }
    if(!entry) continue;
    const m=/^\s{4,}("?)([A-Za-z_$][\w$]*)\1\s*:/.exec(L);
    if(!m) continue;
    const k=m[2];
    if(keys.has(k)){ problems++; console.log('DUPLICATE KEY · '+f+' · entry "'+entry+'" (opens line '+openedAt+') · key "'+k+'" at line '+(n+1)+', first at line '+keys.get(k)+' — the LATER one wins'); }
    else keys.set(k, n+1);
  }
}
console.log(problems? '\nPROBLEMS: '+problems : '\nClean — no silent overwrites.');
