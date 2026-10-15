// 截图脚本：node shot.mjs
// 可用环境变量：CHROME_PATH（浏览器可执行文件路径）、SHOTS_DIR（输出目录，默认 ./shots）
import {chromium} from 'playwright-core';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join, resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
const here=dirname(fileURLToPath(import.meta.url));
const pageUrl=pathToFileURL(join(here,'index.html')).href;
const outDir=resolve(process.env.SHOTS_DIR||join(here,'shots'));mkdirSync(outDir,{recursive:true});
const out=n=>join(outDir,n);
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
async function run(w,h,mob){const p=await b.newPage({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob});p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>m.type()==='error'&&console.log('CE',m.text()));p.setDefaultTimeout(180000);
await p.goto(pageUrl,{waitUntil:'commit'});await p.waitForTimeout(5000);
const pre=mob?'mobile':'desk';await p.screenshot({path:out(`${pre}-0-start.png`)});
await p.evaluate(()=>__cozy.begin());await p.waitForTimeout(2500);
if(!mob){for(const [i,n] of [[0,'morning'],[1,'afternoon'],[2,'dusk'],[3,'night']]){await p.evaluate(i=>__cozy.setTime(i,true),i);await p.waitForTimeout(1500);await p.screenshot({path:out(`desk-${i+1}-${n}.png`)});}
 await p.evaluate(()=>{__cozy.setTime(2,true);__cozy.sim.y=-1;});await p.waitForTimeout(2500);await p.evaluate(()=>{__cozy.sim.y=0;__cozy.sim.x=0;__cozy.rot(2.4,-.15)});await p.waitForTimeout(1500);await p.screenshot({path:out('desk-5-walk-rotate.png')});
 await p.evaluate(()=>{__cozy.setTime(3,true);__cozy.rot(-1.5,.1)});await p.waitForTimeout(1500);await p.screenshot({path:out('desk-6-night-house.png')});
}else{await p.screenshot({path:out('mobile-1-afternoon.png')});await p.evaluate(()=>__cozy.setTime(2,true));await p.waitForTimeout(1500);await p.screenshot({path:out('mobile-2-dusk.png')});}
await p.close();}
await run(1280,800,false);await run(390,844,true);await b.close();
