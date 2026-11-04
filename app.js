import * as THREE from "three";

const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
const isMobile = matchMedia("(max-width: 800px)").matches;
const quality = lowPower || isMobile ? 0.65 : 1;

// Boot sequence
let bootValue = 0;
const bootTimer = setInterval(() => {
  bootValue = Math.min(100, bootValue + (bootValue < 70 ? 7 : 3));
  $("#boot-percent").textContent = String(bootValue).padStart(2,"0");
  $(".boot-line i").style.width = bootValue + "%";
  if (bootValue >= 100) {
    clearInterval(bootTimer);
    setTimeout(() => $("#boot").classList.add("done"), 180);
  }
}, 32);

// Three.js: one shared canvas, adaptive DPR and graceful 2D fallback.
let renderer, scene, camera, particles, core, rings, fallback = false;
const canvas = $("#world");
const pointer = {x:0,y:0,tx:0,ty:0};
let scrollProgress = 0;
try {
  renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias: !lowPower, powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 1 ? 1.7 : 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, .1, 150);
  camera.position.set(0,0,13);
  const count = isMobile ? 900 : 1800;
  const positions = new Float32Array(count*3);
  const colors = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const radius = 3 + Math.random()*24;
    const theta = Math.random()*Math.PI*2;
    const phi = Math.acos(2*Math.random()-1);
    positions[i*3] = radius*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1] = radius*Math.sin(phi)*Math.sin(theta);
    positions[i*3+2] = radius*Math.cos(phi);
    const c = new THREE.Color().setHSL(.53 + Math.random()*.07,.65,.45 + Math.random()*.35);
    colors.set([c.r,c.g,c.b],i*3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.BufferAttribute(positions,3));
  geo.setAttribute("color",new THREE.BufferAttribute(colors,3));
  const mat = new THREE.PointsMaterial({size:isMobile?.025:.035,vertexColors:true,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending});
  particles = new THREE.Points(geo,mat);
  scene.add(particles);

  core = new THREE.Group();
  const coreGeo = new THREE.IcosahedronGeometry(1.05,2);
  const coreMat = new THREE.MeshBasicMaterial({color:0x55cfff,wireframe:true,transparent:true,opacity:.18});
  const coreMesh = new THREE.Mesh(coreGeo,coreMat);
  core.add(coreMesh);
  const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(.48,1),new THREE.MeshBasicMaterial({color:0x9ce4ff,wireframe:true,transparent:true,opacity:.34}));
  core.add(inner);
  scene.add(core);
  rings = new THREE.Group();
  for(let i=0;i<3;i++){
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7+i*.38,.006,6,140),new THREE.MeshBasicMaterial({color:i===1?0x4fcaff:0x8bcce8,transparent:true,opacity:.3-i*.05}));
    ring.rotation.x = Math.PI*(.25+i*.19);
    ring.rotation.y = i*.7;
    rings.add(ring);
  }
  scene.add(rings);
} catch(e) {
  fallback = true;
  canvas.style.display = "none";
  document.body.classList.add("no-webgl");
}

let rafId = 0;
function render(){
  rafId = requestAnimationFrame(render);
  if(!renderer || !scene) return;
  pointer.x += (pointer.tx-pointer.x)*.035;
  pointer.y += (pointer.ty-pointer.y)*.035;
  const t = performance.now()*.00015;
  particles.rotation.y = t*.55 + pointer.x*.12;
  particles.rotation.x = t*.2 + pointer.y*.1;
  const targetZ = 13 - scrollProgress*3.6;
  camera.position.z += (targetZ-camera.position.z)*.025;
  camera.position.x += (pointer.x*.7-camera.position.x)*.025;
  camera.position.y += (-pointer.y*.45-camera.position.y)*.025;
  camera.lookAt(0,0,0);
  const energy = .65 + Math.sin(t*8)*.08 + scrollProgress*.5;
  core.scale.setScalar(energy);
  core.rotation.x = t*1.5;
  core.rotation.y = t*1.1;
  rings.rotation.z = -t*.6;
  rings.rotation.x = .2 + pointer.y*.12;
  const visibility = scrollProgress > .08 && scrollProgress < .92 ? 1 : .62;
  core.visible = true;
  particles.material.opacity = visibility*.72;
  renderer.render(scene,camera);
}
if(!reducedMotion) render();
else if(renderer){ renderer.render(scene,camera); }

function resize(){
  if(renderer && camera){ camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality===1?1.7:1));}
}
addEventListener("resize",resize,{passive:true});
addEventListener("pointermove",e=>{pointer.tx=(e.clientX/innerWidth-.5)*2;pointer.ty=(e.clientY/innerHeight-.5)*2;},{passive:true});

// Smooth scroll + scroll-driven scenes
let lenis;
if(window.Lenis && !reducedMotion){
  lenis = new Lenis({duration:1.15,smoothWheel:true,orientation:"vertical",gestureOrientation:"vertical",smoothTouch:false,touchMultiplier:1.2});
  function lenisRaf(time){lenis.raf(time);requestAnimationFrame(lenisRaf)}
  requestAnimationFrame(lenisRaf);
}
if(window.gsap && window.ScrollTrigger && !reducedMotion){
  gsap.registerPlugin(ScrollTrigger);
  if(lenis) lenis.on("scroll",ScrollTrigger.update);
  gsap.ticker.lagSmoothing(0);
  $$(".scene").forEach((section,i)=>{
    gsap.fromTo($$(".reveal",section),{y:24,opacity:0},{y:0,opacity:1,duration:.9,stagger:.08,ease:"power2.out",scrollTrigger:{trigger:section,start:"top 72%",once:true}});
    ScrollTrigger.create({trigger:section,start:"top center",end:"bottom center",onEnter:()=>setScene(i),onEnterBack:()=>setScene(i)});
  });
  gsap.to(".hero-title",{yPercent:-12,opacity:.65,ease:"none",scrollTrigger:{trigger:".hero",start:"top top",end:"bottom top",scrub:true}});
} else {
  $$(".reveal").forEach(el=>{el.style.opacity=1;el.style.transform="none"});
  addEventListener("scroll",()=>{const p=scrollY/(document.documentElement.scrollHeight-innerHeight||1);setScene(Math.min(4,Math.floor(p*5)));},{passive:true});
}
function setScene(i){
  scrollProgress = i/4;
  $("#progress-number").textContent=String(i+1).padStart(2,"0");
  $("#progress-fill").style.height=((i+1)/5*100)+"%";
  if(i===1){
    const n=Math.min(4,Math.max(0,Math.floor((scrollY-innerHeight*.8)/(innerHeight*.11))));
    $$(".era").forEach((el,j)=>el.classList.toggle("active",j===n));
  }
}
addEventListener("scroll",()=>{
  const p=scrollY/(document.documentElement.scrollHeight-innerHeight||1);
  $("#progress-fill").style.height=(Math.min(1,p)*100)+"%";
},{passive:true});

// Navigation + skip intro
const nav=$("#nav-overlay"), menu=$("#menu-toggle");
menu.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));});
$$(".nav-overlay a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menu.setAttribute("aria-expanded","false")}));
$("#skip-intro").addEventListener("click",()=>$("#experience").scrollIntoView({behavior:reducedMotion?"auto":"smooth"}));

// Data-driven dashboard
const categoryGrid=$("#category-grid"), projectPanel=$("#project-panel"), projectList=$("#project-list");
let catalog={categories:[],projects:[]};
const icons={"AI & INTELLIGENCE":"⌘","WEB APPLICATIONS":"▤","SOFTWARE & TOOLS":"◈","DIGITAL EXPERIENCES":"◎","EXPERIMENTAL PROJECTS":"✳","RESEARCH & DEVELOPMENT":"⌬","ABOUT NONONICK":"N.","CONTACT":"↗"};
async function loadCatalog(){
  try{
    const response=await fetch("./projects.json",{cache:"no-store"});
    if(!response.ok) throw new Error("Catalog unavailable");
    catalog=await response.json();
  }catch(err){
    catalog={categories:[],projects:[]};
    projectList.innerHTML='<p class="empty-state">Project catalog could not be loaded. Run this site from a local server or publish it to GitHub Pages.</p>';
  }
  renderCategories();
}
function renderCategories(){
  categoryGrid.innerHTML="";
  catalog.categories.forEach((cat,i)=>{
    const button=document.createElement("button");
    button.className="category-tile";
    button.type="button";
    button.innerHTML=`<span class="tile-number">0${i+1} / SECTOR</span><span class="tile-arrow">↗</span><span class="tile-icon">${icons[cat.title]||"◇"}</span><span class="tile-title">${escapeHTML(cat.title)}</span><span class="tile-desc">${escapeHTML(cat.description||"EXPLORE THE SECTOR")}</span>`;
    button.addEventListener("click",()=>openCategory(cat));
    categoryGrid.appendChild(button);
  });
  $("#project-count").textContent=`${catalog.projects.length} PROJECTS INDEXED`;
}
function openCategory(cat){
  $("#panel-eyebrow").textContent=`SECTOR / ${String(catalog.categories.indexOf(cat)+1).padStart(2,"0")}`;
  $("#panel-title").textContent=cat.title;
  const projects=catalog.projects.filter(p=>p.category===cat.id);
  projectList.innerHTML="";
  if(!projects.length){
    const empty=document.createElement("p");empty.className="empty-state";empty.textContent=cat.emptyMessage||"No projects have been published in this sector yet. Add one in projects.json.";projectList.appendChild(empty);
  }else{
    projects.forEach(p=>{
      const item=document.createElement("article");item.className="project-item";
      const img=document.createElement("img");img.className="project-thumb";img.loading="lazy";img.alt=p.title+" preview";img.src=p.image||"";
      img.onerror=()=>{img.removeAttribute("src");img.style.background="linear-gradient(135deg,#0b2635,#071018)";};
      const copy=document.createElement("div");const h=document.createElement("h4");h.textContent=p.title;const desc=document.createElement("p");desc.textContent=p.description||"";copy.append(h,desc);
      const link=document.createElement("a");link.href=p.url||"#";link.textContent=p.url?"OPEN ↗":"COMING SOON";link.target=p.url?"_blank":"_self";link.rel="noopener noreferrer";if(!p.url)link.addEventListener("click",e=>e.preventDefault());
      item.append(img,copy,link);projectList.appendChild(item);
    });
  }
  projectPanel.classList.add("open");
  projectPanel.scrollIntoView({behavior:reducedMotion?"auto":"smooth",block:"nearest"});
}
$("#panel-close").addEventListener("click",()=>projectPanel.classList.remove("open"));
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
loadCatalog();

// Release GPU resources if page is discarded.
addEventListener("pagehide",()=>{
  cancelAnimationFrame(rafId);
  if(lenis)lenis.destroy();
  if(renderer){
    scene.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material.dispose();}});
    renderer.dispose();renderer.forceContextLoss();
  }
});
