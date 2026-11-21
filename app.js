const $ = s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const dialog=$('#gameDialog'), canvas=$('#game'), ctx=canvas.getContext('2d'), form=$('#scoreForm');
let generation=0;
let game='launch', board='launch', state='ready', score=0, frame=0, last=0, objects=[], playerX=420, distance=0, vx=0, vy=0, x=90, y=300, power=0, keys={};
const sprite=new Image();sprite.src='assets/hotdog-jesus.png';
function text(t,x,y,size=18,color='#3c1530'){ctx.fillStyle=color;ctx.font=`bold ${size}px sans-serif`;ctx.fillText(t,x,y)}
function background(){ctx.fillStyle='#a9d9c0';ctx.fillRect(0,0,840,420);ctx.fillStyle='#f7e9bd';for(let i=0;i<6;i++){let cx=((i*193-frame*.2)%1050+1050)%1050-100;ctx.beginPath();ctx.ellipse(cx,65+(i%2)*42,60,18,0,0,7);ctx.fill()}ctx.fillStyle='#75b99c';ctx.beginPath();ctx.moveTo(0,340);for(let i=0;i<=840;i+=40)ctx.lineTo(i,340-25*Math.sin((i+frame*.5)/80));ctx.lineTo(840,420);ctx.lineTo(0,420);ctx.fill();ctx.fillStyle='#e4b367';ctx.fillRect(0,372,840,48);ctx.fillStyle='#a96650';ctx.fillRect(0,372,840,7)}
function dog(px,py,w=70){if(sprite.complete&&sprite.naturalWidth)ctx.drawImage(sprite,px-w/2,py-w,w,w);else text('🌭',px-w/2,py,48)}
function draw(){background();if(game==='launch'){dog(x,y,90);text(`DISTANCE  ${Math.floor(distance)} m`,20,32,18);if(state==='ready')text('PRESS AND HOLD LAUNCH, THEN RELEASE',150,205,20);if(state==='charging'){ctx.fillStyle='#421932';ctx.fillRect(160,250,520,25);ctx.fillStyle='#e83846';ctx.fillRect(165,255,510*power,15);text('POWER',375,242,16)}}else{dog(playerX,370,80);for(const o of objects){text(o.bad?'☁':'★',o.x,o.y,32,o.bad?'#63324b':'#ffbb24')}text(`SCORE  ${score}`,20,32,18);if(state==='ready')text('CATCH STARS • DODGE STORM CLOUDS',190,190,20)}if(state==='over'){ctx.fillStyle='#2b1027dd';ctx.fillRect(180,125,480,155);text('NICE RUN!',325,180,30,'#fff0c6');text(`${score} ${game==='launch'?'METRES':'POINTS'}`,325,220,20,'#ffca48')} }
function openGame(g){game=g;state='ready';score=0;frame=0;objects=[];playerX=420;x=90;y=370;distance=0;power=0;form.hidden=true;$('#submitMessage').textContent='';$('#gameTitle').textContent=g==='launch'?'HOLY LAUNCH':'TOPPING RUSH';$('#instructions').textContent=g==='launch'?'Hold LAUNCH to build power, release to fly.':'Move with ← → or the on-screen buttons. Catch stars, avoid clouds.';$('#hud').textContent='READY?';$('#startGame').textContent=g==='launch'?'HOLD TO LAUNCH':'START GAME';$('#left').hidden=$('#right').hidden=g==='launch';$('#gameMessage').textContent=g==='launch'?'Release to send him soaring.':'Survive for 30 seconds.';dialog.showModal();draw()}
function finish(){state='over';score=game==='launch'?Math.floor(distance):score;$('#hud').textContent=`${score} ${game==='launch'?'m':'pts'}`;$('#gameMessage').textContent='Save your score to the board!';$('#startGame').textContent='PLAY AGAIN';form.hidden=false;draw()}
function startRush(){generation++;form.querySelector('button').hidden=false;state='playing';score=0;frame=0;objects=[];playerX=420;form.hidden=true;$('#startGame').textContent='RESTART';last=performance.now();requestAnimationFrame(t=>tick(t,generation))}
function charge(){if(game!=='launch')return;if(state==='playing')return;generation++;form.querySelector('button').hidden=false;state='charging';power=0;frame=0;distance=0;x=90;y=370;form.hidden=true;$('#gameMessage').textContent='Release to launch!';last=performance.now();requestAnimationFrame(t=>tick(t,generation))}
function release(){if(state!=='charging')return;state='playing';vx=7+power*14;vy=-(9+power*7);$('#gameMessage').textContent='Flying high!';}
function tick(now,run){if(run!==generation||!dialog.open||!['playing','charging'].includes(state))return;let dt=Math.min((now-last)/16.667,2);last=now;frame+=dt;if(state==='charging'){power=(Math.sin(frame*.055-Math.PI/2)+1)/2;$('#hud').textContent=`POWER ${Math.round(power*100)}%`}else if(game==='launch'){distance+=vx*dt*.65;vy+=.19*dt;y+=vy*dt;x=Math.min(620,x+vx*dt*.2);vx*=Math.pow(.998,dt);if(y>=370){y=370;finish();return}$('#hud').textContent=`${Math.floor(distance)} m`}else{if(keys.left)playerX-=7*dt;if(keys.right)playerX+=7*dt;playerX=Math.max(40,Math.min(800,playerX));if(Math.floor(frame/30)!==Math.floor((frame-dt)/30))objects.push({x:40+Math.random()*760,y:0,bad:Math.random()<.25});for(const o of objects)o.y+=3.3*dt;for(const o of objects){if(o.y>310&&o.y<375&&Math.abs(o.x-playerX)<40&&!o.hit){o.hit=true;score=Math.max(0,score+(o.bad?-3:1))}}objects=objects.filter(o=>o.y<430&&!o.hit);$('#hud').textContent=`${score} PTS · ${Math.max(0,Math.ceil((1800-frame)/60))}s`;if(frame>=1800){finish();return}}draw();requestAnimationFrame(t=>tick(t,run))}
$$('[data-play]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.play)));
$('#closeGame').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{state='ready';keys={}});
const start=$('#startGame');start.addEventListener('pointerdown',e=>{if(game==='launch'){e.preventDefault();start.setPointerCapture(e.pointerId);charge()}});start.addEventListener('pointerup',release);start.addEventListener('pointercancel',release);start.addEventListener('click',()=>{if(game==='rush')startRush()});start.addEventListener('keydown',e=>{if(game==='launch'&&(e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();charge()}});start.addEventListener('keyup',e=>{if(game==='launch'&&(e.key===' '||e.key==='Enter'))release()});
for(const direction of ['left','right']){const b=$('#'+direction);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[direction]=true});b.addEventListener('pointerup',()=>keys[direction]=false);b.addEventListener('pointercancel',()=>keys[direction]=false)}
window.addEventListener('keydown',e=>{if(dialog.open&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();keys[e.key==='ArrowLeft'?'left':'right']=true}});window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft')keys.left=false;if(e.key==='ArrowRight')keys.right=false});
const browserBoard = location.hostname.endsWith('.github.io');
const scorePrefix = 'champaignking-arcade.score.';
if (browserBoard) $('.board-note').textContent = 'Scores are saved in this browser.';

async function rankedScores(gameName) {
  if (browserBoard) {
    const prefix = scorePrefix + gameName + '.';
    const scores = Object.keys(localStorage)
      .filter(key => key.startsWith(prefix))
      .map(key => JSON.parse(localStorage.getItem(key)));
    return scores.sort((a, b) => b.score - a.score);
  }
  const response = await fetch('/api/scores?game=' + encodeURIComponent(gameName));
  if (!response.ok) throw Error('Could not load scores.');
  return response.json();
}

async function saveScore(entry) {
  if (browserBoard) {
    if (!/^[\p{L}\p{N} _.-]{1,18}$/u.test(entry.name) || !['launch','rush'].includes(entry.game) ||
        !Number.isSafeInteger(entry.score) || entry.score < 0 || entry.score > 100000) {
      throw Error('Use a name of 1–18 letters or numbers and a valid score.');
    }
    localStorage.setItem(scorePrefix + entry.game + '.' + crypto.randomUUID(), JSON.stringify(entry));
    return;
  }
  const response = await fetch('/api/scores', {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(entry)
  });
  if (!response.ok) throw Error((await response.json()).error || 'Could not save score.');
}

async function loadBoard(){const target=$('#scores');target.replaceChildren();try{const requested=board;const entries=await rankedScores(requested);if(board!==requested)return;target.replaceChildren();if(!entries.length){const p=document.createElement('p');p.className='empty';p.textContent='No scores yet. Play a game and be the first top dog!';target.append(p);return}entries.slice(0,5).forEach((s,i)=>{const row=document.createElement('div');row.className='score-row';const rank=document.createElement('b');rank.textContent=String(i+1).padStart(2,'0');const name=document.createElement('span');name.textContent=s.name;const points=document.createElement('strong');points.textContent=s.score+(board==='launch'?' m':' pts');row.append(rank,name,points);target.append(row)})}catch{const p=document.createElement('p');p.className='empty';p.textContent=browserBoard?'Browser scores unavailable. Check your browser storage settings.':'Leaderboard unavailable. Start the arcade server to load scores.';target.append(p)}}
$$('[data-board]').forEach(b=>b.onclick=()=>{board=b.dataset.board;$$('[data-board]').forEach(x=>x.classList.toggle('active',x===b));loadBoard()});
form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await saveScore({name:$('#player').value.trim(),game,score});$('#submitMessage').textContent='Score saved!';button.hidden=true;board=game;$$('[data-board]').forEach(x=>x.classList.toggle('active',x.dataset.board===board));await loadBoard()}catch(err){$('#submitMessage').textContent=err.message||'Could not save score.'}finally{button.disabled=false}});
form.addEventListener('reset',()=>{});dialog.addEventListener('close',()=>{form.querySelector('button').hidden=false});loadBoard();
