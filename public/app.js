// ═══════════════════════════════════════
//  SOCKET.IO CLIENT
// ═══════════════════════════════════════
// socket.io is loaded via CDN in index.html
let socket = null;

function connectSocket() {
  socket = io(); // auto-connects to same host

  socket.on('connect', () => {
    if (App.playerId) {
      socket.emit('auth', { playerId: App.playerId });
    }
  });

  socket.on('auth:ok', ({ playerId, character, name }) => {
    App.playerId   = playerId;
    App.character  = character;
    App.playerName = name;
  });

  socket.on('lobby:players', ({ players }) => {
    window._lobbyPlayers = players;
    const me = players.find(p => p.id === App.playerId);
    document.getElementById('online-count').textContent = players.length;
  });

  socket.on('room:joined', ({ roomId }) => {
    App.currentRoomId = roomId;
  });

  socket.on('room:update', (room) => {
    // If still in waiting room panel
    if (room.status === 'waiting' && window._panelOpen) {
      renderRoomPanel(room);
      return;
    }
    // If transitioning to game
    if (room.status !== 'waiting') {
      if (!window._inGameScreen) {
        window._inGameScreen = true;
        onGameStart(room);
      } else {
        // Smart update: preserve input values
        const clueInput = document.getElementById('ci');
        const savedClue = clueInput ? clueInput.value : '';
        const guessInput = document.getElementById('guess-i');
        const savedGuess = guessInput ? guessInput.value : '';

        renderGameState(room);

        // Restore inputs after re-render
        const newClue = document.getElementById('ci');
        if (newClue && savedClue) newClue.value = savedClue;
        const newGuess = document.getElementById('guess-i');
        if (newGuess && savedGuess) newGuess.value = savedGuess;
      }
    }
  });

  socket.on('error', (msg) => {
    console.warn('Socket error:', msg);
    // Show toast error
    showToast(msg, 'error');
  });
}

// ═══════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════
const App = {
  playerId: null, playerName: null, character: null,
  currentRoomId: null,
  init() {
    this.playerId   = sessionStorage.getItem('pid');
    this.playerName = sessionStorage.getItem('pname');
    this.character  = sessionStorage.getItem('pchar');
  },
  set(id, name, ch) {
    this.playerId=id; this.playerName=name; this.character=ch;
    sessionStorage.setItem('pid',id);
    sessionStorage.setItem('pname',name);
    sessionStorage.setItem('pchar',ch);
  },
  showLobby() {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-lobby').classList.remove('hidden');
    document.getElementById('screen-game').classList.remove('active');
    window._inGameScreen = false;
  },
  showGame() {
    document.getElementById('screen-lobby').classList.add('hidden');
    document.getElementById('screen-game').classList.add('active');
  },
  backToLobby() {
    document.getElementById('screen-game').classList.remove('active');
    document.getElementById('screen-lobby').classList.remove('hidden');
    window._inGameScreen = false;
  },
};

// ═══════════════════════════════════════
//  SOCKET EMIT HELPERS
// ═══════════════════════════════════════
const emit = {
  move:     (x,y)          => socket?.emit('lobby:move',   { playerId:App.playerId, x, y }),
  ping:     ()             => socket?.emit('lobby:ping',   { playerId:App.playerId }),
  create:   (settings)     => socket?.emit('room:create',  { playerId:App.playerId, settings }),
  join:     (roomId)       => socket?.emit('room:join',    { playerId:App.playerId, roomId }),
  start:    ()             => socket?.emit('room:start',   { playerId:App.playerId, roomId:App.currentRoomId }),
  clue:     (clue)         => socket?.emit('clue:submit',  { playerId:App.playerId, roomId:App.currentRoomId, clue }),
  voteNow:  ()             => socket?.emit('vote:now',     { playerId:App.playerId, roomId:App.currentRoomId }),
  vote:     (targetId)     => socket?.emit('vote:cast',    { playerId:App.playerId, roomId:App.currentRoomId, targetId }),
  guess:    (guess)        => socket?.emit('guess:submit', { playerId:App.playerId, roomId:App.currentRoomId, guess }),
  cont:     ()             => socket?.emit('game:continue',{ playerId:App.playerId, roomId:App.currentRoomId }),
  leave:    (roomId)       => socket?.emit('room:leave',   { playerId:App.playerId, roomId }),
};
window.emit = emit;

// Legacy HTTP for join + rooms list (before socket auth)
const api = {
  async post(url, data) {
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error||'Server error');
    return j;
  },
  async get(url) {
    const r = await fetch(url);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error||'Server error');
    return j;
  },
  join:     name  => api.post('/api/join', { name }),
  getRooms: ()    => api.get('/api/rooms'),
};
window.api = api;

// ═══════════════════════════════════════
//  CHARACTER DATA
// ═══════════════════════════════════════
const CHARS = {
  wizard:  { body:'#5b21b6', pants:'#4c1d95', shoe:'#1e1b4b', hair:'#d97706', eye:'#e9d5ff', hat:'pointy',  hatCol:'#7c3aed', hatAcc:'#a78bfa' },
  knight:  { body:'#64748b', pants:'#334155', shoe:'#0f172a', hair:'#7c2d12', eye:'#7dd3fc', hat:'helmet',  hatCol:'#94a3b8', hatAcc:'#1e3a8a' },
  archer:  { body:'#15803d', pants:'#14532d', shoe:'#052e16', hair:'#b45309', eye:'#86efac', hat:'hood',    hatCol:'#166534', hatAcc:'#4ade80' },
  rogue:   { body:'#312e81', pants:'#1e1b4b', shoe:'#0c0a1e', hair:'#374151', eye:'#f87171', hat:'scarf',   hatCol:'#1e1b4b', hatAcc:'#6366f1' },
  mage:    { body:'#1e40af', pants:'#1e3a8a', shoe:'#172554', hair:'#7c3aed', eye:'#bfdbfe', hat:'wizard2', hatCol:'#2563eb', hatAcc:'#93c5fd' },
  bard:    { body:'#92400e', pants:'#78350f', shoe:'#451a03', hair:'#b91c1c', eye:'#fcd34d', hat:'feather', hatCol:'#d97706', hatAcc:'#fde68a' },
  paladin: { body:'#b45309', pants:'#92400e', shoe:'#451a03', hair:'#1e3a8a', eye:'#fef9c3', hat:'helm2',   hatCol:'#d97706', hatAcc:'#fef08a' },
  druid:   { body:'#5c3317', pants:'#3b1f10', shoe:'#1c0f08', hair:'#7f6020', eye:'#bbf7d0', hat:'leaf',    hatCol:'#4d7c0f', hatAcc:'#bef264' },
};
const CHAR_EMOJI = { wizard:'🧙', knight:'⚔️', archer:'🏹', rogue:'🗡️', mage:'🔮', bard:'🎵', paladin:'🛡️', druid:'🌿' };
function charEmoji(c) { return CHAR_EMOJI[c]||'🧙'; }
window.charEmoji = charEmoji;
window.CHARS     = CHARS;

// ═══════════════════════════════════════
//  PIXEL SPRITE DRAWING
// ═══════════════════════════════════════
function drawSprite(ctx, cx, cy, charKey, scale, bob=0) {
  const c  = CHARS[charKey] || CHARS.wizard;
  const s  = scale;
  const ox = Math.floor(cx - 4*s);
  const oy = Math.floor(cy - 20*s + bob);

  function px(vx,vy,vw,vh,col) {
    ctx.fillStyle=col;
    ctx.fillRect(ox+vx*s, oy+vy*s, vw*s, vh*s);
  }
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(cx,cy+bob*.2,4.5*s,1.4*s,0,0,Math.PI*2); ctx.fill();
  // Feet
  px(0,18,3,2,c.shoe); px(5,18,3,2,c.shoe);
  // Legs
  px(0,15,3,3,c.pants); px(5,15,3,3,c.pants);
  // Body
  px(0,9,8,6,c.body);
  // Arms
  px(-1,9,2,5,c.body); px(7,9,2,5,c.body);
  // Belt
  px(0,14,8,1,drk(c.body));
  // Neck
  px(3,7,2,2,'#e8c09a');
  // Head
  px(1,3,6,4,'#e8c09a');
  // Hair
  px(1,3,6,1,c.hair); px(1,3,1,3,c.hair); px(6,3,1,3,c.hair);
  // Eyes
  px(2,5,1,1,c.eye); px(5,5,1,1,c.eye);
  // Mouth
  px(3,6,2,1,drk(c.hair,.4));
  // Hat
  drawHat(px,c);
}

function drk(hex,f=0.6) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.floor(r*f)},${Math.floor(g*f)},${Math.floor(b*f)})`;
}

function drawHat(px, c) {
  const h = c.hat;
  if (h==='pointy')  { px(3,0,2,1,c.hatCol);px(2,1,4,1,c.hatCol);px(1,2,6,2,c.hatCol);px(0,2,8,1,c.hatAcc);px(3,1,1,1,c.hatAcc); }
  else if (h==='helmet') { px(1,1,6,3,c.hatCol);px(0,3,8,1,c.hatAcc);px(2,4,4,1,'#1e293b'); }
  else if (h==='hood')   { px(0,1,8,4,c.hatCol);px(1,3,6,2,'#e8c09a');px(0,2,2,3,c.hatCol);px(6,2,2,3,c.hatCol); }
  else if (h==='scarf')  { px(0,1,8,4,c.hatCol);px(1,4,6,1,'#111');px(1,3,6,1,'#e8c09a');px(0,5,8,2,c.hatAcc); }
  else if (h==='wizard2'){ px(3,0,2,1,c.hatCol);px(2,1,4,1,c.hatCol);px(1,2,6,2,c.hatCol);px(0,2,8,1,c.hatAcc);px(2,1,1,1,c.hatAcc);px(5,1,1,1,c.hatAcc); }
  else if (h==='feather'){ px(0,2,8,2,c.hatCol);px(6,0,2,3,c.hatAcc);px(7,0,1,4,'#fbbf24'); }
  else if (h==='helm2')  { px(1,1,6,4,c.hatCol);px(0,3,8,1,c.hatAcc);px(3,4,2,1,'#1e293b');px(3,2,2,3,c.hatAcc); }
  else if (h==='leaf')   { px(1,2,6,2,c.hatCol);px(0,1,2,2,c.hatCol);px(6,1,2,2,c.hatCol);px(1,2,1,1,c.hatAcc);px(6,2,1,1,c.hatAcc); }
}

window.drawSprite = drawSprite;
window.App = App;

// ═══════════════════════════════════════
//  SFX — Web Audio API (no files needed)
// ═══════════════════════════════════════
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type='sine', vol=0.3, delay=0) {
  try {
    const ac  = getAudio();
    const osc = ac.createOscillator();
    const gain= ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime+delay);
    gain.gain.setValueAtTime(0, ac.currentTime+delay);
    gain.gain.linearRampToValueAtTime(vol, ac.currentTime+delay+0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+delay+duration);
    osc.start(ac.currentTime+delay);
    osc.stop(ac.currentTime+delay+duration+0.05);
  } catch(e) {}
}

const SFX = {
  // Notifikasi giliran kamu — ascending notes
  yourTurn() {
    playTone(440, 0.12, 'sine', 0.35);
    playTone(554, 0.12, 'sine', 0.35, 0.13);
    playTone(659, 0.2,  'sine', 0.4,  0.26);
  },
  // Vote dimulai — dramatic
  voteStart() {
    playTone(220, 0.15, 'sawtooth', 0.3);
    playTone(277, 0.15, 'sawtooth', 0.3, 0.16);
    playTone(165, 0.4,  'sawtooth', 0.35, 0.32);
  },
  // Eliminasi — descending tones
  eliminated() {
    playTone(330, 0.15, 'triangle', 0.4);
    playTone(277, 0.15, 'triangle', 0.4, 0.16);
    playTone(220, 0.15, 'triangle', 0.4, 0.32);
    playTone(165, 0.4,  'triangle', 0.4, 0.48);
  },
  // Menang — fanfare
  win() {
    [523,659,784,1047].forEach((f,i) => playTone(f, 0.2, 'sine', 0.45, i*0.15));
  },
  // Kalah — sad
  lose() {
    [392,349,330,294].forEach((f,i) => playTone(f, 0.25, 'triangle', 0.35, i*0.18));
  },
  // Click — soft tick
  click() {
    playTone(800, 0.05, 'square', 0.15);
  },
  // Timer warning — urgent beep
  timerWarn() {
    playTone(880, 0.07, 'square', 0.2);
  },
  // Clue submitted
  clueIn() {
    playTone(600, 0.08, 'sine', 0.25);
    playTone(800, 0.08, 'sine', 0.2, 0.09);
  },
  // New player joined
  join() {
    playTone(523, 0.1, 'sine', 0.2);
    playTone(659, 0.15,'sine', 0.25, 0.11);
  },
};
window.SFX = SFX;

// ═══════════════════════════════════════
//  TOAST NOTIFICATION
// ═══════════════════════════════════════
function showToast(msg, type='info') {
  const el  = document.createElement('div');
  const col  = type==='error' ? '#f87171' : type==='success' ? '#4ade80' : '#22d3ee';
  el.style.cssText = `position:fixed;bottom:70px;left:50%;transform:translateX(-50%);
    background:rgba(18,18,40,.95);border:1px solid ${col};color:${col};
    padding:10px 20px;border-radius:4px;font-family:'Share Tech Mono',monospace;font-size:.82rem;
    z-index:9999;pointer-events:none;animation:toastIn .2s ease;white-space:nowrap;
    box-shadow:0 4px 20px rgba(0,0,0,.5)`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 2500);
}
window.showToast = showToast;

// Toast animation
const toastStyle = document.createElement('style');
toastStyle.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
document.head.appendChild(toastStyle);

// ═══════════════════════════════════════
//  UTIL
// ═══════════════════════════════════════
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
window.escHtml = escHtml;

// ═══════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  connectSocket();

  const btn   = document.getElementById('login-btn');
  const input = document.getElementById('login-name');
  const err   = document.getElementById('login-err');

  async function doLogin() {
    const name = input.value.trim();
    if (!name) { err.textContent='Masukkan namamu dulu!'; return; }
    btn.disabled=true; btn.textContent='LOADING...'; err.textContent='';
    try {
      const d = await api.join(name);
      App.set(d.playerId, d.name, d.character);
      socket.emit('auth', { playerId: d.playerId });
      SFX.join();
      App.showLobby();
      initLobby();
    } catch(e) { err.textContent=e.message; }
    finally { btn.disabled=false; btn.textContent='MASUK LOBBY →'; }
  }

  btn.addEventListener('click', doLogin);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
});
