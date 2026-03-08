const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const { v4: uuidv4 } = require('uuid');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────
//  IN-MEMORY STATE
// ─────────────────────────────────────────
const players        = {};
const rooms          = {};
const socketToPlayer = {};

// ─────────────────────────────────────────
//  100+ WORD BANK — Bahasa Indonesia
// ─────────────────────────────────────────
const WORD_BANK = [
  // Hewan
  { civilian:'Kucing',         undercover:'Anjing' },
  { civilian:'Singa',          undercover:'Harimau' },
  { civilian:'Lumba-lumba',    undercover:'Hiu' },
  { civilian:'Kelinci',        undercover:'Hamster' },
  { civilian:'Ayam',           undercover:'Bebek' },
  { civilian:'Kupu-kupu',      undercover:'Capung' },
  { civilian:'Burung Hantu',   undercover:'Kelelawar' },
  { civilian:'Gajah',          undercover:'Badak' },
  { civilian:'Kuda',           undercover:'Zebra' },
  { civilian:'Kepiting',       undercover:'Udang' },
  { civilian:'Buaya',          undercover:'Biawak' },
  { civilian:'Ular',           undercover:'Cacing' },
  { civilian:'Gorila',         undercover:'Simpanse' },
  { civilian:'Rusa',           undercover:'Kambing' },
  // Makanan & Minuman
  { civilian:'Pizza',          undercover:'Roti Bakar' },
  { civilian:'Nasi Goreng',    undercover:'Mie Goreng' },
  { civilian:'Sushi',          undercover:'Onigiri' },
  { civilian:'Burger',         undercover:'Sandwich' },
  { civilian:'Bakso',          undercover:'Pempek' },
  { civilian:'Rendang',        undercover:'Gulai' },
  { civilian:'Sate',           undercover:'Tongseng' },
  { civilian:'Kopi',           undercover:'Teh' },
  { civilian:'Jus Jeruk',      undercover:'Jus Mangga' },
  { civilian:'Es Krim',        undercover:'Sorbet' },
  { civilian:'Apel',           undercover:'Pir' },
  { civilian:'Nanas',          undercover:'Mangga' },
  { civilian:'Cokelat',        undercover:'Permen' },
  { civilian:'Keripik',        undercover:'Popcorn' },
  { civilian:'Martabak',       undercover:'Terang Bulan' },
  { civilian:'Gado-gado',      undercover:'Pecel' },
  { civilian:'Soto',           undercover:'Rawon' },
  { civilian:'Siomay',         undercover:'Batagor' },
  { civilian:'Indomie',        undercover:'Sarimi' },
  { civilian:'Tempe',          undercover:'Tahu' },
  { civilian:'Klepon',         undercover:'Onde-onde' },
  { civilian:'Kue Lapis',      undercover:'Kue Cubit' },
  // Tempat
  { civilian:'Pantai',         undercover:'Kolam Renang' },
  { civilian:'Bioskop',        undercover:'Teater' },
  { civilian:'Museum',         undercover:'Perpustakaan' },
  { civilian:'Sekolah',        undercover:'Kampus' },
  { civilian:'Rumah Sakit',    undercover:'Klinik' },
  { civilian:'Mall',           undercover:'Pasar' },
  { civilian:'Sungai',         undercover:'Danau' },
  { civilian:'Gunung',         undercover:'Bukit' },
  { civilian:'Kebun Binatang', undercover:'Akuarium' },
  { civilian:'Masjid',         undercover:'Gereja' },
  { civilian:'Stasiun',        undercover:'Terminal' },
  { civilian:'Hotel',          undercover:'Villa' },
  { civilian:'Indomaret',      undercover:'Alfamart' },
  { civilian:'Taman',          undercover:'Alun-alun' },
  { civilian:'Penjara',        undercover:'Kantor Polisi' },
  { civilian:'Bandara',        undercover:'Pelabuhan' },
  // Profesi
  { civilian:'Dokter',         undercover:'Perawat' },
  { civilian:'Pilot',          undercover:'Pramugari' },
  { civilian:'Polisi',         undercover:'Tentara' },
  { civilian:'Guru',           undercover:'Dosen' },
  { civilian:'Koki',           undercover:'Baker' },
  { civilian:'Fotografer',     undercover:'Videografer' },
  { civilian:'Arsitek',        undercover:'Desainer' },
  { civilian:'Pemadam',        undercover:'Penyelamat' },
  { civilian:'Wartawan',       undercover:'Youtuber' },
  { civilian:'Hakim',          undercover:'Jaksa' },
  // Benda
  { civilian:'Sepatu',         undercover:'Sandal' },
  { civilian:'Kursi',          undercover:'Sofa' },
  { civilian:'Komputer',       undercover:'Laptop' },
  { civilian:'Handphone',      undercover:'Tablet' },
  { civilian:'Buku',           undercover:'Majalah' },
  { civilian:'Jam Tangan',     undercover:'Gelang' },
  { civilian:'Kacamata',       undercover:'Lensa Kontak' },
  { civilian:'Payung',         undercover:'Jas Hujan' },
  { civilian:'Selimut',        undercover:'Bantal' },
  { civilian:'Kulkas',         undercover:'Freezer' },
  { civilian:'Kipas',          undercover:'AC' },
  { civilian:'Lampu',          undercover:'Lilin' },
  { civilian:'Gunting',        undercover:'Pisau' },
  { civilian:'Ember',          undercover:'Gayung' },
  { civilian:'Sepeda',         undercover:'Skuter' },
  { civilian:'Mobil',          undercover:'Motor' },
  { civilian:'Cermin',         undercover:'Foto' },
  { civilian:'Dompet',         undercover:'Tas' },
  // Alam & Cuaca
  { civilian:'Hujan',          undercover:'Salju' },
  { civilian:'Matahari',       undercover:'Bulan' },
  { civilian:'Petir',          undercover:'Gempa' },
  { civilian:'Angin',          undercover:'Badai' },
  { civilian:'Bintang',        undercover:'Meteor' },
  { civilian:'Pelangi',        undercover:'Aurora' },
  { civilian:'Gunung Berapi',  undercover:'Geyser' },
  { civilian:'Hutan',          undercover:'Kebun' },
  // Waktu & Aktivitas
  { civilian:'Pagi',           undercover:'Malam' },
  { civilian:'Tidur',          undercover:'Istirahat' },
  { civilian:'Berlari',        undercover:'Berjalan' },
  { civilian:'Berenang',       undercover:'Menyelam' },
  { civilian:'Memasak',        undercover:'Memanggang' },
  { civilian:'Membaca',        undercover:'Menulis' },
  { civilian:'Bernyanyi',      undercover:'Bersenandung' },
  { civilian:'Ulang Tahun',    undercover:'Pernikahan' },
  { civilian:'Liburan',        undercover:'Piknik' },
  // Teknologi
  { civilian:'Instagram',      undercover:'TikTok' },
  { civilian:'WhatsApp',       undercover:'Telegram' },
  { civilian:'Google',         undercover:'Bing' },
  { civilian:'Netflix',        undercover:'Disney+' },
  { civilian:'Spotify',        undercover:'YouTube Music' },
  { civilian:'Twitter/X',      undercover:'Threads' },
  { civilian:'Game Online',    undercover:'Game Offline' },
  // Keluarga
  { civilian:'Ibu',            undercover:'Ayah' },
  { civilian:'Kakak',          undercover:'Adik' },
  { civilian:'Sahabat',        undercover:'Kenalan' },
  // Olahraga
  { civilian:'Sepak Bola',     undercover:'Futsal' },
  { civilian:'Basket',         undercover:'Voli' },
  { civilian:'Badminton',      undercover:'Tenis' },
  { civilian:'Renang',         undercover:'Lari' },
  { civilian:'Tinju',          undercover:'Karate' },
  { civilian:'Skateboard',     undercover:'Sepatu Roda' },
  // Ekstra unik
  { civilian:'Mimpi',          undercover:'Khayalan' },
  { civilian:'Musik',          undercover:'Podcast' },
  { civilian:'Konser',         undercover:'Festival' },
  { civilian:'Sirkus',         undercover:'Pertunjukan' },
  { civilian:'Sulap',          undercover:'Hipnosis' },
];

const CHARACTERS = ['wizard','knight','archer','rogue','mage','bard','paladin','druid'];

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i=0;i<4;i++) c+=chars[Math.floor(Math.random()*chars.length)];
  return rooms[c] ? genRoomCode() : c;
}

function pickCharacter() {
  const used  = new Set(Object.values(players).map(p=>p.character));
  const avail = CHARACTERS.filter(c=>!used.has(c));
  const pool  = avail.length ? avail : CHARACTERS;
  return pool[Math.floor(Math.random()*pool.length)];
}

function activePlayers(room) {
  return room.players.filter(pid=>!room.eliminated.some(e=>e.playerId===pid));
}

function checkWin(room) {
  const alive = activePlayers(room);
  const civs  = alive.filter(p=>room.roles[p]==='civilian');
  const undcs = alive.filter(p=>room.roles[p]==='undercover');
  const mrws  = alive.filter(p=>room.roles[p]==='mrwhite');
  if (!undcs.length && !mrws.length) return { winner:'civilian',   reason:'Semua impostor telah tersingkir!' };
  if (undcs.length >= civs.length)   return { winner:'undercover', reason:'Undercover berhasil menguasai permainan!' };
  return null;
}

function advanceTurn(room) {
  const alive = activePlayers(room);
  if (!alive.length) return;
  const order = room.turnOrder.filter(p=>alive.includes(p));
  if (!order.length) return;
  const idx = order.indexOf(room.currentTurn);
  room.currentTurn = order[(idx+1)%order.length];
  room.timerStart  = Date.now();
}

function buildState(room, pid) {
  const alive = activePlayers(room);
  const s = {
    id:room.id, hostId:room.hostId, settings:room.settings,
    status:room.status, round:room.round, timerStart:room.timerStart,
    timerRemaining: (room.status==='playing' && room.timerStart)
      ? Math.max(0, room.settings.timerSeconds - (Date.now()-room.timerStart)/1000)
      : null,
    currentTurn:room.currentTurn, wantVote:room.wantVote,
    wantVoteCount:room.wantVote.length,
    voteThreshold:Math.floor(alive.length/2)+1,
    votes: room.settings.voteAnonymous ? {} : room.votes,
    eliminated:room.eliminated, mrWhiteElim:room.mrWhiteElim,
    mrWhiteGuess:room.mrWhiteGuess, lastVoteResult:room.lastVoteResult,
    winner:room.winner, winReason:room.winReason, clues:room.clues,
    players: room.players.map(id=>({
      id, name:players[id]?.name||'?', character:players[id]?.character||'wizard',
      isEliminated:room.eliminated.some(e=>e.playerId===id),
      isOnline: players[id] ? Date.now()-players[id].lastSeen<15000 : false,
    })),
  };
  if (pid && room.roles[pid]) {
    s.myRole = room.roles[pid];
    s.myWord = room.roles[pid]==='civilian'   ? room.words.civilian
             : room.roles[pid]==='undercover' ? room.words.undercover : null;
  }
  if (room.status==='reveal'||room.status==='finished') {
    s.allRoles = room.roles; s.allWords = room.words;
  }
  return s;
}

function broadcast(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  for (const pid of room.players) {
    const p = players[pid];
    if (p?.socketId) io.to(p.socketId).emit('room:update', buildState(room, pid));
  }
}

// ─────────────────────────────────────────
//  AUTO-SKIP TIMER
// ─────────────────────────────────────────
setInterval(()=>{
  for (const room of Object.values(rooms)) {
    if (room.status!=='playing'||!room.timerStart) continue;
    if ((Date.now()-room.timerStart)/1000 < room.settings.timerSeconds) continue;
    room.clues.push({
      playerId:room.currentTurn, playerName:players[room.currentTurn]?.name||'?',
      clue:'⏰ (waktu habis)', round:room.round, timestamp:Date.now(), autoSkipped:true,
    });
    advanceTurn(room);
    const alive = activePlayers(room);
    if (room.clues.filter(c=>c.round===room.round).length >= alive.length) room.round++;
    broadcast(room.id);
  }
}, 1000);

// ─────────────────────────────────────────
//  CLEANUP
// ─────────────────────────────────────────
setInterval(()=>{
  const now = Date.now();
  for (const [id,p] of Object.entries(players)) {
    if (now-p.lastSeen > 25000) {
      if (p.inRoom && rooms[p.inRoom]) {
        const r = rooms[p.inRoom];
        if (r.status==='waiting') {
          r.players = r.players.filter(x=>x!==id);
          if (!r.players.length) delete rooms[p.inRoom];
          else { if (r.hostId===id) r.hostId=r.players[0]; broadcast(p.inRoom); }
        }
      }
      delete players[id];
    }
  }
}, 10000);

// ─────────────────────────────────────────
//  HTTP
// ─────────────────────────────────────────
app.post('/api/join', (req,res)=>{
  const {name} = req.body;
  if (!name?.trim()) return res.status(400).json({error:'Nama tidak boleh kosong'});
  const id = uuidv4(), ch = pickCharacter();
  players[id] = {id, name:name.trim().slice(0,20), character:ch, x:640, y:240, lastSeen:Date.now(), inRoom:null, socketId:null};
  res.json({playerId:id, character:ch, name:players[id].name});
});

app.get('/api/rooms',(req,res)=>{
  const list = Object.values(rooms).filter(r=>r.status==='waiting').map(r=>({
    id:r.id, hostName:players[r.hostId]?.name||'?',
    playerCount:r.players.length, maxPlayers:r.settings.maxPlayers, settings:r.settings,
    players:r.players.map(pid=>({id:pid,name:players[pid]?.name||'?',character:players[pid]?.character||'wizard'})),
  }));
  res.json({rooms:list});
});

// ─────────────────────────────────────────
//  SOCKET.IO
// ─────────────────────────────────────────
io.on('connection', socket=>{

  socket.on('auth', ({playerId})=>{
    const p = players[playerId];
    if (!p) return;
    p.socketId = socket.id; p.lastSeen = Date.now();
    socketToPlayer[socket.id] = playerId;
    socket.emit('auth:ok', {playerId, character:p.character, name:p.name});
    if (p.inRoom && rooms[p.inRoom]) {
      socket.join(p.inRoom);
      socket.emit('room:update', buildState(rooms[p.inRoom], playerId));
    }
  });

  socket.on('lobby:move', ({playerId,x,y})=>{
    const p = players[playerId]; if (!p) return;
    p.x=x; p.y=y; p.lastSeen=Date.now();
  });
  socket.on('lobby:ping', ({playerId})=>{ if (players[playerId]) players[playerId].lastSeen=Date.now(); });

  socket.on('room:create', ({playerId, settings})=>{
    const p = players[playerId]; if (!p) return socket.emit('error','Player not found');
    const id = genRoomCode();
    rooms[id] = {
      id, hostId:playerId,
      settings:{
        maxPlayers:Math.min(10,Math.max(3,settings.maxPlayers||6)),
        undercoverCount:Math.max(1,settings.undercoverCount||1),
        mrWhiteCount:Math.max(0,settings.mrWhiteCount||0),
        voteAnonymous:settings.voteAnonymous||false,
        timerSeconds:[15,30,45,60].includes(settings.timerSeconds)?settings.timerSeconds:30,
        customWord:settings.customWord||null,
      },
      status:'waiting', players:[playerId], roles:{}, words:{},
      clues:[], turnOrder:[], currentTurn:null, timerStart:null,
      wantVote:[], votes:{}, eliminated:[], mrWhiteElim:null,
      mrWhiteGuess:null, lastVoteResult:null, winner:null, winReason:null, round:1,
    };
    p.inRoom=id; socket.join(id);
    socket.emit('room:joined',{roomId:id});
    broadcast(id);
  });

  socket.on('room:join', ({playerId,roomId})=>{
    const p=players[playerId], room=rooms[roomId];
    if (!p)                                           return socket.emit('error','Player not found');
    if (!room)                                        return socket.emit('error','Room tidak ditemukan');
    if (room.status!=='waiting')                      return socket.emit('error','Game sudah dimulai');
    if (room.players.length>=room.settings.maxPlayers) return socket.emit('error','Room penuh!');
    if (room.players.includes(playerId))              return socket.emit('error','Sudah di room ini');
    room.players.push(playerId); p.inRoom=roomId; socket.join(roomId);
    socket.emit('room:joined',{roomId}); broadcast(roomId);
  });

  socket.on('room:start', ({playerId,roomId})=>{
    const room=rooms[roomId];
    if (!room)                     return socket.emit('error','Room tidak ditemukan');
    if (room.hostId!==playerId)    return socket.emit('error','Hanya host');
    if (room.status!=='waiting')   return socket.emit('error','Game sudah berjalan');
    const needed=room.settings.undercoverCount+room.settings.mrWhiteCount+2;
    if (room.players.length<needed) return socket.emit('error',`Butuh min. ${needed} pemain!`);
    const shuffled=[...room.players].sort(()=>Math.random()-.5);
    const roles={};
    shuffled.forEach((pid,i)=>{
      if (i<room.settings.undercoverCount)                                   roles[pid]='undercover';
      else if (i<room.settings.undercoverCount+room.settings.mrWhiteCount)   roles[pid]='mrwhite';
      else                                                                    roles[pid]='civilian';
    });
    const wordPair  = room.settings.customWord || WORD_BANK[Math.floor(Math.random()*WORD_BANK.length)];
    const turnOrder = [...room.players].sort(()=>Math.random()-.5);
    Object.assign(room,{roles,words:wordPair,turnOrder,currentTurn:turnOrder[0],timerStart:Date.now(),
      status:'playing',round:1,clues:[],wantVote:[],votes:{},eliminated:[],
      winner:null,winReason:null,lastVoteResult:null,mrWhiteElim:null,mrWhiteGuess:null});
    broadcast(roomId);
  });

  socket.on('clue:submit', ({playerId,roomId,clue})=>{
    const room=rooms[roomId];
    if (!room||room.status!=='playing')    return socket.emit('error','Bukan fase clue');
    if (room.currentTurn!==playerId)       return socket.emit('error','Bukan giliranmu');
    if (!clue?.trim())                     return socket.emit('error','Clue kosong');
    room.clues.push({playerId,playerName:players[playerId]?.name||'?',clue:clue.trim().slice(0,60),round:room.round,timestamp:Date.now()});
    advanceTurn(room);
    const alive=activePlayers(room);
    if (room.clues.filter(c=>c.round===room.round).length>=alive.length) room.round++;
    broadcast(roomId);
  });

  socket.on('vote:now', ({playerId,roomId})=>{
    const room=rooms[roomId]; if (!room||room.status!=='playing') return;
    if (room.wantVote.includes(playerId)) room.wantVote=room.wantVote.filter(p=>p!==playerId);
    else room.wantVote.push(playerId);
    const alive=activePlayers(room);
    if (room.wantVote.length>=Math.floor(alive.length/2)+1) { room.status='voting'; room.votes={}; }
    broadcast(roomId);
  });

  socket.on('vote:cast', ({playerId,roomId,targetId})=>{
    const room=rooms[roomId]; if (!room||room.status!=='voting') return;
    room.votes[playerId]=targetId;
    const alive=activePlayers(room);
    if (alive.filter(pid=>room.votes[pid]).length < alive.length) return broadcast(roomId);
    const tally={};
    for (const tid of Object.values(room.votes)) tally[tid]=(tally[tid]||0)+1;
    let maxV=0,eliminated=null,isTie=false;
    for (const [pid,cnt] of Object.entries(tally)) {
      if (cnt>maxV){maxV=cnt;eliminated=pid;isTie=false;}
      else if (cnt===maxV) isTie=true;
    }
    room.lastVoteResult={eliminated,isTie,tally,votes:{...room.votes}};
    if (isTie||!eliminated) { room.status='reveal'; }
    else {
      const role=room.roles[eliminated];
      room.eliminated.push({playerId:eliminated,playerName:players[eliminated]?.name||'?',role,round:room.round});
      if (role==='mrwhite') { room.mrWhiteElim=eliminated; room.status='mrwhite-guess'; }
      else { const win=checkWin(room); if(win){room.status='finished';room.winner=win.winner;room.winReason=win.reason;}else room.status='reveal'; }
    }
    broadcast(roomId);
  });

  socket.on('guess:submit', ({playerId,roomId,guess})=>{
    const room=rooms[roomId];
    if (!room||room.status!=='mrwhite-guess') return;
    if (room.mrWhiteElim!==playerId) return socket.emit('error','Bukan giliranmu');
    const correct=guess.trim().toLowerCase()===room.words.civilian.toLowerCase();
    room.mrWhiteGuess={playerId,guess:guess.trim(),correct};
    if (correct){room.status='finished';room.winner='mrwhite';room.winReason='Mr. White berhasil menebak kata!';}
    else { const win=checkWin(room); if(win){room.status='finished';room.winner=win.winner;room.winReason=win.reason;}else room.status='reveal'; }
    broadcast(roomId);
  });

  socket.on('game:continue', ({playerId,roomId})=>{
    const room=rooms[roomId];
    if (!room||room.status!=='reveal'||room.hostId!==playerId) return;
    const alive=activePlayers(room);
    const first=room.turnOrder.find(p=>alive.includes(p))||alive[0];
    Object.assign(room,{status:'playing',wantVote:[],votes:{},mrWhiteElim:null,currentTurn:first,timerStart:Date.now()});
    broadcast(roomId);
  });

  socket.on('room:leave', ({playerId,roomId})=>{
    const room=rooms[roomId], p=players[playerId];
    if (room) {
      room.players=room.players.filter(x=>x!==playerId);
      if (!room.players.length) delete rooms[roomId];
      else { if (room.hostId===playerId) room.hostId=room.players[0]; broadcast(roomId); }
    }
    if (p) { p.inRoom=null; socket.leave(roomId); }
  });

  socket.on('disconnect', ()=>{
    const pid=socketToPlayer[socket.id]; delete socketToPlayer[socket.id];
    if (pid&&players[pid]) { players[pid].socketId=null; players[pid].lastSeen=Date.now()-15000; }
  });
});

// ─────────────────────────────────────────
//  LOBBY BROADCAST (150ms)
// ─────────────────────────────────────────
setInterval(()=>{
  const now=Date.now();
  const list=Object.values(players).filter(p=>now-p.lastSeen<12000)
    .map(p=>({id:p.id,name:p.name,character:p.character,x:p.x,y:p.y,inRoom:p.inRoom}));
  io.emit('lobby:players',{players:list});
},150);

// ─────────────────────────────────────────
//  START
// ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`🕵️  Undercover REALTIME http://localhost:${PORT}`));
