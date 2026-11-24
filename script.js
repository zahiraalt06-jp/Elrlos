(() => {
"use strict";
const $ = id => document.getElementById(id);
const screens = ["gate","titleScreen","gameScreen"];
const show = id => screens.forEach(s => $(s).classList.toggle("hidden", s !== id));
function unlockWithPassword(value, errorElement, inputElement){
 if(value==="Cádiz21"){show("titleScreen");if(errorElement)errorElement.textContent="";}
 else{if(errorElement)errorElement.textContent="La cerradura sigue cerrada. Prueba otra vez.";if(inputElement)inputElement.value="";}
}
$("passwordForm").addEventListener("submit",e=>{e.preventDefault();unlockWithPassword($("password").value,$("passwordError"),$("password"));});
function beginAdventure(){show("gameScreen");startGame();}
$("playBtn").addEventListener("click",beginAdventure);
$("playBtnMobile").addEventListener("click",beginAdventure);
const canvas=$("game"),ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
const W=960,H=540, G=0.56;
const worlds=[
 {name:"Pueblo nevado",icon:"❄",desc:"Faroles cálidos, tejados nevados y una pista junto al viejo hotel.",sky:["#8bbbc7","#d5e8dc"],ground:"#d7e8df",accent:"#b7d8d1",platform:"#8eb7ad",hazard:"#7b9fa4",collect:"★",question:"¿En qué ciudad nos vimos por primera vez, en la puerta del hotel?",answers:["Cádiz","Sevilla","Granada"],correct:0,tip:"¡Esa primera pista estaba en Cádiz! ¡Vamos, tú puedes!"},
 {name:"Bosque encantado",icon:"🌲",desc:"Árboles luminosos guardan pequeñas señales entre sus ramas.",sky:["#254c59","#7a9f83"],ground:"#456d5b",accent:"#c4d89a",platform:"#759d79",hazard:"#b86c69",collect:"✧",question:"¿Cuál es mi comida favorita?",answers:["Pasta","Sushi","Hamburguesa"],correct:0,tip:"¡Pasta! Has encontrado otra pista. Tu amorsin está orgullosa de ti."},
 {name:"Reino de los dulces",icon:"🍬",desc:"Un paisaje navideño lleno de luces y criaturas traviesas.",sky:["#d58e9d","#f7d5b9"],ground:"#b87982",accent:"#ffe2b7",platform:"#f2c6a4",hazard:"#b94e66",collect:"✧",question:"¿Cuál es mi sueño?",answers:["Mudarme a Sevilla","Mudarme con el amor de mi vida","Mudarme debajo del puente"],correct:1,tip:"¡Ese sueño está lleno de amor! Sigue adelante, campeón."},
 {name:"Montaña de los secretos",icon:"⛰",desc:"El viento silba entre cristales de hielo. Una señal antigua esconde un mensaje.",sky:["#5a718f","#c1d9e6"],ground:"#9dbbc9",accent:"#eff7f1",platform:"#7198ad",hazard:"#61728d",collect:"♦",question:"¿Qué es lo que más me gusta de ti?",textAnswer:true,expected:"mis ojos verdes",tip:"¡Tus ojos verdes! Y tu amorsin está orgullosa de ti."},
 {name:"Castillo helado",icon:"🏰",desc:"Tras las puertas de hielo espera el último recuerdo de esta aventura.",sky:["#273b67","#a9c6dc"],ground:"#b5cbd8",accent:"#f7edce",platform:"#8aa9c5",hazard:"#6577a6",collect:"✦",question:"Zahira es…",answers:["GUAPA","FRIOLERA","Coqueta","Todas son correctas jejeje"],correct:3,tip:"¡Todas son correctas, jejeje! Has llegado al final. ¡Tu amorsin está orgullosa de ti!"}
];
const spriteNames=["idle","walk1","walk2","walk3","run1","run2","jump1","jump2","jump3","fall","happy","excited","star"];
const sprites={};spriteNames.forEach(n=>{const im=new Image();im.src=`assets/${n}.png`;sprites[n]=im;});
const loveMessages=["Te quierooo muchooo mi amorsiiin","Te amooo mi corazón de melooon","Te ilofiuuuuu cielitooooooo","Tecomotostuscromosomaaperfectosss","¡Vamossss, tú puedessss completarlo!","Tu amorsin está orgullosa de ti","¡Sigue así, campeón! Cada vez estás más cerca"];
const monsterNames=["muñeco de nieve malvado","galleta de jengibre malvada","caca navideña"];
const monsterSprites=["monster-snowman","monster-gingerbread","monster-poo"].map(name=>{const im=new Image();im.src=`assets/${name}.png`;return im;});
const state={world:0,stars:0,lives:3,paused:false,active:false,worldStarted:false,unlocked:false,dialog:false,frame:0,cam:0,checkpoint:0,keys:{},touch:{left:false,right:false,jump:false,action:false},collected:new Set(),answered:new Set(),lastTime:0};
let player,level,toastTimer=0;
const worldLength=3000;
function platform(x,y,w,h=22,type="normal"){return{x,y,w,h,type};}
function buildLevel(){
 const w=worlds[state.world],plats=[platform(0,480,700,60),platform(760,480,600,60),platform(1420,480,680,60),platform(2160,480,900,60)];
 // Plataformas en escalera, algo más anchas y con alturas alcanzables.
 for(let i=0;i<18;i++){let x=175+i*150;let y=390-[0,82,158,72][i%4];plats.push(platform(x,y,172,20));}
 const stars=[];for(let i=0;i<18;i++){let p=plats[4+i];let x=p.x+p.w/2;let y=p.y-48;stars.push({x,y,taken:false});}
 const enemies=[];for(let i=0;i<9;i++){const type=i%3;enemies.push({x:500+i*285,y:442,home:500+i*285,dir:i%2?1:-1,alive:true,deadTimer:0,type,name:monsterNames[type],bob:i*.8});}
 return {plats,stars,enemies,door:{x:2860,y:390,w:56,h:90},key:{x:2450,y:425,taken:false},chest:{x:1860,y:430,opened:false},checkpoint:{x:1500,y:420,active:false},length:worldLength,decor:Array.from({length:60},(_,i)=>({x:i*57,y:80+(i*47)%230,s:(i%3)+1}))};
}
function resetPlayer(){player={x:55,y:390,vx:0,vy:0,w:48,h:54,onGround:false,facing:1,anim:0,invuln:0,checkpointX:55,landed:false,coyote:0};}
function startGame(){state.world=0;state.stars=0;state.lives=3;state.collected.clear();state.answered.clear();beginWorld(true);}
function beginWorld(first=false){level=buildLevel();resetPlayer();state.cam=0;state.active=true;state.worldStarted=true;state.paused=false;$("worldName").textContent=worlds[state.world].name.toUpperCase();updateHud();if(!first){$("worldEmblem").textContent=worlds[state.world].icon;$("worldTitle").textContent=worlds[state.world].name;$("worldDescription").textContent=worlds[state.world].desc;$("worldOverlay").classList.remove("hidden");state.active=false;}else{toast("¡Encuentra las estrellas y la llave!");}}
function updateHud(){$("starCount").textContent=state.stars;$("lives").textContent=state.lives;$("objective").textContent=level.key.taken?"¡Encuentra la puerta!":"Recoge estrellas y busca la llave";}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),1900);}
function nextWorld(){if(state.world===4){state.active=false;$("finalOverlay").classList.remove("hidden");return;}state.world++;beginWorld(false);}
$("enterWorld").onclick=()=>{$("worldOverlay").classList.add("hidden");state.active=true;toast("¡Adelante, campeón!");};
function drawBackground(){
 const w=worlds[state.world],g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,w.sky[0]);g.addColorStop(1,w.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // Colinas lejanas con parallax suave.
 for(let i=0;i<7;i++){let x=((i*210-state.cam*.22)%1250+1250)%1250-140;ctx.fillStyle=i%2?"#ffffff22":"#132d3a22";ctx.beginPath();ctx.moveTo(x,430);ctx.quadraticCurveTo(x+100,250+(i%3)*35,x+220,430);ctx.fill();}
 const decoX=(i,step,parallax)=>((i*step-state.cam*parallax)%1500+1500)%1500-160;
 if(state.world===0){ // Pueblo nevado: casitas, tejados, pinos y farolas
   for(let i=0;i<8;i++){const x=decoX(i,205,.34),y=320+(i%2)*22;ctx.fillStyle="#f4e6df";ctx.fillRect(x,y,105,115);ctx.fillStyle="#b65f70";ctx.beginPath();ctx.moveTo(x-10,y+8);ctx.lineTo(x+52,y-48);ctx.lineTo(x+115,y+8);ctx.fill();ctx.fillStyle="#ffd98d";ctx.fillRect(x+18,y+35,20,28);ctx.fillRect(x+65,y+35,20,28);ctx.fillStyle="#fff";ctx.fillRect(x-6,y+5,116,7);}
   for(let i=0;i<9;i++){const x=decoX(i,260,.55);ctx.fillStyle="#315f57";ctx.beginPath();ctx.moveTo(x,430);ctx.lineTo(x+34,300);ctx.lineTo(x+68,430);ctx.fill();ctx.fillStyle="#fff";ctx.fillRect(x+15,355,38,6);}
   for(let i=0;i<4;i++){const x=decoX(i,410,.72);ctx.fillStyle="#59495c";ctx.fillRect(x+18,300,8,120);ctx.fillStyle="#ffe8a3";ctx.beginPath();ctx.arc(x+22,294,13,0,Math.PI*2);ctx.fill();}
 }else if(state.world===1){ // Bosque: árboles altos, setas y luciérnagas
   for(let i=0;i<10;i++){const x=decoX(i,180,.4),h=175+(i%3)*45;ctx.fillStyle=i%2?"#1f574c":"#2c6955";ctx.fillRect(x+27,430-h*.45,15,h*.45);ctx.beginPath();ctx.moveTo(x,430-h*.25);ctx.lineTo(x+34,430-h);ctx.lineTo(x+72,430-h*.25);ctx.fill();ctx.beginPath();ctx.moveTo(x-8,430-h*.55);ctx.lineTo(x+34,430-h*1.15);ctx.lineTo(x+80,430-h*.55);ctx.fill();ctx.fillStyle="#d8f4a0";ctx.beginPath();ctx.arc(x+34,430-h*.75,4,0,Math.PI*2);ctx.fill();}
   for(let i=0;i<12;i++){const x=decoX(i,125,.7),y=375+(i%3)*14;ctx.fillStyle="#f2b3a2";ctx.fillRect(x+8,y,8,28);ctx.fillStyle="#f6d4bd";ctx.beginPath();ctx.ellipse(x+12,y,18,9,0,Math.PI,0);ctx.fill();ctx.fillStyle="#fff2a7";ctx.fillRect(x+70,y-90,5,5);}
 }else if(state.world===2){ // Reino dulce: bastones, piruletas y casitas de jengibre
   for(let i=0;i<8;i++){const x=decoX(i,210,.42),y=320+(i%2)*24;ctx.fillStyle="#fff1df";ctx.fillRect(x,y,92,105);ctx.fillStyle="#c95c73";ctx.beginPath();ctx.moveTo(x-8,y+8);ctx.lineTo(x+46,y-35);ctx.lineTo(x+100,y+8);ctx.fill();ctx.fillStyle="#a75a48";ctx.fillRect(x+15,y+42,18,24);ctx.fillRect(x+58,y+42,18,24);}
   for(let i=0;i<9;i++){const x=decoX(i,155,.62);ctx.strokeStyle=i%2?"#fff3df":"#e66d82";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(x+15,430);ctx.lineTo(x+15,320);ctx.quadraticCurveTo(x+15,280,x+48,280);ctx.stroke();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x+48,280,7,0,Math.PI*2);ctx.fill();}
   for(let i=0;i<7;i++){const x=decoX(i,230,.7);ctx.fillStyle="#f8d06f";ctx.beginPath();ctx.arc(x+70,340,22,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=5;ctx.beginPath();ctx.arc(x+70,340,14,0,Math.PI*2);ctx.stroke();}
 }else if(state.world===3){ // Montaña: picos, cristales e hielo colgante
   for(let i=0;i<9;i++){const x=decoX(i,205,.35),h=160+(i%4)*42;ctx.fillStyle="#dcebf0aa";ctx.beginPath();ctx.moveTo(x,430);ctx.lineTo(x+65,430-h);ctx.lineTo(x+130,430);ctx.fill();ctx.fillStyle="#ffffffcc";ctx.beginPath();ctx.moveTo(x+65,430-h);ctx.lineTo(x+45,430-h+38);ctx.lineTo(x+80,430-h+31);ctx.fill();}
   for(let i=0;i<12;i++){const x=decoX(i,120,.65);ctx.fillStyle="#d5f4f5";ctx.beginPath();ctx.moveTo(x,300);ctx.lineTo(x+14,365+(i%3)*15);ctx.lineTo(x+28,300);ctx.fill();ctx.strokeStyle="#9ed7e3";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+14,370);ctx.lineTo(x+14,410);ctx.stroke();}
   for(let i=0;i<6;i++){const x=decoX(i,270,.75);ctx.fillStyle="#80c6d5aa";ctx.beginPath();ctx.moveTo(x+30,430);ctx.lineTo(x+45,345);ctx.lineTo(x+58,430);ctx.fill();}
 }else{ // Castillo: torres, almenas y ventanas luminosas
   for(let i=0;i<6;i++){const x=decoX(i,250,.3),base=430,h=150+(i%3)*35;ctx.fillStyle="#9bbbd0";ctx.fillRect(x+20,base-h,75,h);ctx.fillStyle="#dcecf4";ctx.beginPath();ctx.moveTo(x+10,base-h);ctx.lineTo(x+58,base-h-65);ctx.lineTo(x+105,base-h);ctx.fill();ctx.fillRect(x+10,base-h+20,95,9);ctx.fillStyle="#f8e3a2";ctx.fillRect(x+42,base-h+42,16,28);ctx.fillRect(x+68,base-h+42,16,28);ctx.fillStyle="#8eabc1";ctx.fillRect(x+4,base-h+5,12,18);ctx.fillRect(x+98,base-h+5,12,18);}
   for(let i=0;i<10;i++){const x=decoX(i,145,.6);ctx.fillStyle="#e6f5ff99";ctx.beginPath();ctx.arc(x,150+(i%4)*48,3+(i%2)*2,0,Math.PI*2);ctx.fill();}
 }
 // Nieve/luz ambiental en todos los mundos.
 for(let i=0;i<32;i++){const x=decoX(i,67,.18),y=(i*83+Date.now()*.012)%430;ctx.fillStyle=state.world===1?"#e6f5a888":"#ffffff88";ctx.beginPath();ctx.arc(x,y,1.5+(i%2),0,Math.PI*2);ctx.fill();}
}
function drawWorld(){
 drawBackground();ctx.save();ctx.translate(-state.cam,0);
 // floor/platforms
 for(const p of level.plats){ctx.fillStyle=p.type==="normal"?worlds[state.world].ground:worlds[state.world].platform;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle="#ffffff55";ctx.fillRect(p.x,p.y,p.w,4);ctx.fillStyle="#172e3b33";for(let x=p.x+8;x<p.x+p.w;x+=24)ctx.fillRect(x,p.y+8,9,3);}
 // checkpoint flag
 ctx.fillStyle="#624d5d";ctx.fillRect(level.checkpoint.x,level.checkpoint.y,5,60);ctx.fillStyle=level.checkpoint.active?"#f5df8e":"#d7797c";ctx.beginPath();ctx.moveTo(level.checkpoint.x+5,level.checkpoint.y);ctx.lineTo(level.checkpoint.x+38,level.checkpoint.y+12);ctx.lineTo(level.checkpoint.x+5,level.checkpoint.y+24);ctx.fill();
 // stars
 level.stars.forEach(s=>{if(!s.taken){ctx.fillStyle="#ffe49b";ctx.font="28px serif";ctx.fillText(worlds[state.world].collect,s.x,s.y+Math.sin(Date.now()/230+s.x)*4);}});
 // key, chest, door
 if(!level.key.taken){ctx.font="32px serif";ctx.fillText("🗝",level.key.x,level.key.y);}
 ctx.font="40px serif";ctx.fillText(level.chest.opened?"📦":"🎁",level.chest.x,level.chest.y);
 ctx.fillStyle="#c4e5e9";ctx.fillRect(level.door.x,level.door.y,level.door.w,level.door.h);ctx.fillStyle="#476c80";ctx.fillRect(level.door.x+9,level.door.y+10,level.door.w-18,level.door.h-10);ctx.fillStyle="#f6d78e";ctx.beginPath();ctx.arc(level.door.x+40,level.door.y+51,4,0,Math.PI*2);ctx.fill();
 // enemies
 level.enemies.forEach(e=>{if(e.alive){const im=monsterSprites[e.type];const bob=Math.sin(Date.now()/180+e.bob)*3;if(im&&im.complete&&im.naturalWidth){const scale=Math.min(64/im.naturalWidth,66/im.naturalHeight);const dw=im.naturalWidth*scale,dh=im.naturalHeight*scale;ctx.drawImage(im,e.x-8,e.y+34-dh+bob,dw,dh);}else{ctx.fillStyle="#b84d62";ctx.beginPath();ctx.arc(e.x+18,e.y+12,18,0,Math.PI*2);ctx.fill();}}else if(e.deadTimer>0){ctx.save();ctx.globalAlpha=e.deadTimer/34;ctx.font="25px serif";ctx.fillText("✨",e.x+4,e.y+8-e.deadTimer*.7);ctx.fillText("⭐",e.x+22,e.y+4-e.deadTimer*.45);ctx.restore();}});
 // player
 drawPlayer();
 ctx.restore();
}
function drawPlayer(){
 // Cada PNG contiene un fotograma. Se han recortado los fragmentos de los
 // fotogramas vecinos para que al girar no aparezcan piezas sueltas ni desaparezca.
 let name="idle";
 if(!player.onGround){
   name=player.vy < -5 ? "jump1" : (player.vy < 2 ? "jump2" : "fall");
 }else if(Math.abs(player.vx)>.25){
   const frames=["walk1","walk2","walk3"];
   name=frames[Math.floor(player.anim/7)%frames.length];
 }
 let im=sprites[name];
 if(!im || !im.complete || !im.naturalWidth) im=sprites.idle;
 const center=player.x+player.w/2;
 const boxW=66, boxH=60;
 const scale=Math.min(boxW/im.naturalWidth,boxH/im.naturalHeight);
 const dw=im.naturalWidth*scale, dh=im.naturalHeight*scale;
 const bob=player.onGround&&Math.abs(player.vx)>.25?Math.sin(player.anim*.34)*1.8:0;
 const dy=player.y+player.h-dh+bob;
 ctx.save();
 // Transform around the character's centre in both directions. This avoids
 // negative-position drawing artefacts when the player turns left.
 ctx.translate(center,0);
 if(player.facing<0) ctx.scale(-1,1);
 if(im&&im.complete&&im.naturalWidth) ctx.drawImage(im,-dw/2,dy,dw,dh);
 else {ctx.fillStyle="#e98d45";ctx.fillRect(-18,player.y+8,36,35);}
 ctx.restore();
}
function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function update(dt){
 if(!state.active||state.paused||state.dialog)return;
 const k=state.keys,t=state.touch;let dir=(k.ArrowRight||k.KeyD||t.right?1:0)-(k.ArrowLeft||k.KeyA||t.left?1:0);
 player.vx=dir*4.5;if(dir)player.facing=dir;
 const previousBottom=player.y+player.h;
 player.x+=player.vx;
 player.vy=Math.min(player.vy+G,13.5);
 player.y+=player.vy;
 player.onGround=false;
 if(player.vy>=0){
   let landing=null;
   for(const p of level.plats){
     const currentBottom=player.y+player.h;
     if(player.x+player.w>p.x+3&&player.x<p.x+p.w-3&&previousBottom<=p.y+8&&currentBottom>=p.y){
       if(!landing||p.y<landing.y)landing=p;
     }
   }
   if(landing){player.y=landing.y-player.h;player.vy=0;player.onGround=true;player.coyote=10;}
 }
 if(player.coyote>0&&!player.onGround)player.coyote--;
 const wantsJump=k.Space||k.ArrowUp||k.KeyW||t.jump;
 if(wantsJump&&(player.onGround||player.coyote>0)){
   player.vy=-18.2;player.onGround=false;player.coyote=0;
   state.keys.Space=false;state.keys.ArrowUp=false;state.keys.KeyW=false;t.jump=false;
 }
 player.x=Math.max(0,Math.min(level.length-player.w,player.x));if(player.y>H+90){loseLife();}
 player.anim++;if(player.invuln>0)player.invuln--;
 level.enemies.forEach(e=>{if(!e.alive){if(e.deadTimer>0)e.deadTimer--;return;}e.x+=e.dir*.8;if(Math.abs(e.x-e.home)>48)e.dir*=-1;if(overlaps(player,{x:e.x,y:e.y,w:34,h:34})){if(player.vy>0&&player.y+player.h<e.y+27){e.alive=false;e.deadTimer=38;player.vy=-10;state.stars++;updateHud();toast("✨ ¡PUM! Has derrotado al "+e.name+". ¡Vamossss, campeón!");}else if(!player.invuln)loseLife();}});
 level.stars.forEach(s=>{if(!s.taken&&overlaps(player,{x:s.x-18,y:s.y-34,w:36,h:42})){s.taken=true;state.stars++;updateHud();if(state.stars%3===0)toast(loveMessages[Math.floor(Math.random()*loveMessages.length)]);}});
 if(!level.key.taken&&overlaps(player,{x:level.key.x,y:level.key.y-28,w:30,h:34})){level.key.taken=true;toast("¡Has encontrado la llave!");updateHud();}
 if(!level.chest.opened&&overlaps(player,{x:level.chest.x,y:level.chest.y-35,w:42,h:42})){level.chest.opened=true;openMemory();}
 if(!level.checkpoint.active&&player.x>level.checkpoint.x-20){level.checkpoint.active=true;player.checkpointX=level.checkpoint.x;toast("Punto de control activado");}
 if(overlaps(player,{x:level.door.x,y:level.door.y,w:level.door.w,h:level.door.h})){if(level.key.taken&&state.stars>=4){openWorldQuestion();}else toast(level.key.taken?"Te faltan estrellas para abrir el portal":"La puerta necesita una llave");}
 state.cam=Math.max(0,Math.min(level.length-W,player.x-W*.38));
}
function loseLife(){if(player.invuln)return;state.lives--;updateHud();if(state.lives<=0){toast("Se agotaron las vidas. Volvemos al punto de control.");state.lives=3;}player.x=player.checkpointX;player.y=300;player.vy=0;player.invuln=90;}
function openMemory(){
 state.active=false;state.dialog=true;
 $("dialogIcon").textContent="🎁";
 $("dialogTitle").textContent="¡Has encontrado un tesoro!";
 $("dialogText").textContent=loveMessages[Math.floor(Math.random()*loveMessages.length)];
 $("dialogChoices").innerHTML='<button id="memoryOk">¡Seguir la aventura!</button>';
 $("dialogExtra").textContent="";
 $("memoryOk").onclick=closeDialog;openDialog();
}
function openWorldQuestion(){
 if(state.answered.has(state.world)){nextWorld();return;}
 state.active=false;state.dialog=true;const w=worlds[state.world];
 $("dialogIcon").textContent=w.icon;
 $("dialogTitle").textContent="La pregunta del recuerdo";
 $("dialogText").textContent=w.question;
 $("dialogChoices").innerHTML="";$("dialogExtra").innerHTML="";
 if(w.textAnswer){
   $("dialogExtra").innerHTML='<input id="textAnswer" placeholder="Escribe tu respuesta" autocomplete="off"><button id="textAnswerCheck" class="main-btn">COMPROBAR</button>';
   $("textAnswerCheck").onclick=()=>{
     const answer=($("textAnswer").value||"").trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[.!¡?¿]/g,"");
     const expected=w.expected.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
     if(answer===expected)correctAnswer();else toast("¡Casi! Piensa en lo que más me gusta de ti.");
   };
 }else{
   w.answers.forEach((a,i)=>{const b=document.createElement("button");b.textContent=a;b.onclick=()=>i===w.correct?correctAnswer():toast("Esa pista no coincide. ¡Inténtalo de nuevo!");$("dialogChoices").appendChild(b);});
 }
 openDialog();
}
function correctAnswer(){state.answered.add(state.world);$("dialogTitle").textContent="¡Recuerdo desbloqueado!";$("dialogText").textContent=worlds[state.world].tip;$("dialogChoices").innerHTML='<button id="continueMemory">Continuar</button>'; $("dialogExtra").textContent="";$("continueMemory").onclick=()=>{closeDialog();nextWorld();};}
function closeDialog(){state.dialog=false;$("dialog").classList.add("hidden");state.active=true;}
$("dialogClose").onclick=closeDialog;
function openDialog(){ $("dialog").classList.remove("hidden");}
function openMemoryOrQuestion(){ }
function draw(){
 // The animation loop starts before the player enters the first world.
 // Keep the loop alive, but do not try to draw an uninitialized level.
 if(!level || !player){ctx.clearRect(0,0,W,H);return;}
 drawWorld();
}
function loop(ts){const dt=Math.min(32,ts-(state.lastTime||ts));state.lastTime=ts;update(dt/16.67);ctx.clearRect(0,0,W,H);draw();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp","Space"].includes(e.code))e.preventDefault();state.keys[e.code]=true;if(e.code==="Escape")togglePause();if(e.code==="KeyE"||e.code==="Enter"){if(state.dialog)return;}});
window.addEventListener("keyup",e=>state.keys[e.code]=false);
function togglePause(){if($("gameScreen").classList.contains("hidden")||state.dialog||!state.worldStarted)return;state.paused=!state.paused;$("pauseOverlay").classList.toggle("hidden",!state.paused);state.active=!state.paused;}
$("pauseBtn").onclick=togglePause;$("resumeBtn").onclick=togglePause;
$("restartBtn").onclick=()=>{if(confirm("¿Reiniciar este mundo?"))beginWorld(true);};
$("pauseRestart").onclick=()=>{$("pauseOverlay").classList.add("hidden");beginWorld(true);};
$("toTitle").onclick=()=>{$("pauseOverlay").classList.add("hidden");state.active=false;show("titleScreen");};
$("playAgain").onclick=()=>{$("finalOverlay").classList.add("hidden");startGame();};
document.querySelectorAll(".mobile-controls button").forEach(btn=>{const key=btn.dataset.key;const down=e=>{e.preventDefault();state.touch[key]=true;};const up=e=>{e.preventDefault();state.touch[key]=false;};btn.addEventListener("pointerdown",down);btn.addEventListener("pointerup",up);btn.addEventListener("pointerleave",up);btn.addEventListener("pointercancel",up);});
$("finalMessage").textContent="Hay recuerdos que iluminan incluso la noche más fría. ¡Tu amorsin está orgullosa de ti!";
// Expose a tiny editable configuration point for future memories and the ending.
window.GAME_CUSTOM = { finalMessage: "Hay recuerdos que iluminan incluso la noche más fría. ¡Tu amorsin está orgullosa de ti!", extraQuestions: [], loveMessages };
})();