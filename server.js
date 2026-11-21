import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const data = join(root, 'data', 'scores.json');
const mime = {'.mp4':'video/mp4','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
let writes = Promise.resolve();
async function scores(){ try { return JSON.parse(await readFile(data,'utf8')); } catch(e){ if(e.code==='ENOENT') return []; throw e; } }
http.createServer(async (req,res)=>{
  const url = new URL(req.url, 'http://localhost');
  const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  try {
    if(url.pathname==='/api/scores' && req.method==='GET') return json(200,(await scores()).filter(s=>!url.searchParams.get('game')||s.game===url.searchParams.get('game')).sort((a,b)=>b.score-a.score).slice(0,20));
    if(url.pathname==='/api/scores' && req.method==='POST') {
      let body=''; for await(const chunk of req){body+=chunk;if(body.length>2048) return json(413,{error:'Too large'});}
      let input; try {input=JSON.parse(body)} catch {return json(400,{error:'Invalid request'});}
      const name=typeof input.name==='string'?input.name.trim():''; const score=input.score; const game=input.game;
      if(!/^[\p{L}\p{N} _.-]{1,18}$/u.test(name)||!['launch','rush'].includes(game)||!Number.isSafeInteger(score)||score<0||score>100000) return json(400,{error:'Use a name of 1–18 letters or numbers and a valid score.'});
      writes = writes.catch(()=>{}).then(async()=>{const all=await scores();all.push({name,score,game,at:new Date().toISOString()});await mkdir(join(root,'data'),{recursive:true});await writeFile(data,JSON.stringify(all,null,2));});
      await writes; return json(201,{ok:true});
    }
    if(req.method!=='GET'&&req.method!=='HEAD') return json(405,{error:'Method not allowed'});
    const path = url.pathname==='/'?'index.html':url.pathname.slice(1);
    if(!/^(index\.html|style\.css|app\.js|assets\/[a-zA-Z0-9._-]+)$/.test(path)) return json(404,{error:'Not found'});
    const content=await readFile(join(root,path));res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:content);
  } catch(e){if(e.code==='ENOENT') return json(404,{error:'Not found'});console.error(e);json(500,{error:'Server error'});}
}).listen(process.env.PORT||4173,'127.0.0.1',()=>console.log(`Arcade running at http://127.0.0.1:${process.env.PORT||4173}`));
