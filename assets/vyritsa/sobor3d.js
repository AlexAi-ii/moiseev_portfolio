/* ===== Соборная карта — единый 3D-движок (three.js r128): морф сфера↔плоскость =====
   Глобус разворачивается в плоскую карту и обратно; города (плоские огоньки, тёмные днём /
   светлые ночью), объёмные нити-трубки с длинным бегущим сегментом, Вырица с расходящимися
   кольцами, день/ночь, полюса-точки, подписи, зум/перетаскивание, авто-вращение с паузой 3с. */
(function(){
  const DEG=Math.PI/180;
  const R=100, PW=Math.PI*R, PH=Math.PI*R/2, TILT=23.4*DEG;

  function sphereXYZ(lat,lng,rad){ const a=lat*DEG,b=lng*DEG;
    return [rad*Math.cos(a)*Math.cos(b), rad*Math.sin(a), -rad*Math.cos(a)*Math.sin(b)]; }
  function planeXYZ(lat,lng,z){ return [ (lng/180)*PW, (lat/90)*PH, z||0 ]; }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function sun(date){ const start=Date.UTC(date.getUTCFullYear(),0,0);
    const doy=Math.floor((date-start)/86400000);
    const decl=-23.44*Math.cos(DEG*(360/365)*(doy+10));
    const utcH=date.getUTCHours()+date.getUTCMinutes()/60;
    let lng=-15*(utcH-12); lng=((lng+540)%360)-180; return {lat:decl,lng:lng}; }

  function dotTexture(col,ring){ const c=document.createElement('canvas'); c.width=c.height=64;
    const x=c.getContext('2d'); const g=x.createRadialGradient(32,32,0,32,32,26);
    g.addColorStop(0,col); g.addColorStop(0.55,col); g.addColorStop(0.78,col.replace(/,\s*1\)\s*$/,',0.3)')); g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g; x.beginPath(); x.arc(32,32,26,0,7); x.fill();
    if(ring!==false){ x.strokeStyle='rgba(255,255,255,0.7)'; x.lineWidth=2.5; x.beginPath(); x.arc(32,32,14,0,7); x.stroke(); }
    return new THREE.CanvasTexture(c); }
  function ringTexture(col){ const c=document.createElement('canvas'); c.width=c.height=128;
    const x=c.getContext('2d'); x.strokeStyle=col; x.lineWidth=3; x.beginPath(); x.arc(64,64,58,0,7); x.stroke(); return new THREE.CanvasTexture(c); }

  window.sobor3dInit=function(elId,opts){
    opts=opts||{};
    const host=document.getElementById(elId); if(!host||!window.THREE) return null;
    const THREE=window.THREE, V=window.VYRITSA, CITIES=window.CITIES;
    const interactive=opts.interactive!==false;
    const lblMode=opts.labelsMode||(opts.labels===false?'none':'all');   // 'all'|'big'|'vyr'|'none'
    const showLabels=lblMode!=='none';
    const pointScale=opts.pointScale||1, fitFactor=opts.fit||0.97, labelScale=opts.labelScale||1;
    let nightFloor=opts.nightFloor||0.64;
    const aimX=opts.aimX!=null?opts.aimX:-0.32, aimY=opts.aimY!=null?opts.aimY:0.40;
    if(getComputedStyle(host).position==='static') host.style.position='relative';

    const scene=new THREE.Scene();
    const cam=new THREE.PerspectiveCamera(42, host.clientWidth/host.clientHeight, 1, 8000);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(host.clientWidth,host.clientHeight); renderer.domElement.style.display='block';
    host.appendChild(renderer.domElement);
    const tiltG=new THREE.Group(); scene.add(tiltG);       // наклон оси 23°
    const world=new THREE.Group(); tiltG.add(world);       // спин вокруг полярной оси (внутри наклона)
    let morph=0, anim=null, spin=0;

    // ── Земля (морф + день/ночь через vertexColors) ──
    const SX=160,SY=80, verts=[],plane=[],uvs=[],cols=[],idx=[], vLat=[],vLng=[];
    for(let j=0;j<=SY;j++){ const lat=90-j/SY*180;
      for(let i=0;i<=SX;i++){ const lng=-180+i/SX*360;
        const s=sphereXYZ(lat,lng,R); verts.push(s[0],s[1],s[2]);
        const p=planeXYZ(lat,lng,0); plane.push(p[0],p[1],p[2]);
        uvs.push((lng+180)/360,(lat+90)/180); cols.push(1,1,1); vLat.push(lat); vLng.push(lng); }}
    for(let j=0;j<SY;j++)for(let i=0;i<SX;i++){ const a=j*(SX+1)+i,b=a+1,c=a+SX+1,d=c+1; idx.push(a,c,b,b,c,d); }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
    geo.setIndex(idx); geo.morphAttributes.position=[ new THREE.Float32BufferAttribute(plane,3) ];
    const tex=new THREE.TextureLoader().load(opts.texture||'assets/earth-parchment.png');
    if(THREE.SRGBColorSpace) tex.colorSpace=THREE.SRGBColorSpace;
    const earth=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex,morphTargets:true,vertexColors:true,side:THREE.DoubleSide}));
    earth.morphTargetInfluences=[0]; world.add(earth);

    let sunDir=[1,0,0];
    function updateDayNight(){ const sp=sun(new Date());
      sunDir=sphereXYZ(sp.lat,sp.lng,1);
      const col=geo.attributes.color;
      for(let n=0;n<vLat.length;n++){ const nn=sphereXYZ(vLat[n],vLng[n],1);
        const d=nn[0]*sunDir[0]+nn[1]*sunDir[1]+nn[2]*sunDir[2];
        const t=Math.max(0,Math.min(1,(d+0.12)/0.24)); const m=lerp(nightFloor,1,t);
        col.setXYZ(n, m*0.93, m*0.97, lerp(nightFloor+0.12,1,t)); }
      col.needsUpdate=true; updateCityColors();
    }

    // ── Полюса — плоские чёрные точки ──
    const texPole=dotTexture('rgba(20,20,24,1)');
    function poleDot(y){ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:texPole,transparent:true,depthTest:true,depthWrite:false,sizeAttenuation:true}));
      sp.scale.set(1.4,1.4,1); sp.position.set(0,y,0); world.add(sp); return sp; }
    const poleN=poleDot(R), poleS=poleDot(-R);

    // ── Города ──
    const texDay=dotTexture('rgba(36,28,26,1)'), texNight=dotTexture('rgba(245,240,224,1)'), texBlue=dotTexture('rgba(37,82,214,1)');
    const cityList=CITIES.map(c=>({lat:c.lat,lng:c.lng,big:!!c.big,vyr:false,city:c.city,temple:c.temple,far:!!c.far}))
      .concat([{lat:V.lat,lng:V.lng,vyr:true,city:V.name,far:true}]);
    const cityObjs=cityList.map(c=>{
      const mat=new THREE.SpriteMaterial({map:c.vyr?texBlue:texDay,transparent:true,depthWrite:false,depthTest:true});
      const sp=new THREE.Sprite(mat); const sz=(c.vyr?3.4:(c.big?1.5:1.1))*pointScale; sp.scale.set(sz,sz,1);
      sp.userData={s:sphereXYZ(c.lat,c.lng,R*1.012),p:planeXYZ(c.lat,c.lng,0.4),c:c,sz:sz,n:sphereXYZ(c.lat,c.lng,1)};
      world.add(sp); return sp;
    });
    function updateCityColors(){ cityObjs.forEach(sp=>{ const c=sp.userData.c; if(c.vyr) return;
      const n=sp.userData.n, d=n[0]*sunDir[0]+n[1]*sunDir[1]+n[2]*sunDir[2];
      sp.material.map = d>0 ? texDay : texNight; sp.material.needsUpdate=true; }); }
    updateDayNight(); const dnTimer=setInterval(updateDayNight,60000);

    // ── Карточка города (тап по городу): приход/имена; следует за точкой, масштаб по зуму ──
    const cardEl=document.createElement('div'); cardEl.className='sob-city-card'; cardEl.style.display='none'; host.appendChild(cardEl);
    let cardFor=null;
    function cityNamesFor(idx){ const S=window.SINODIK||[]; if(!S.length) return []; const o=[]; for(let k=0;k<3;k++) o.push(S[(idx*3+k)%S.length]); return o; }
    function showCity(sp){ const c=sp.userData.c, idx=cityObjs.indexOf(sp), names=cityNamesFor(idx);
      let h='<button class="scc-x" type="button" aria-label="Закрыть">×</button><div class="scc-city">'+c.city+'</div>';
      if(c.temple) h+='<div class="scc-temple">'+c.temple+'</div>';
      if(names.length) h+='<div class="scc-lbl">Молятся и жертвуют о храме</div><div class="scc-names">'+names.join(' · ')+'</div>';
      cardEl.innerHTML=h; cardEl.style.display='block'; cardFor=sp;
      cardEl.querySelector('.scc-x').onclick=function(e){ e.stopPropagation(); cardEl.style.display='none'; cardFor=null; }; }

    // ── Вырица: расходящиеся кольца ──
    const texRing=ringTexture('rgba(37,82,214,1)');
    const rings=[0,1,2].map(i=>{ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texRing,transparent:true,depthWrite:false,depthTest:false,opacity:0}));
      s.userData={ph:i/3}; scene.add(s); return s; });
    const vyrObj=cityObjs[cityObjs.length-1];

    // ── Нити — тонкие трубки (под углом тоньше), длинный бегущий сегмент, у каждой своя фаза ──
    const arcVert='varying float vD;void main(){vD=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
    const arcFrag='varying float vD;uniform float uTime;uniform float uPhase;uniform float uSpeed;void main(){float x=fract(vD*1.2-uTime*uSpeed+uPhase);float seg=smoothstep(0.0,0.03,x)*smoothstep(0.62,0.52,x);if(seg<0.02)discard;vec3 col=mix(vec3(0.74,0.6,0.28),vec3(0.5,0.13,0.14),vD);gl_FragColor=vec4(col,seg*0.92);}';
    function makeArcMat(){ return new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,
      uniforms:{uTime:{value:0},uPhase:{value:Math.random()},uSpeed:{value:0.10+Math.random()*0.10}},
      vertexShader:arcVert, fragmentShader:arcFrag}); }
    const arcMats=[];
    const ARC_RAD_BASE=0.12; let arcRad=ARC_RAD_BASE;
    function vecOf(lat,lng){ const s=sphereXYZ(lat,lng,1); return new THREE.Vector3(s[0],s[1],s[2]); }
    function slerpV(a,b,f){ let d=Math.max(-1,Math.min(1,a.dot(b))); const th=Math.acos(d); if(th<1e-5) return a.clone();
      const s=Math.sin(th); return a.clone().multiplyScalar(Math.sin((1-f)*th)/s).add(b.clone().multiplyScalar(Math.sin(f*th)/s)); }
    function vToLL(v){ const u=v.clone().normalize(); return [Math.asin(Math.max(-1,Math.min(1,u.y)))/DEG, Math.atan2(-u.z,u.x)/DEG]; }
    const pVy=vecOf(V.lat,V.lng);
    const arcObjs=CITIES.map(c=>{
      const N=44,sP=[],pP=[], p0=vecOf(c.lat,c.lng);
      const ang=Math.acos(Math.max(-1,Math.min(1,p0.dot(pVy)))), alt=R*(0.05+0.40*(ang/Math.PI));
      for(let k=0;k<=N;k++){ const f=k/N,h=Math.sin(f*Math.PI)*alt, u=slerpV(p0,pVy,f);
        sP.push([u.x*(R+h),u.y*(R+h),u.z*(R+h)]);
        const ll=vToLL(u); pP.push(planeXYZ(ll[0],ll[1],h*0.5)); }
      const m=makeArcMat(); arcMats.push(m);
      const mesh=new THREE.Mesh(buildTube(sP), m); world.add(mesh);
      return {mesh,sP,pP};
    });
    function buildTube(pts){ const cv=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],p[1],p[2])));
      return new THREE.TubeGeometry(cv,38,arcRad,5,false); }

    function applyMorph(t){ morph=t;
      earth.morphTargetInfluences[0]=t; tiltG.rotation.z=-TILT*(1-t); world.rotation.y=spin*(1-t);
      const ax=Math.max(0,1-t*1.6); poleN.material.opacity=ax; poleS.material.opacity=ax; poleN.visible=poleS.visible=ax>0.01;
      cityObjs.forEach(sp=>{const s=sp.userData.s,p=sp.userData.p; sp.position.set(lerp(s[0],p[0],t),lerp(s[1],p[1],t),lerp(s[2],p[2],t));});
      arcObjs.forEach(a=>{ const pts=a.sP.map((s,k)=>new THREE.Vector3(lerp(s[0],a.pP[k][0],t),lerp(s[1],a.pP[k][1],t),lerp(s[2],a.pP[k][2],t)));
        a.mesh.geometry.dispose(); a.mesh.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),38,arcRad,5,false); });
    }

    // ── Подписи (HTML overlay) ──
    let labelEls=[];
    if(showLabels){ const lay=document.createElement('div'); lay.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden'; host.appendChild(lay);
      labelEls=cityList.filter(c=> lblMode==='all' || (lblMode==='big'&&(c.big||c.vyr)) || (lblMode==='vyr'&&c.vyr)).map(c=>{ const d=document.createElement('div');
        d.textContent=c.city; d.style.cssText='position:absolute;white-space:nowrap;font-family:"Golos Text",sans-serif;font-weight:600;font-size:'+((c.vyr?16:11)*labelScale).toFixed(1)+'px;color:'+(c.vyr?'#1E3A8A':'#3a2a26')+';text-shadow:0 0 4px #f1e6cd,0 0 7px #f1e6cd,0 1px 2px #f1e6cd;transform:translateY(-50%)';
        lay.appendChild(d); var _o=cityObjs[cityList.indexOf(c)];
        if(interactive){ d.style.pointerEvents='auto'; d.style.cursor='pointer'; d.onclick=function(ev){ ev.stopPropagation(); showCity(_o); }; }
        return {c,d,obj:_o}; }); }
    const tmpV=new THREE.Vector3(), camN=new THREE.Vector3();
    function pri(c){ return c.vyr?0:c.big?1:c.far?2:3; }
    let lblTick=0;
    function updateLabels(){ if(!labelEls.length) return; const w=host.clientWidth,h=host.clientHeight;
      camN.copy(cam.position).normalize();
      // позиции — каждый кадр (плавно); видимость по горизонту — каждый кадр
      labelEls.forEach(e=>{ e.obj.getWorldPosition(tmpV);
        const fd=tmpV.clone().normalize().dot(camN); tmpV.project(cam);
        e._sx=(tmpV.x*0.5+0.5)*w; e._sy=(-tmpV.y*0.5+0.5)*h;
        e._vis = tmpV.z<1 && e._sx>-40 && e._sx<w+40 && e._sy>-20 && e._sy<h+20 && (morph>0.5||fd>0.06); });
      // решение о наложениях — реже (раз в 7 кадров), чтобы не дёргалось
      if((lblTick++ % 7)===0){ const shown=[];
        labelEls.map((e,i)=>i).sort((a,b)=>pri(labelEls[a].c)-pri(labelEls[b].c)).forEach(i=>{ const e=labelEls[i];
          if(!e._vis){ e._show=false; return; }
          const off=e.c.vyr?11:7, fs=(e.c.vyr?16:11)*labelScale, tw=e.c.city.length*(e.c.vyr?8.5:6)*labelScale;
          const box={x:e._sx+off,y:e._sy-fs*0.6,w:tw,h:fs}; let ok=true;
          for(const b of shown){ if(!(box.x+box.w<b.x-2||b.x+b.w<box.x-2||box.y+box.h<b.y-2||b.y+b.h<box.y-2)){ok=false;break;} }
          e._show=ok; if(ok) shown.push(box); }); }
      labelEls.forEach(e=>{ const off=e.c.vyr?11:7;
        if(e._vis && e._show){ e.d.style.display=''; e.d.style.left=(e._sx+off)+'px'; e.d.style.top=e._sy+'px'; }
        else e.d.style.display='none'; });
    }

    applyMorph(0);

    // ── Камера / управление + авто-пауза 3с ──
    let camZsphere=300, camZplane=720;
    // вписываем шар/карту под аспект экрана (на телефоне — почти весь шар, обрезка ~1/10 по бокам)
    function fitCam(){ const vhalf=Math.tan(cam.fov*DEG/2), a=cam.aspect;
      camZsphere=Math.round(R/(fitFactor*Math.min(vhalf,vhalf*a)));
      camZplane=Math.round(Math.max(PW/(vhalf*a), PH/vhalf)/0.96); }
    fitCam();
    const UP=new THREE.Vector3(0,1,0), target=new THREE.Vector3(0,0,0);
    let autoOn=!!opts.autoRotate, interacting=false, resumeAt=0, morphing=false, dist=camZsphere;
    // самонаведение: численно ставит камеру так, чтобы Вырица была в левом-верхнем (без ручных знаков)
    function aimVyritsa(){ cam.up.set(0,1,0); const wp=new THREE.Vector3();
      cam.updateMatrixWorld(true); vyrObj.getWorldPosition(wp); cam.position.copy(wp).setLength(camZsphere); cam.lookAt(0,0,0);
      function ndc(){ cam.updateMatrixWorld(true); vyrObj.getWorldPosition(wp); return wp.clone().project(cam); }
      for(let it=0; it<6; it++){ const p=ndc(); const ex=aimX-p.x, ey=aimY-p.y;
        if(Math.abs(ex)<0.004 && Math.abs(ey)<0.004) break; const tt=0.05;
        cam.position.applyAxisAngle(UP,tt); cam.lookAt(0,0,0); const px=ndc().x; cam.position.applyAxisAngle(UP,-tt); cam.lookAt(0,0,0);
        const dxu=(px-p.x)/tt||1e-3;
        const rg=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0);
        cam.position.applyAxisAngle(rg,tt); cam.lookAt(0,0,0); const py=ndc().y; cam.position.applyAxisAngle(rg,-tt); cam.lookAt(0,0,0);
        const dyr=(py-p.y)/tt||1e-3;
        cam.position.applyAxisAngle(UP, Math.max(-0.7,Math.min(0.7,ex/dxu))); cam.lookAt(0,0,0);
        const rg2=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0);
        cam.position.applyAxisAngle(rg2, Math.max(-0.7,Math.min(0.7,ey/dyr))); cam.lookAt(0,0,0); }
      dist=cam.position.distanceTo(target); }
    aimVyritsa();
    // ── Своё управление: глобус — вращение мячом (1 палец) + крутить-на-месте/зум (2 пальца);
    //    карта — перетаскивание (1 палец/мышь) + зум; колесо — зум всегда ──
    if(interactive){
      const dom=renderer.domElement; dom.style.touchAction='none'; const ptrs=new Map(); let pinchD=0,pinchA=null,tapStart=null;
      // Тап по городу. Если рядом плотный кластер (несколько точек в 16px) — не гадаем, а подзумиваем к этому месту;
      // города расходятся, следующий тап выбирает точно. Одиночный город открывается сразу.
      function pickCity(cx,cy){ const r=dom.getBoundingClientRect(), px=cx-r.left, py=cy-r.top; camN.copy(cam.position).normalize();
        const R0=28, cand=[];
        for(let k=0;k<cityObjs.length;k++){ const sp=cityObjs[k]; sp.getWorldPosition(tmpV); const fd=tmpV.clone().normalize().dot(camN); if(morph<0.5 && fd<0.05) continue;
          const pv=tmpV.clone().project(cam); if(pv.z>1) continue;
          const sx=(pv.x*0.5+0.5)*host.clientWidth, sy=(-pv.y*0.5+0.5)*host.clientHeight, d=Math.hypot(sx-px,sy-py);
          if(d<R0) cand.push({sp:sp,d:d,sx:sx,sy:sy}); }
        if(!cand.length) return;
        cand.sort((a,b)=>a.d-b.d); const best=cand[0];
        const cluster=cand.filter(c=>Math.hypot(c.sx-best.sx,c.sy-best.sy)<13);
        if(morph>0.5 && cluster.length>=2 && dist>170){ zoomToSprite(best.sp,0.42); return; }
        showCity(best.sp); }
      // подвести точку города к центру и приблизить (для расхождения кластера)
      function zoomToSprite(sp,f){ const wp=new THREE.Vector3(); sp.getWorldPosition(wp); const mv=wp.clone().sub(target);
        cam.position.add(mv); target.add(mv); cam.lookAt(target); zoomCam(f); resumeAt=performance.now()+3000; }
      function rotateGlobe(dx,dy){ const len=Math.hypot(dx,dy); if(len<0.01)return;
        const axis=new THREE.Vector3(dy,dx,0).normalize().applyQuaternion(cam.quaternion);
        const q=new THREE.Quaternion().setFromAxisAngle(axis,-len*0.006*Math.min(1.7,Math.max(0.4,dist/300)));
        cam.position.sub(target).applyQuaternion(q).add(target); cam.up.applyQuaternion(q); cam.lookAt(target); }
      function rollGlobe(da){ const ax=new THREE.Vector3().subVectors(cam.position,target).normalize();
        cam.up.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(ax,da)); cam.lookAt(target); }
      function panCam(dx,dy){ const k=dist*2*Math.tan(cam.fov*DEG/2)/Math.max(1,host.clientHeight);  // палец 1:1 на любом зуме
        const rt=new THREE.Vector3().setFromMatrixColumn(cam.matrix,0), up=new THREE.Vector3().setFromMatrixColumn(cam.matrix,1);
        const mv=rt.multiplyScalar(-dx*k).add(up.multiplyScalar(dy*k)); cam.position.add(mv); target.add(mv); cam.lookAt(target); }
      function zoomCam(f){ dist=Math.max(150,Math.min(2200,dist*f));
        const d=new THREE.Vector3().subVectors(cam.position,target).normalize(); cam.position.copy(target).addScaledVector(d,dist); cam.lookAt(target);
        const nr=Math.max(0.07,Math.min(0.5, ARC_RAD_BASE*dist/300));   // тоньше при приближении
        if(Math.abs(nr-arcRad)/arcRad>0.08){ arcRad=nr; if(!morphing) applyMorph(morph); } }
      dom.addEventListener('pointerdown',e=>{ if(morphing)return; ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY}); interacting=true; if(ptrs.size===1) tapStart={x:e.clientX,y:e.clientY,t:performance.now()}; try{dom.setPointerCapture(e.pointerId);}catch(_){}  });
      dom.addEventListener('pointermove',e=>{ if(morphing||!ptrs.has(e.pointerId))return;
        const prev=ptrs.get(e.pointerId), cur={x:e.clientX,y:e.clientY}; ptrs.set(e.pointerId,cur); const flat=morph>0.5;
        if(tapStart && Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)>7) tapStart=null;
        if(ptrs.size===1){ const dx=cur.x-prev.x,dy=cur.y-prev.y; if(flat)panCam(dx,dy); else rotateGlobe(dx,dy); }
        else if(ptrs.size>=2){ const a=[...ptrs.values()], d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y), ang=Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);
          if(pinchD) zoomCam(pinchD/d); if(!flat&&pinchA!==null) rollGlobe(ang-pinchA); pinchD=d; pinchA=ang; } });
      function endP(e){ ptrs.delete(e.pointerId); if(ptrs.size<2){pinchD=0;pinchA=null;} if(ptrs.size===0){interacting=false;resumeAt=performance.now()+3000;} }
      dom.addEventListener('pointerup',e=>{ if(tapStart && Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)<7 && performance.now()-tapStart.t<420) pickCity(e.clientX,e.clientY); tapStart=null; endP(e); }); dom.addEventListener('pointercancel',endP);
      dom.addEventListener('wheel',e=>{ if(morphing)return; e.preventDefault(); zoomCam(e.deltaY<0?0.9:1/0.9); },{passive:false});
    }

    const tmpVy=new THREE.Vector3(); let gt=0;
    function tick(){ gt+=0.016; for(let m=0;m<arcMats.length;m++) arcMats[m].uniforms.uTime.value=gt;
      // кольца Вырицы — плавный медленный пульс
      if(vyrObj){ vyrObj.getWorldPosition(tmpVy);
        rings.forEach(s=>{ s.position.copy(tmpVy); let ph=(gt*0.3+s.userData.ph)%1;
          const sc=lerp(2,13,ph); s.scale.set(sc,sc,1); s.material.opacity=Math.max(0,(1-ph)*(1-ph)*0.7); }); }
      if(autoOn && morph<0.5 && !interacting && !morphing && performance.now()>resumeAt) spin+=0.0016;  // вращение глобуса вокруг своей оси (запад→восток)
      if(morph<0.5 && !morphing) world.rotation.y=spin;
      updateLabels();
      if(cardFor){ cardFor.getWorldPosition(tmpV); const fd=tmpV.clone().normalize().dot(camN); tmpV.project(cam);
        if(tmpV.z<1 && (morph>0.5||fd>0)){ cardEl.style.display='block'; cardEl.style.left=Math.round((tmpV.x*0.5+0.5)*host.clientWidth)+'px'; cardEl.style.top=Math.round((-tmpV.y*0.5+0.5)*host.clientHeight)+'px'; }
        else cardEl.style.display='none'; }
      renderer.render(scene,cam); requestAnimationFrame(tick);
    }
    tick();
    function resize(){ const w=host.clientWidth,h=host.clientHeight; cam.aspect=w/h; cam.updateProjectionMatrix(); renderer.setSize(w,h); fitCam(); }
    window.addEventListener('resize',resize);

    // целевой ракурс для состояния t: плоская — анфас; шар — самонаведение на Вырицу (СЗ)
    function viewFor(t){ const sp=cam.position.clone(), su=cam.up.clone(), sm=morph;
      let pos,up;
      if(t>0.5){ pos=new THREE.Vector3(0,0,camZplane); up=new THREE.Vector3(0,1,0); }
      else { spin=0; applyMorph(0); aimVyritsa(); pos=cam.position.clone(); up=cam.up.clone();
        cam.position.copy(sp); cam.up.copy(su); applyMorph(sm); cam.lookAt(target); }
      return {pos,up};
    }
    function animateMorph(to,dur){ const from=morph,t0=performance.now(); dur=dur||1300;
      if(to<0.5) spin=0;
      const v=viewFor(to), camFrom=cam.position.clone(), camTo=v.pos;
      morphing=true; cancelAnimationFrame(anim);
      function step(now){ let k=Math.min(1,(now-t0)/dur); const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
        applyMorph(lerp(from,to,e)); cam.position.lerpVectors(camFrom,camTo,e); cam.up.set(0,1,0); cam.lookAt(0,0,0);
        if(k<1) anim=requestAnimationFrame(step);
        else { morphing=false; target.set(0,0,0); cam.up.copy(v.up); cam.position.copy(camTo);
          dist=cam.position.distanceTo(target); cam.lookAt(target); resumeAt=performance.now()+2600; } }
      anim=requestAnimationFrame(step);
    }
    function setView(t){ target.set(0,0,0); if(t<0.5)spin=0; const v=viewFor(t);
      cam.position.copy(v.pos); cam.up.copy(v.up); dist=cam.position.distanceTo(target); cam.lookAt(target); resumeAt=performance.now()+2600; }

    return { THREE,scene,cam,renderer,earth,resize,
      setMorph:(t)=>{ applyMorph(t); setView(t); },
      toggle:()=>animateMorph(morph>0.5?0:1), morphTo:(t,dur)=>animateMorph(t,dur), isFlat:()=>morph>0.5,
      resetView:()=>{ cardEl.style.display='none'; cardFor=null; setView(morph); },
      setTexture:(url,nf)=>{ const t=new THREE.TextureLoader().load(url); if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;
        const old=earth.material.map; earth.material.map=t; earth.material.needsUpdate=true; if(old&&old!==t)old.dispose();
        if(nf!=null){ nightFloor=nf; updateDayNight(); } } };
  };
})();
