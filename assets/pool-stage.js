// Art is drawn in course coordinates so the ring and collision area stay aligned.
function makePoolStage(ctx) {
  const load = file => { const image = new Image(); image.src = file; return image; };
  const scene = load('pool-scenery.webp'), cork = load('corky-pop-opaque.png'), host = load('hotdog-jesus.png');
  const bursts = [];
  let recoil = 0;
  function burst(x,y,color,count) {
    for(let i=0;i<count;i++){
      const angle = i/count*Math.PI*2, speed=50+Math.random()*140;
      bursts.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-65,life:1,color});
    }
  }
  return {
    pop(){recoil=1;burst(145,365,'#fff5bf',18)},
    boost(s){burst(s.x,s.y,'#a4ffff',28)},
    land(hit,s){burst(s.x,Math.min(420,s.y),hit?'#ffcf50':'#8defff',hit?45:18)},
    paint({shot,mode,target,ghost,particles,hitFlash,dt,time,angle}){
      const ready=image=>image.complete&&image.naturalWidth;
      ctx.fillStyle='#93dacf';ctx.fillRect(0,0,1000,500);
      if(ready(scene))ctx.drawImage(scene,0,0,1000,500);
      const bob=Math.sin(time*3);
      if(ready(host))ctx.drawImage(host,850,269+bob*3-hitFlash*16,112,132);
      ctx.save();ctx.translate(target.x,target.y);
      ctx.scale(1+hitFlash*.18,1-hitFlash*.1);
      for(const [radius,color] of [[32,'#6d2241'],[28,'#fff0bf'],[22,'#de4664'],[14,'#fff3ce'],[7,'#ef4763']]){
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,radius,0,7);ctx.fill();
      }ctx.restore();
      ctx.save();ctx.translate(145,365);ctx.rotate(-angle*Math.PI/180);
      ctx.translate(-recoil*13,0);recoil=Math.max(0,recoil-dt*5);
      const glass=ctx.createLinearGradient(0,-20,0,20);
      glass.addColorStop(0,'#143a37');glass.addColorStop(.3,'#75ad77');glass.addColorStop(.55,'#247158');glass.addColorStop(1,'#102e2e');
      ctx.fillStyle=glass;ctx.beginPath();ctx.moveTo(-6,-9);ctx.lineTo(-37,-9);ctx.quadraticCurveTo(-50,-23,-64,-23);ctx.lineTo(-124,-23);ctx.quadraticCurveTo(-135,-23,-135,-12);ctx.lineTo(-135,12);ctx.quadraticCurveTo(-135,23,-124,23);ctx.lineTo(-64,23);ctx.quadraticCurveTo(-50,23,-37,9);ctx.lineTo(-6,9);ctx.closePath();ctx.fill();
      ctx.fillStyle='#f5cf83';ctx.fillRect(-25,-10,22,20);ctx.fillRect(-106,-21,38,42);
      ctx.fillStyle='#8c3649';ctx.font='bold 21px Georgia';ctx.fillText('♛',-99,8);ctx.restore();
      ctx.fillStyle='#fff8dc';for(let i=0;i<ghost.length;i+=5)ctx.fillRect(...ghost[i],3,3);
      for(const p of particles){ctx.strokeStyle='rgba(255,255,255,'+p.a+')';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.stroke()}
      ctx.save();ctx.translate(shot?.x??149,shot?.y??(345+bob*2));
      const tilt=shot?Math.atan2(shot.vy,shot.vx)*.65:bob*.08;
      ctx.rotate(tilt);ctx.scale(1+recoil*.22,1-recoil*.16);
      const actor=mode==='cork'?cork:host;
      if(ready(actor))ctx.drawImage(actor,-36,-36,72,72);
      ctx.restore();
      for(let i=bursts.length-1;i>=0;i--){const p=bursts[i];p.life-=dt*1.6;if(p.life<=0){bursts.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=240*dt;ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,6)}ctx.globalAlpha=1;
    }
  };
}
