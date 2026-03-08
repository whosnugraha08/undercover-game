// ═══════════════════════════════════════
//  LOBBY ENGINE — Realtime via Socket.io
// ═══════════════════════════════════════
const CW=1280, CH=720, SPD=3.2;
const GR_ZONE = {x:660,y:390,w:580,h:290};

const WALLS = [
  {x:60,y:36,w:1164,h:10},{x:60,y:684,w:1164,h:10},
  {x:60,y:36,w:10,h:658},{x:1214,y:36,w:10,h:658},
  {x:60,y:382,w:140,h:10},{x:380,y:382,w:420,h:10},{x:1000,y:382,w:224,h:10},
  {x:652,y:392,w:10,h:302},
  {x:120,y:230,w:200,h:70},{x:440,y:80,w:220,h:100},
  {x:100,y:420,w:240,h:160},{x:690,y:420,w:320,h:160},
];

let lCanvas, lCtx, bgCache, grassPts=[], lFrame=0, moveTick=0;
let myPos={x:500,y:200}, myDir={x:0,y:1}, myMoving=false;
let keys={};
window._panelOpen=false;
window._lobbyPlayers=[];

function circRect(cx,cy,r,rect){
  const nx=Math.max(rect.x,Math.min(cx,rect.x+rect.w));
  const ny=Math.max(rect.y,Math.min(cy,rect.y+rect.h));
  return (cx-nx)**2+(cy-ny)**2<r*r;
}
function canMove(x,y,r=18){
  if(x<r||x>CW-r||y<r||y>CH-r) return false;
  return !WALLS.some(w=>circRect(x,y,r+1,w));
}

// ── BACKGROUND BUILD ──
function buildBg(){
  const oc=document.createElement('canvas'); oc.width=CW; oc.height=CH;
  const c=oc.getContext('2d');
  // Outdoor
  c.fillStyle='#2d5a1b'; c.fillRect(0,0,CW,CH);
  c.fillStyle='#3a6e24';
  for(const g of grassPts) c.fillRect(g.x,g.y,g.s,g.s);
  // House
  c.fillStyle='#3d2a1a'; c.fillRect(60,36,1164,658);
  // Ruang Tamu
  c.fillStyle='#c8a87a'; c.fillRect(70,46,1144,332);
  c.strokeStyle='#b89862'; c.lineWidth=1;
  for(let x=70;x<1214;x+=48){c.beginPath();c.moveTo(x,46);c.lineTo(x,378);c.stroke();}
  for(let y=46;y<378;y+=36){c.beginPath();c.moveTo(70,y);c.lineTo(1214,y);c.stroke();}
  // Kamar
  c.fillStyle='#d4c4ac'; c.fillRect(70,392,578,292);
  c.strokeStyle='#c4b49c';
  for(let x=70;x<648;x+=36){c.beginPath();c.moveTo(x,392);c.lineTo(x,684);c.stroke();}
  // Game Room
  c.fillStyle='#0a0820'; c.fillRect(662,392,552,292);
  c.fillStyle='#2a1660';
  for(let i=0;i<60;i++){
    c.beginPath();
    c.arc(662+(Math.sin(i*2.3)*.5+.5)*550, 392+(Math.cos(i*1.7)*.5+.5)*290, 1+(i%2),0,Math.PI*2);
    c.fill();
  }
  // Walls
  c.fillStyle='#3d2a1a';
  WALLS.slice(0,8).forEach(w=>c.fillRect(w.x,w.y,w.w,w.h));
  // Door frames
  c.fillStyle='#6b4423';
  c.fillRect(197,374,6,20);c.fillRect(377,374,6,20);
  c.fillRect(797,374,6,20);c.fillRect(997,374,6,20);
  // Labels
  c.font='bold 18px "Share Tech Mono",monospace'; c.textAlign='center';
  c.fillStyle='rgba(80,50,20,.7)'; c.fillText('RUANG TAMU',640,68);
  c.fillStyle='rgba(100,80,60,.7)'; c.fillText('KAMAR',355,414);
  c.shadowColor='#7c3aed'; c.shadowBlur=14;
  c.fillStyle='#a78bfa'; c.font='bold 16px "Share Tech Mono",monospace';
  c.fillText('★ GAME ROOM ★',940,414); c.shadowBlur=0;
  drawFurniture(c);
  return oc;
}

function drawFurniture(c){
  // Sofa
  c.fillStyle='#7c4a28';c.fillRect(120,245,200,55);
  c.fillStyle='#6b3f22';c.fillRect(120,268,200,32);
  c.fillStyle='#5a3318';c.fillRect(118,243,8,58);c.fillRect(314,243,8,58);
  c.fillStyle='#9a6840';c.fillRect(128,270,56,24);c.fillRect(192,270,56,24);c.fillRect(256,270,56,24);
  // Coffee table
  c.fillStyle='#5d3a1a';c.fillRect(240,178,180,52);
  c.fillStyle='#4a2d10';c.fillRect(246,178,168,4);
  // TV
  c.fillStyle='#111';c.fillRect(440,80,220,110);
  c.fillStyle='#1a1a3e';c.fillRect(448,88,204,94);
  c.fillStyle='rgba(60,60,200,.15)';c.fillRect(448,88,204,94);
  // Bookshelf
  c.fillStyle='#5d3a1a';c.fillRect(70,46,38,148);
  ['#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad','#16a085'].forEach((col,i)=>{c.fillStyle=col;c.fillRect(73,50+i*22,12,18);});
  c.strokeStyle='#4a2d10';c.lineWidth=1;
  [90,112,134,156,178].forEach(y=>{c.beginPath();c.moveTo(70,y);c.lineTo(108,y);c.stroke();});
  // Rug
  c.fillStyle='rgba(100,30,130,.22)';c.beginPath();c.ellipse(640,230,160,80,0,0,Math.PI*2);c.fill();
  c.strokeStyle='rgba(140,50,180,.3)';c.lineWidth=2;
  c.beginPath();c.ellipse(640,230,160,80,0,0,Math.PI*2);c.stroke();
  c.beginPath();c.ellipse(640,230,120,55,0,0,Math.PI*2);c.stroke();
  // Plant
  c.fillStyle='#4a2d10';c.fillRect(1166,230,24,42);
  c.fillStyle='#16a34a';c.beginPath();c.arc(1178,224,32,0,Math.PI*2);c.fill();
  c.fillStyle='#15803d';c.beginPath();c.arc(1162,210,20,0,Math.PI*2);c.fill();
  c.beginPath();c.arc(1196,214,20,0,Math.PI*2);c.fill();
  // Bed
  c.fillStyle='#5d3a1a';c.fillRect(100,430,240,160);
  c.fillStyle='#f1f5f9';c.fillRect(108,438,82,58);
  c.fillStyle='#93c5fd';c.fillRect(108,496,224,82);
  c.fillStyle='#bfdbfe';c.fillRect(110,498,220,18);
  // Bedside lamp
  c.fillStyle='#5d3a1a';c.fillRect(344,440,60,56);
  c.fillStyle='#fbbf24';c.beginPath();c.moveTo(368,424);c.lineTo(382,440);c.lineTo(354,440);c.closePath();c.fill();
  c.fillStyle='#fed7aa';c.beginPath();c.arc(375,420,9,0,Math.PI*2);c.fill();
  // Game table
  c.fillStyle='#3b1f8a';c.fillRect(690,428,320,155);
  c.fillStyle='#4c2ba8';c.fillRect(698,436,304,139);
  c.strokeStyle='rgba(60,30,180,.6)';c.lineWidth=1;
  for(let gx=698;gx<1002;gx+=28){c.beginPath();c.moveTo(gx,436);c.lineTo(gx,575);c.stroke();}
  [{x:714,c:'#ef4444'},{x:760,c:'#3b82f6'},{x:806,c:'#22c55e'},{x:852,c:'#f59e0b'},{x:898,c:'#a855f7'}].forEach(cd=>{
    c.fillStyle=cd.c;c.fillRect(cd.x,452,30,44);
    c.fillStyle='rgba(255,255,255,.2)';c.fillRect(cd.x+3,455,12,16);
    c.fillStyle='rgba(255,255,255,.6)';c.font='bold 16px monospace';c.textAlign='center';c.fillText('?',cd.x+15,476);
  });
  c.fillStyle='#5b21b6';
  [[690,420,80,12],[930,420,80,12],[690,576,80,12],[930,576,80,12],[682,436,12,90],[1010,436,12,90]].forEach(([x,y,w,h])=>c.fillRect(x,y,w,h));
  const g=c.createRadialGradient(940,530,20,940,530,250);
  g.addColorStop(0,'rgba(124,58,237,.18)');g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g;c.fillRect(662,392,552,292);
}

function drawLobbyPlayer(ctx,x,y,character,isMe,frame,name,inRoom){
  const SCALE=3;
  const bob=isMe&&myMoving ? Math.sin(frame*.2)*SCALE : 0;
  drawSprite(ctx,x,y,character,SCALE,bob);
  const nm=isMe?`★ ${name}`:name;
  const tw=ctx.measureText(nm).width+10;
  const ly=y-20*SCALE-10+bob;
  ctx.fillStyle=isMe?'rgba(0,0,0,.7)':'rgba(0,0,0,.55)';
  ctx.fillRect(x-tw/2,ly-14,tw,15);
  ctx.font=isMe?'bold 11px "Share Tech Mono"':'10px "Share Tech Mono"';
  ctx.textAlign='center';
  ctx.fillStyle=isMe?'#fbbf24':'#e2e8f0';
  ctx.fillText(nm,x,ly);
  if(inRoom){ctx.font='9px "Share Tech Mono"';ctx.fillStyle='#a78bfa';ctx.fillText('[in game]',x,y+10);}
}

// ── INIT ──
function initLobby(){
  lCanvas=document.getElementById('lobby-canvas');
  lCanvas.width=CW; lCanvas.height=CH;
  lCtx=lCanvas.getContext('2d');
  document.getElementById('hud-name').textContent=App.playerName;

  const seed=7;
  for(let i=0;i<500;i++) grassPts.push({x:Math.floor((Math.sin(i*2.1+seed)*.5+.5)*CW),y:Math.floor((Math.cos(i*1.7+seed)*.5+.5)*CH),s:i%3===0?4:3});
  bgCache=buildBg();

  window.addEventListener('keydown',e=>{keys[e.key]=true;});
  window.addEventListener('keyup',  e=>{keys[e.key]=false;});

  // Heartbeat
  setInterval(()=>{ if(App.playerId) emit.ping(); }, 5000);

  requestAnimationFrame(lobbyLoop);
}

// ── ZONE CHECK ──
function checkGRZone(){
  const inZone=myPos.x>GR_ZONE.x&&myPos.x<GR_ZONE.x+GR_ZONE.w&&myPos.y>GR_ZONE.y&&myPos.y<GR_ZONE.y+GR_ZONE.h;
  const hint=document.getElementById('gameroom-hint');
  if(inZone&&!window._panelOpen){
    hint.style.opacity='1';
    hint.style.left=(myPos.x/CW*100)+'vw';
    hint.style.top=((myPos.y-80)/CH*100)+'vh';
    if(keys['e']||keys['E']||keys['Enter']){
      keys['e']=keys['E']=keys['Enter']=false;
      SFX.click();
      openRoomPanel();
    }
  } else if(!window._panelOpen){
    hint.style.opacity='0';
  }
}

// ── ROOM PANEL ──
function openRoomPanel(){
  window._panelOpen=true;
  document.getElementById('room-panel-wrap').classList.add('active');
  if(App.currentRoomId){
    // already in a room — panel will receive room:update via socket
  } else {
    renderRoomLobby();
  }
}

function closeRoomPanel(){
  window._panelOpen=false;
  document.getElementById('room-panel-wrap').classList.remove('active');
  document.getElementById('gameroom-hint').style.opacity='0';
  if(App.currentRoomId){
    emit.leave(App.currentRoomId);
    App.currentRoomId=null;
  }
}
window.openRoomPanel=openRoomPanel;
window.closeRoomPanel=closeRoomPanel;

// ── LOOP ──
function lobbyLoop(){
  requestAnimationFrame(lobbyLoop);
  lFrame++;
  if(!window._panelOpen){
    let dx=0,dy=0;
    if(keys['ArrowLeft']||keys['a']||keys['A']) dx=-1;
    if(keys['ArrowRight']||keys['d']||keys['D']) dx=+1;
    if(keys['ArrowUp']||keys['w']||keys['W']) dy=-1;
    if(keys['ArrowDown']||keys['s']||keys['S']) dy=+1;
    if(dx||dy){
      const len=Math.sqrt(dx*dx+dy*dy);
      const nx=myPos.x+(dx/len)*SPD, ny=myPos.y+(dy/len)*SPD;
      if(canMove(nx,ny)){myPos.x=nx;myPos.y=ny;}
      else if(canMove(nx,myPos.y)){myPos.x=nx;}
      else if(canMove(myPos.x,ny)){myPos.y=ny;}
      myDir={x:dx/len,y:dy/len}; myMoving=true;
      moveTick++;
      if(moveTick>=8){moveTick=0;emit.move(Math.round(myPos.x),Math.round(myPos.y));}
    } else { myMoving=false; }
    checkGRZone();
  }
  const c=lCtx;
  c.clearRect(0,0,CW,CH);
  c.drawImage(bgCache,0,0);
  // GR pulse
  const dzx=myPos.x-(GR_ZONE.x+GR_ZONE.w/2), dzy=myPos.y-(GR_ZONE.y+GR_ZONE.h/2);
  if(Math.sqrt(dzx*dzx+dzy*dzy)<280&&!window._panelOpen){
    const pulse=(Math.sin(lFrame*.08)*.5+.5)*.12+.04;
    c.fillStyle=`rgba(124,58,237,${pulse})`;
    c.fillRect(GR_ZONE.x,GR_ZONE.y,GR_ZONE.w,GR_ZONE.h);
  }
  // Other players from socket
  const others=(window._lobbyPlayers||[]).filter(p=>p.id!==App.playerId);
  for(const op of others) drawLobbyPlayer(c,op.x,op.y,op.character,false,lFrame,op.name,!!op.inRoom);
  // My player
  drawLobbyPlayer(c,myPos.x,myPos.y,App.character,true,lFrame,App.playerName,false);
}

// ═══════════════════════════════════════
//  ROOM PANEL CONTENT
// ═══════════════════════════════════════
function setRoomPanel(html){ document.getElementById('room-panel-content').innerHTML=html; }

// ── Choice screen ──
function renderRoomLobby(){
  setRoomPanel(`
    <div class="ph"><div class="ph-title">🎮 GAME ROOM</div><button class="btn-x" onclick="closeRoomPanel()">✕</button></div>
    <div class="info-box">Buat room baru atau join room yang sudah ada!</div>
    <div class="choice-card" onclick="renderCreateRoom()">
      <h3>+ BUAT ROOM BARU</h3><p>Atur pemain, undercover, Mr. White, timer, dan lainnya.</p>
    </div>
    <div class="s-title" style="margin-top:4px">ROOM TERSEDIA — klik untuk JOIN</div>
    <div id="rooms-list-wrap"><div class="empty-rooms">⏳ Memuat...</div></div>
  `);
  loadRoomList();
}
window.renderRoomLobby=renderRoomLobby;

function loadRoomList(){
  api.getRooms().then(data=>{
    const wrap=document.getElementById('rooms-list-wrap'); if(!wrap) return;
    if(!data.rooms.length){wrap.innerHTML='<div class="empty-rooms">Belum ada room. Buat yang pertama! 🎉</div>';return;}
    const html=data.rooms.map(r=>{
      const avs=r.players.slice(0,6).map(p=>`<div class="rc-av">${charEmoji(p.character)}</div>`).join('');
      const extra=r.players.length>6?`<div class="rc-av">+${r.players.length-6}</div>`:'';
      const tags=[`🕵️ ${r.settings.undercoverCount}`,r.settings.mrWhiteCount?`⬜ ${r.settings.mrWhiteCount}`:null,`⏱️ ${r.settings.timerSeconds}s`].filter(Boolean).join(' · ');
      return `<div class="room-card" onclick="doJoinRoomById('${r.id}')">
        <div><div class="rc-avatars">${avs}${extra}</div></div>
        <div class="rc-info"><div class="rc-host">🏠 ${escHtml(r.hostName)}</div><div class="rc-meta">${r.playerCount}/${r.maxPlayers} pemain · ${tags}</div></div>
        <div class="rc-join-lbl">JOIN →</div>
      </div>`;
    }).join('');
    wrap.innerHTML=`<div class="room-list">${html}</div>`;
  }).catch(()=>{const w=document.getElementById('rooms-list-wrap');if(w)w.innerHTML='<div class="empty-rooms">Gagal memuat.</div>';});
}

async function doJoinRoomById(roomId){
  SFX.click();
  emit.join(roomId);
  // room:joined + room:update will arrive via socket
}
window.doJoinRoomById=doJoinRoomById;

// ── Create room form ──
function renderCreateRoom(){
  setRoomPanel(`
    <div class="ph"><div class="ph-title">+ BUAT ROOM</div><button class="btn-x" onclick="renderRoomLobby()">←</button></div>
    <div class="frow">
      <div class="fg"><label class="fl">MAX PEMAIN</label><input id="f-max" class="fi" type="number" min="3" max="10" value="6"></div>
      <div class="fg"><label class="fl">TIMER PER GILIRAN</label>
        <select id="f-timer" class="fs"><option value="15">15 detik</option><option value="30" selected>30 detik</option><option value="45">45 detik</option><option value="60">60 detik</option></select>
      </div>
    </div>
    <div class="frow3">
      <div class="fg"><label class="fl">UNDERCOVER</label><input id="f-uc" class="fi" type="number" min="1" max="3" value="1"></div>
      <div class="fg"><label class="fl">MR. WHITE</label><input id="f-mw" class="fi" type="number" min="0" max="2" value="0"></div>
      <div class="fg"><label class="fl">WARGA</label><input class="fi" disabled value="otomatis" style="color:var(--muted)"></div>
    </div>
    <label class="tog"><input type="checkbox" id="f-anon"><span class="tog-txt">🎭 Vote anonymous</span><div class="tog-sl"></div></label>
    <label class="tog"><input type="checkbox" id="f-cw" onchange="toggleCW()"><span class="tog-txt">✏️ Input kata sendiri</span><div class="tog-sl"></div></label>
    <div id="cw-fields" style="display:none">
      <div class="frow" style="margin-bottom:12px">
        <div class="fg" style="margin:0"><label class="fl">KATA WARGA</label><input id="f-civw" class="fi" placeholder="misal: Kucing"></div>
        <div class="fg" style="margin:0"><label class="fl">KATA UNDERCOVER</label><input id="f-ucw" class="fi" placeholder="misal: Anjing"></div>
      </div>
    </div>
    <div class="err" id="cr-err"></div>
    <button class="btn" onclick="doCreateRoom()" style="margin-top:6px">BUAT ROOM →</button>
  `);
}
window.renderCreateRoom=renderCreateRoom;

function toggleCW(){
  document.getElementById('cw-fields').style.display=document.getElementById('f-cw').checked?'block':'none';
}
window.toggleCW=toggleCW;

function doCreateRoom(){
  SFX.click();
  const max=parseInt(document.getElementById('f-max').value)||6;
  const timer=parseInt(document.getElementById('f-timer').value)||30;
  const uc=parseInt(document.getElementById('f-uc').value)||1;
  const mw=parseInt(document.getElementById('f-mw').value)||0;
  const anon=document.getElementById('f-anon').checked;
  const useCW=document.getElementById('f-cw').checked;
  let customWord=null;
  if(useCW){
    const cw=document.getElementById('f-civw').value.trim();
    const uw=document.getElementById('f-ucw').value.trim();
    if(!cw||!uw){document.getElementById('cr-err').textContent='Isi kedua kata custom!';return;}
    customWord={civilian:cw,undercover:uw};
  }
  const minP=uc+mw+2;
  if(max<minP){document.getElementById('cr-err').textContent=`Butuh min. ${minP} pemain!`;return;}
  emit.create({maxPlayers:max,undercoverCount:uc,mrWhiteCount:mw,voteAnonymous:anon,timerSeconds:timer,customWord});
}
window.doCreateRoom=doCreateRoom;

// ── Waiting room panel ──
function renderRoomPanel(room){
  if(!room) return;
  if(room.status!=='waiting'){
    closeRoomPanel();
    onGameStart(room);
    return;
  }
  const isHost=room.hostId===App.playerId;
  const minP=room.settings.undercoverCount+room.settings.mrWhiteCount+2;
  const canStart=room.players.length>=minP;

  const cards=room.players.map(p=>`
    <div class="wait-card ${p.id===App.playerId?'me':''} ${p.id===room.hostId?'host':''}">
      <canvas class="wc-canvas" id="pwc-${p.id}" width="52" height="68"></canvas>
      <div class="wc-name">${escHtml(p.name)}</div>
      ${p.id===room.hostId?'<span class="wc-badge" style="color:var(--gold)">HOST</span>':''}
      ${p.id===App.playerId?'<span class="wc-badge" style="color:var(--cyan)">KAMU</span>':''}
    </div>`).join('');

  const tags=[
    `👥 ${room.players.length}/${room.settings.maxPlayers}`,
    `🕵️ ${room.settings.undercoverCount} undercover`,
    ...(room.settings.mrWhiteCount>0?[`⬜ ${room.settings.mrWhiteCount} mr.white`]:[]),
    `⏱️ ${room.settings.timerSeconds}s`,
    room.settings.voteAnonymous?'🎭 anon':'👁️ terbuka',
  ].map(t=>`<span class="tag">${t}</span>`).join('');

  // Check if player count changed for SFX
  const prevCount=window._lastRoomPlayerCount||0;
  if(room.players.length>prevCount&&prevCount>0) SFX.join();
  window._lastRoomPlayerCount=room.players.length;

  setRoomPanel(`
    <div class="ph"><div class="ph-title">🚪 WAITING ROOM</div><button class="btn-x" onclick="doLeaveRoomPanel()">✕</button></div>
    <div class="code-big">
      <div class="code-lbl">KODE ROOM — bagikan ke teman!</div>
      <div class="code-val" onclick="copyRoomCode('${room.id}')">${room.id}</div>
      <div style="font-size:.65rem;color:var(--muted);margin-top:4px">📋 klik untuk copy</div>
    </div>
    <div class="s-title">PEMAIN (${room.players.length}/${room.settings.maxPlayers})</div>
    <div class="wait-grid" style="margin-bottom:12px">${cards}</div>
    <div class="tags" style="margin-bottom:14px">${tags}</div>
    ${isHost
      ?`<button class="btn ${canStart?'':'ghost'}" onclick="doPanelStart()" ${canStart?'':'disabled'}>
          ${canStart?'MULAI GAME →':`⏳ Butuh min. ${minP} pemain`}</button>`
      :`<div class="info-box">⏳ Menunggu host memulai...</div>`}
  `);
  setTimeout(()=>{
    room.players.forEach(p=>{
      const cv=document.getElementById(`pwc-${p.id}`); if(!cv) return;
      drawSprite(cv.getContext('2d'),26,60,p.character,2.5,0);
    });
  },0);
}
window.renderRoomPanel=renderRoomPanel;

function copyRoomCode(code){
  navigator.clipboard.writeText(code).catch(()=>{});
  const el=document.querySelector('.code-val');
  if(el){el.textContent='COPIED!';setTimeout(()=>el.textContent=code,1200);}
}
window.copyRoomCode=copyRoomCode;

function doPanelStart(){
  SFX.click();
  emit.start();
}
window.doPanelStart=doPanelStart;

function doLeaveRoomPanel(){
  SFX.click();
  closeRoomPanel();
}
window.doLeaveRoomPanel=doLeaveRoomPanel;
