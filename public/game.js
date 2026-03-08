// ═══════════════════════════════════════
//  GAME SCREEN — Realtime, no input reset
// ═══════════════════════════════════════
let gameCanvas, gameCtx, gameRoom=null, gameFrame=0, gameAnimId=null;
let myVoteTarget=null, particleList=[];
let _lastStatus=null, _lastTurn=null, _lastClueCount=0;
let _timerTick=null, _lastWarnSec=null;
// These are set each time a room:update arrives with timerRemaining
let _timerSnapshot=null;   // { remaining, at } — remaining secs at timestamp 'at'

// ─────────────────────────────────────────
//  CLIENT-SIDE TIMER TICK
//  Runs every 200ms — updates ONLY the timer
//  DOM elements, no full re-render, so input
//  focus is never broken.
// ─────────────────────────────────────────
function startTimerTick(){
  stopTimerTick();
  _timerTick = setInterval(()=>{
    if(!gameRoom || gameRoom.status!=='playing' || !_timerSnapshot) return;
    // Count down from last server snapshot using local clock — no clock skew
    const elapsed   = (Date.now() - _timerSnapshot.at) / 1000;
    const remaining = Math.max(0, _timerSnapshot.remaining - elapsed);
    const total     = gameRoom.settings.timerSeconds;
    const pct       = Math.min(100, (remaining / total) * 100);
    const hot       = remaining < total * 0.3;
    const secs      = Math.ceil(remaining);
    // Update text
    const timeEl = document.getElementById('tc-time');
    if(timeEl) timeEl.textContent = '\u23f1\ufe0f ' + secs + 's \u00b7 Ronde ' + gameRoom.round;
    // Update bar
    const fillEl = document.getElementById('timer-fill');
    if(fillEl){ fillEl.style.width = pct+'%'; fillEl.className='timer-fill'+(hot?' hot':''); }
    // SFX warning
    if(hot && secs<=5 && gameRoom.currentTurn===App.playerId){
      if(_lastWarnSec!==secs){ _lastWarnSec=secs; SFX.timerWarn(); }
    } else { _lastWarnSec=null; }
  }, 200);
}
function stopTimerTick(){
  if(_timerTick){ clearInterval(_timerTick); _timerTick=null; }
}

function initGameCanvas(){
  gameCanvas=document.getElementById('game-canvas');
  gameCtx=gameCanvas.getContext('2d');
  const wrap=document.getElementById('game-canvas-wrap');
  gameCanvas.width=wrap.offsetWidth||800;
  gameCanvas.height=wrap.offsetHeight||720;
  new ResizeObserver(()=>{ gameCanvas.width=wrap.offsetWidth; gameCanvas.height=wrap.offsetHeight; }).observe(wrap);
}

function onGameStart(room){
  if(!gameCanvas) initGameCanvas();
  App.showGame();
  document.getElementById('gc-room-id').textContent=room.id;
  App.currentRoomId=room.id;
  gameRoom=room; myVoteTarget=null;
  _lastStatus=null; _lastTurn=null; _lastClueCount=0;
  renderGameState(room);
  startTimerTick();
  if(!gameAnimId) gameAnimId=requestAnimationFrame(gameLoop);
}
window.onGameStart=onGameStart;

// ─────────────────────────────────────────
//  SMART RENDER — preserves input focus
// ─────────────────────────────────────────
function renderGameState(room){
  if(!room) return;
  const statusChanged = room.status !== _lastStatus;
  const turnChanged   = room.currentTurn !== _lastTurn;
  const newClues      = room.clues.length > _lastClueCount;

  // SFX triggers
  if(statusChanged){
    if(room.status==='voting')   SFX.voteStart();
    if(room.status==='reveal')   { const e=room.lastVoteResult?.eliminated; if(e) SFX.eliminated(); }
    if(room.status==='finished') { room.winner==='civilian'&&App.playerId===room.players.find(p=>room.allRoles?.[p.id]==='civilian')?.id ? SFX.win() : room.winner==='undercover'&&room.allRoles?.[App.playerId]==='undercover' ? SFX.win() : SFX.lose(); }
  }
  if(turnChanged && room.status==='playing'){ startTimerTick(); }
  if(turnChanged && room.currentTurn===App.playerId && room.status==='playing') SFX.yourTurn();
  if(newClues) SFX.clueIn();

  _lastStatus=room.status; _lastTurn=room.currentTurn; _lastClueCount=room.clues.length;
  // Save timer snapshot using local clock to avoid server/client clock skew
  if(room.status==='playing' && room.timerRemaining!=null){
    _timerSnapshot = { remaining: room.timerRemaining, at: Date.now() };
  } else if(room.status!=='playing'){
    _timerSnapshot = null;
  }

  if(room.status!=='playing') stopTimerTick();
  switch(room.status){
    case 'waiting':       renderWaitGame(room);     break;
    case 'playing':       renderPlaying(room);      break;
    case 'voting':        renderVoting(room);        break;
    case 'mrwhite-guess': renderMrWhiteGuess(room); break;
    case 'reveal':        renderReveal(room);        break;
    case 'finished':      renderFinished(room);      break;
  }
}

function setBody(html){
  const el=document.getElementById('gc-body'); if(el) el.innerHTML=html;
}

function roleBadge(role){
  const map={civilian:['r-civ','WARGA'],undercover:['r-uc','UNDERCOVER'],mrwhite:['r-mw','MR. WHITE']};
  const [cls,lbl]=map[role]||['r-civ','?'];
  return `<span class="role-badge ${cls}">${lbl}</span>`;
}

// ─────────────────────────────────────────
//  GAME CANVAS LOOP
// ─────────────────────────────────────────
function gameLoop(){
  gameAnimId=requestAnimationFrame(gameLoop);
  if(!gameRoom) return;
  gameFrame++;
  const c=gameCtx, W=gameCanvas.width, H=gameCanvas.height;
  c.clearRect(0,0,W,H);

  // Background
  const bg=c.createRadialGradient(W/2,H/2,50,W/2,H/2,Math.max(W,H)*.7);
  bg.addColorStop(0,'#12102a'); bg.addColorStop(.6,'#0c0b1e'); bg.addColorStop(1,'#080814');
  c.fillStyle=bg; c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(255,255,255,.02)'; c.lineWidth=1;
  for(let y=0;y<H;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  for(let x=0;x<W;x+=60){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}

  updateParticles(c,W,H);
  const cx=W/2, cy=H/2+10;
  drawTable(c,cx,cy,W,H);
  drawPlayersAround(c,cx,cy,W,H);
  drawCandles(c,cx,cy,W,H);
}

function drawTable(c,cx,cy,W,H){
  const rx=Math.min(W*.28,200), ry=Math.min(H*.2,130);
  c.fillStyle='rgba(0,0,0,.4)';
  c.beginPath();c.ellipse(cx,cy+8,rx+20,ry+12,0,0,Math.PI*2);c.fill();
  const tg=c.createRadialGradient(cx-rx*.3,cy-ry*.3,10,cx,cy,rx);
  tg.addColorStop(0,'#4a2f12');tg.addColorStop(.6,'#3a2410');tg.addColorStop(1,'#2a1a0a');
  c.fillStyle=tg;c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);c.fill();
  const fg=c.createRadialGradient(cx,cy,10,cx,cy,rx*.85);
  fg.addColorStop(0,'#1e3a5f');fg.addColorStop(1,'#0f2040');
  c.fillStyle=fg;c.beginPath();c.ellipse(cx,cy,rx*.85,ry*.85,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#6b4423';c.lineWidth=4;c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);c.stroke();
  c.strokeStyle='rgba(180,120,60,.3)';c.lineWidth=1.5;c.beginPath();c.ellipse(cx,cy,rx-5,ry-5,0,0,Math.PI*2);c.stroke();
  c.save();c.globalAlpha=.12;
  c.font=`${Math.floor(ry*.5)}px serif`;c.textAlign='center';c.textBaseline='middle';
  c.fillStyle='#c0a060';c.fillText('🕵️',cx,cy);c.restore();
}

function drawPlayersAround(c,cx,cy,W,H){
  if(!gameRoom) return;
  const n=gameRoom.players.length;
  const rx=Math.min(W*.28,200)+Math.min(W*.15,100);
  const ry=Math.min(H*.2,130)+Math.min(H*.14,100);
  const SCALE=Math.min(3,Math.floor(W/320));
  gameRoom.players.forEach((p,i)=>{
    const angle=(i/n)*Math.PI*2-Math.PI/2;
    const px=cx+Math.cos(angle)*rx, py=cy+Math.sin(angle)*ry;
    const alive=!p.isEliminated;
    const isTurn=gameRoom.currentTurn===p.id&&gameRoom.status==='playing';
    const isMe=p.id===App.playerId;
    const inWant=gameRoom.wantVote?.includes(p.id);
    if(isTurn&&alive){
      const sg=c.createRadialGradient(px,py,5,px,py,80);
      sg.addColorStop(0,'rgba(34,211,238,.2)');sg.addColorStop(1,'rgba(34,211,238,0)');
      c.fillStyle=sg;c.beginPath();c.arc(px,py,80,0,Math.PI*2);c.fill();
    }
    if(isMe){
      const mg=c.createRadialGradient(px,py,5,px,py,60);
      mg.addColorStop(0,'rgba(251,191,36,.15)');mg.addColorStop(1,'rgba(251,191,36,0)');
      c.fillStyle=mg;c.beginPath();c.arc(px,py,60,0,Math.PI*2);c.fill();
    }
    const srx=Math.cos(angle)*rx*.72, sry=Math.sin(angle)*ry*.72;
    c.fillStyle=alive?(isTurn?'rgba(34,211,238,.15)':'rgba(60,40,20,.5)'):'rgba(20,20,20,.4)';
    c.beginPath();c.ellipse(cx+srx,cy+sry,20,12,0,0,Math.PI*2);c.fill();
    c.save();
    if(!alive){c.globalAlpha=.3;c.filter='grayscale(100%)';}
    const bob=isTurn&&alive ? Math.sin(gameFrame*.12)*SCALE : 0;
    drawSprite(c,px,py,p.character,SCALE,bob);
    c.restore();
    // Name
    const nm=isMe?`★${p.name}`:p.name;
    const tw=c.measureText(nm).width+8;
    const ly=py-20*SCALE-16+bob;
    c.fillStyle='rgba(0,0,0,.7)';c.fillRect(px-tw/2,ly-13,tw,14);
    c.font=`${isMe?'bold ':''}${Math.max(9,SCALE*3.5)}px "Share Tech Mono"`;
    c.textAlign='center';
    c.fillStyle=isMe?'#fbbf24':(alive?'#e2e8f0':'#6b7280');
    c.fillText(nm,px,ly);
    if(isTurn&&alive){c.fillStyle='#22d3ee';c.font='10px "Share Tech Mono"';c.fillText('◄ GILIRAN',px,ly-16);}
    if(!alive){
      c.strokeStyle='#f87171';c.lineWidth=2;c.globalAlpha=.5;
      const r=SCALE*8;
      c.beginPath();c.moveTo(px-r,py-r);c.lineTo(px+r,py+r);c.stroke();
      c.beginPath();c.moveTo(px+r,py-r);c.lineTo(px-r,py+r);c.stroke();
      c.globalAlpha=1;c.lineWidth=1;
    }
    if(inWant&&alive&&gameRoom.status==='playing'){
      c.fillStyle='#a78bfa';c.font='11px serif';c.fillText('⚑',px+SCALE*5,py-SCALE*12+bob);
    }
  });
}

function drawCandles(c,cx,cy,W,H){
  const cvs=[{x:cx-cx*.6,y:cy-cy*.5},{x:cx+cx*.6,y:cy-cy*.5},{x:cx-cx*.6,y:cy+cy*.5},{x:cx+cx*.6,y:cy+cy*.5}];
  const fl=Math.sin(gameFrame*.07)*.3+.7;
  for(const cv of cvs){
    if(cv.x<20||cv.x>W-20||cv.y<20||cv.y>H-20) continue;
    const cg=c.createRadialGradient(cv.x,cv.y,2,cv.x,cv.y,70);
    cg.addColorStop(0,`rgba(255,180,60,${.18*fl})`);cg.addColorStop(1,'rgba(255,100,0,0)');
    c.fillStyle=cg;c.beginPath();c.arc(cv.x,cv.y,70,0,Math.PI*2);c.fill();
    c.fillStyle=`rgba(255,200,80,${fl})`;c.beginPath();c.arc(cv.x,cv.y,3,0,Math.PI*2);c.fill();
  }
}

function updateParticles(c,W,H){
  if(gameFrame%8===0&&particleList.length<20)
    particleList.push({x:Math.random()*W,y:Math.random()*H,vy:-0.5-Math.random(),alpha:.4,size:1+Math.random()});
  particleList=particleList.filter(p=>p.alpha>0);
  for(const p of particleList){
    p.y+=p.vy;p.alpha-=.003;
    c.fillStyle=`rgba(192,132,252,${p.alpha})`;c.beginPath();c.arc(p.x,p.y,p.size,0,Math.PI*2);c.fill();
  }
}

// ─────────────────────────────────────────
//  PHASES
// ─────────────────────────────────────────
function renderWaitGame(room){
  const isHost=room.hostId===App.playerId;
  const minP=room.settings.undercoverCount+room.settings.mrWhiteCount+2;
  const can=room.players.length>=minP;
  const cards=room.players.map(p=>`
    <div class="wait-card ${p.id===App.playerId?'me':''} ${p.id===room.hostId?'host':''}">
      <canvas class="wc-canvas" id="gs-${p.id}" width="48" height="62"></canvas>
      <div class="wc-name">${escHtml(p.name)}</div>
      ${p.id===room.hostId?'<span class="wc-badge" style="color:var(--gold)">HOST</span>':''}
    </div>`).join('');
  setBody(`
    <div class="my-word-card"><div class="mwc-lbl">MENUNGGU PEMAIN</div><div class="mwc-word" style="font-size:1.8rem">⏳</div></div>
    <div style="font-size:.6rem;color:var(--muted);font-family:'Press Start 2P'">PEMAIN</div>
    <div class="wait-grid">${cards}</div>
    ${isHost?`<button class="btn ${can?'':'ghost'}" onclick="doGameStart()" ${can?'':'disabled'}>${can?'MULAI →':`Min. ${minP} pemain`}</button>`
            :`<div class="info-box">⏳ Menunggu host...</div>`}
    <button class="btn ghost" onclick="doLeaveGame()" style="margin-top:8px">← Keluar Room</button>
  `);
  setTimeout(()=>{room.players.forEach(p=>{const cv=document.getElementById(`gs-${p.id}`);if(cv)drawSprite(cv.getContext('2d'),24,56,p.character,2.2,0);});},0);
}

function doGameStart(){ SFX.click(); emit.start(); }
window.doGameStart=doGameStart;

// PLAYING — smart update: don't re-render if input is focused
function renderPlaying(room){
  const isMyTurn=room.currentTurn===App.playerId;
  const turnP=room.players.find(p=>p.id===room.currentTurn);
  const alive=room.players.filter(p=>!p.isEliminated);
  // Use timerRemaining from server snapshot to avoid clock skew
  const remaining=room.timerRemaining!=null ? room.timerRemaining : room.settings.timerSeconds;
  const pct=Math.min(100,(remaining/room.settings.timerSeconds)*100);
  const hot=remaining<room.settings.timerSeconds*.3;

  let wordHtml='';
  if(room.myRole==='mrwhite') wordHtml=`<div class="my-word-card"><div class="mwc-lbl">KATAMU</div><div class="mwc-word">???</div>${roleBadge('mrwhite')}<div style="font-size:.7rem;color:var(--muted);margin-top:5px">Bluff!</div></div>`;
  else if(room.myRole) wordHtml=`<div class="my-word-card"><div class="mwc-lbl">KATAMU</div><div class="mwc-word">${escHtml(room.myWord||'')}</div>${roleBadge(room.myRole)}</div>`;

  let logHtml='',lastRnd=0;
  for(const cl of room.clues){
    if(cl.round!==lastRnd){logHtml+=`<div class="log-sep">── RONDE ${cl.round} ──</div>`;lastRnd=cl.round;}
    logHtml+=`<div class="log-item ${cl.autoSkipped?'sk':''}"><span class="log-who">${escHtml(cl.playerName)}:</span><span class="log-what">${escHtml(cl.clue)}</span></div>`;
  }
  if(!logHtml) logHtml='<div style="color:var(--muted);font-size:.78rem;text-align:center;padding:8px">Belum ada clue...</div>';

  const chips=room.players.map(p=>{
    const dead=p.isEliminated;
    const turn=p.id===room.currentTurn&&!dead;
    return `<div class="chip ${turn?'turn':''} ${dead?'dead':''}">${charEmoji(p.character)} ${escHtml(p.name)}</div>`;
  }).join('');

  const voted=room.wantVote?.includes(App.playerId);
  const thr=room.voteThreshold||Math.floor(alive.length/2)+1;

  // Check if clue input is focused — preserve it
  const activeId=document.activeElement?.id;
  const hadClueFocus=activeId==='ci';
  const savedClue=hadClueFocus?document.getElementById('ci')?.value:'';

  setBody(`
    ${wordHtml}
    <div class="turn-card ${isMyTurn?'my':''}">
      ${isMyTurn?`<div class="tc-who">🎤 GILIRANMU!</div>`:`<div class="tc-who">${escHtml(turnP?.name||'?')}'s turn</div>`}
      <div class="tc-time" id="tc-time">⏱️ ${Math.ceil(remaining)}s · Ronde ${room.round}</div>
      <div class="timer-track"><div class="timer-fill ${hot?'hot':''}" id="timer-fill" style="width:${pct}%"></div></div>
    </div>
    ${isMyTurn?`<div class="clue-row"><input id="ci" placeholder="Ketik clue..." maxlength="60" autocomplete="off" autofocus><button class="btn sm cyan" onclick="doClue()">KIRIM</button></div>`:''}
    <div class="chips">${chips}</div>
    <div class="vote-now-bar">
      <div><div style="font-size:.75rem;margin-bottom:2px">Cukup clue?</div>
        <div class="vnb-cnt"><span>${room.wantVoteCount||0}</span>/${thr} mau vote</div></div>
      <button class="btn sm ${voted?'red':''}" onclick="doVoteNow()">${voted?'✓ Mau Vote':'⚑ Vote Sekarang'}</button>
    </div>
    <div class="sec-title">LOG CLUE</div>
    <div class="log-wrap" id="log-el">${logHtml}</div>
  `);

  // Restore and refocus clue input
  if(isMyTurn){
    const ci=document.getElementById('ci');
    if(ci){
      if(savedClue) ci.value=savedClue;
      if(hadClueFocus) ci.focus();
      ci.addEventListener('keydown',e=>{if(e.key==='Enter') doClue();});
    }
  }
  const logEl=document.getElementById('log-el');
  if(logEl) logEl.scrollTop=logEl.scrollHeight;
}

function doClue(){
  const ci=document.getElementById('ci'); if(!ci) return;
  const clue=ci.value.trim(); if(!clue) return;
  SFX.click();
  emit.clue(clue);
  ci.value=''; // clear after send
}
window.doClue=doClue;

function doVoteNow(){ SFX.click(); emit.voteNow(); }
window.doVoteNow=doVoteNow;

// VOTING
function renderVoting(room){
  const alive=room.players.filter(p=>!p.isEliminated);
  const hasVoted=room.votes?.[App.playerId];
  const isDead=room.players.find(p=>p.id===App.playerId)?.isEliminated;
  const total=Object.keys(room.votes||{}).length;
  let wordRemind='';
  if(room.myRole==='mrwhite') wordRemind='<div class="info-box">Kamu Mr. White — coba bertahan!</div>';
  else if(room.myRole) wordRemind=`<div class="info-box">Katamu: <strong>${escHtml(room.myWord||'???')}</strong></div>`;
  const opts=alive.map(p=>{
    const isMe=p.id===App.playerId;
    const isSel=myVoteTarget===p.id||(hasVoted&&room.votes?.[App.playerId]===p.id);
    const cnt=!room.settings?.voteAnonymous?Object.values(room.votes||{}).filter(v=>v===p.id).length:null;
    return `<div class="vote-opt ${isSel?'sel':''} ${hasVoted||isDead?'cast':''} ${isMe?'mine':''}"
                 onclick="${!hasVoted&&!isMe&&!isDead?`doVote('${p.id}')`:''}">
      <span style="font-size:1.4rem">${charEmoji(p.character)}</span>
      <span class="vo-name">${escHtml(p.name)}${isMe?' (kamu)':''}</span>
      ${cnt!==null?`<span class="vo-cnt">${cnt}✗</span>`:''}
    </div>`;
  }).join('');
  setBody(`
    ${wordRemind}
    <div style="font-family:'Press Start 2P',monospace;font-size:.7rem;color:var(--glow);margin-bottom:8px">🗳️ VOTING!</div>
    <div style="font-size:.8rem;color:var(--muted);margin-bottom:10px">Siapa yang kamu curigai?</div>
    <div class="vprog"><span>${total}</span>/${alive.length} sudah vote</div>
    <div class="vote-list">${opts}</div>
    ${isDead?'<div class="info-box">Kamu sudah tereliminasi.</div>':''}
    ${hasVoted?'<div class="info-box">✓ Vote masuk. Menunggu...</div>':''}
  `);
}

function doVote(tid){ SFX.click(); myVoteTarget=tid; emit.vote(tid); }
window.doVote=doVote;

// MR WHITE GUESS
function renderMrWhiteGuess(room){
  const isMrW=room.mrWhiteElim===App.playerId;
  const elimP=room.players.find(p=>p.id===room.mrWhiteElim);
  if(isMrW){
    const savedGuess=document.getElementById('guess-i')?.value||'';
    const hadFocus=document.activeElement?.id==='guess-i';
    setBody(`
      <div class="my-word-card"><div class="mwc-lbl">KAMU TERTANGKAP!</div><div class="mwc-word">⬜</div></div>
      <div class="mw-wrap">
        <div class="mw-title">MR. WHITE LAST CHANCE!</div>
        <div class="mw-sub">Tebak kata para warga untuk menang!</div>
        <input id="guess-i" class="fi" placeholder="Tebak kata warga..." style="text-align:center;font-size:1rem;margin-bottom:10px" autocomplete="off">
        <div class="err" id="guess-err"></div>
        <button class="btn" onclick="doGuess()">TEBAK! 🎯</button>
      </div>
    `);
    const gi=document.getElementById('guess-i');
    if(gi){
      if(savedGuess) gi.value=savedGuess;
      if(hadFocus) gi.focus();
      gi.addEventListener('keydown',e=>{if(e.key==='Enter') doGuess();});
    }
  } else {
    setBody(`
      <div class="my-word-card"><div class="mwc-lbl">MR. WHITE TERTANGKAP</div>
        <div class="mwc-word" style="font-size:1.8rem">${charEmoji(elimP?.character||'wizard')}</div>
      </div>
      <div class="info-box" style="margin-top:10px">
        <strong>${escHtml(elimP?.name||'?')}</strong> adalah Mr. White!<br>
        <span style="color:var(--muted)">Sedang menebak kata... 🤔</span>
      </div>
    `);
  }
}

function doGuess(){
  const gi=document.getElementById('guess-i'); if(!gi) return;
  const g=gi.value.trim(); if(!g) return;
  SFX.click(); emit.guess(g);
}
window.doGuess=doGuess;

// REVEAL
function renderReveal(room){
  const isHost=room.hostId===App.playerId;
  const res=room.lastVoteResult;
  let revBox='';
  if(res?.isTie){
    revBox=`<div class="reveal-card"><span class="rev-icon">🤝</span><div class="rev-name">SERI!</div><div style="color:var(--muted);font-size:.8rem;margin-top:6px">Tidak ada yang tereliminasi.</div></div>`;
  } else if(res?.eliminated){
    const ep=room.players.find(p=>p.id===res.eliminated);
    const role=room.allRoles?.[res.eliminated]||room.eliminated?.find(e=>e.playerId===res.eliminated)?.role||'?';
    const rc=role==='civilian'?'var(--green)':role==='undercover'?'var(--red)':'#fff';
    revBox=`<div class="reveal-card" style="border-color:${rc}">
      <span class="rev-icon">${charEmoji(ep?.character||'wizard')}</span>
      <div class="rev-name">${escHtml(ep?.name||'?')} tereliminasi!</div>
      <div style="color:${rc};font-family:'Press Start 2P',monospace;font-size:.65rem;margin-top:4px">
        ${role==='civilian'?'😇 WARGA':role==='undercover'?'🕵️ UNDERCOVER!':'⬜ MR. WHITE!'}
      </div>
      ${room.mrWhiteGuess?`<div style="margin-top:10px;font-size:.75rem;color:var(--muted)">
        Tebakan: <strong style="color:${room.mrWhiteGuess.correct?'var(--green)':'var(--red)'}">
          ${escHtml(room.mrWhiteGuess.guess)} ${room.mrWhiteGuess.correct?'✓ BENAR':'✗ SALAH'}
        </strong></div>`:''}
    </div>`;
  }
  let voteBreak='';
  if(!room.settings?.voteAnonymous&&res?.tally&&Object.keys(res.tally).length){
    const rows=Object.entries(res.tally).map(([pid,cnt])=>{
      const pp=room.players.find(p=>p.id===pid);
      const voters=res.votes?Object.entries(res.votes).filter(([,v])=>v===pid).map(([vid])=>room.players.find(p=>p.id===vid)?.name||'?').join(', '):'';
      return `<div class="rv-row">${charEmoji(pp?.character)}<span class="rv-name">${escHtml(pp?.name||'?')}</span><span style="color:var(--glow)">${cnt}✗</span>${voters?`<span class="rv-word">${escHtml(voters)}</span>`:''}</div>`;
    }).join('');
    voteBreak=`<div class="sec-title">HASIL VOTE</div><div class="rv-list">${rows}</div>`;
  }
  setBody(`
    ${revBox}${voteBreak}
    <div style="height:4px"></div>
    ${isHost?`<button class="btn" onclick="doContinue()">LANJUT RONDE →</button>`:`<div class="info-box">⏳ Menunggu host...</div>`}
  `);
}

function doContinue(){ SFX.click(); emit.cont(); }
window.doContinue=doContinue;

// FINISHED
function renderFinished(room){
  const w=room.winner;
  const icons={civilian:'🎊',undercover:'🕵️',mrwhite:'⬜'};
  const titles={civilian:'WARGA MENANG!',undercover:'UNDERCOVER MENANG!',mrwhite:'MR. WHITE MENANG!'};
  const colors={civilian:'var(--green)',undercover:'var(--red)',mrwhite:'#fff'};
  const rows=room.players.map(p=>{
    const role=(room.allRoles||{})[p.id]||'?';
    const word=role==='civilian'?(room.allWords||{}).civilian:role==='undercover'?(room.allWords||{}).undercover:'(no kata)';
    return `<div class="rv-row">${charEmoji(p.character)}<span class="rv-name">${escHtml(p.name)}</span>
      <span class="role-badge ${role==='civilian'?'r-civ':role==='undercover'?'r-uc':'r-mw'}" style="font-size:.45rem">${role.toUpperCase()}</span>
      <span class="rv-word">${escHtml(word)}</span></div>`;
  }).join('');
  setBody(`
    <div class="winner-wrap">
      <span class="winner-ico">${icons[w]||'🏆'}</span>
      <div class="winner-ttl" style="color:${colors[w]||'var(--gold)'}">${titles[w]||'SELESAI!'}</div>
      <div class="winner-rsn">${escHtml(room.winReason||'')}</div>
    </div>
    <div class="sec-title">SEMUA ROLE</div>
    <div class="rv-list" style="margin-bottom:16px">${rows}</div>
    <div style="display:flex;gap:8px">
      <button class="btn ghost" style="flex:1" onclick="doPlayAgain()">MAIN LAGI</button>
      <button class="btn" style="flex:1" onclick="doLeaveGame()">KELUAR</button>
    </div>
  `);
}

function doPlayAgain(){
  SFX.click();
  if(App.currentRoomId){ emit.leave(App.currentRoomId); App.currentRoomId=null; }
  App.backToLobby();
  openRoomPanel(); renderCreateRoom();
}
window.doPlayAgain=doPlayAgain;

function doLeaveGame(){
  SFX.click();
  if(App.currentRoomId){ emit.leave(App.currentRoomId); App.currentRoomId=null; }
  App.backToLobby();
}
window.doLeaveGame=doLeaveGame;
