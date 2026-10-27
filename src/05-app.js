/* =================== EXPANSION =================== */

function expandGirls(){
  const out = DEEP.slice();
  for(const r of STUB_ROWS){
    const [id,full,short,titles,partner,arc,house,coreBuild,fillBuild,height,meas,cock,flight,prof,essence] = r;
    const fl = (flight && flight !== "—") ? flight : null;
    out.push({
      id, kind:"girl", depth:"stub", state:"current", house,
      full, short, sort:full.split(" ")[0],
      titles: (titles && titles !== "—") ? titles.split(" · ") : [],
      partner: partner || null, coupleId:null,
      arcAdopted: arc, profession: prof, essence,
      status:{pre9:"", arc9:"", arc12:""},
      survivor: fl ? {y:true, state:"survivor", flight:fl.split(" · ")[0], id:(fl.split(" · ")[1]||"")}
                   : {y:false, state:"unrecorded", flight:null, id:null},
      body:{ coreBuild, fillBuild, height, measurements: meas },
      cock:{ specs: cock },
      hair:{}, mind:{}, narrative:{}, tags:[], seeAlso:[house], open:[]
    });
  }
  /* overrides carry fields the compact tuple has no slot for */
  if(typeof STUB_EXTRA !== "undefined"){
    for(const g of out){
      const x = STUB_EXTRA[g.id];
      if(x){
        const y=Object.assign({},x); const bodyPatch=y.bodyPatch, mindPatch=y.mindPatch;
        delete y.bodyPatch; delete y.mindPatch;
        Object.assign(g,y);
        if(bodyPatch) Object.assign(g.body||(g.body={}),bodyPatch);
        if(mindPatch) Object.assign(g.mind||(g.mind={}),mindPatch);
      }
      /* survivorState patches the survivor object rather than sitting beside it */
      if(g.survivorState){
        g.survivor = g.survivor || {y:false, state:"unrecorded", flight:null, id:null};
        g.survivor.state = g.survivorState;
        g.survivor.y = (g.survivorState === "survivor");
        delete g.survivorState;
      }
      if(g.arcIntroduced==null) g.arcIntroduced=g.arcAdopted;
    }
  }
  /* Specter Haven was built in Arc 10 with Arianna and Lili. The other
     residents have no recorded adoption arc — 12 is a placeholder, and
     every one of those datings says so on the page. */
  return out;
}

function expandCouples(){
  const out = COUPLES.slice();
  for(const r of COUPLE_ROWS){
    const [id,name,tag,a,b,house,arcMet,st12,core,colorCode,position,aftercare] = r;
    if(!a) continue;
    out.push({
      id, kind:"couple", depth:"stub", state:"current", house,
      name, tag, a, b, arcMet,
      status:{pre9:"", arc9:"", arc12:st12},
      core: core||"", colorCode: colorCode||"", position: position||"", aftercare: aftercare||"",
      origin:"", architecture:"", rituals:[], conflicts:[], home:"", tells:"", open:[]
    });
  }
  if(typeof COUPLE_EXTRA !== "undefined"){
    for(const c of out){ const x = COUPLE_EXTRA[c.id]; if(x) Object.assign(c, x); }
  }
  return out;
}

/* =================== STATE =================== */

const S = { girls:{}, couples:{}, houses:{}, rooms:{}, systems:{}, arcs:{}, changes:{}, questions:{}, images:{} };
/* structural collections first: an interrupted seed still leaves a navigable archive */
const COLLS = ["houses","arcs","systems","rooms","couples","changes","questions","girls","images"];
let DB = null, DBLIVE = false, MODE = "read", DIRTY = {};
let LENS = 14;

try{ const v = localStorage.getItem("gla.lens"); if(v!==null) LENS = Math.max(0,Math.min(14,parseInt(v,10))); }catch(e){}

function seedInto(){
  for(const g of expandGirls()) S.girls[g.id]=g;
  for(const c of expandCouples()) S.couples[c.id]=c;
  for(const h of HOUSES) S.houses[h.id]=h;
  for(const r of ROOMS) S.rooms[r.id]=r;
  for(const s of SYSTEMS) S.systems[s.id]=s;
  for(const a of ARCS) S.arcs[a.id]=a;
  for(const c of CHANGES) S.changes[c.id]=c;
  for(const q of QUESTIONS) S.questions[q.id]=q;
  /* wire couple ids back onto girls */
  for(const c of Object.values(S.couples)){
    if(S.girls[c.a]) S.girls[c.a].coupleId = c.id;
    if(S.girls[c.b]) S.girls[c.b].coupleId = c.id;
  }
}
seedInto();

/* =================== UTILITIES =================== */

const esc = s => String(s==null?"":s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const el = (h) => { const d=document.createElement("div"); d.innerHTML=h.trim(); return d.firstElementChild; };
const $ = s => document.querySelector(s);
const view = () => $("#view");

function getPath(o,p){ return p.split(".").reduce((a,k)=> (a==null?a:a[k]), o); }
function setPath(o,p,v){ const ks=p.split("."); let c=o; for(let i=0;i<ks.length-1;i++){ if(typeof c[ks[i]]!=="object"||c[ks[i]]===null) c[ks[i]]={}; c=c[ks[i]]; } c[ks[ks.length-1]]=v; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }

function arcName(n){ const a=S.arcs[String(n)]; return a?a.name:"—"; }
function girl(id){ return S.girls[id]; }
function nameOf(id){
  return (S.girls[id]&&S.girls[id].short) || (S.couples[id]&&S.couples[id].name) ||
         (S.houses[id]&&S.houses[id].name) || (S.systems[id]&&S.systems[id].name) ||
         (S.rooms[id]&&S.rooms[id].name) || (S.arcs[id]?("Arc "+id+" — "+S.arcs[id].name):null) ||
         (S.changes[id]&&S.changes[id].label) || id;
}
function routeOf(id){
  if(S.girls[id]) return "#/girl/"+id;
  if(S.couples[id]) return "#/couple/"+id;
  if(S.houses[id]) return "#/house/"+id;
  if(S.systems[id]) return "#/system/"+id;
  if(S.rooms[id]) return "#/house/"+S.rooms[id].house+"#room-"+id;
  if(S.arcs[id]) return "#/arc/"+id;
  /* a change links to the record it was filed against */
  if(S.changes[id]) return routeOf(S.changes[id].subject);
  return "#/";
}

/* changes that bear on a subject */
function changesFor(id){
  return Object.values(S.changes).filter(c=>c.subject===id)
    .sort((a,b)=>(a.arc==null?99:a.arc)-(b.arc==null?99:b.arc));
}
/* resolve a document as of the current lens */
function resolve(doc){
  if(!doc) return {doc, applied:[], pending:[]};
  const cs = changesFor(doc.id);
  const out = clone(doc); const applied=[], pending=[];
  const byPath={};
  for(const c of cs){
    if(c.state==="proposed" || c.state==="retired"){ pending.push(c); continue; }
    if(c.arc==null && !c.timeless){ pending.push(c); continue; }
    const mode=c.timeless?"correction":(c.mode||(c.path?"evolution":"narrative"));
    if(c.timeless || mode==="correction" || c.arc<=LENS) applied.push(c); else pending.push(c);
    if(c.path) (byPath[c.path]=byPath[c.path]||[]).push(c);
  }
  for(const [path, pathChanges] of Object.entries(byPath)){
    const live=pathChanges.filter(c=>c.state!=="proposed"&&c.state!=="retired"&&(c.arc!=null||c.timeless));
    const corrections=live.filter(c=>c.timeless||(c.mode||"evolution")==="correction");
    if(corrections.length){
      const c=corrections[corrections.length-1];
      try{ setPath(out,path,clone(c.to)); }catch(e){}
      continue;
    }
    const evolutions=live.filter(c=>!c.timeless&&(c.mode||"evolution")!=="narrative");
    if(!evolutions.length) continue;
    const effective=evolutions.filter(c=>c.arc<=LENS);
    const value=effective.length?effective[effective.length-1].to:evolutions[0].from;
    try{ setPath(out,path,clone(value)); }catch(e){}
  }
  return {doc:out, applied, pending, all:cs};
}
function statusAt(st){
  if(!st) return "";
  if(typeof st==="string") return st;
  let value=st.pre9||"";
  Object.keys(st).filter(k=>/^arc\d+$/.test(k)).map(k=>[Number(k.slice(3)),st[k]])
    .sort((a,b)=>a[0]-b[0]).forEach(([arc,v])=>{ if(arc<=LENS&&v) value=v; });
  return value;
}
function statusLabel(){ return "at Arc "+LENS; }
function introArc(g){ return g.arcIntroduced!=null?g.arcIntroduced:g.arcAdopted; }
function inStoryYet(g){ return introArc(g)==null || introArc(g)<=LENS; }
function houseExists(h){ return h.arcOpened==null || h.arcOpened<=LENS; }
function roomExists(r,h){ const a=r.arcOpened!=null?r.arcOpened:(h&&h.arcOpened); return a==null||a<=LENS; }
function houseLabelAt(id){
  const h=S.houses[id]; if(!h) return esc(id||"—");
  if(!houseExists(h)) return "Found Family — before "+esc(h.name);
  if(h.arcOccupied!=null&&h.arcOccupied>LENS) return "Found Family — apartment era";
  return '<a class="chip house '+esc(id)+'" href="#/house/'+esc(id)+'">'+esc(h.name)+'</a>';
}

function toast(msg, bad){
  const t = el('<div class="toast'+(bad?" bad":"")+'">'+esc(msg)+'</div>');
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2600);
}

/* =================== DATABASE =================== */

function setDbState(kind, txt){
  const n = $("#dbstate"); if(!n) return;
  n.className = "dbstate "+kind;
  n.querySelector(".txt").textContent = txt;
}

async function connectDb(){
  let db=null;
  try{ db = await claude.use("db"); }catch(e){ db=null; }
  if(!db){ setDbState("local","local copy · edits not saved"); return; }
  DB = db;
  try{
    const meta = await DB.doc("meta/archive").get();
    const existing = {};
    for(const c of COLLS){
      try{
        const snap = await DB.collection(c).limit(1000).get();
        existing[c] = {};
        snap.docs.forEach(d=>{ existing[c][d.id] = d.data(); });
      }catch(e){ existing[c]={}; }
    }
    /* One path, always resumable: write only what is missing, never overwrite an
       edit. A seed interrupted by a closed tab simply finishes on the next open. */
    const have = COLLS.reduce((n,c)=>n+Object.keys(existing[c]).length,0);
    if(have < 100) setDbState("local","seeding the archive…");
    const added = await topUp(existing);
    for(const c of COLLS){ for(const [id,d] of Object.entries(existing[c])) S[c][id]=d; }
    relink();
    setDbState("live", added ? ("live · "+added+" record"+(added>1?"s":"")+" written") : "live · saving to the archive");
    DBLIVE = true;
    subscribe();
    render();
  }catch(e){
    console.warn("db init", e);
    setDbState("local","local copy · edits not saved");
  }
}

async function writeMany(pairs){
  const q = pairs.slice(); let done=0;
  async function worker(){
    while(q.length){
      const [path,body] = q.shift();
      for(let attempt=0; attempt<3; attempt++){
        try{ await DB.doc(path).set(body); done++; break; }
        catch(e){
          if(e && (e.code==="resource_exhausted"||e.code==="unavailable")){
            await new Promise(r=>setTimeout(r, 400+Math.random()*900*(attempt+1)));
          } else { console.warn("write failed", path, e); break; }
        }
      }
    }
  }
  await Promise.all([worker(),worker(),worker(),worker()]);
  return done;
}

async function topUp(existing){
  const pairs=[];
  for(const c of COLLS){
    for(const [id,d] of Object.entries(S[c])){
      if(!existing[c][id]){ pairs.push([c+"/"+id, d]); existing[c][id]=d; }
    }
  }
  const n = pairs.length ? await writeMany(pairs) : 0;
  try{ await DB.doc("meta/archive").set({seedVersion:SEED_VERSION, lastTopUp:new Date().toISOString(),
    complete:(n===pairs.length), title:"The Ghostlight Archive"}); }catch(e){}
  return n;
}

function relink(){
  for(const g of Object.values(S.girls)) g.coupleId = null;
  for(const c of Object.values(S.couples)){
    if(S.girls[c.a]) S.girls[c.a].coupleId = c.id;
    if(S.girls[c.b]) S.girls[c.b].coupleId = c.id;
  }
}

let subs=[];
function subscribe(){
  subs.forEach(u=>{try{u()}catch(e){}});
  subs = COLLS.map(c => DB.collection(c).limit(1000).onSnapshot(snap=>{
    let changed=false;
    snap.docChanges().forEach(ch=>{
      changed=true;
      if(ch.type==="removed") delete S[c][ch.doc.id];
      else S[c][ch.doc.id] = ch.doc.data();
    });
    if(changed && !Object.keys(DIRTY).length){ relink(); render(); }
  }, e=>{ if(e.code==="revoked"){ DBLIVE=false; setDbState("local","access ended · local copy"); } }));
}

async function saveDoc(coll, id, patch){
  Object.assign(S[coll][id], patch);
  if(!DBLIVE){ toast("saved locally only"); return false; }
  try{ await DB.doc(coll+"/"+id).set(S[coll][id]); return true; }
  catch(e){
    if(e && e.code==="quota_exceeded") toast("the archive is full — delete something first", true);
    else toast("could not save — "+(e&&e.code||"unknown"), true);
    return false;
  }
}

/* =================== ARC LENS =================== */

function buildDial(){
  const d = $("#dial"); d.innerHTML="";
  for(let i=14;i>=0;i--){
    const a = S.arcs[String(i)];
    const b = el('<button data-arc="'+i+'"><span class="tick"></span><span class="lbl">'+i+' · '+esc(a?a.name:"—")+'</span></button>');
    b.addEventListener("click",()=>setLens(i));
    d.appendChild(b);
  }
  paintDial();
}
function paintDial(){
  document.querySelectorAll("#dial button").forEach(b=>{
    const n = +b.dataset.arc;
    b.classList.toggle("on", n===LENS);
    b.classList.toggle("past", n<LENS);
  });
  const a = S.arcs[String(LENS)];
  $("#lensNo").textContent = "Arc "+LENS;
  $("#lensName").textContent = a?a.name:"";
  $("#bandArc").textContent = "Arc "+LENS+" — "+(a?a.name:"—");
  const total = Object.values(S.girls).length;
  const here = Object.values(S.girls).filter(inStoryYet).length;
  $("#bandNote").textContent = here+" of "+total+" girls are in the story · statuses read "+statusLabel();
  $("#lensNote").textContent = LENS===14
    ? "The writing edge. Everything current resolves here."
    : "Canon resolves as it stood at Arc "+LENS+". Later changes are held back, not deleted.";
}
function setLens(n){
  LENS = n; try{ localStorage.setItem("gla.lens", String(n)); }catch(e){}
  paintDial(); render();
}

/* =================== NAV =================== */

function buildNav(){
  const n = $("#nav");
  const items = [
    ["#/","Archive",""],
    ["#/girls","Girls", Object.keys(S.girls).length],
    ["#/couples","Couples", Object.keys(S.couples).length],
    ["#/houses","Houses", Object.keys(S.houses).length],
    ["#/systems","Systems", Object.keys(S.systems).length],
    ["#/arcs","Arcs", Object.keys(S.arcs).length],
    ["#/changes","Canon Changes", Object.keys(S.changes).length],
    ["#/open","Open Questions", Object.keys(S.questions).length]
  ];
  n.innerHTML = items.map(([h,l,c])=>'<a href="'+h+'" data-r="'+h+'">'+esc(l)+(c!==""?'<span class="n">'+c+'</span>':'')+'</a>').join("");
  paintNav();
}
function paintNav(){
  const h = location.hash||"#/";
  document.querySelectorAll("#nav a").forEach(a=>{
    const r=a.dataset.r;
    a.classList.toggle("on", r==="#/" ? (h==="#/"||h==="") : h.startsWith(r));
  });
}

/* =================== SHARED RENDER BITS =================== */

function chipState(st){ return st?'<span class="chip state-'+esc(st)+'">'+esc(st)+'</span>':''; }
function chipHouse(h){ const H=S.houses[h]; return H?'<a class="chip house-'+esc(h)+'" href="#/house/'+esc(h)+'">'+esc(H.name)+'</a>':''; }
function xlinks(ids){
  if(!ids||!ids.length) return "";
  return '<div class="crosslinks">'+ids.map(i=>'<a class="xlink" href="'+routeOf(i)+'">'+esc(nameOf(i))+'</a>').join("")+'</div>';
}
function blk(title,hint,inner,id){
  if(!inner) return "";
  return '<section class="blk"'+(id?' id="'+id+'"':'')+'><div class="blkhead"><h2>'+esc(title)+'</h2>'+
    (hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>'+inner+'</section>';
}
function row(label, value, opts){
  if(value==null || value==="" ) return "";
  const o = opts||{};
  const cls = o.num?" num":"";
  const editable = (MODE==="edit" && o.path) ? ' contenteditable="true" data-edit="'+esc(o.path)+'" data-coll="'+esc(o.coll)+'" data-id="'+esc(o.id)+'"' : '';
  return '<dt>'+esc(label)+'</dt><dd class="'+cls.trim()+'"'+editable+'>'+ (o.html? value : esc(value)) +'</dd>';
}
function ledger(rows){ return rows.filter(Boolean).length ? '<dl class="ledger">'+rows.join("")+'</dl>' : ""; }
function panel(title, text, o){
  if(!text) return "";
  o=o||{};
  const editable = (MODE==="edit" && o.path) ? ' contenteditable="true" data-edit="'+esc(o.path)+'" data-coll="'+esc(o.coll)+'" data-id="'+esc(o.id)+'"' : '';
  return '<div class="panel">'+(title?'<h3>'+esc(title)+'</h3>':'')+'<p'+editable+'>'+esc(text)+'</p></div>';
}
function modsRow(m){
  if(!m) return "";
  const order=["H","G","A","T","W","BA"];
  return '<div class="mods">'+order.filter(k=>m[k]!=null).map(k=>{
    const v=m[k]; const sign = v>0?"+"+v : (v<0? String(v) : "0");
    return '<span class="'+(v>0?"pos":(v<0?"neg":""))+'"><b>'+k+'</b>'+sign+'</span>';
  }).join("")+'</div>';
}
function list(items){
  if(!items||!items.length) return "";
  return '<ul class="plain">'+items.map(i=>'<li>'+esc(i)+'</li>').join("")+'</ul>';
}

function timelineFor(id){
  const cs = changesFor(id);
  if(!cs.length) return '<p class="empty-note">No canon changes filed against this record yet.</p>';
  return '<div class="timeline">'+cs.map(c=>{
    const future = !c.timeless && c.arc!=null && c.arc>LENS;
    const prop = c.state==="proposed" || (c.arc==null&&!c.timeless);
    const cls = prop? "" : (future? "future" : (c.arc===LENS? "on":""));
    const when = c.timeless ? "All arcs" : (prop ? "Unfiled" : ("Arc "+c.arc));
    return '<div class="tl '+cls+'"><div class="when">'+esc(when)+'</div><div class="what">'+
      '<h4>'+esc(c.label)+'</h4>'+
      '<div class="eyebrow" style="margin:0 0 6px">'+esc(c.field||"")+' '+chipState(c.state)+'</div>'+
      (c.from||c.to ? '<div class="delta"><span class="was">'+esc(c.from||"—")+'</span><span class="arrow">→</span><span class="now">'+esc(c.to||"—")+'</span></div>' : '')+
      (c.note?'<p class="note">'+esc(c.note)+'</p>':'')+
      xlinks(c.links)+
    '</div></div>';
  }).join("")+'</div>';
}

/* -------- gallery -------- */
function imagesFor(id){ return Object.values(S.images).filter(i=>i.subject===id); }
function galleryFor(id, kind){
  const imgs = imagesFor(id);
  const plates = imgs.map(i=>
    '<figure class="plate"><img src="'+i.data+'" alt="'+esc(i.label||"")+'">'+
    '<figcaption class="cap"><span class="lb">'+esc(i.label||"Untitled")+'</span>'+
    '<span class="st '+(i.status==="Canonical"?"canonical":"")+'">'+esc(i.status||"Reference")+'</span></figcaption>'+
    (MODE==="edit"?'<button class="rm" data-rmimg="'+esc(i.id)+'">remove</button>':'')+
    '</figure>').join("");
  const drop = '<label class="dropzone" data-drop="'+esc(id)+'"><span class="big">+</span><span>add plate</span>'+
    '<input type="file" accept="image/*" hidden data-upl="'+esc(id)+'" data-kind="'+esc(kind)+'"></label>';
  return '<div class="gallery">'+plates+drop+'</div>'+
    '<p class="empty-note">Plates are stored in the Archive itself and shrunk to fit. Label each one Canonical, Close Reference, Concept or Superseded — a portrait can be useful without being right.</p>';
}

/* =================== VIEWS =================== */

function vHome(){
  const recent = Object.values(S.changes)
    .filter(c=>c.state!=="proposed"&&c.state!=="retired"&&(c.timeless||c.mode==="correction"||c.arc==null||c.arc<=LENS))
    .slice().sort((a,b)=>(b.arc==null?99:b.arc)-(a.arc==null?99:a.arc)).slice(0,6);
  const houses = Object.values(S.houses).filter(houseExists);
  const girls = Object.values(S.girls).map(g=>resolve(g).doc);
  const deepCount = Object.values(S.girls).filter(g=>g.depth==="deep").length;

  const houseCols = houses.map(h=>{
    const res = girls.filter(g=>g.house===h.id).sort((a,b)=>(a.sort||a.full).localeCompare(b.sort||b.full));
    const here = (h.arcOccupied==null||h.arcOccupied<=LENS)?res.filter(inStoryYet):[];
    return '<div>'+
      '<a class="tile house '+esc(h.id)+'" href="#/house/'+esc(h.id)+'" style="margin-bottom:12px">'+
        '<h3>'+esc(h.name)+'</h3><p>'+esc(h.epithet)+'</p>'+
        '<div class="kv-inline" style="margin-top:6px"><span><b>On stage</b>'+here.length+(res.length?' / '+res.length:'')+'</span>'+
        (h.couples?'<span><b>Couples</b>'+h.couples+'</span>':'')+'</div>'+
      '</a>'+
      (here.length ? '<div class="tags">'+here.slice(0,40).map(g=>'<a class="tag" href="#/girl/'+esc(g.id)+'">'+esc(g.short)+'</a>').join("")+'</div>'
                   : '<p class="empty-note">No residents on stage at Arc '+LENS+'.</p>')+
    '</div>';
  }).join("");

  return '<div class="page wide">'+
    '<div class="phead">'+
      '<div class="eyebrow">A private canon database wearing the face of a wiki '+chipState("current")+'</div>'+
      '<h1>The Ghostlight Archive</h1>'+
      '<p class="lede">Every fact has one home. Change it once and every page showing it changes with it. Canon carries a date, so a superseded number is history rather than an error — and the Arc Lens in the rail re-resolves the whole archive to any point in the story.</p>'+
    '</div>'+

    blk("The Havens","Rosters resolve to the arc in the lens", '<div class="twocol" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">'+houseCols+'</div>')+

    blk("Recent canon activity","Newest effective arc first", '<div class="timeline">'+recent.map(c=>{
      const prop = c.state==="proposed"||(c.arc==null&&!c.timeless);
      return '<div class="tl '+(prop?"":(!c.timeless&&c.arc>LENS?"future":""))+'"><div class="when">'+esc(c.timeless?"All arcs":(prop?"Unfiled":"Arc "+c.arc))+'</div>'+
        '<div class="what"><h4><a href="'+routeOf(c.subject)+'">'+esc(c.label)+'</a></h4>'+
        '<div class="eyebrow" style="margin:0 0 5px">'+esc(nameOf(c.subject))+' · '+esc(c.field||"")+' '+chipState(c.state)+'</div>'+
        (c.note?'<p class="note">'+esc(c.note.slice(0,190))+(c.note.length>190?"…":"")+'</p>':'')+'</div></div>';
    }).join("")+'</div>')+

    blk("The Archive at a glance","", '<div class="tiles">'+
      '<a class="tile" href="#/girls"><span class="tnum">'+Object.keys(S.girls).length+'</span><h3>Girls</h3><p>'+deepCount+' full records, the rest imported as stubs and waiting to be deepened.</p></a>'+
      '<a class="tile" href="#/couples"><span class="tnum">'+Object.keys(S.couples).length+'</span><h3>Couples</h3><p>A pairing is its own record — origin, architecture, rituals, conflicts — not two reciprocal links.</p></a>'+
      '<a class="tile" href="#/systems"><span class="tnum">'+Object.keys(S.systems).length+'</span><h3>Systems</h3><p>Nereid, the builds, the archetypes, the Flights, the protocols. Defined once, linked everywhere.</p></a>'+
      '<a class="tile" href="#/changes"><span class="tnum">'+Object.keys(S.changes).length+'</span><h3>Canon changes</h3><p>Every shift with the arc it became true in, and the value it replaced kept beside it.</p></a>'+
      '<a class="tile" href="#/open"><span class="tnum">'+Object.keys(S.questions).length+'</span><h3>Open questions</h3><p>Contradictions the import found and would not quietly resolve on your behalf.</p></a>'+
    '</div>')+
  '</div>';
}

function vGirls(){
  const gs = Object.values(S.girls).map(g=>resolve(g).doc).sort((a,b)=>(a.sort||a.full).localeCompare(b.sort||b.full));
  const here = gs.filter(inStoryYet), later = gs.filter(g=>!inStoryYet(g));
  const byHouse = {};
  here.forEach(g=>{ (byHouse[g.house]=byHouse[g.house]||[]).push(g); });
  const sections = Object.keys(byHouse).map(h=>
    blk(S.houses[h]?(houseExists(S.houses[h])?S.houses[h].name:"Found Family — before "+S.houses[h].name):h, byHouse[h].length+" on stage",
      '<div class="roster">'+byHouse[h].map(gcard).join("")+'</div>')
  ).join("");
  return '<div class="page wide"><div class="phead">'+
    '<div class="eyebrow">Roster '+chipHouse("")+'</div><h1>The Girls</h1>'+
    '<p class="lede">'+here.length+' on stage at Arc '+LENS+'. A gold left edge is a full record; a grey one is a stub carrying identity, build and partner and nothing else yet.</p>'+
    '</div>'+sections+
    (later.length? blk("Not yet in the story","Introduced after Arc "+LENS,
      '<div class="tags">'+later.map(g=>'<a class="tag" href="#/girl/'+esc(g.id)+'">'+esc(g.short)+' · Arc '+introArc(g)+'</a>').join("")+'</div>') : "")+
  '</div>';
}
function gcard(g){
  const p = g.partner? nameOf(g.partner):"";
  return '<a class="rcard '+(g.depth==="deep"?"is-deep":"is-stub")+'" href="#/girl/'+esc(g.id)+'">'+
    '<span class="nm">'+esc(g.short)+'</span>'+
    '<span class="tt">'+esc((g.titles||[]).join(" · "))+'</span>'+
    '<span class="meta">'+(p?'<span>♥ '+esc(p)+'</span>':'')+
      (g.body&&g.body.coreBuild?'<span class="hc">'+esc(g.body.coreBuild)+(g.body.fillBuild&&g.body.fillBuild!==g.body.coreBuild?' × '+esc(g.body.fillBuild):'')+'</span>':'')+
    '</span></a>';
}

function vGirl(id){
  const raw = S.girls[id]; if(!raw) return notFound();
  const {doc:g, applied, pending} = resolve(raw);
  const b = g.body||{}, k = g.cock||{}, h = g.hair||{}, m = g.mind||{}, nr = g.narrative||{};
  const E = (path)=>({path, coll:"girls", id});
  const imgs = imagesFor(id);
  const portrait = imgs.find(i=>i.status==="Canonical") || imgs[0];
  const notYet = !inStoryYet(g);
  const physical = g.physicalFromArc==null || g.physicalFromArc<=LENS;

  if(notYet) return '<div class="page"><div class="phead"><div class="eyebrow">Sealed by the Arc Lens</div><h1>'+esc(g.short)+'</h1><p class="lede">This record enters the story in Arc '+introArc(g)+'. Set the Arc Lens there or later to open it without future canon bleeding backward.</p></div>'+blk("Canon through time","The sealed ledger remains visible",timelineFor(id))+'</div>';

  const idBlock = ledger([
    row("Full name", g.full, E("full")),
    row("Short name", g.short, E("short")),
    row("Nicknames", g.nicknames, E("nicknames")),
    row("Deadname", g.deadname, E("deadname")),
    row("Maiden name", g.maiden, E("maiden")),
    row("Age", (g.agePre9||g.ageCurrent)? ((g.agePre9||"—")+" pre Arc 9 · "+(g.ageCurrent||"—")+" current · cap 28"):"", {num:true}),
    row("Adopted", g.arcAdopted!=null? ('<a href="#/arc/'+g.arcAdopted+'">Arc '+g.arcAdopted+' — '+esc(arcName(g.arcAdopted))+'</a>'+
      (g.arcAdoptedInferred?' <span class="chip state-draft">placeholder — no arc recorded</span>':'')):"", {html:true}),
    row("Gender", "Shemale — affirmed by Project Nereid"),
    row("Transition", g.transition, E("transition")),
    row("Status", statusAt(g.status)? esc(statusAt(g.status))+' <span class="chip">'+statusLabel()+'</span>':"", {html:true}),
    row("Devotion-locked", g.partner
      ? '<a href="#/girl/'+esc(g.partner)+'">'+esc(nameOf(g.partner))+'</a>'+(g.coupleId?' · <a href="#/couple/'+esc(g.coupleId)+'">the pairing</a>':'')
      : '<span style="color:var(--faint);font-style:italic">no pairing recorded</span>', {html:true}),
    row("Personal vibe", g.vibe? (g.vibe.primary+(g.vibe.primaryFlavor?" ("+g.vibe.primaryFlavor+")":"")+(g.vibe.secondary?" / "+g.vibe.secondary+(g.vibe.secondaryFlavor?" ("+g.vibe.secondaryFlavor+")":""):"")):""),
    row("Anchor role", g.anchorRole, E("anchorRole")),
    row("Contested floor", g.contestNote, E("contestNote")),
    row("Clan", g.clan, E("clan")),
    row("Correction", g.correction, E("correction")),
    row("Sexuality", g.sexuality, E("sexuality")),
    row("Profession", g.profession, E("profession")),
    row("Jonah survivor", g.survivor? (
        g.survivor.y ? ((g.survivor.flight||"Survivor \u2014 flight unrecorded")+(g.survivor.id?" · "+g.survivor.id:""))
      : g.survivor.state==="civilian" ? "No \u2014 never assigned a designation"
      : '<span style="color:var(--faint);font-style:italic">unrecorded \u2014 the Archive does not know</span>'
      ):"", {num:true, html:g.survivor && !g.survivor.y}),
    row("House", houseLabelAt(g.house), {html:true})
  ]);

  const bodyBlock = ledger([
    row("Build class", (b.coreBuild||"")+(b.fillBuild&&b.fillBuild!==b.coreBuild? " × "+b.fillBuild : ""), {num:true}),
    row("Core / Fill", b.coreBuild? (b.coreBuild+" is the thesis · "+(b.fillBuild||b.coreBuild)+" is the flesh"):""),
    row("Keywords", b.keywords, E("body.keywords")),
    row("Height shift", b.heightShift, {num:true}),
    row("Shoulder dial", b.shoulderDial),
    row("Height", b.height, {num:true}),
    row("Measurements", b.measurements, {num:true}),
    row("Movement", b.movementArch),
    row("Skin", b.skin)
  ]);

  const lowerBlock = ledger([
    row("Archetypes", (b.assArch||[]).join(" + "), {num:true}),
    row("Modifiers", modsRow(b.mods), {html:true}),
    row("HMM · hips", b.hmm, {num:true}),
    row("TDM · thigh density", b.tdm),
    row("BAS · back arch", b.bas),
    row("GG · gap geometry", b.gg),
    row("AMD · mass distribution", b.amd),
    row("Thighs", b.thighs, E("body.thighs")),
    row("Gap", b.gap),
    row("Arch", b.arch),
    row("Sexual gravity", b.gravity)
  ]);

  const upperBlock = ledger([
    row("Tits", b.tits, E("body.tits")),
    row("Back", b.back), row("Midriff", b.midriff), row("Shoulders", b.shoulders),
    row("Collarbone", b.collarbone), row("Face", b.face), row("Archetype", b.faceArch),
    row("Eyes", b.eyes), row("Lips", b.lips), row("Voice", b.voice)
  ]);

  const cockBlock = ledger([
    row("Specs", k.specs, Object.assign({num:true}, E("cock.specs"))),
    row("Character", k.prose, E("cock.prose")),
    row("Devotion-locked", k.devotionLocked, E("cock.devotionLocked")),
    row("Balls", k.balls), row("Bulge", k.bulge),
    row("Defining", (k.features||[]).join(" · ")),
    row("Panty canon", k.panties, E("cock.panties"))
  ]);

  const hairBlock = ledger([
    row("Palette", h.palette, E("hair.palette")),
    row("Personality", h.personality, E("hair.personality")),
    row("Texture", h.texture), row("Growth", h.growth), row("Method", h.method),
    row("Scent — daily", h.scentDaily), row("Scent — after", h.scentAfter)
  ]);

  const mindBlock = ledger([
    row("Core wounds", m.wounds, E("mind.wounds")),
    row("Pain point", m.painPoint, E("mind.painPoint")),
    row("Coping", m.coping), row("Love language", m.love), row("Attachment", m.attachment),
    row("Kinks", m.kinks, E("mind.kinks")),
    row("Tempo & position", g.tempo, E("tempo")),
    row("Recovery", m.recovery, E("mind.recovery")),
    row("Tell — vibe", m.tellVibe), row("Tell — heat", m.tellHeat),
    row("Moan volume", m.moan? '<a href="#/system/moan-volume">'+esc(m.moan)+'</a>':"", {html:true}),
    row("Spirit animal", m.spirit)
  ]);

  return '<div class="page">'+
  '<div class="phead"><div class="dossier">'+
    '<div class="portrait">'+ (portrait? '<img src="'+portrait.data+'" alt="'+esc(g.short)+'">'
      : '<span class="empty"><span class="glyph">✦</span>no plate<br>filed yet</span>') +'</div>'+
    '<div>'+
      '<div class="eyebrow">'+houseLabelAt(g.house)+(g.houseInferred?'<span class="chip state-draft">house inferred</span>':'')+' '+chipState(g.state)+
        (g.depth==="stub"?'<span class="chip stub">stub record</span>':'')+
        (notYet?'<span class="chip state-draft">not yet at Arc '+LENS+'</span>':'')+
        (g.survivor&&g.survivor.y?'<span class="chip">'+esc(g.survivor.id||g.survivor.flight||"survivor")+'</span>':'')+
        (g.survivor&&!g.survivor.y&&g.survivor.state!=="civilian"?'<span class="chip state-draft">flight unrecorded</span>':'')+'</div>'+
      '<h1>'+esc(g.short)+' <span class="sm">'+esc(g.full)+'</span></h1>'+
      '<div class="titles">'+esc((g.titles||[]).join(" · "))+'</div>'+
      (g.essence?'<p class="lede">'+esc(g.essence)+'</p>':'')+
      ((applied.length||pending.length)? '<p class="lensnote" style="margin-top:12px">'+
        (applied.length? applied.length+' canon change'+(applied.length>1?"s":"")+' in force at Arc '+LENS : 'No canon changes in force at Arc '+LENS)+
        (pending.length? ' · '+pending.length+' not yet in force' : '')+'.</p>':'')+
    '</div>'+
  '</div></div>'+

  editBar("girls", id)+

  blk("Identity","The single home for every field below", idBlock)+
  ((g.dynamic||g.essence)? blk("In her own register","Relationship truth, then how she exists",
    '<div class="panelrow">'+panel("Relationship dynamic", g.dynamic, E("dynamic"))+panel("Core essence", g.essence, E("essence"))+'</div>') : "")+
  (!physical ? blk("Embodiment","No physical anatomy at Arc "+LENS,panel("Current state",b.narrative||"Software only")) : "")+
  (physical ? ((b.narrative||b.movementSig||b.synergy) ? blk("Body — the thesis","Core sets what she is; Fill sets how it becomes flesh",
    bodyBlock + '<div class="panelrow" style="margin-top:16px">'+
      panel("Body narrative", b.narrative, E("body.narrative"))+
      panel("Movement signature", b.movementSig, E("body.movementSig"))+
      panel("Build synergy", b.synergy, E("body.synergy"))+'</div>') : blk("Body — the thesis","", bodyBlock)) : "")+
  (physical&&upperBlock? blk("Upper body", "", upperBlock):"")+
  (physical&&lowerBlock? blk("Lower body","Outputs follow from the modifiers, not the other way round",
    lowerBlock + (b.archTraits? '<div style="margin-top:16px">'+panel("Archetype traits", b.archTraits)+'</div>':'')):"")+
  (physical&&cockBlock? blk("Cock engine","Soft for the world, traitor for one person", cockBlock):"")+
  (hairBlock? blk("Hair engine","", hairBlock):"")+
  (mindBlock? blk("Mentality engine","", mindBlock):"")+
  ((nr.possessions||nr.keyArcs||nr.recoveryArcs||nr.moments)? blk("Personal narrative","",
    '<div class="twocol">'+
    (nr.possessions?'<div><div class="eyebrow">Important possessions</div>'+list(nr.possessions)+'</div>':'')+
    (nr.keyArcs?'<div><div class="eyebrow">Key arcs</div>'+list(nr.keyArcs)+'</div>':'')+
    (nr.recoveryArcs?'<div><div class="eyebrow">Recovery arcs</div>'+list(nr.recoveryArcs)+'</div>':'')+
    (nr.moments?'<div><div class="eyebrow">Defining moments</div>'+list(nr.moments)+'</div>':'')+
    '</div>'):"")+
  blk("Canon through time","Filed changes, newest arc last", timelineFor(id)+
    (MODE==="edit"?'<div style="margin-top:16px"><button class="btn primary" data-addchange="'+esc(id)+'" data-kind="girl">File a canon change</button></div>':''))+
  blk("Gallery","", galleryFor(id,"girl"))+
  ((g.tags&&g.tags.length)? blk("Tags","", '<div class="tags">'+g.tags.map(t=>'<span class="tag">'+esc(t)+'</span>').join("")+'</div>'+
    (g.heatSignature?'<p class="empty-note">Heat signature — '+esc(g.heatSignature)+'</p>':'')):"")+
  ((g.seeAlso&&g.seeAlso.length)? blk("Linked records","", xlinks(g.seeAlso)):"")+
  ((g.open&&g.open.length)? blk("Open on this record","Imported contradictions, unresolved", list(g.open)):"")+
  '</div>';
}

function vCouples(){
  const cs = Object.values(S.couples).map(c=>resolve(c).doc).sort((a,b)=>(a.arcMet||0)-(b.arcMet||0));
  const here = cs.filter(c=>c.arcMet==null||c.arcMet<=LENS);
  return '<div class="page wide"><div class="phead">'+
    '<div class="eyebrow">Pairings</div><h1>The Couples</h1>'+
    '<p class="lede">A pairing is its own record. Bryn and Torie are not Bryn: spouse Torie plus Torie: spouse Bryn — they have an origin, an emotional core, a sexual architecture, private rituals, conflicts, a home and evolving tells, and none of that lives on either girl&#39;s page.</p></div>'+
    blk("Together at Arc "+LENS, here.length+" of "+cs.length,
      '<div class="roster">'+here.map(c=>
        '<a class="rcard '+(c.depth==="deep"?"is-deep":"is-stub")+'" href="#/couple/'+esc(c.id)+'">'+
        '<span class="nm">'+esc(c.name)+'</span><span class="tt">'+esc(c.tag||"")+'</span>'+
        '<span class="meta"><span>'+esc(statusAt(c.status)||"—")+'</span><span class="hc">Arc '+esc(c.arcMet)+'</span></span></a>').join("")+'</div>')+
  '</div>';
}

function vCouple(id){
  const raw = S.couples[id]; if(!raw) return notFound();
  const {doc:c, applied} = resolve(raw);
  if(c.arcMet!=null&&c.arcMet>LENS) return '<div class="page"><div class="phead"><div class="eyebrow">Sealed by the Arc Lens</div><h1>'+esc(c.name)+'</h1><p class="lede">This pairing enters the story in Arc '+c.arcMet+'. Set the Arc Lens there or later to open it without future canon bleeding backward.</p></div>'+blk("Canon through time","The sealed ledger remains visible",timelineFor(id))+'</div>';
  const E = (path)=>({path, coll:"couples", id});
  const A=S.girls[c.a], B=S.girls[c.b];
  return '<div class="page"><div class="phead">'+
    '<div class="eyebrow">'+chipHouse(c.house)+' '+chipState(c.state)+(c.depth==="stub"?'<span class="chip stub">stub record</span>':'')+'</div>'+
    '<h1>'+esc(c.name)+'</h1><div class="titles">'+esc(c.tag||"")+'</div>'+
    '<p class="lede">'+esc(statusAt(c.status)||"—")+' as of Arc '+LENS+'. '+(c.arcMet?'Together since Arc '+c.arcMet+' — '+esc(arcName(c.arcMet))+'.':'')+'</p>'+
    '</div>'+
    editBar("couples", id)+
    blk("The two of them","",
      '<div class="roster pair">'+[A,B].filter(Boolean).map(gcard).join("")+'</div>')+
    (c.note? blk("Standing note","How this pair reads against the systems", panel("", c.note, E("note"))):"")+
    ((c.quotes&&c.quotes.length)? blk("On the record","Said out loud, more than once",
      c.quotes.map(q=>'<figure class="quote"><blockquote>'+esc(q.line)+'</blockquote>'+
        '<figcaption><b>'+esc(q.who)+'</b>'+(q.when?' — '+esc(q.when):'')+'</figcaption></figure>').join("")):"")+
    (c.origin? blk("Origin","How it started", panel("", c.origin, E("origin"))):"")+
    (c.core? blk("Emotional core","What the pairing is actually about", panel("", c.core, E("core"))):"")+
    (c.architecture? blk("Sexual architecture","Who leads, who yields, and why", panel("", c.architecture, E("architecture"))):"")+
    ((c.rituals&&c.rituals.length)? blk("Private rituals","", list(c.rituals)):"")+
    ((c.conflicts&&c.conflicts.length)? blk("Conflicts","The places they can hurt each other", list(c.conflicts)):"")+
    blk("The register","Wardrobe, heat and aftercare canon", ledger([
      row("Married", c.weddingArc!=null
        ? ('<a href="#/arc/'+c.weddingArc+'">Arc '+c.weddingArc+' — '+esc(arcName(c.weddingArc))+'</a>'+(c.weddingNote?' · '+esc(c.weddingNote):''))
        : (c.weddingNote? esc(c.weddingNote) : ""), {html:true}),
      row("Home", c.home, E("home")),
      row("Colour code", c.colorCode), row("Perfume", c.perfume), row("Lingerie", c.lingerie),
      row("Spice / Filth", (c.spice||c.filth)? ((c.spice||"—")+" / "+(c.filth||"—")):"", {num:true}),
      row("Position", c.position), row("Aftercare", c.aftercare),
      row("Signature scene", c.scene, E("scene")),
      row("Tells", c.tells, E("tells")),
      row("Haunts", (c.haunts||[]).join(" · "))
    ]))+
    blk("Canon through time","", timelineFor(id)+
      (MODE==="edit"?'<div style="margin-top:16px"><button class="btn primary" data-addchange="'+esc(id)+'" data-kind="couple">File a canon change</button></div>':''))+
    blk("Gallery","", galleryFor(id,"couple"))+
    ((c.open&&c.open.length)? blk("Open on this record","", list(c.open)):"")+
  '</div>';
}

function vHouses(){
  const houses=Object.values(S.houses).filter(houseExists);
  const girls=Object.values(S.girls).map(g=>resolve(g).doc).filter(inStoryYet);
  return '<div class="page wide"><div class="phead"><div class="eyebrow">Places</div><h1>The Havens</h1>'+
    '<p class="lede">Three houses on the same Southern Woods land. Two of them are shaped like a girl who lives in them.</p></div>'+
    '<div class="tiles">'+houses.map(h=>
      '<a class="tile house '+esc(h.id)+'" href="#/house/'+esc(h.id)+'"><h3>'+esc(h.name)+'</h3>'+
      '<p><em>'+esc(h.epithet)+'</em></p><p>'+esc((h.thesis||"").slice(0,150))+'…</p>'+
      '<div class="kv-inline" style="margin-top:8px"><span><b>Girls</b>'+((h.arcOccupied==null||h.arcOccupied<=LENS)?girls.filter(g=>g.house===h.id).length:0)+'</span><span><b>Opened</b>Arc '+h.arcOpened+'</span></div></a>').join("")+'</div>'+
  '</div>';
}

function vHouse(id){
  const raw = S.houses[id]; if(!raw) return notFound();
  const {doc:h} = resolve(raw);
  if(!houseExists(h)) return '<div class="page"><div class="phead"><div class="eyebrow">Sealed by the Arc Lens</div><h1>'+esc(h.name)+'</h1><p class="lede">This Haven does not exist until Arc '+h.arcOpened+'. The database will not build it early.</p></div>'+blk("Canon through time","The founding record remains visible",timelineFor(id))+'</div>';
  const E = (path)=>({path, coll:"houses", id});
  const rooms = Object.values(S.rooms).filter(r=>r.house===id&&roomExists(r,h));
  const res = Object.values(S.girls).map(g=>resolve(g).doc).filter(g=>g.house===id&&inStoryYet(g)).sort((a,b)=>(a.sort||a.full).localeCompare(b.sort||b.full));
  const here = (h.arcOccupied==null||h.arcOccupied<=LENS)?res:[];
  const zones = {};
  rooms.forEach(r=>{ (zones[r.zone||"Rooms"]=zones[r.zone||"Rooms"]||[]).push(r); });

  return '<div class="page"><div class="phead">'+
    '<div class="eyebrow">'+chipHouse(id)+' '+chipState(h.state)+(h.depth==="stub"?'<span class="chip stub">stub record</span>':'')+'</div>'+
    '<h1>'+esc(h.name)+'</h1><div class="titles">'+esc(h.epithet)+'</div>'+
    '<p class="lede">'+esc(h.thesis)+'</p></div>'+
    editBar("houses", id)+
    blk("The house","", ledger([
      row("Residents", here.length+" at Arc "+LENS, {num:true}),
      row("Couples", h.couples, {num:true}),
      row("Location", h.location, E("location")),
      row("Lead", h.lead, E("lead")),
      row("Smells", h.smells, E("smells")),
      row("Opened", h.arcOpened!=null? '<a href="#/arc/'+h.arcOpened+'">Arc '+h.arcOpened+' — '+esc(arcName(h.arcOpened))+'</a>':"", {html:true}),
      row("Occupied", h.arcOccupied!=null? '<a href="#/arc/'+h.arcOccupied+'">Arc '+h.arcOccupied+' — '+esc(arcName(h.arcOccupied))+'</a>':"", {html:true})
    ]))+
    (h.plan? blk("Floor plan","The footprint, read from above", panel("", h.plan, E("plan"))):"")+
    (h.mood? blk("Anchor mood","", panel("", h.mood, E("mood"))):"")+
    (h.seasons? blk("Seasonal mood","", '<div class="panelrow">'+
      ["winter","spring","summer","fall"].map(s=>panel(s, h.seasons[s], E("seasons."+s))).join("")+'</div>'):"")+
    (rooms.length? blk("Rooms", rooms.length+" filed", Object.keys(zones).map(z=>
      '<div style="margin-bottom:22px"><div class="eyebrow">'+esc(z)+'</div>'+
      zones[z].map(r=>'<div id="room-'+esc(r.id)+'" style="margin-bottom:14px;scroll-margin-top:70px">'+
        '<h3 style="font-size:22px;color:var(--cream);margin-bottom:5px">'+esc(r.name)+
        (r.depth==="stub"?' <span class="chip stub">stub</span>':'')+'</h3>'+
        '<p style="max-width:66ch;color:var(--bone)">'+esc(r.body)+'</p>'+
        (r.residents?'<div class="tags" style="margin-top:7px">'+r.residents.map(x=>'<span class="tag">'+esc(x)+'</span>').join("")+'</div>':'')+
      '</div>').join("")+'</div>').join("")):"")+
    blk("Residents", here.length+" on stage", here.length? '<div class="roster">'+here.map(gcard).join("")+'</div>'
      : '<p class="empty-note">No roster imported for this house.</p>')+
    blk("Canon through time","", timelineFor(id))+
    blk("Gallery","", galleryFor(id,"house"))+
    ((h.open&&h.open.length)? blk("Open on this record","", list(h.open)):"")+
  '</div>';
}

function vSystems(){
  const groups = {};
  Object.values(S.systems).forEach(s=>{ (groups[s.group]=groups[s.group]||[]).push(s); });
  return '<div class="page wide"><div class="phead"><div class="eyebrow">Mechanics</div><h1>The Systems</h1>'+
    '<p class="lede">Defined once here, linked from everywhere else. No more copying a definition into twenty-seven profiles and discovering three generations of the same paragraph in circulation.</p></div>'+
    Object.keys(groups).map(g=>blk(g,"", '<div class="tiles">'+groups[g].map(s=>
      '<a class="tile" href="#/system/'+esc(s.id)+'"><h3>'+esc(s.name)+(s.version?' <span style="font-family:var(--mono);font-size:11px;color:var(--faint)">'+esc(s.version)+'</span>':'')+'</h3>'+
      '<p>'+esc(s.tagline)+'</p></a>').join("")+'</div>')).join("")+
  '</div>';
}

function vSystem(id){
  const s = S.systems[id]; if(!s) return notFound();
  const E = (path)=>({path, coll:"systems", id});
  /* who uses it */
  const users = Object.values(S.girls).filter(g=>(g.seeAlso||[]).includes(id));
  const buildUsers = (id==="build-classes")? Object.values(S.girls).filter(g=>g.body&&g.body.coreBuild) : [];
  return '<div class="page"><div class="phead">'+
    '<div class="eyebrow">'+esc(s.group)+' '+chipState(s.state)+(s.version?'<span class="chip">'+esc(s.version)+'</span>':'')+'</div>'+
    '<h1>'+esc(s.name)+'</h1><div class="titles">'+esc(s.tagline)+'</div></div>'+
    editBar("systems", id)+
    (s.body? blk("Definition","", panel("", s.body, E("body"))):"")+
    ((s.rules&&s.rules.length)? blk("The register", s.rules.length+" entries", list(s.rules)):"")+
    (buildUsers.length? blk("Every build in the Archive","Core × Fill, grouped",
      '<div class="roster">'+buildUsers.sort((a,b)=>(a.body.coreBuild+a.body.fillBuild).localeCompare(b.body.coreBuild+b.body.fillBuild)).map(gcard).join("")+'</div>'):"")+
    (users.length && id!=="build-classes"? blk("Linked from","", '<div class="tags">'+users.map(g=>'<a class="tag" href="#/girl/'+esc(g.id)+'">'+esc(g.short)+'</a>').join("")+'</div>'):"")+
    ((s.seeAlso&&s.seeAlso.length)? blk("See also","", xlinks(s.seeAlso)):"")+
  '</div>';
}

function vArcs(){
  return '<div class="page"><div class="phead"><div class="eyebrow">Chronology</div><h1>The Arc Ledger</h1>'+
    '<p class="lede">Fifteen arcs, zero through fourteen. The lens in the rail sets which of them the whole archive resolves to; this page is the ledger itself.</p></div>'+
    '<div class="timeline">'+Object.values(S.arcs).sort((a,b)=>a.n-b.n).map(a=>
      '<div class="tl '+(a.n===LENS?"on":(a.n>LENS?"future":""))+'"><div class="when">Arc '+a.n+'</div><div class="what">'+
      '<h4><a href="#/arc/'+a.id+'">'+esc(a.name)+'</a> '+chipState(a.state)+'</h4>'+
      '<p class="note">'+esc(a.summary)+'</p>'+
      (a.additions&&a.additions.length?'<div class="tags" style="margin-top:7px">'+a.additions.map(x=>'<span class="tag">+ '+esc(x)+'</span>').join("")+'</div>':'')+
      '</div></div>').join("")+'</div></div>';
}

function vArc(id){
  const a = S.arcs[id]; if(!a) return notFound();
  const E = (path)=>({path, coll:"arcs", id});
  const joined = Object.values(S.girls).filter(g=>String(g.arcAdopted)===String(a.n));
  const changes = Object.values(S.changes).filter(c=>String(c.arc)===String(a.n));
  return '<div class="page"><div class="phead">'+
    '<div class="eyebrow">Arc '+a.n+' · '+esc(a.tag||"")+' '+chipState(a.state)+'</div>'+
    '<h1>'+esc(a.name)+'</h1><p class="lede">'+esc(a.summary)+'</p>'+
    '<div style="margin-top:16px"><button class="btn primary" data-setlens="'+a.n+'">Set the lens to Arc '+a.n+'</button></div></div>'+
    editBar("arcs", id)+
    ((a.events&&a.events.length)? blk("Key events","", list(a.events)):"")+
    ((a.pairings&&a.pairings.length)? blk("New pairings","", '<div class="tags">'+a.pairings.map(p=>'<span class="tag">'+esc(p)+'</span>').join("")+'</div>'):"")+
    (joined.length? blk("Adopted this arc", joined.length+" girls", '<div class="roster">'+joined.map(gcard).join("")+'</div>'):"")+
    (changes.length? blk("Canon effective this arc","", '<div class="timeline">'+changes.map(c=>
      '<div class="tl on"><div class="when">'+esc(nameOf(c.subject))+'</div><div class="what"><h4><a href="'+routeOf(c.subject)+'">'+esc(c.label)+'</a></h4>'+
      '<div class="delta"><span class="was">'+esc(c.from||"—")+'</span><span class="arrow">→</span><span class="now">'+esc(c.to||"—")+'</span></div></div></div>').join("")+'</div>'):"")+
  '</div>';
}

function vChanges(){
  const cs = Object.values(S.changes).sort((a,b)=>(a.arc==null?99:a.arc)-(b.arc==null?99:b.arc));
  return '<div class="page"><div class="phead"><div class="eyebrow">The ledger of shifts</div><h1>Canon Changes</h1>'+
    '<p class="lede">Every filed change with the arc it became true in. Nothing here overwrites anything — the superseded value is kept beside its replacement, which is the whole reason the Archive exists.</p></div>'+
    '<div class="timeline">'+cs.map(c=>{
      const prop = c.state==="proposed"||(c.arc==null&&!c.timeless);
      return '<div class="tl '+(prop?"":(c.arc>LENS?"future":(c.arc===LENS?"on":"")))+'">'+
        '<div class="when">'+esc(c.timeless?"All arcs":(prop?"Unfiled":"Arc "+c.arc))+'</div><div class="what">'+
        '<h4><a href="'+routeOf(c.subject)+'">'+esc(c.label)+'</a></h4>'+
        '<div class="eyebrow" style="margin:0 0 5px">'+esc(nameOf(c.subject))+' · '+esc(c.field||"")+' '+chipState(c.state)+'</div>'+
        '<div class="delta"><span class="was">'+esc(c.from||"—")+'</span><span class="arrow">→</span><span class="now">'+esc(c.to||"—")+'</span></div>'+
        (c.note?'<p class="note">'+esc(c.note)+'</p>':'')+xlinks(c.links)+'</div></div>';
    }).join("")+'</div></div>';
}

function vOpen(){
  const qs = Object.values(S.questions);
  return '<div class="page"><div class="phead"><div class="eyebrow">Contradiction goblins</div><h1>Open Questions</h1>'+
    '<p class="lede">Things the import found and would not quietly resolve on your behalf. A wrong detail, a once-true detail and a detail we only ever discussed are three different things, and the Archive keeps them apart.</p></div>'+
    qs.map(q=>blk(q.q, nameOf(q.subject),
      '<p style="max-width:66ch;color:var(--bone)">'+esc(q.detail)+'</p>'+
      '<div style="margin-top:10px">'+chipState(q.state)+' <a class="xlink" href="'+routeOf(q.subject)+'">'+esc(nameOf(q.subject))+'</a></div>')).join("")+
  '</div>';
}

function vSearch(q){
  const needle = q.toLowerCase().trim();
  if(!needle) return '<div class="page"><div class="phead"><h1>Search</h1><p class="lede">Type in the rail. Names, titles, builds, archetypes, flights, kinks, rooms, systems, tags — all of it is indexed.</p></div></div>';
  const hits=[];
  const scan=(coll,kind)=>{
    let docs=Object.values(S[coll]);
    if(coll==="girls") docs=docs.map(d=>resolve(d).doc).filter(inStoryYet);
    if(coll==="couples") docs=docs.map(d=>resolve(d).doc).filter(d=>d.arcMet==null||d.arcMet<=LENS);
    if(coll==="houses") docs=docs.filter(houseExists);
    if(coll==="rooms") docs=docs.filter(d=>roomExists(d,S.houses[d.house])&&houseExists(S.houses[d.house]));
    for(const d of docs){
      const blob = JSON.stringify(d).toLowerCase();
      const i = blob.indexOf(needle);
      if(i>=0){
        const name = d.short||d.name||d.full||d.label||d.q||d.id;
        const raw = JSON.stringify(d).replace(/["{}\[\]]/g," ").replace(/\\n/g," ");
        const start = Math.max(0, i-70);
        const ex = raw.slice(start, start+220).replace(/\s+/g," ");
        hits.push({kind, name, ex, href:kind==="change"? routeOf(d.subject) : routeOf(d.id), rank:(String(name).toLowerCase().includes(needle)?0:1)});
      }
    }
  };
  scan("girls","girl"); scan("couples","couple"); scan("houses","house");
  scan("rooms","room"); scan("systems","system"); scan("arcs","arc");
  scan("changes","change"); scan("questions","open");
  hits.sort((a,b)=>a.rank-b.rank);
  return '<div class="page"><div class="phead"><div class="eyebrow">Search</div><h1>“'+esc(q)+'”</h1>'+
    '<p class="lede">'+hits.length+' record'+(hits.length===1?"":"s")+' in the Archive.</p></div>'+
    (hits.length? '<div class="hits">'+hits.slice(0,80).map(h=>
      '<a class="hit" href="'+h.href+'"><span class="kind">'+esc(h.kind)+'</span><span><span class="nm">'+esc(h.name)+'</span>'+
      '<span class="ex">…'+esc(h.ex)+'…</span></span></a>').join("")+'</div>'
      : '<p class="empty-note">Nothing. Try a build class, an archetype, a flight number, or half a name.</p>')+
  '</div>';
}

function notFound(){
  return '<div class="page"><div class="phead"><h1>No such record</h1>'+
    '<p class="lede">Nothing is filed under that address. <a href="#/">Back to the Archive</a>.</p></div></div>';
}

/* =================== EDIT SURFACE =================== */

function editBar(coll,id){
  if(MODE!=="edit") return "";
  return '<div class="editbar">'+
    '<button class="btn primary" data-save="'+esc(coll)+'/'+esc(id)+'">Save changes</button>'+
    '<button class="btn" data-addchange="'+esc(id)+'" data-kind="'+esc(coll)+'">File a canon change</button>'+
    '<span class="hintx">'+(DBLIVE? "Editable fields are lit. Edits save to the Archive." : "No live database — edits will not persist.")+'</span>'+
  '</div>';
}

document.addEventListener("input", e=>{
  const n = e.target.closest?.("[data-edit]");
  if(!n) return;
  const key = n.dataset.coll+"/"+n.dataset.id;
  DIRTY[key] = DIRTY[key]||{};
  DIRTY[key][n.dataset.edit] = n.innerText.trim();
});

async function commit(key){
  const patch = DIRTY[key]; if(!patch){ toast("nothing changed"); return; }
  const [coll,id] = key.split("/");
  const doc = clone(S[coll][id]);
  for(const [p,v] of Object.entries(patch)) setPath(doc,p,v);
  doc.updated = new Date().toISOString();
  const ok = await saveDoc(coll,id,doc);
  delete DIRTY[key];
  if(ok) toast("saved to the archive");
  render();
}

/* ---- canon-change modal ---- */
function openChangeModal(subject, subjectKind){
  const arcOpts = Object.values(S.arcs).sort((a,b)=>a.n-b.n)
    .map(a=>'<option value="'+a.n+'">Arc '+a.n+' — '+esc(a.name)+'</option>').join("");
  const scrim = el('<div class="scrim"><div class="modal">'+
    '<h3>File a canon change</h3>'+
    '<p class="sub">Against '+esc(nameOf(subject))+'. The old value is kept, not replaced.</p>'+
    '<div class="field"><label>What changed</label><input id="cLabel" placeholder="The Blacksmith Gremlin"></div>'+
    '<div class="fieldrow">'+
      '<div class="field"><label>Field</label><input id="cField" placeholder="Personal Vibe"></div>'+
      '<div class="field"><label>Effective arc</label><select id="cArc"><option value="">Unfiled — no arc yet</option>'+arcOpts+'</select></div>'+
    '</div>'+
    '<div class="fieldrow">'+
      '<div class="field"><label>Was</label><input id="cFrom" placeholder="the superseded value"></div>'+
      '<div class="field"><label>Now</label><input id="cTo" placeholder="the new value"></div>'+
    '</div>'+
    '<div class="fieldrow">'+
      '<div class="field"><label>Canon state</label><select id="cState">'+
        ["current","historical","proposed","draft","disputed","retired"].map(s=>'<option>'+s+'</option>').join("")+'</select></div>'+
      '<div class="field"><label>Overrides path <span class="fh">optional</span></label><input id="cPath" placeholder="vibe.primary"></div>'+
    '</div>'+
    '<div class="field"><label>Note</label><textarea id="cNote" placeholder="Why it changed, and what follows from it."></textarea>'+
      '<span class="fh">A path makes the change rewrite that field live at and after its arc. Leave it blank for a narrative-only entry.</span></div>'+
    '<div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="cSave">File it</button></div>'+
  '</div></div>');
  document.body.appendChild(scrim);
  scrim.addEventListener("click", e=>{ if(e.target===scrim||e.target.hasAttribute("data-close")) scrim.remove(); });
  scrim.querySelector("#cSave").addEventListener("click", async ()=>{
    const g = s => scrim.querySelector(s).value.trim();
    if(!g("#cLabel")){ toast("give it a name", true); return; }
    const id = "c-"+Date.now().toString(36);
    const doc = { id, kind:"change", subject, subjectKind, label:g("#cLabel"), field:g("#cField"),
      arc: g("#cArc")===""? null : Number(g("#cArc")), from:g("#cFrom"), to:g("#cTo"),
      state:g("#cState"), path:g("#cPath")||null, note:g("#cNote"), links:[], created:new Date().toISOString() };
    S.changes[id]=doc;
    if(DBLIVE){ try{ await DB.doc("changes/"+id).set(doc); toast("filed"); }catch(e){ toast("could not file it", true); } }
    else toast("filed locally only");
    scrim.remove(); render();
  });
}

/* ---- image handling ---- */
function shrink(file, cb){
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      let w=img.width,h=img.height; const max=900;
      if(w>max||h>max){ const s=max/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
      const c=document.createElement("canvas"); c.width=w; c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      let q=0.82, out=c.toDataURL("image/jpeg",q);
      while(out.length>170000 && q>0.35){ q-=0.08; out=c.toDataURL("image/jpeg",q); }
      cb(out.length>230000? null : out);
    };
    img.onerror = ()=>cb(null);
    img.src = r.result;
  };
  r.onerror = ()=>cb(null);
  r.readAsDataURL(file);
}

function openImageModal(subject, kind, data){
  const scrim = el('<div class="scrim"><div class="modal">'+
    '<h3>Add a plate</h3><p class="sub">Filed against '+esc(nameOf(subject))+'.</p>'+
    '<div style="display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:start">'+
    '<img src="'+data+'" style="width:100%;border:1px solid var(--line);border-radius:2px" alt="preview">'+
    '<div><div class="field"><label>Label</label><input id="iLabel" placeholder="Canonical portrait"></div>'+
    '<div class="field"><label>Status</label><select id="iStatus">'+
      ["Canonical","Close Reference","Concept","Superseded"].map(s=>'<option>'+s+'</option>').join("")+'</select></div>'+
    '<div class="field"><label>Notes</label><input id="iNote" placeholder="physique slightly too toned; left hand malformed"></div></div></div>'+
    '<div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="iSave">File the plate</button></div>'+
  '</div></div>');
  document.body.appendChild(scrim);
  scrim.addEventListener("click", e=>{ if(e.target===scrim||e.target.hasAttribute("data-close")) scrim.remove(); });
  scrim.querySelector("#iSave").addEventListener("click", async ()=>{
    const id="img-"+Date.now().toString(36);
    const doc={ id, kind:"image", subject, subjectKind:kind,
      label:scrim.querySelector("#iLabel").value.trim()||"Untitled",
      status:scrim.querySelector("#iStatus").value,
      note:scrim.querySelector("#iNote").value.trim(),
      data, created:new Date().toISOString() };
    S.images[id]=doc;
    if(DBLIVE){ try{ await DB.doc("images/"+id).set(doc); toast("plate filed"); }
      catch(e){ toast(e&&e.code==="invalid_argument"?"image too large after shrinking":"could not save the plate", true); } }
    else toast("filed locally only");
    scrim.remove(); render();
  });
}

/* =================== EVENTS =================== */

document.addEventListener("click", async e=>{
  const save = e.target.closest?.("[data-save]");
  if(save){ commit(save.dataset.save); return; }
  const ac = e.target.closest?.("[data-addchange]");
  if(ac){ openChangeModal(ac.dataset.addchange, ac.dataset.kind); return; }
  const sl = e.target.closest?.("[data-setlens]");
  if(sl){ setLens(+sl.dataset.setlens); return; }
  const rm = e.target.closest?.("[data-rmimg]");
  if(rm){
    const id = rm.dataset.rmimg; delete S.images[id];
    if(DBLIVE){ try{ await DB.doc("images/"+id).delete(); }catch(err){} }
    render(); return;
  }
});

document.addEventListener("change", e=>{
  const up = e.target.closest?.("[data-upl]");
  if(!up || !up.files || !up.files[0]) return;
  const f = up.files[0]; up.value="";
  shrink(f, data=>{
    if(!data){ toast("could not read that image", true); return; }
    openImageModal(up.dataset.upl, up.dataset.kind, data);
  });
});

$("#mRead").addEventListener("click", ()=>{ MODE="read"; $("#mRead").classList.add("on"); $("#mEdit").classList.remove("on"); render(); });
$("#mEdit").addEventListener("click", ()=>{ MODE="edit"; $("#mEdit").classList.add("on"); $("#mRead").classList.remove("on"); render(); });

let searchTimer;
$("#q").addEventListener("input", e=>{
  clearTimeout(searchTimer);
  const v = e.target.value;
  searchTimer = setTimeout(()=>{
    if(v.trim()) location.hash = "#/search/"+encodeURIComponent(v);
    else if(location.hash.startsWith("#/search")) location.hash = "#/";
  }, 220);
});

/* =================== ROUTER =================== */

function render(){
  const h = (location.hash||"#/").slice(2);
  const [seg, ...rest] = h.split("/");
  const arg = decodeURIComponent(rest.join("/")||"");
  let html;
  switch(seg){
    case "": html = vHome(); break;
    case "girls": html = vGirls(); break;
    case "girl": html = vGirl(arg); break;
    case "couples": html = vCouples(); break;
    case "couple": html = vCouple(arg); break;
    case "houses": html = vHouses(); break;
    case "house": html = vHouse(arg.split("#")[0]); break;
    case "systems": html = vSystems(); break;
    case "system": html = vSystem(arg); break;
    case "arcs": html = vArcs(); break;
    case "arc": html = vArc(arg); break;
    case "changes": html = vChanges(); break;
    case "open": html = vOpen(); break;
    case "search": html = vSearch(arg); break;
    default: html = notFound();
  }
  view().innerHTML = html;
  paintNav();
  const frag = location.hash.split("#")[2];
  if(frag){ const t=document.getElementById(frag); if(t) setTimeout(()=>t.scrollIntoView({block:"start"}),40); }
  else window.scrollTo(0,0);
}

window.addEventListener("hashchange", ()=>{ DIRTY={}; render(); });

/* =================== BOOT =================== */

buildNav();
buildDial();
render();
setDbState("local","connecting…");
if(typeof claude !== "undefined" && claude.use) connectDb();
else setDbState("local","local copy · edits not saved");
</script>
