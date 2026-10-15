import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const C=(h)=>new THREE.Color(h);
const isMobile=matchMedia('(pointer:coarse)').matches||innerWidth<700;
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,isMobile?1.5:1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(isMobile?55:45,innerWidth/innerHeight,0.1,400);
scene.fog=new THREE.Fog(0xffe4cc,40,120);

// ---------- sky
const skyU={top:{value:C('#8ec5ff')},bot:{value:C('#ffe3c8')},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:C('#fff2d6')},stars:{value:0},t:{value:0}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(300,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:skyU,
 vertexShader:`varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform vec3 top,bot,sunDir,sunCol;uniform float stars,t;varying vec3 vP;
 float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
 void main(){float y=clamp(vP.y*1.3+.12,0.,1.);vec3 c=mix(bot,top,pow(y,.6));
 vec3 sd=normalize(sunDir);float d=max(dot(vP,sd),0.);
 float hz=exp(-abs(vP.y-.02)*9.);c=mix(c,mix(bot,sunCol,.35)*1.15,hz*.55);
 float az=max(dot(normalize(vP.xz+1e-4),normalize(sd.xz+1e-4)),0.);c+=sunCol*hz*pow(az,6.)*.45;
 c+=sunCol*(smoothstep(.9993,.9997,d)*6.+pow(d,1200.)*3.+pow(d,60.)*.6+pow(d,8.)*.25);
 c+=(h(vP*400.+t)-.5)/255.;
 vec3 q=floor(vP*180.);float s=step(.996,h(q))*stars*smoothstep(.05,.4,vP.y);s*=.6+.4*sin(t*2.+h(q)*30.);c+=vec3(s);
 gl_FragColor=vec4(c,1.);}`}));
scene.add(sky);

// ---------- lights
const hemi=new THREE.HemisphereLight(0xfff1e0,0xb8d89a,0.9);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d8,2.2);sun.castShadow=true;
sun.shadow.mapSize.set(isMobile?1024:2048,isMobile?1024:2048);
Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:120});sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.03;sun.shadow.radius=4;
scene.add(sun,sun.target);

const RIM={uRim:{value:C('#ffd9b0')},uRimI:{value:.5}};
function rimify(m,extra){m.onBeforeCompile=s=>{s.uniforms.uRim=RIM.uRim;s.uniforms.uRimI=RIM.uRimI;if(extra)extra(s);
 s.fragmentShader='uniform vec3 uRim;uniform float uRimI;\n'+s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 float rimF=pow(1.-clamp(dot(normalize(vViewPosition),normal),0.,1.),2.5);totalEmissiveRadiance+=uRim*rimF*uRimI*(diffuseColor.rgb*.6+.4)*.6;`);};return m;}
const M=(c,o={})=>rimify(new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,metalness:0},o)));
const add=(g,m,x=0,y=0,z=0,cs=true,rs=true)=>{const me=new THREE.Mesh(g,m);me.position.set(x,y,z);me.castShadow=cs;me.receiveShadow=rs;scene.add(me);return me;};
const colliders=[];const ISL=21;

// ---------- island & water
const ig=new THREE.CylinderGeometry(ISL+1,ISL-1.5,1.2,64,1);
const groundTex=(()=>{const c=document.createElement('canvas');c.width=c.height=1024;const x=c.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,1024,1024);
 for(let i=0;i<260;i++){const px=Math.random()*1024,py=Math.random()*1024,r=30+Math.random()*120;const g=x.createRadialGradient(px,py,0,px,py,r);const k=Math.random();
  const col=k<.45?'rgba(150,200,120,':k<.8?'rgba(255,250,200,':'rgba(120,170,110,';g.addColorStop(0,col+(.18+Math.random()*.2)+')');g.addColorStop(1,col+'0)');x.fillStyle=g;x.fillRect(px-r,py-r,r*2,r*2);}
 const g=x.createRadialGradient(512,512,380,512,512,512);g.addColorStop(0,'rgba(255,240,200,0)');g.addColorStop(1,'rgba(230,240,170,.5)');x.fillStyle=g;x.fillRect(0,0,1024,1024);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;})();
add(ig,M('#a8d47f',{roughness:.95,map:groundTex}),0,-0.6,0,false,true);
// soft grass rim
add(new THREE.TorusGeometry(ISL+0.5,0.7,10,64).rotateX(Math.PI/2),M('#9ccb74'),0,-0.25,0,false,true);
const cliff=new THREE.CylinderGeometry(ISL-1,6,10,40,3);{const p=cliff.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<4.9){const a=Math.atan2(p.getZ(i),p.getX(i));const k=1+0.08*Math.sin(a*7+y)+0.05*Math.sin(a*13);p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}}cliff.computeVertexNormals();}
add(cliff,M('#d9a77c',{flatShading:true}),0,-6.2,0,false,false);
const waterU={t:{value:0},deep:{value:C('#5fb7d0')},col:{value:C('#9fd8e6')},skyc:{value:C('#ffe3c8')},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:C('#fff')},spark:{value:1}};
function waterMat(isPond){return new THREE.ShaderMaterial({fog:true,transparent:true,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{}]),
 vertexShader:`varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main(){vec4 wp=modelMatrix*vec4(position,1.);vW=wp.xyz;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}`,
 fragmentShader:`uniform float t,spark;uniform vec3 deep,col,skyc,sunDir,sunCol;varying vec3 vW;\n#include <fog_pars_fragment>\n
 float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec2 p=vW.xz*${isPond?'1.6':'0.35'};float a=t*${isPond?'0.8':'0.5'};
  float dx=cos(p.x*1.3+a)*.5+cos((p.x+p.y)*2.1-a*1.3)*.35+cos(p.x*4.7+p.y*1.1+a*2.)*.15;
  float dz=cos(p.y*1.1-a*.9)*.5+cos((p.y-p.x)*1.9+a*1.1)*.35+cos(p.y*5.3-p.x*.7+a*1.7)*.15;
  vec3 N=normalize(vec3(dx*.18,1.,dz*.18));vec3 V=normalize(cameraPosition-vW);
  float fr=.04+.96*pow(1.-max(dot(N,V),0.),5.);
  float r=length(vW.xz);vec3 base=${isPond?'mix(deep*.75,col,.35+.4*smoothstep(3.2,.5,length(vW.xz-vec2(6.,5.))))':'mix(col,deep,smoothstep(24.,90.,r))'};
  vec3 c=mix(base,skyc,clamp(fr*${isPond?'0.6':'1.0'},0.,${isPond?'0.4':'0.7'}));
  vec3 Rf=reflect(-V,N);vec3 sd=normalize(sunDir);float sp=pow(max(dot(Rf,sd),0.),180.);
  vec2 g=floor(vW.xz*${isPond?'9.':'3.'});float gl=step(.985,h2(g+floor(t*3.)))*pow(max(dot(Rf,sd),0.),8.);
  c+=sunCol*(sp*3.+gl*2.5)*spark;
  ${isPond?'float sh=smoothstep(2.4,3.2,length(vW.xz-vec2(6.,5.)));c=mix(c,vec3(1.),sh*.25*(.6+.4*sin(t*2.+atan(vW.z-5.,vW.x-6.)*8.)));':'float f=smoothstep(4.5,0.,r-22.5+sin(atan(vW.z,vW.x)*12.+t*.8)*.6);c=mix(c,vec3(1.,.98,.95),f*(.55+.25*sin(r*3.-t*2.)));'}
  gl_FragColor=vec4(c,${isPond?'0.93':'1.0'});\n#include <fog_fragment>\n}`});}
const mkW=(isPond)=>{const m=waterMat(isPond);Object.assign(m.uniforms,waterU);return m;};
const water=add(new THREE.CircleGeometry(260,96).rotateX(-Math.PI/2),mkW(false),0,-3.2,0,false,false);
// big soft clouds
const cloudM=new THREE.MeshLambertMaterial({color:'#ffffff',emissive:'#ffffff',emissiveIntensity:.35});const clouds=new THREE.Group();scene.add(clouds);
for(let i=0;i<9;i++){const g=new THREE.Group();const a=i/9*Math.PI*2,r=70+Math.random()*30;g.position.set(Math.cos(a)*r,18+Math.random()*14,Math.sin(a)*r);
 for(let j=0;j<7;j++){const s=new THREE.Mesh(new THREE.SphereGeometry(2.5+Math.random()*3.5,20,14),cloudM);s.position.set((j-2)*3.5,Math.random()*2-(Math.abs(j-2)),Math.random()*2);s.scale.y=.75;g.add(s);}
 g.lookAt(0,g.position.y,0);clouds.add(g);}

// ---------- cottage
const house=new THREE.Group();house.position.set(-6,0,-6);house.rotation.y=0.5;scene.add(house);
const hAdd=(g,m,x,y,z)=>{const me=new THREE.Mesh(g,m);me.position.set(x,y,z);me.castShadow=me.receiveShadow=true;house.add(me);return me;};
const rbox=(w,h,d,r=.25)=>{const g=new THREE.BoxGeometry(w,h,d,4,4,4);const p=g.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const hx=w/2-r,hy=h/2-r,hz=d/2-r;const c=new THREE.Vector3(THREE.MathUtils.clamp(v.x,-hx,hx),THREE.MathUtils.clamp(v.y,-hy,hy),THREE.MathUtils.clamp(v.z,-hz,hz));v.sub(c).normalize().multiplyScalar(r).add(c);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();return g;};
hAdd(rbox(6,4,5,.35),M('#fff3e2'),0,2,0);
hAdd(rbox(6.4,.5,5.4,.2),M('#e8c9a6'),0,.25,0);
const roofShape=new THREE.Shape();roofShape.moveTo(-3.8,0);roofShape.lineTo(0,2.9);roofShape.lineTo(3.8,0);roofShape.lineTo(-3.8,0);
const roofG=new THREE.ExtrudeGeometry(roofShape,{depth:6,bevelEnabled:true,bevelSize:.25,bevelThickness:.25,bevelSegments:3});roofG.translate(0,0,-3);
hAdd(roofG,M('#e8836b'),0,3.9,0);
hAdd(rbox(.9,2,.9,.15),M('#c9a68c'),1.8,6.2,-1);
const winMat=M('#6a5a50',{emissive:'#ffb85c',emissiveIntensity:0});
const doorM=M('#b5775a');hAdd(rbox(1.3,2.2,.3,.12),doorM,0,1.4,2.5);
hAdd(new THREE.SphereGeometry(.08,8,8),M('#ffd27a',{metalness:.6,roughness:.3}),.4,1.4,2.7);
for(const [x,y,z,ry] of [[-1.8,2.3,2.52,0],[1.8,2.3,2.52,0],[3.02,2.3,0,Math.PI/2],[-3.02,2.3,0,Math.PI/2]]){
 const w=hAdd(rbox(1.2,1.2,.12,.05),winMat,x,y,z);w.rotation.y=ry;
 const fr=hAdd(rbox(1.45,1.45,.08,.06),M('#ffffff'),x-(ry?Math.sign(x)*-0.03:0),y,z-(ry?0:0.03));fr.rotation.y=ry;
 const box=hAdd(rbox(1.4,.35,.4,.1),M('#c98a62'),x+(ry?Math.sign(x)*.25:0),y-.85,z+(ry?0:.25));box.rotation.y=ry;
 for(let k=-1;k<=1;k++){const f=hAdd(new THREE.SphereGeometry(.17,10,8),M(['#ff9db5','#ffd166','#ff8f8f'][k+1]),0,0,0);const off=k*.4;f.position.set(x+(ry?Math.sign(x)*.3:off),y-.6,z+(ry?off:.3));}}
const houseLight=new THREE.PointLight(0xffa952,0,14,1.6);houseLight.position.set(0,2.2,3.6);house.add(houseLight);
house.updateMatrixWorld();
{const p=new THREE.Vector3(0,0,0).applyMatrix4(house.matrixWorld);colliders.push({x:p.x,z:p.z,r:3.9});
 for(const s of [-1.6,1.6]){const q=new THREE.Vector3(s,0,0).applyMatrix4(house.matrixWorld);colliders.push({x:q.x,z:q.z,r:2.9});}}

// ---------- trees
const leafCols=['#8cc66b','#9fd47a','#7bb862','#ffb7c5','#ffcf9e','#b4dd7f'];
function tree(x,z,s=1,ci){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g);
 const tr=new THREE.Mesh(new THREE.CylinderGeometry(.22,.35,2.2,8),M('#b98463'));tr.position.y=1.1;tr.castShadow=true;g.add(tr);
 const col=leafCols[ci??Math.floor(Math.random()*leafCols.length)];const lm=M(col,{flatShading:true,roughness:.8,vertexColors:true,emissive:col,emissiveIntensity:.08});
 const blobs=[[0,2.9,0,1.5],[.8,2.5,.3,1.05],[-.7,2.6,-.2,1.1],[.1,3.7,.1,1.0]];
 for(const[a,b,c,r]of blobs){const m=new THREE.Mesh(leafGeo(r,b),lm);m.position.set(a,b,c);m.castShadow=true;m.receiveShadow=true;g.add(m);}
 g.userData.ph=Math.random()*6;trees.push(g);colliders.push({x,z,r:.7*s});}
const trees=[];
function leafGeo(r,yo){const g=new THREE.IcosahedronGeometry(r,1);const p=g.attributes.position;const cs=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){const y=(p.getY(i)+yo-1.5)/3;const k=THREE.MathUtils.clamp(.62+y*.55,.55,1.18)+(Math.random()-.5)*.06;cs[i*3]=k*1.02;cs[i*3+1]=k;cs[i*3+2]=k*.94;}
 g.setAttribute('color',new THREE.BufferAttribute(cs,3));return g;}
[[6,-9,1.2,0],[10,-4,1,3],[-12,4,1.1,1],[-9,9,.9,4],[6,15,1,2],[13,7,.95,5],[-14,-5,1.15,0],[-2,-14,1.05,3],[9,-13,.9,1],[15,-1,.8,4],[-6,15,.85,0],[-16,1,.8,3]].forEach(a=>tree(...a));

// ---------- pond
const pond={x:6,z:5,r:3.2};
add(new THREE.CircleGeometry(pond.r,48).rotateX(-Math.PI/2),mkW(true),pond.x,0.03,pond.z,false,false);
add(new THREE.RingGeometry(pond.r-.2,pond.r+.5,40).rotateX(-Math.PI/2),M('#cfe6a8'),pond.x,0.02,pond.z,false,true);
colliders.push({x:pond.x,z:pond.z,r:pond.r+.2});
const stoneM=M('#e6ddd3',{flatShading:true});
for(let i=0;i<14;i++){const a=i/14*Math.PI*2+Math.random()*.2;const s=add(new THREE.DodecahedronGeometry(.35+Math.random()*.25,0),stoneM,pond.x+Math.cos(a)*(pond.r+.4),.1,pond.z+Math.sin(a)*(pond.r+.4));s.scale.y=.55;}
const pads=[];for(let i=0;i<4;i++){const p=add(new THREE.CircleGeometry(.45,16,.3,Math.PI*1.8).rotateX(-Math.PI/2),M('#7cc06a'),pond.x+Math.cos(i*1.7)*1.6,.06,pond.z+Math.sin(i*1.7)*1.4,false,true);pads.push(p);}
add(new THREE.SphereGeometry(.16,10,8),M('#ffc2d4'),pond.x+Math.cos(1.7)*1.6,.15,pond.z+Math.sin(1.7)*1.4);

// ---------- path stones & fence
{const d0=new THREE.Vector3(0,0,3.5).applyMatrix4(house.matrixWorld);const geo=[];
 for(let t=0;t<=1;t+=.07){const x=THREE.MathUtils.lerp(d0.x,pond.x-2.5,t)+Math.sin(t*6)*.8,z=THREE.MathUtils.lerp(d0.z,pond.z-1,t);
  const g=new THREE.CylinderGeometry(.5+Math.random()*.15,.55,.08,10);g.translate(x,.04,z);geo.push(g);}
 for(let t=0;t<=1;t+=.08){const g=new THREE.CylinderGeometry(.45,.5,.08,10);g.translate(-2+Math.sin(t*5)*1.2,.04,THREE.MathUtils.lerp(-1,18,t));geo.push(g);}
 const ps=new THREE.Mesh(mergeGeometries(geo),M('#f1e4d0'));ps.receiveShadow=true;scene.add(ps);}
{const geo=[];const fx=-9,fz=-1;
 for(let i=0;i<9;i++){const a=-.3+i*.2;const x=fx+Math.cos(a+Math.PI)*0,z=fz+i*1.1;const p=new THREE.CylinderGeometry(.12,.14,1.1,8);p.translate(-13.5,.55,-1+i*1.1);geo.push(p);const t=new THREE.SphereGeometry(.14,8,6);t.translate(-13.5,1.12,-1+i*1.1);geo.push(t);}
 for(const y of[.45,.85]){const r=new THREE.BoxGeometry(.08,.12,8.8);r.translate(-13.5,y,3.4);geo.push(r);}
 for(let i=0;i<6;i++){const p=new THREE.CylinderGeometry(.12,.14,1.1,8);p.translate(-13.5+i*1.1,.55,-1.4);geo.push(p);const t=new THREE.SphereGeometry(.14,8,6);t.translate(-13.5+i*1.1,1.12,-1.4);geo.push(t);}
 for(const y of[.45,.85]){const r=new THREE.BoxGeometry(5.5,.12,.08);r.translate(-10.75,y,-1.4);geo.push(r);}
 const f=new THREE.Mesh(mergeGeometries(geo),M('#fff6ea'));f.castShadow=f.receiveShadow=true;scene.add(f);
 for(let i=0;i<9;i++)colliders.push({x:-13.5,z:-1+i*1.1,r:.35});for(let i=0;i<6;i++)colliders.push({x:-13.5+i*1.1,z:-1.4,r:.35});}
// veggie garden & bench & mailbox
for(let i=0;i<3;i++)for(let j=0;j<4;j++){add(new THREE.SphereGeometry(.32,10,8),M(['#f4a261','#9fd47a','#ff8fa3'][i]),-12.2+i*1.1,.25,0+j*1.6);}
// lanterns
const lanternM=M('#fff1d6',{emissive:'#ffc46b',emissiveIntensity:0});const lanterns=[];
for(const [x,z] of [[-.6,1],[2.2,2.4],[-3.4,8],[-.6,13],[3.5,7.8]]){add(new THREE.CylinderGeometry(.07,.09,1.6,8),M('#8a6b5a'),x,.8,z);const l=add(new THREE.SphereGeometry(.28,14,10),lanternM,x,1.75,z,false,false);lanterns.push(l);colliders.push({x,z,r:.3});}
// bench
{const g=[];const b=new THREE.BoxGeometry(2.2,.15,.6);b.translate(0,.55,0);g.push(b);const bk=new THREE.BoxGeometry(2.2,.5,.12);bk.translate(0,.95,-.3);g.push(bk);for(const s of[-.9,.9]){const l=new THREE.BoxGeometry(.12,.55,.5);l.translate(s,.27,0);g.push(l);}
 const bench=new THREE.Mesh(mergeGeometries(g),M('#c99572'));bench.position.set(9.8,0,4.3);bench.rotation.y=-1.6;bench.castShadow=bench.receiveShadow=true;scene.add(bench);colliders.push({x:9.8,z:4.3,r:1});}
// rocks + mushrooms
for(const[x,z,s]of[[14,-8,1],[-8,-12,.8],[16,4,.7],[-17,8,.9],[1,-17,.7]]){const r=add(new THREE.DodecahedronGeometry(s,0),M('#e0d6cc',{flatShading:true}),x,s*.3,z);r.scale.y=.7;colliders.push({x,z,r:s*.9});}
for(const[x,z]of[[8,-8],[-10,6],[11,-5],[-13,-3.5],[4,13]]){add(new THREE.CylinderGeometry(.09,.12,.35,8),M('#fff4e6'),x,.17,z);const c=add(new THREE.SphereGeometry(.28,14,8,0,Math.PI*2,0,Math.PI/2),M('#ff7a6b'),x,.3,z);c.scale.y=.75;}

// ---------- grass (instanced, swaying)
const sway={value:0};
function swayMat(col){const m=M(col,{side:THREE.DoubleSide,roughness:1});m.onBeforeCompile=s=>{s.uniforms.uT=sway;s.vertexShader='uniform float uT;\n'+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 wp=instanceMatrix*vec4(0.,0.,0.,1.);float k=max(position.y,0.)*0.9;transformed.x+=sin(uT*1.6+wp.x*.35+wp.z*.25)*.18*k;transformed.z+=cos(uT*1.3+wp.x*.2)*.12*k;`);};return m;}
const free=(x,z,pad=.4)=>{if(Math.hypot(x,z)>ISL-1)return false;for(const c of colliders)if(Math.hypot(x-c.x,z-c.z)<c.r+pad)return false;return true;};
{const N=isMobile?3500:9000;const g=new THREE.ConeGeometry(.06,.4,3,2);g.translate(0,.2,0);
 const im=new THREE.InstancedMesh(g,swayMat('#a6d27e'),N);const d=new THREE.Object3D();const col=new THREE.Color();let n=0;
 while(n<N){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*(ISL-.8);const x=Math.cos(a)*r,z=Math.sin(a)*r;if(!free(x,z,.1))continue;
  d.position.set(x,0,z);d.rotation.set(0,Math.random()*3,0);d.scale.set(1,.6+Math.random()*.9,1);d.updateMatrix();im.setMatrixAt(n,d.matrix);
  {const k=Math.random();im.setColorAt(n,col.set(k<.15?'#fff2b8':k<.5?'#d8f0b0':'#ffffff').multiplyScalar(.85+Math.random()*.25));}n++;}
 im.receiveShadow=true;scene.add(im);}
// flowers
{const N=isMobile?260:420;const head=new THREE.SphereGeometry(.12,8,6);head.translate(0,.42,0);const stem=new THREE.CylinderGeometry(.02,.02,.4,4);stem.translate(0,.2,0);
 const fm=swayMat('#ffffff');fm.emissive=C('#ffffff');fm.emissiveIntensity=.12;const ih=new THREE.InstancedMesh(head,fm,N),is=new THREE.InstancedMesh(stem,swayMat('#6aa850'),N);
 const fc=['#ffb3c6','#fff0a6','#ffffff','#ffc9a3','#d9c2ff','#ff9aa2'];const d=new THREE.Object3D();let n=0;const c=new THREE.Color();
 while(n<N){let x,z;if(Math.random()<.5){const cl=[[-9,-9],[3,9],[12,-2],[-4,6],[-15,4]][Math.floor(Math.random()*5)];x=cl[0]+(Math.random()-.5)*6;z=cl[1]+(Math.random()-.5)*6;}else{const a=Math.random()*6.28,r=Math.sqrt(Math.random())*(ISL-1.5);x=Math.cos(a)*r;z=Math.sin(a)*r;}
  if(!free(x,z,.3))continue;d.position.set(x,0,z);d.scale.setScalar(.8+Math.random()*.6);d.updateMatrix();ih.setMatrixAt(n,d.matrix);is.setMatrixAt(n,d.matrix);ih.setColorAt(n,c.set(fc[Math.floor(Math.random()*fc.length)]));n++;}
 ih.castShadow=true;scene.add(ih,is);}

// lantern halos & lights
const haloM=new THREE.SpriteMaterial({map:null,color:'#ffc27a',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0});
const halos=[];const lampLights=[];
// ---------- character
const hero=new THREE.Group();scene.add(hero);hero.position.set(0,0,4);
const body=new THREE.Group();hero.add(body);
const bodyM=M('#fff8ee',{roughness:.7});
const torso=new THREE.Mesh(new THREE.SphereGeometry(.55,24,18),M('#ffd6a5',{roughness:.8}));torso.scale.set(1,1.05,.95);torso.position.y=.75;body.add(torso);
const head=new THREE.Mesh(new THREE.SphereGeometry(.62,28,20),bodyM);head.position.y=1.65;body.add(head);
for(const s of[-1,1]){const ear=new THREE.Mesh(new THREE.SphereGeometry(.22,14,10),bodyM);ear.scale.set(.8,1.4,.6);ear.position.set(s*.38,2.2,0);ear.rotation.z=-s*.3;body.add(ear);
 const inner=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),M('#ffc4cf'));inner.scale.set(.7,1.3,.4);inner.position.set(s*.38,2.2,.1);inner.rotation.z=-s*.3;body.add(inner);
 const eye=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),M('#3b2f2f',{roughness:.3}));eye.position.set(s*.22,1.7,.56);eye.scale.z=.6;body.add(eye);
 const bl=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),M('#ffadb9',{transparent:true,opacity:.8}));bl.scale.set(1.4,.8,.3);bl.position.set(s*.36,1.55,.5);body.add(bl);}
const scarf=new THREE.Mesh(new THREE.TorusGeometry(.42,.12,10,24).rotateX(Math.PI/2),M('#ff8fa3'));scarf.position.y=1.15;body.add(scarf);
const feet=[];for(const s of[-1,1]){const f=new THREE.Mesh(new THREE.SphereGeometry(.18,12,10),M('#e9b48a'));f.scale.set(1,.7,1.3);f.position.set(s*.25,.12,0);hero.add(f);feet.push(f);}
hero.traverse(o=>{if(o.isMesh)o.castShadow=true;});
const shadowBlob=new THREE.Mesh(new THREE.CircleGeometry(.6,20).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.12,depthWrite:false}));shadowBlob.position.y=.02;hero.add(shadowBlob);

// ---------- particles: petals & fireflies
function dotTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}
const tex=dotTex();haloM.map=tex;
for(const l of lanterns){const s=new THREE.Sprite(haloM);s.scale.setScalar(1.7);s.position.copy(l.position);scene.add(s);halos.push(s);}
for(const i of [1,3]){const pl=new THREE.PointLight(0xffb060,0,9,1.8);pl.position.copy(lanterns[i].position);scene.add(pl);lampLights.push(pl);}
{const ws=[[0,2.3,2.7],[1.8,2.3,2.7],[-1.8,2.3,2.7]];for(const w of ws){const s=new THREE.Sprite(haloM);s.scale.setScalar(1.8);s.position.set(...w);house.add(s);halos.push(s);}}
const DN=isMobile?90:200,dG=new THREE.BufferGeometry(),dP=new Float32Array(DN*3),dB=[];
for(let i=0;i<DN;i++){dB.push([(Math.random()-.5)*30,.3+Math.random()*6,(Math.random()-.5)*30,Math.random()*6]);}
dG.setAttribute('position',new THREE.BufferAttribute(dP,3));
const dustM=new THREE.PointsMaterial({color:'#fff0c8',size:.11,map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.6});const dust=new THREE.Points(dG,dustM);scene.add(dust);
const PN=160,petG=new THREE.BufferGeometry(),petP=new Float32Array(PN*3),petV=[];
for(let i=0;i<PN;i++){petP[i*3]=(Math.random()-.5)*44;petP[i*3+1]=Math.random()*12;petP[i*3+2]=(Math.random()-.5)*44;petV.push(Math.random()*6);}
petG.setAttribute('position',new THREE.BufferAttribute(petP,3));
const petM=new THREE.PointsMaterial({color:'#ffc8d6',size:.22,map:tex,transparent:true,depthWrite:false,opacity:.9});scene.add(new THREE.Points(petG,petM));
const FN=120,ffG=new THREE.BufferGeometry(),ffP=new Float32Array(FN*3),ffB=[];
for(let i=0;i<FN;i++){const a=Math.random()*6.28,r=Math.random()*(ISL-2);ffB.push([Math.cos(a)*r,.5+Math.random()*2.5,Math.sin(a)*r,Math.random()*6]);}
ffG.setAttribute('position',new THREE.BufferAttribute(ffP,3));
const ffM=new THREE.PointsMaterial({color:'#fff1a0',size:.5,map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0});scene.add(new THREE.Points(ffG,ffM));

// ---------- time of day
const TIMES=[
 {name:'上午',top:'#7fc3ff',bot:'#fdf1dc',sun:[18,26,14],sunCol:'#fff3dc',sunI:2.4,hemiS:'#fff6ea',hemiG:'#b9dc9c',hemiI:1.0,fog:'#e6f0f2',fogN:60,fogF:170,win:0,ff:0,stars:0,exp:.96,water:'#4fb9d2',bloom:.12,gain:'#fff8ee',lift:'#f0f6ff',sat:1.08,rays:.18,rim:'#fff1d8',rimI:.45,tilt:1},
 {name:'下午',top:'#8fb9f2',bot:'#ffe2bf',sun:[-20,18,12],sunCol:'#ffe1b0',sunI:2.3,hemiS:'#ffeedd',hemiG:'#c9d48f',hemiI:.95,fog:'#fbe3c8',fogN:55,fogF:160,win:0,ff:0,stars:0,exp:.98,water:'#56b2c6',bloom:.15,gain:'#fff1dc',lift:'#fff4ea',sat:1.12,rays:.22,rim:'#ffd6a6',rimI:.6,tilt:1},
 {name:'黄昏',top:'#4f5bb4',bot:'#ff9466',sun:[-30,5,-6],sunCol:'#ff9a5c',sunI:1.7,hemiS:'#ffc9a8',hemiG:'#9c8fa0',hemiI:.8,fog:'#f2a88e',fogN:42,fogF:130,win:1.0,ff:.6,stars:.15,exp:1.05,water:'#6f86b8',bloom:.6,gain:'#ffe0c4',lift:'#f4e8ff',sat:1.15,rays:.85,rim:'#ff9f6a',rimI:.95,tilt:1},
 {name:'夜晚',top:'#121a45',bot:'#4c4a8a',sun:[14,22,-20],sunCol:'#a8b8ff',sunI:.6,hemiS:'#7f8ad0',hemiG:'#2f3a5a',hemiI:.7,fog:'#2d3462',fogN:25,fogF:100,win:1.3,ff:1,stars:1,exp:1.1,water:'#26367a',bloom:.9,gain:'#e8eeff',lift:'#e6ecff',sat:1.05,rays:.15,rim:'#8fa3ff',rimI:.55,tilt:1}];
const cur={};const tgt={};
function P(t){return{top:C(t.top),bot:C(t.bot),sun:new THREE.Vector3(...t.sun),sunCol:C(t.sunCol),sunI:t.sunI,hemiS:C(t.hemiS),hemiG:C(t.hemiG),hemiI:t.hemiI,fog:C(t.fog),fogN:t.fogN,fogF:t.fogF,win:t.win,ff:t.ff,stars:t.stars,exp:t.exp,water:C(t.water),bloom:t.bloom,gain:C(t.gain),lift:C(t.lift),sat:t.sat,rays:t.rays,rim:C(t.rim),rimI:t.rimI};}
let timeIdx=1;Object.assign(cur,P(TIMES[1]));Object.assign(tgt,P(TIMES[1]));
function setTime(i,instant){timeIdx=i;Object.assign(tgt,P(TIMES[i]));if(instant)Object.assign(cur,P(TIMES[i]));document.querySelectorAll('#times button').forEach((b,j)=>b.classList.toggle('on',j===i));audio.mood(i);}
function lerpEnv(k){for(const key in cur){const a=cur[key],b=tgt[key];if(typeof a==='number')cur[key]=a+(b-a)*k;else if(a.isColor)a.lerp(b,k);else a.lerp(b,k);}
 skyU.top.value.copy(cur.top);skyU.bot.value.copy(cur.bot);skyU.sunDir.value.copy(cur.sun).normalize();skyU.sunCol.value.copy(cur.sunCol);skyU.stars.value=cur.stars;
 sun.color.copy(cur.sunCol);sun.intensity=cur.sunI;hemi.color.copy(cur.hemiS);hemi.groundColor.copy(cur.hemiG);hemi.intensity=cur.hemiI;
 scene.fog.color.copy(cur.fog);scene.fog.near=cur.fogN;scene.fog.far=cur.fogF;winMat.emissiveIntensity=cur.win;lanternM.emissiveIntensity=cur.win*.9;houseLight.intensity=cur.win*4;document.body.classList.toggle('dark',cur.stars>.5);
 ffM.opacity=cur.ff;petM.opacity=.9*(1-cur.ff*.8);renderer.toneMappingExposure=cur.exp;bloom.strength=cur.bloom;
 gradeU.gain.value.copy(cur.gain);gradeU.lift.value.copy(cur.lift);gradeU.sat.value=cur.sat;gradeU.rays.value=cur.rays;RIM.uRim.value.copy(cur.rim);RIM.uRimI.value=cur.rimI;
 waterU.col.value.copy(cur.water);waterU.deep.value.copy(cur.water).multiplyScalar(.7);waterU.skyc.value.copy(cur.bot).lerp(cur.top,.3);waterU.sunDir.value.copy(cur.sun).normalize();waterU.sunCol.value.copy(cur.sunCol);waterU.spark.value=1-cur.stars*.6;
 haloM.opacity=Math.min(1,cur.win)*.35;lampLights.forEach(l=>l.intensity=cur.win*3);dustM.opacity=.55*(1-cur.ff)+.1;
 cloudM.color.copy(cur.bot).lerp(C('#ffffff'),.55);cloudM.emissive.copy(cur.bot);}

// ---------- post
const rt=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:isMobile?0:4});
const composer=new EffectComposer(renderer,rt);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth/2,innerHeight/2),.4,.5,.92);composer.addPass(bloom);composer.addPass(new OutputPass());
const gradeU={tDiffuse:{value:null},sunPos:{value:new THREE.Vector2(.5,.5)},sunVis:{value:0},sunCol:{value:C('#fff')},rays:{value:.5},gain:{value:C('#fff')},lift:{value:C('#fff')},sat:{value:1.1},t:{value:0},res:{value:new THREE.Vector2(innerWidth,innerHeight)},tilt:{value:isMobile?.6:1}};
const grade=new ShaderPass({uniforms:gradeU,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 sunPos,res;uniform float sunVis,rays,sat,t,tilt;uniform vec3 sunCol,gain,lift;varying vec2 vUv;
 float hs(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
  float b=smoothstep(.2,.48,abs(vUv.y-.52))*tilt;if(b>.01){vec3 acc=c;float px=b*3.2/res.y;
   for(int i=0;i<${isMobile?6:12};i++){float a=float(i)*2.39996;float r=sqrt(float(i)+.5)/${isMobile?'2.45':'3.46'};acc+=texture2D(tDiffuse,vUv+vec2(cos(a),sin(a))*r*b*6./res).rgb;}
   c=acc/${isMobile?'7.':'13.'};}
  if(sunVis>0.){vec2 d=(vUv-sunPos);float acc2=0.;float dec=1.;vec2 st=d/${isMobile?'16.':'28.'}*.9;vec2 uv=vUv;
   for(int i=0;i<${isMobile?16:28};i++){uv-=st;vec3 s=texture2D(tDiffuse,uv).rgb;float l=max(max(s.r,s.g),s.b);acc2+=smoothstep(.9,1.,l)*dec;dec*=.96;}
   acc2/=${isMobile?'16.':'28.'};float fall=1.-smoothstep(0.,.9,length(d*vec2(res.x/res.y,1.)));c+=sunCol*acc2*rays*sunVis*fall*1.8;}
  c=c*gain*.97+lift*.03;
  float L=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(L),c,sat);
  c=mix(c,c*c*(3.-2.*c),.3);
  vec2 q=vUv-.5;float v=smoothstep(.95,.3,length(q*vec2(1.15,1.)));c*=mix(.72,1.,v);
  c+=(hs(vUv*res+fract(t)*91.)-.5)*.028;
  gl_FragColor=vec4(c,1.);}`});
composer.addPass(grade);
let fxaa=null;if(isMobile){fxaa=new ShaderPass(FXAAShader);fxaa.material.uniforms.resolution.value.set(1/(innerWidth*renderer.getPixelRatio()),1/(innerHeight*renderer.getPixelRatio()));composer.addPass(fxaa);}

// ---------- audio
const audio=(()=>{let ctx,master,muted=false,mood=1,started=false;const scale=[0,2,4,7,9];
 const note=(m)=>440*Math.pow(2,(m-69)/12);
 function pluck(f,t,v=.12,d=2.2,type='sine'){const o=ctx.createOscillator(),g=ctx.createGain(),o2=ctx.createOscillator();o.type=type;o.frequency.value=f;o2.type='sine';o2.frequency.value=f*2;const g2=ctx.createGain();g2.gain.value=.25;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);o2.connect(g2).connect(g);g.connect(master);g.connect(rev);o.start(t);o2.start(t);o.stop(t+d);o2.stop(t+d);}
 let rev;
 function pad(){const now=ctx.currentTime;const roots=[[57,64,69,72],[53,60,65,69],[55,62,67,71],[52,59,64,67]];let i=0;
  const loop=()=>{const t=ctx.currentTime;const ch=roots[i++%4];for(const m of ch){const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='triangle';o.frequency.value=note(m-12+(mood===3?-2:0));f.type='lowpass';f.frequency.value=900;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.025,t+2.5);g.gain.linearRampToValueAtTime(0,t+8.5);o.connect(f).connect(g).connect(master);g.connect(rev);o.start(t);o.stop(t+9);}
   for(let k=0;k<6;k++)if(Math.random()<.7){const m=ch[0]+12+scale[Math.floor(Math.random()*5)]+(Math.random()<.3?12:0);pluck(note(m+(mood===3?-2:0)),t+k*1.3+Math.random()*.3,.05,2.8);}
   setTimeout(loop,8000);};loop();}
 function ambient(){const t=ctx.currentTime;
  if(mood<2&&Math.random()<.6){const f0=2200+Math.random()*1500;for(let k=0;k<2+Math.floor(Math.random()*3);k++){const o=ctx.createOscillator(),g=ctx.createGain();const s=t+k*.14;o.frequency.setValueAtTime(f0,s);o.frequency.exponentialRampToValueAtTime(f0*1.35,s+.06);o.frequency.exponentialRampToValueAtTime(f0*.9,s+.11);g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.02,s+.02);g.gain.linearRampToValueAtTime(0,s+.12);o.connect(g).connect(master);g.connect(rev);o.start(s);o.stop(s+.15);}}
  if(mood>=2){for(let k=0;k<6;k++){const o=ctx.createOscillator(),g=ctx.createGain();const s=t+k*.07;o.frequency.value=4300;g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.006,s+.02);g.gain.linearRampToValueAtTime(0,s+.05);o.connect(g).connect(master);o.start(s);o.stop(s+.06);}}
  setTimeout(ambient,1500+Math.random()*3000);}
 let noiseBuf;
 return{start(){if(started)return;started=true;ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=muted?0:.9;master.connect(ctx.destination);
   rev=ctx.createConvolver();const L=ctx.sampleRate*2.5,b=ctx.createBuffer(2,L,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,3);}rev.buffer=b;const rg=ctx.createGain();rg.gain.value=.35;rev.connect(rg).connect(master);
   noiseBuf=ctx.createBuffer(1,ctx.sampleRate*.12,ctx.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1)*(1-i/nd.length);
   pad();ambient();},
  step(){if(!ctx)return;const s=ctx.createBufferSource();s.buffer=noiseBuf;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=700+Math.random()*300;const g=ctx.createGain();g.gain.value=.07;s.connect(f).connect(g).connect(master);s.start();},
  land(v=1){if(!ctx)return;const t=ctx.currentTime;const s=ctx.createBufferSource();s.buffer=noiseBuf;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=420;const g=ctx.createGain();g.gain.value=.11*v;s.connect(f).connect(g).connect(master);s.start(t);
   const o=ctx.createOscillator(),og=ctx.createGain();o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(70,t+.12);og.gain.setValueAtTime(.05*v,t);og.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(og).connect(master);o.start(t);o.stop(t+.18);},
  chime(){if(ctx)pluck(note(81+scale[Math.floor(Math.random()*5)]),ctx.currentTime,.08,2.5);},
  mood(i){mood=i;this.chime();},
  toggle(){muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.9,ctx.currentTime,.2);return muted;}};})();

// ---------- input
const keys={};let jumpReq=false;addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'){e.preventDefault();if(!e.repeat)jumpReq=true;if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();}});
addEventListener('keyup',e=>{if(e.code==='Space')e.preventDefault();},true);addEventListener('keyup',e=>{keys[e.code]=false;});
let yaw=0.35,pitch=0.42,dist=isMobile?18:14,camT=new THREE.Vector3();let yawT=yaw,pitchT=pitch,distT=dist,camD=dist,lastInput=0;
const cvs=renderer.domElement;let drag=null;
cvs.addEventListener('pointerdown',e=>{if(e.target!==cvs)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};cvs.setPointerCapture(e.pointerId);});
cvs.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;yawT-=(e.clientX-drag.x)*.006;pitchT=THREE.MathUtils.clamp(pitchT+(e.clientY-drag.y)*.004,.08,1.25);lastInput=performance.now();drag.x=e.clientX;drag.y=e.clientY;});
cvs.addEventListener('pointerup',()=>drag=null);cvs.addEventListener('pointercancel',()=>drag=null);
cvs.addEventListener('wheel',e=>{distT=THREE.MathUtils.clamp(distT+e.deltaY*.01,6,26);e.preventDefault();},{passive:false});
// joystick
const joy={x:0,y:0};const jb=document.getElementById('joy'),jk=document.getElementById('knob');
if(isMobile)jb.style.display='block';
let jid=null;jb.addEventListener('pointerdown',e=>{jid=e.pointerId;jb.setPointerCapture(jid);jmove(e);e.stopPropagation();});
const jmove=e=>{if(e.pointerId!==jid)return;const r=jb.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}joy.x=x;joy.y=y;jk.style.transform=`translate(${x*34}px,${y*34}px)`;};
jb.addEventListener('pointermove',jmove);const jend=()=>{jid=null;joy.x=joy.y=0;jk.style.transform='';};jb.addEventListener('pointerup',jend);jb.addEventListener('pointercancel',jend);

// ---------- UI
document.querySelectorAll('#times button').forEach((b,i)=>b.onclick=()=>setTime(i));
const muteB=document.getElementById('mute');muteB.onclick=()=>{const m=audio.toggle();muteB.textContent=m?'♪ 静音':'♪ 声音';muteB.classList.toggle('off',m);};
const start=document.getElementById('start');
function begin(){start.classList.add('hide');document.body.classList.add('live');audio.start();setTimeout(()=>start.remove(),900);}
start.addEventListener('click',begin);

// ---------- loop
const ray=new THREE.Raycaster();const occluders=[];house.traverse(o=>{if(o.isMesh)occluders.push(o);});trees.forEach(g=>g.traverse(o=>{if(o.isMesh)occluders.push(o);}));
const clock=new THREE.Clock();let walkPh=0,lastStep=0,speedNow=0;const sim={x:0,y:0};
const JUMP_V=6.2,GRAV=18;let vy=0,grounded=true,squash=0,squashV=0;
function jump(dt){if(jumpReq&&grounded){vy=JUMP_V;grounded=false;squash=-.12;squashV=0;}jumpReq=false;
 if(!grounded){vy-=GRAV*dt;hero.position.y+=vy*dt;if(hero.position.y<=0){const impact=Math.min(1,-vy/JUMP_V);hero.position.y=0;grounded=true;squash=.28*impact;squashV=0;vy=0;audio.land(impact);}}
 // spring back: squash>0 = flattened, <0 = stretched
 squashV+=(-squash*260-squashV*16)*dt;squash+=squashV*dt;if(!grounded&&squash>-.08)squash+=(-.08-squash)*Math.min(1,dt*10);
 body.scale.set(1+squash*.6,1-squash,1+squash*.6);
 shadowBlob.position.y=.02-hero.position.y;const k=1/(1+hero.position.y*.35);shadowBlob.scale.setScalar(k);shadowBlob.material.opacity=.12*k;}
function move(dt){jump(dt);let ix=0,iz=0;if(keys.KeyW||keys.ArrowUp)iz-=1;if(keys.KeyS||keys.ArrowDown)iz+=1;if(keys.KeyA||keys.ArrowLeft)ix-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;ix+=joy.x+sim.x;iz+=joy.y+sim.y;
 const l=Math.hypot(ix,iz);let moving=l>.1;if(l>1){ix/=l;iz/=l;}
 const fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 const dir=fwd.multiplyScalar(-iz).add(right.multiplyScalar(ix));
 speedNow+=((moving?4.2:0)-speedNow)*Math.min(1,dt*8);
 if(moving){const p=hero.position;let nx=p.x+dir.x*speedNow*dt,nz=p.z+dir.z*speedNow*dt;
  for(const c of colliders){const dx=nx-c.x,dz=nz-c.z,d=Math.hypot(dx,dz),R=c.r+.5;if(d<R){nx=c.x+dx/d*R;nz=c.z+dz/d*R;}}
  const rr=Math.hypot(nx,nz);if(rr>ISL-1.2){nx*=(ISL-1.2)/rr;nz*=(ISL-1.2)/rr;}
  p.x=nx;p.z=nz;const ta=Math.atan2(dir.x,dir.z);let da=ta-hero.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));hero.rotation.y+=da*Math.min(1,dt*10);}
 walkPh+=dt*speedNow*2.6;const s=speedNow/4.2;
 body.position.y=Math.abs(Math.sin(walkPh))*.18*s+Math.sin(clock.elapsedTime*2)*.02;body.rotation.z=Math.sin(walkPh)*.08*s;
 feet[0].position.z=Math.sin(walkPh)*.3*s;feet[1].position.z=-Math.sin(walkPh)*.3*s;feet[0].position.y=.12+Math.max(0,Math.cos(walkPh))*.12*s;feet[1].position.y=.12+Math.max(0,-Math.cos(walkPh))*.12*s;
 if(grounded&&s>.5&&Math.floor(walkPh/Math.PI)!==lastStep){lastStep=Math.floor(walkPh/Math.PI);audio.step();}}
function tick(){const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;sway.value=t;skyU.t.value=t;
 move(dt);lerpEnv(Math.min(1,dt*1.6));
 camT.lerp(new THREE.Vector3(hero.position.x,hero.position.y+1.4,hero.position.z),Math.min(1,dt*5));
 const ek=Math.min(1,dt*6);yaw+=(yawT-yaw)*ek;pitch+=(pitchT-pitch)*ek;dist+=(distT-dist)*Math.min(1,dt*4);
 const idle=performance.now()-lastInput>6000&&speedNow<.1;if(idle)yawT+=dt*.02;
 const breathe=Math.sin(t*.35)*.25;
 const cdir=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
 ray.set(camT,cdir);ray.far=dist+.5;const hit=ray.intersectObjects(occluders,false)[0];const want=hit?Math.max(2.5,hit.distance-.6):dist+breathe;
 camD+=(want-camD)*Math.min(1,dt*(want<camD?12:2.5));
 camera.position.copy(camT).addScaledVector(cdir,camD);camera.lookAt(camT);
 {const sp=camT.clone().add(cur.sun.clone().normalize().multiplyScalar(200)).project(camera);gradeU.sunPos.value.set(sp.x*.5+.5,sp.y*.5+.5);const vis=sp.z<1?1-THREE.MathUtils.smoothstep(Math.max(Math.abs(sp.x),Math.abs(sp.y)),1.,1.8):0;gradeU.sunVis.value=vis;gradeU.sunCol.value.copy(cur.sunCol);}
 gradeU.t.value=t;waterU.t.value=t;
 for(let i=0;i<DN;i++){const b=dB[i];dP[i*3]=camT.x+b[0]+Math.sin(t*.15+b[3])*2;dP[i*3+1]=b[1]+Math.sin(t*.3+b[3]*2)*.6;dP[i*3+2]=camT.z+b[2]+Math.cos(t*.12+b[3])*2;}dG.attributes.position.needsUpdate=true;
 sun.position.copy(camT).add(cur.sun.clone().normalize().multiplyScalar(50));sun.target.position.copy(camT);
 for(const tr of trees){tr.rotation.z=Math.sin(t*.8+tr.userData.ph)*.02;}
 clouds.rotation.y=t*.004;
 for(let i=0;i<PN;i++){petP[i*3+1]-=dt*.5;petP[i*3]+=Math.sin(t+petV[i])*dt*.6+dt*.3;petP[i*3+2]+=Math.cos(t*.7+petV[i])*dt*.4;if(petP[i*3+1]<0){petP[i*3+1]=12;petP[i*3]=(Math.random()-.5)*44;petP[i*3+2]=(Math.random()-.5)*44;}}petG.attributes.position.needsUpdate=true;
 for(let i=0;i<FN;i++){const b=ffB[i];ffP[i*3]=b[0]+Math.sin(t*.4+b[3])*1.5;ffP[i*3+1]=b[1]+Math.sin(t*.9+b[3]*2)*.5;ffP[i*3+2]=b[2]+Math.cos(t*.35+b[3])*1.5;}ffG.attributes.position.needsUpdate=true;
 ffM.size=.5+Math.sin(t*3)*.08;
 pads.forEach((p,i)=>p.position.y=.06+Math.sin(t+i)*.01);
 composer.render();requestAnimationFrame(tick);}
setTime(1,true);lerpEnv(1);tick();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);gradeU.res.value.set(innerWidth,innerHeight);if(fxaa)fxaa.material.uniforms.resolution.value.set(1/(innerWidth*renderer.getPixelRatio()),1/(innerHeight*renderer.getPixelRatio()));});
window.__cozy={setTime,begin,sim,jump:()=>{jumpReq=true;},state:()=>({y:hero.position.y,grounded,sy:body.scale.y}),rot:(dy,dp=0)=>{yaw+=dy;yawT=yaw;pitch=pitchT=THREE.MathUtils.clamp(pitch+dp,.08,1.25);lastInput=performance.now();},hero};
