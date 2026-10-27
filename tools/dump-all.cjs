/* Expands the seed sources and writes canon JSON per record plus bundled collection files. */
const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'), src=path.join(root,'src'), canon=path.join(root,'canon');
const code=['02-seed-a.js','03-seed-girls.js','04-seed-couples.js']
  .map(f=>fs.readFileSync(path.join(src,f),'utf8')).join('\n').replace('<script>','');
const sb={};
new Function('sb', code+'\nfor(const k of ["HOUSES","ARCS","SYSTEMS","ROOMS","DEEP","STUB_EXTRA","STUB_ROWS","COUPLES","COUPLE_EXTRA","COUPLE_ROWS","CHANGES","QUESTIONS"]){try{sb[k]=eval(k)}catch(e){}}')(sb);

/* girls: deep records, then expand the compact rows, then apply the extras */
const girls=(sb.DEEP||[]).slice();
for(const r of (sb.STUB_ROWS||[])){
  const [id,full,short,titles,partner,arc,house,coreBuild,fillBuild,height,meas,cock,flight,prof,essence]=r;
  const fl=(flight&&flight!=="—")?flight:null;
  girls.push({id,kind:"girl",depth:"stub",state:"current",house,full,short,sort:full.split(" ")[0],
    titles:String(titles||"").split(" · ").filter(Boolean),partner,arcAdopted:arc,
    arcIntroduced:arc,profession:prof,essence,
    survivor: fl?{y:true,state:"survivor",flight:fl.split(" · ")[0],id:(fl.split(" · ")[1]||null)}:{y:false,state:"civilian"},
    body:{coreBuild,fillBuild,height,measurements:meas}, cock:{specs:cock},
    hair:{},mind:{},narrative:{},tags:[],seeAlso:[house],open:[]});
}
for(const [k,x] of Object.entries(sb.STUB_EXTRA||{})){
  const g=girls.find(g=>g.id===k); if(!g) continue;
  const y=Object.assign({},x), bodyPatch=y.bodyPatch, mindPatch=y.mindPatch;
  delete y.bodyPatch; delete y.mindPatch;
  Object.assign(g,y);
  if(bodyPatch) Object.assign(g.body||(g.body={}),bodyPatch);
  if(mindPatch) Object.assign(g.mind||(g.mind={}),mindPatch);
}
for(const g of girls){
  if(g && g.survivorState){
    g.survivor=Object.assign({y:g.survivorState==="survivor",state:g.survivorState}, g.survivor||{});
    delete g.survivorState;
  }
}

/* couples: same shape */
const couples=(sb.COUPLES||[]).slice();
for(const r of (sb.COUPLE_ROWS||[])){
  const [id,name,tag,a,b,house,arcMet,status,core,colorCode,position,aftercare,origin,architecture]=r;
  couples.push({id,kind:"couple",depth:"stub",state:"current",house,name,tag,a,b,arcMet,
    status:{pre9:"",arc9:"",arc12:status},core,colorCode,position,aftercare,origin,architecture,
    rituals:[],conflicts:"",home:"",tells:"",open:[]});
}
for(const [k,x] of Object.entries(sb.COUPLE_EXTRA||{})){
  const c=couples.find(c=>c.id===k); if(!c) continue;
  Object.assign(c,x);
}

const sets={girls,couples,
  houses:sb.HOUSES||[], rooms:sb.ROOMS||[], systems:sb.SYSTEMS||[],
  arcs:(sb.ARCS||[]), changes:sb.CHANGES||[], questions:sb.QUESTIONS||[]};

let total=0;
for(const [coll,arr] of Object.entries(sets)){
  const dir=path.join(canon,coll);
  fs.mkdirSync(dir,{recursive:true});
  for(const f of fs.readdirSync(dir)) if(f.endsWith('.json')) fs.unlinkSync(path.join(dir,f));
  for(const rec of arr){
    fs.writeFileSync(path.join(dir,String(rec.id)+'.json'), JSON.stringify(rec,null,2));
    total++;
  }
  fs.writeFileSync(path.join(canon,coll+'.json'), JSON.stringify(arr,null,1));
}
console.log('canon documents: '+total);
for(const [coll,arr] of Object.entries(sets)) console.log('  '+coll.padEnd(10)+' '+arr.length);
