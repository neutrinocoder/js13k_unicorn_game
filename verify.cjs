const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'classic/index.html','utf8'),script=html.split('<script>')[1].split('</script>')[0];
const noop=()=>{},gradient={addColorStop:noop},ctx=new Proxy({createLinearGradient:()=>gradient},{get:(o,k)=>o[k]??noop}),canvas={width:960,height:540,getContext:()=>ctx,getBoundingClientRect:()=>({width:960,height:540})};
const env={document:{querySelector:()=>canvas},devicePixelRatio:1,requestAnimationFrame:noop};vm.createContext(env);vm.runInContext(script,env);
function runInGame(code, context) { return vm.runInContext(script.includes('VIEW_WIDTH') ? require('./rename.cjs')(code, require('./source-names.json')) : code, context); }
runInGame(`
muted=1;reset();
scene='win';c.onclick();if(scene!=='win')throw Error('Victory click exits');onkeydown({key:' ',repeat:false,preventDefault(){}});if(scene!=='win')throw Error('Victory jump exits');onkeyup({key:' '});onkeydown({key:'Enter',repeat:true,preventDefault(){}});if(scene!=='win')throw Error('Held Enter exits');onkeydown({key:'Enter',repeat:false,preventDefault(){}});if(scene!=='title')throw Error('Victory Enter fails');onkeyup({key:'Enter'});reset();
for(let run=0;run<20;run++){reset(1);if(hazards.some(h=>h.type==='gear'))throw Error('Gear still generated');if(hazards.some(h=>h.type==='spike'&&h.phase>72))throw Error('Gear replaced with spike')}reset();
for(let facing of [-1,1]){reset();p.face=facing;mouse.active=1;mouse.x=p.x+150;mouse.y=p.y+11-cam;let target={x:p.x+130,y:p.y-2,hp:9};E.splice(0,E.length,target);whip();t+=.225;whipHits();if(target.hp!==6)throw Error('Tail facing-independent hit');let root=tail(p)[0];if(root[0]!==6||root[1]!==11)throw Error('Tail detached');draw();t+=.3;if(tail(p).some(v=>!Number.isFinite(v[0]+v[1])))throw Error('Tail recovery')}mouse.active=0;reset();
for(let shield of [0,2]){reset(1);let h={boss:1,red:1,power:3,x:p.x+100,y:p.y+37,hp:60,v:0,phase:0,cd:2,tongue:.4,ax:-1,ay:0,hit:0};E.splice(0,E.length,h);p.inv=0;p.shield=shield;update(.001);if(shield?(p.hp!==8||p.push):(p.hp!==6||Math.abs(p.push)!==1000||p.vy!==-320))throw Error('White blast strength/shield');draw()}reset();
E.length=0;p.charge=10;bubblePower();if(orbs.length!==24)throw Error('Empty bubbles missing');orbs.splice(0,orbs.length,{x:p.x+15,y:p.y+p.h+24,vx:0,vy:0,life:6});p.vy=100;updateOrbs(.001);if(p.vy!==-620||p.jump!==2||orbs.length)throw Error('Empty bubble bounce');reset();
let volley={boss:1,power:1,tongue:1,ax:1,ay:0};if(rays(volley).length!==3||reach(volley)!==0)throw Error('Boss volley warning');volley.tongue=.4;if(reach(volley)!==900)throw Error('Boss active reach');volley.power=2;if(rays(volley).length!==2)throw Error('Boss single power');reset();
reset();
for(let power=1;power<4;power++){reset(1);let bossShot={boss:1,red:1,power,x:p.x+100,y:p.y+37,hp:60,v:0,phase:0,cd:2,tongue:.3,ax:-1,ay:0,hit:0};E.splice(0,E.length,bossShot);p.inv=p.shield=0;update(.001);if(p.hp!==8-(power===3?2:3)||Boolean(p.freeze)!==false||Boolean(p.push)!==(power===3))throw Error('Boss powers mixed');draw()}reset();
if(discovered!==1)throw Error('Undiscovered map layers');reset(1);if(discovered!==3)throw Error('Lust discovery');p.y=8400;cam=p.y-270;update(.01);if(!(discovered&4)||layer!==2||layerTime<=0)throw Error('Gluttony map/title');draw();p.y=9000;cam=p.y-270;update(.01);if(!(discovered&4))throw Error('Discovery lost on backtrack');reset();if(discovered!==1)throw Error('Map reset');
reset(1);if(!E.some(e=>e.wind)||E.some(e=>e.red&&e.home.i<61)||!E.some(e=>e.blue))throw Error('Circle enemy types');
let special=E.find(e=>e.wind);E.splice(0,E.length,special);special.x=p.x+100;special.y=p.y;special.tongue=.3;special.ax=-1;special.ay=0;special.hit=0;special.cd=2;update(.001);if(!p.push||p.hp!==8)throw Error('Wind enemy');
reset(1);special=E.find(e=>e.blue);E.splice(0,E.length,special);special.x=p.x+100;special.y=p.y;special.tongue=.3;special.ax=-1;special.ay=0;special.hit=0;special.cd=2;p.inv=0;update(.001);if(!p.freeze||p.hp!==8)throw Error('Freeze enemy');draw();
reset(1);p.y=700;cam=430;update(.001);if(E.some(e=>e.boss))throw Error('Boss too early');p.hp=2;p.y=290;cam=20;update(.001);if(E.length!==1||!E[0].boss||p.hp!==8||E[0].hp!==60)throw Error('Final arena');
reset(1);zone=2;p.ground=1;J.w=1;update(.001);if(p.vy< -500)throw Error('Mud jump height');reset();

reset(1);E.length=0;t=2;zone=1;let windX=p.x;update(.02);if(p.x<=windX)throw Error('Lust wind push');reset();
weapon=3;E.length=0;let blastTarget={x:p.x+100,y:p.y,hp:100};E.push(blastTarget);
for(let shot=0;shot<8;shot++){attack=p.reload=0;blastTarget.x=p.x+100;fireWeapon();if(blastTarget.hp!==100-4*(shot+1))throw Error('Unlimited blast damage');let remainingHP=blastTarget.hp;fireWeapon();if(blastTarget.hp!==remainingHP)throw Error('Blast cooldown bypass')}
if(p.reload!==1||attack!==1)throw Error('One second blast cooldown');reset();
warned=1;p.y=6309;endless();if(warned!==1)throw Error('Early second taunt');p.y=6307;endless();if(warned!==2||taunt!==8)throw Error('500m taunt');taunt=3;endless();if(taunt!==3)throw Error('Second taunt repeats');draw();reset();
let originalEnemies=E.length;p.y=8990;cam=p.y-270;endless();if(taunt!==8||E.length!==originalEnemies)throw Error('Hades apparition');taunt=7;draw();endless();if(taunt!==7)throw Error('Taunt repeats');reset();if(taunt||'bombs' in p)throw Error('Bomb removal or taunt reset');
reset(1);p.x=plat[6].x+30;p.y=plat[6].y-p.h;p.vy=0;update(.001);if(cp!==0)throw Error('Midworld checkpoint');
p.y=8400;cam=p.y-270;update(.001);if(cp!==31)throw Error('Lava completion checkpoint');
p.y=2800;cam=p.y-270;update(.001);if(cp!==92)throw Error('Acid completion checkpoint');respawn();if(p.y!==plat[92].y-p.h)throw Error('World checkpoint respawn');reset();
scene='title';advanceIntro();if(scene!=='prologue')throw Error('Prologue entry');let introTime=t;update(.1);if(t!==introTime||inkTime<=0)throw Error('Prologue timing');draw();advanceIntro();if(scene!=='prologue'||inkTime!==12)throw Error('Reveal skip');draw();advanceIntro();if(scene!=='play')throw Error('Prologue start');
reset(1);for(let [height,expected] of [[11000,1],[7000,2],[4500,3],[2500,4]]){p.y=height;cam=height-270;update(.001);if(zone!==expected)throw Error('Restored region');draw()}
zone=3;eruption=0;volcano(.01);if(lavaBalls.length!==5)throw Error('Restored volcano');
zone=4;cp=92;hail.length=0;hailClock=2;p.x=400;p.y=2300;p.hp=7;p.inv=2;p.shield=5;hail.push({x:415,y:2290,v:500,warn:0});regionHazards(.05);if(p.hp!==8||p.y!==plat[92].y-p.h)throw Error('Lethal hail respawn');
zone=2;hail.push({x:10,y:10,v:300,warn:0});regionHazards(.01);if(hail.length)throw Error('Hail region cleanup');
reset(1);E.length=0;p.x=plat[0].x+30;p.y=plat[0].y-p.h;p.ground=1;zone=2;K.d=1;update(.01);let mudSpeed=p.vx;
reset(1);E.length=0;p.x=plat[0].x+30;p.y=plat[0].y-p.h;p.ground=1;zone=3;K.d=1;update(.01);if(p.vx<=mudSpeed)throw Error('Sticky mud');K.d=0;
if(!hazards.some(h=>h.type==='vent')||!plat.some(a=>a.move&&a.y<3700))throw Error('Region obstacles');reset();
document.pointerLockElement=c;mouse.down=1;document.onpointerlockchange();if(!mouse.down)throw Error('Lock acquisition cancels held fire');mouse.ax=1;mouse.ay=0;
onkeydown({code:'KeyW',key:'w',repeat:false,preventDefault(){}});J.w=0;
for(let i=0;i<60;i++){onkeydown({code:'KeyW',key:'w',repeat:true,preventDefault(){}});update(1/60);if(!p.whip)throw Error('Held W interrupts fire');if(J.w)throw Error('Repeat queues jump')}
onkeyup({code:'KeyW',key:'w'});document.pointerLockElement=null;document.onpointerlockchange();reset();
cp=6;p.hp=1;p.inv=0;damage();if(scene!=='play'||p.hp!==8||p.y!==plat[cp].y-p.h||p.jump!==2)throw Error('Fatal checkpoint respawn');
p.y+=700;p.inv=1;damage(1,1);if(p.y!==plat[cp].y-p.h)throw Error('Invulnerable fall respawn');
reset();weapon=3;mouse.active=1;mouse.x=p.x+200;mouse.y=p.y+10-cam;p.vx=-150;fireWeapon();if(p.vx!==-150)throw Error('Aim changes horizontal movement');mouse.active=0;reset();
document.pointerLockElement=c;mouse.ax=1;mouse.ay=0;mouse.active=1;mouse.down=1;
for(let k of ['w','a','s','d'])K[k]=1;
update(.016);if(!p.whip||Math.abs(p.whip.angle)>.01)throw Error('Movement interferes with locked beam');
c.onpointermove({movementX:0,movementY:50});if(aimVector()[1]<=0)throw Error('Relative aim');
document.pointerLockElement=null;mouse.active=0;mouse.down=0;for(let k in K)K[k]=0;reset();
for(let input of ['key','mouse']){reset();E.length=0;K.z=input==='key';mouse.down=input==='mouse';for(let i=0;i<90;i++)update(1/60);if(!p.whip||t-p.whip.time>.6)throw Error('Held whip fails');K.z=mouse.down=0}reset();
mouse.active=1;mouse.x=p.x+15-camX+100;mouse.y=p.y+10-cam-100;
let av=aimVector();if(Math.abs(av[0]-Math.SQRT1_2)>.001||Math.abs(av[1]+Math.SQRT1_2)>.001)throw Error('Mouse angle');
let angled=E[0];angled.x=p.x+15+100;angled.y=p.y+10-100-13;let hp=angled.hp;whip();t+=.225;whipHits();if(angled.hp!==hp-3)throw Error('Angled whip');whipHits();if(angled.hp!==hp-3)throw Error('Repeated whip damage');crosshair();
mouse.down=1;onpointerup();if(mouse.down)throw Error('Pointer release');mouse.active=0;reset();
let victim=E[0];victim.x=p.x+100;victim.y=p.y;let distant=E[1];distant.y=cam-100;bubblePower();if(orbs.length)throw Error('Uncharged special');p.charge=45;bubblePower();if(!victim.trapped||distant.trapped||p.shield!==6||p.charge!==0)throw Error('Bubble special');let shieldHP=p.hp;damage();if(p.hp!==shieldHP)throw Error('Shield protection');updateOrbs(.4);updateOrbs(4);if(!victim.dead)throw Error('Bubble pop');
reset();J[3]=1;update(.01);if(weapon!==0)throw Error('Tail remains selectable');
reset();weapon=3;K.arrowdown=1;fireWeapon();if(p.vy>=0)throw Error('Blast recoil');K.arrowdown=0;drawWeapons();
reset();victim=E[0];victim.x=p.x+120;victim.y=p.y;let beforeX=victim.x;update(.02);if(victim.x>=beforeX)throw Error('Blob pursuit');
reset();if(orbs.length||weapon||attack)throw Error('Weapon reset');
if(U<11000)throw Error('Expanded map missing');
let first=JSON.stringify(plat.slice(0,12));reset();if(first===JSON.stringify(plat.slice(0,12)))throw Error('Layout not randomized');
for(let run=0;run<100;run++){
reset();
if(!plat.some(a=>a.move&&a.y>7020))throw Error('Early moving platforms missing');
for(let j=0;j<plat.length;j++){
let a=plat[j],m=a.move||0;
if(a.x-m<0||a.x+a.w+m>W||!Number.isFinite(a.w)||a.w<=0)throw Error('Invalid platform');
for(let k=j+1;k<plat.length;k++){let b=plat[k],n=b.move||0;if(a.y<b.y+b.h&&a.y+a.h>b.y&&a.x-m<b.x+b.w+n&&a.x+a.w+m>b.x-n)throw Error('Platform motion envelopes overlap')}
}
for(let lane=0;lane<1;lane++)for(let i=1;i<N;i++){
let a=plat[lane*N+i-1],b=plat[lane*N+i],rise=a.y-b.y;
let airtime=(600+Math.sqrt(600*600-2*1450*rise))/1450;
let distance=Math.abs(a.x+a.w/2-b.x-b.w/2)+(a.move||0)+(b.move||0);
if(rise>110||distance>260*airtime+b.w/2-30)throw Error('Unreachable route jump');
}
}
reset();
// Exercise normal held-key updates; never initialize or override the cooldown here.
let e=E[0],a=plat[4];p.x=e.x-90;p.y=a.y-p.h;p.face=1;K.z=1;
for(let i=0;i<40;i++)update(1/60);
if(!e.dead||!p.whip)throw Error('Fresh-game held whip failed');
reset();if(attack!==0||p.whip!==null)throw Error('Restart timers failed');
K.z=0;for(let y of [9000,6000,3600,1200]){p.y=y;cam=y-270;update(.001);draw();}
reset();p.x=900;p.y=8800;update(.1);if(camX!==0||p.x>W-p.w)throw Error('Single-screen camera');draw();
let checkpoint=plat.find(a=>a.i===6);cp=plat.indexOf(checkpoint);respawn();if(p.x!==checkpoint.x+(checkpoint.w-p.w)/2||camX!==0)throw Error('Side route respawn');
reset(1);p.x=450;p.y=220-p.h;p.ground=1;J[' ']=1;for(let i=0;i<15;i++)update(1/60);let hades=E.find(e=>e.boss);if(scene==='win'||!hades)throw Error('Boss victory gate');p.charge=10;bubblePower();if(hades.trapped)throw Error('Boss trapped');draw();hurt(hades,60);if(scene!=='win')throw Error('Hades victory');
reset(1);if(E.length<55||!E.some(e=>e.red&&e.hp>2))throw Error('Enemy progression');let elite=E.find(e=>e.red);E.splice(0,E.length,elite);elite.x=p.x+100;elite.y=p.y;elite.tongue=.3;elite.ax=-1;elite.ay=0;elite.hit=0;elite.cd=2;p.inv=0;p.hp=8;update(.001);if(p.hp!==6)throw Error('Red laser damage');
scene='title';draw();scene='win';draw();
reset();let moving=plat.find(a=>a.move);p.x=moving.x+30;p.y=moving.y-p.h;p.ground=1;let offset=p.x-moving.x;t+=.1;platformMotion(.1);if(Math.abs(p.x-moving.x-offset)>.001)throw Error('Moving platform carry');
reset();p.y=11430;update(.016);if(scene!=='portal')throw Error('Lower portal');draw();update(1.5);draw();update(1.6);if(!flipped||scene!=='play')throw Error('Portal transition completion');draw();
let count=plat.length;endless();if(plat.length!==count)throw Error('Lava must be finite');J.w=1;update(.016);if(p.vy>=0)throw Error('Upright jump');draw();
reset();p.y=-1000;cam=p.y-270;endless();if(Math.min(...plat.map(a=>a.y))>p.y-800)throw Error('Endless generation');update(.016);if(scene==='win'||zone!==0)throw Error('Upward route must not win');if(!warned)throw Error('Warning missing');draw();
p.charge=9.99;update(.02);if(p.charge!==10)throw Error('Ten second charge');bubblePower();if(p.charge!==0||p.shield!==6)throw Error('Charged special');
`,env);
runInGame(`
let notes=0,volume=-1;
ac={state:'running',currentTime:0,destination:{},createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v){volume=v}},connect(node){return node},disconnect(){}}),createOscillator:()=>({frequency:{},connect(node){return node},start(){notes++},stop(){},disconnect(){}})};
musicBus=null;musicAt=0;muted=0;scene='play';soundtrack();if(!notes||volume<=0)throw Error('Music scheduling');
let noteCount=notes;muted=1;soundtrack();if(volume!==0||notes!==noteCount)throw Error('Music mute');
muted=0;scene='win';soundtrack();if(volume!==0)throw Error('Music end fade');
`,env);
assert(!html.includes('src="http'),'Offline build');console.log('Gameplay, region rendering, soundtrack scheduling and mute checks passed');
