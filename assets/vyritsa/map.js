/* ===== Соборная карта молитвы — своя SVG-карта мира (плоская) =====
   Силуэт суши + города-огоньки + длинные плавные пунктирные параболы к Вырице,
   живой терминатор день/ночь, зум/перетаскивание (ПК + телефон), подрезка по крайним
   городам, подписи дальних городов. Требует data.js (VYRITSA, CITIES) и world.js (WORLD_LAND). */

function sobornayaMap(elId, opts){
  opts = opts || {};
  const preview = !!opts.preview;
  const host = document.getElementById(elId);
  if(!host) return;
  const V = window.VYRITSA, CITIES = window.CITIES, LAND = window.WORLD_LAND;
  const NS = 'http://www.w3.org/2000/svg';
  const DEG = Math.PI/180, RAD = 180/Math.PI;

  // --- проекция Natural Earth 1 ---
  function projRaw(lng, lat){
    const lam=lng*DEG, phi=lat*DEG, p2=phi*phi, p4=p2*p2;
    const x=lam*(0.8707-0.131979*p2+p4*(-0.013791+p4*(0.003971*p2-0.001529*p4)));
    const y=phi*(1.007226+p2*(0.015085+p4*(-0.044475+0.028874*p2-0.005916*p4)));
    return [x,-y];
  }
  let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
  function acc(lng,lat){const q=projRaw(lng,lat);
    if(q[0]<minx)minx=q[0];if(q[0]>maxx)maxx=q[0];if(q[1]<miny)miny=q[1];if(q[1]>maxy)maxy=q[1];}
  LAND.rings.forEach(r=>r.forEach(p=>acc(p[0],p[1])));
  CITIES.forEach(c=>acc(c.lng,c.lat)); acc(V.lng,V.lat);
  const W=1000, PAD=14, s=(W-2*PAD)/(maxx-minx), H=(maxy-miny)*s+2*PAD*0.7;
  function P(lng,lat){const q=projRaw(lng,lat);return [(q[0]-minx)*s+PAD,(q[1]-miny)*s+PAD*0.7];}

  // --- день/ночь: подсолнечная точка и ночная область ---
  function sunSubpoint(date){
    const start=Date.UTC(date.getUTCFullYear(),0,0);
    const doy=Math.floor((date-start)/86400000);
    const decl=-23.44*Math.cos(DEG*(360/365)*(doy+10));
    const utcH=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600;
    let lng=-15*(utcH-12); lng=((lng+540)%360)-180;
    return {lat:decl,lng:lng};
  }
  function nightPathD(date){
    const sun=sunSubpoint(date), decl=sun.lat, south=decl>0;
    const td=Math.tan(decl*DEG);
    const pts=[];
    for(let lng=-180;lng<=180;lng+=3){
      const Hh=(lng-sun.lng)*DEG;
      let latT = Math.abs(td)<1e-4 ? (south?-89:89) : Math.atan(-Math.cos(Hh)/td)*RAD;
      if(latT>89)latT=89; if(latT<-89)latT=-89;
      pts.push(P(lng,latT));
    }
    const edgeLat=south?-89:89;
    for(let lng=180;lng>=-180;lng-=6) pts.push(P(lng,edgeLat));
    return 'M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'Z';
  }

  // --- SVG-каркас ---
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox',`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`);
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.setAttribute('class','sob-svg');
  svg.innerHTML='<defs>'+
    '<radialGradient id="sob-glow" cx="50%" cy="50%" r="50%">'+
      '<stop offset="0%" stop-color="#FBE9BE"/><stop offset="55%" stop-color="#C2A14D"/>'+
      '<stop offset="100%" stop-color="#8E2A2B"/></radialGradient>'+
    '<filter id="sob-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2"/></filter>'+
  '</defs>';

  const zoomG=document.createElementNS(NS,'g'); zoomG.setAttribute('class','sob-zoom'); svg.appendChild(zoomG);

  // суша
  let d='';
  LAND.rings.forEach(ring=>{ring.forEach((pt,i)=>{const xy=P(pt[0],pt[1]);d+=(i?'L':'M')+xy[0].toFixed(1)+' '+xy[1].toFixed(1);});d+='Z';});
  const land=document.createElementNS(NS,'path'); land.setAttribute('d',d); land.setAttribute('class','sob-land'); zoomG.appendChild(land);

  // ночь (день/ночь) — над сушей, под нитями
  const night=document.createElementNS(NS,'path'); night.setAttribute('class','sob-night');
  night.setAttribute('d',nightPathD(new Date())); zoomG.appendChild(night);

  const vp=P(V.lng,V.lat);
  const gArc=document.createElementNS(NS,'g'); const gDot=document.createElementNS(NS,'g');
  zoomG.appendChild(gArc); zoomG.appendChild(gDot);

  const items=[];
  CITIES.forEach((c,i)=>{
    const p=P(c.lng,c.lat);
    const mx=(p[0]+vp[0])/2,my=(p[1]+vp[1])/2; let dx=vp[0]-p[0],dy=vp[1]-p[1];
    const len=Math.hypot(dx,dy)||1; let nx=-dy/len,ny=dx/len; if(ny>0){nx=-nx;ny=-ny;}
    const off=Math.max(16,Math.min(len*0.18,130)); const cx=mx+nx*off,cy=my+ny*off;
    const arc=document.createElementNS(NS,'path');
    arc.setAttribute('d',`M${p[0].toFixed(1)} ${p[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${vp[0].toFixed(1)} ${vp[1].toFixed(1)}`);
    arc.setAttribute('class','sob-arc'+(c.big?' big':'')); arc.style.animationDelay=(i*0.5).toFixed(2)+'s';
    gArc.appendChild(arc); items.push({c,p,arc});
  });

  // тултип
  function tip(){let t=host.querySelector('.sob-tip'); if(!t){t=document.createElement('div');t.className='sob-tip ui';host.appendChild(t);} return t;}

  items.forEach(({c,p,arc})=>{
    const g=document.createElementNS(NS,'g'); g.setAttribute('class','sob-city');
    g.setAttribute('transform',`translate(${p[0].toFixed(1)},${p[1].toFixed(1)})`);
    const halo=document.createElementNS(NS,'circle'); halo.setAttribute('r',c.big?'4.4':'3.3'); halo.setAttribute('class','sob-halo');
    const core=document.createElementNS(NS,'circle'); core.setAttribute('r',c.big?'2.1':'1.6'); core.setAttribute('class','sob-core');
    g.appendChild(halo); g.appendChild(core);
    function showTip(e){ arc.classList.add('hot'); g.classList.add('hot');
      const t=tip(); t.textContent=c.temple?(c.city+' — '+c.temple):c.city; t.style.opacity='1';
      const r=host.getBoundingClientRect(); t.style.left=(e.clientX-r.left)+'px'; t.style.top=(e.clientY-r.top)+'px'; }
    function hideTip(){ arc.classList.remove('hot'); g.classList.remove('hot'); const t=host.querySelector('.sob-tip'); if(t)t.style.opacity='0'; }
    g.addEventListener('mouseenter',showTip); g.addEventListener('mousemove',showTip);
    g.addEventListener('mouseleave',hideTip); g.addEventListener('click',showTip);
    gDot.appendChild(g);
  });

  // Вырица — сердце (синее)
  const heart=document.createElementNS(NS,'g'); heart.setAttribute('class','sob-heart');
  heart.setAttribute('transform',`translate(${vp[0].toFixed(1)},${vp[1].toFixed(1)})`);
  for(let i=0;i<2;i++){const ring=document.createElementNS(NS,'circle');ring.setAttribute('r','6');ring.setAttribute('class','sob-ring');ring.style.animationDelay=(i*1.2)+'s';heart.appendChild(ring);}
  const hglow=document.createElementNS(NS,'circle');hglow.setAttribute('r','11');hglow.setAttribute('class','sob-hglow');hglow.setAttribute('filter','url(#sob-soft)');
  const hcore=document.createElementNS(NS,'circle');hcore.setAttribute('r','6');hcore.setAttribute('class','sob-hcore');
  heart.appendChild(hglow);heart.appendChild(hcore);
  zoomG.appendChild(heart);

  host.appendChild(svg);

  // длинные «бегущие» сегменты на нитях — как на глобусе (per-arc по длине пути)
  items.forEach(({arc},i)=>{
    const L=arc.getTotalLength()||120;
    arc.style.setProperty('--L', L);
    arc.style.strokeDasharray=(L*0.5).toFixed(1)+' '+(L*0.5).toFixed(1);
    arc.style.animation='sob-run 9s linear infinite';
    arc.style.animationDelay=(i*0.4).toFixed(2)+'s';
  });

  // обновление день/ночь (мгновенно, без морфинга)
  const nightTimer=setInterval(()=>{ night.setAttribute('d',nightPathD(new Date())); }, 60000);

  if(preview){ return svg; }   // на превью — без зума

  // ===== ЗУМ / ПЕРЕТАСКИВАНИЕ =====
  // стартовый вид: подрезка по крайним городам (far) + Вырица
  let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;
  CITIES.filter(c=>c.far).concat([V]).forEach(c=>{const q=P(c.lng,c.lat);
    if(q[0]<bx0)bx0=q[0];if(q[0]>bx1)bx1=q[0];if(q[1]<by0)by0=q[1];if(q[1]>by1)by1=q[1];});
  const mB=40; bx0-=mB;by0-=mB;bx1+=mB;by1+=mB;
  const fitK=Math.min(W/(bx1-bx0), H/(by1-by0));
  let k=fitK, tx=(W-(bx0+bx1)*k)/2, ty=(H-(by0+by1)*k)/2;
  const minK=0.62, maxK=fitK*9;          // минимум — весь мир целиком (Америка/Африка до низа)

  // --- слой подписей: ПОСТОЯННЫЙ размер на экране, дедуп по текущему зуму ---
  const gLabels=document.createElementNS(NS,'g'); gLabels.setAttribute('class','sob-labels'); svg.appendChild(gLabels);
  const labelEls = CITIES.filter(c=>c.far).map(c=>({c,p:P(c.lng,c.lat),big:!!c.big,vyr:false}))
    .concat([{c:{city:V.name},p:vp,big:true,vyr:true}])
    .map(L=>{ const t=document.createElementNS(NS,'text');
      t.setAttribute('class','sob-lbl'+(L.vyr?' vyritsa':(L.big?' big':''))); t.textContent=L.c.city;
      gLabels.appendChild(t);
      return {L,t,w:L.c.city.length*(L.vyr?8.5:(L.big?7:6)), fs:(L.vyr?15.5:(L.big?13:11)), off:(L.vyr?13:(L.big?9:7.5))}; });
  const labelOrder = labelEls.map((e,i)=>i).sort((a,b)=>{
    const A=labelEls[a].L,B=labelEls[b].L; return (A.vyr?0:A.big?1:2)-(B.vyr?0:B.big?1:2); });
  function updateLabels(){
    const shown=[];
    labelOrder.forEach(i=>{ const e=labelEls[i], sx=e.L.p[0]*k+tx, sy=e.L.p[1]*k+ty;
      const box={x:sx+e.off,y:sy-e.fs*0.6,w:e.w,h:e.fs};
      let ok = sx>-20 && sx<W+20 && sy>-20 && sy<H+20;
      if(ok) for(const b of shown){ if(!(box.x+box.w<b.x-2||b.x+b.w<box.x-2||box.y+box.h<b.y-2||b.y+b.h<box.y-2)){ok=false;break;} }
      if(ok){ e.t.setAttribute('x',(sx+e.off).toFixed(1)); e.t.setAttribute('y',(sy+3).toFixed(1)); e.t.style.display=''; shown.push(box); }
      else e.t.style.display='none';
    });
  }
  function apply(){ zoomG.setAttribute('transform',`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})`); updateLabels(); }
  apply();

  // перевод clientXY → координаты viewBox
  function toVB(clientX,clientY){ const r=host.getBoundingClientRect();
    const sx=W/r.width, sy=H/r.height, sc=Math.max(sx,sy); // meet → единый масштаб
    const offX=(r.width*sc-W)/2, offY=(r.height*sc-H)/2;
    return [ (clientX-r.left)*sc-offX, (clientY-r.top)*sc-offY ]; }
  function zoomAt(cx,cy,factor){ const nk=Math.max(minK,Math.min(maxK,k*factor));
    const [vx,vy]=toVB(cx,cy); tx=vx-(vx-tx)*(nk/k); ty=vy-(vy-ty)*(nk/k); k=nk; apply(); }

  host.addEventListener('wheel',e=>{ e.preventDefault(); zoomAt(e.clientX,e.clientY, e.deltaY<0?1.16:1/1.16); },{passive:false});

  const ptrs=new Map(); let pinchD=0, pinchMid=null;
  host.addEventListener('pointerdown',e=>{ if(e.target.closest('.map-zoom'))return; host.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY}); host.classList.add('grabbing'); });
  host.addEventListener('pointermove',e=>{
    if(!ptrs.has(e.pointerId)) return; const prev=ptrs.get(e.pointerId); ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1){ const r=host.getBoundingClientRect(); const sc=Math.max(W/r.width,H/r.height);
      tx+=(e.clientX-prev.x)*sc; ty+=(e.clientY-prev.y)*sc; apply(); }
    else if(ptrs.size===2){ const a=[...ptrs.values()]; const dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
      const mid={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};
      if(pinchD){ zoomAt(mid.x,mid.y, dist/pinchD); } pinchD=dist; pinchMid=mid; }
  });
  function endP(e){ ptrs.delete(e.pointerId); if(ptrs.size<2)pinchD=0; if(ptrs.size===0)host.classList.remove('grabbing'); }
  host.addEventListener('pointerup',endP); host.addEventListener('pointercancel',endP);

  // кнопки +/−
  const zc=document.createElement('div'); zc.className='map-zoom ui';
  zc.innerHTML='<button type="button" aria-label="Приблизить">+</button><button type="button" aria-label="Отдалить">−</button>';
  zc.children[0].addEventListener('click',()=>{const r=host.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,1.4);});
  zc.children[1].addEventListener('click',()=>{const r=host.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,1/1.4);});
  host.appendChild(zc);

  svg.__nightTimer=nightTimer;
  return svg;
}
