const $ = id => document.getElementById(id);
const from = path => '../'+path;
const assets = new Map();
const drawing = $('art');
const type = $('type');
const profile = $('profile');
const room = $('room');
const state = {design:null,paint:new Map(),job:0,started:0,frame:null};
const canvas = (w,h) => Object.assign(document.createElement('canvas'),{width:w,height:h});
const title = text => text[0].toUpperCase()+text.slice(1).replaceAll('-',' ');
const loadJson = async path => {
  const response=await fetch(from(path));
  if (!response.ok) throw new Error('Could not load '+path);
  return response.json();
};
const remember = path => {
  if (!assets.has(path)) {
    if (assets.size>=280) assets.delete(assets.keys().next().value);
    const image=new Image();
    image.src=from(path);
    assets.set(path,image.decode().then(()=>image));
  }
  return assets.get(path);
};
const displayError = error => {
  $('error').hidden=false;
  $('error').textContent=error.message;
};

function drawLayer(context,path,rect) {
  context.drawImage(state.paint.get(path),...rect);
}

function tintedExterior(context,design) {
  if (!$('tint').checked) return;
  const [w,h]=design.framePx;
  const mask=canvas(w,h).getContext('2d',{willReadFrequently:true});
  mask.drawImage(state.paint.get(design.facadeValue),0,0);
  const value=mask.getImageData(0,0,w,h).data;
  const surface=context.getImageData(0,0,w,h);
  const color=[1,3,5].map(pos=>parseInt($('color').value.slice(pos,pos+2),16));
  for (let i=0;i<surface.data.length;i+=4) {
    const strength=value[i+3]/255;
    if (!strength||!surface.data[i+3]) continue;
    const local=value[i]-design.facadeMidtone;
    for (let channel=0;channel<3;channel++) {
      surface.data[i+channel]+=(color[channel]+local-surface.data[i+channel])*strength;
    }
  }
  context.putImageData(surface,0,0);
}

function drawActivity(context,window,design,t) {
  const choice=$('motion').value;
  if (!choice||!window.activityLayers[choice]||(room.value!=='all'&&window.roomId!==room.value)) return;
  const [x,y,w,h]=window.rectPx;
  const mask=canvas(w,h);
  const clip=mask.getContext('2d');
  const art=state.paint.get(window.activityLayers[choice].url);
  const progress=(t%4.7)/4.7;
  clip.globalAlpha=.72;
  if (choice==='curtain'||choice==='blind') {
    const moving=(.5+.4*Math.sin(t*1.1));
    const width=choice==='blind'?w:Math.min(w,art.width*h/art.height);
    clip.drawImage(art,choice==='blind'?0:moving*(w-width),choice==='blind'?-h*moving:0,width,h);
  } else {
    const same=design.windows.filter(other=>other.roomId===window.roomId);
    const left=Math.min(...same.map(other=>other.rectPx[0]));
    const right=Math.max(...same.map(other=>other.rectPx[0]+other.rectPx[2]));
    const height=h*.86, width=height*art.width/art.height;
    const position=choice==='walking'?progress:.55;
    clip.drawImage(art,left-x-width+(right-left+width*2)*position-width/2,h-height*.65,width,height);
  }
  clip.globalAlpha=1;
  clip.globalCompositeOperation='destination-in';
  clip.drawImage(state.paint.get(window.mask),0,0);
  context.drawImage(mask,x,y);
}

function lighting(window,t) {
  if ($('light').value==='unlit'||(room.value!=='all'&&window.roomId!==room.value)) return 0;
  if ($('light').value==='lit') return 1;
  const seed=[...window.roomId].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
  const tick=(t+(seed%6)*.69)%12;
  const ease=u=>{const a=Math.max(0,Math.min(1,u));return a*a*(3-2*a);};
  return ease((tick-.8)/2)*ease((8-tick)/2);
}

function render(time) {
  const design=state.design;
  if (!design) return;
  const t=(time-state.started)/1000;
  const full=canvas(...design.framePx);
  const context=full.getContext('2d');
  for (const window of design.windows) {
    drawLayer(context,window.unlitInterior.url,window.rectPx);
    const warmth=lighting(window,t);
    if (warmth) {
      context.globalAlpha=warmth;
      drawLayer(context,window.litInterior.url,window.rectPx);
      context.globalAlpha=1;
    }
    drawActivity(context,window,design,t);
    drawLayer(context,window.glass.url,window.rectPx);
  }

  const active=new Set([...$('layer-keys').querySelectorAll('input:checked')].map(control=>control.value));
  const shell=canvas(...design.framePx);
  const exterior=shell.getContext('2d',{willReadFrequently:true});
  for (const part of design.componentLayers) {
    if (active.has(part.role)) drawLayer(exterior,part.url,part.rectPx);
  }
  if (active.has('facade')||active.has('tower-walls')||active.has('bay-walls')) tintedExterior(exterior,design);
  context.drawImage(shell,0,0);
  if ($('decor').checked) {
    const displays=new Set();
    for (const mount of design.decorationMounts) {
      const [x,y,w,h]=mount.rectPx;
      const slot=`${mount.anchorPx[0]}-${Math.round(mount.anchorPx[1]/8)}`;
      if (mount.decoration==='fascia'&&displays.has(slot)) continue;
      if (mount.decoration==='awning') displays.add(slot);
      context.save();
      if (mount.mirror) {context.translate(2*x+w,0);context.scale(-1,1);}
      drawLayer(context,mount.image,[x,y,w,h]);
      context.restore();
    }
  }

  const destination=drawing.getContext('2d');
  destination.imageSmoothingQuality='high';
  destination.fillStyle=$('dark').checked?'#40554c':'#e3e8de';
  destination.fillRect(0,0,drawing.width,drawing.height);
  const scale=Math.min(790/design.framePx[0],430/design.groundAnchorPx[1],2.1);
  const [ax,ay]=design.groundAnchorPx;
  destination.drawImage(full,drawing.width/2-ax*scale,466-ay*scale,full.width*scale,full.height*scale);
  if ($('light').value==='fade'||$('motion').value) state.frame=requestAnimationFrame(render);
}

function refresh() {
  cancelAnimationFrame(state.frame);
  state.started=performance.now();
  render(state.started);
}

async function select(entry) {
  cancelAnimationFrame(state.frame);
  const job=++state.job;
  const design=await loadJson(entry.design);
  const paths=new Set([design.facadeValue,...design.componentLayers.map(layer=>layer.url),
    ...design.decorationMounts.map(item=>item.image)]);
  for (const window of design.windows) {
    paths.add(window.mask);
    for (const key of ['unlitInterior','litInterior','glass']) paths.add(window[key].url);
    for (const activity of Object.values(window.activityLayers)) paths.add(activity.url);
  }
  const paint=await Promise.all([...paths].map(async path=>[path,await remember(path)]));
  if (job!==state.job) return;
  state.design=design;
  state.paint=new Map(paint);
  $('selected').textContent=design.label;
  $('layer-keys').replaceChildren();
  for (const layer of design.componentLayers) {
    const label=document.createElement('label');
    const box=Object.assign(document.createElement('input'),{type:'checkbox',value:layer.role,checked:true});
    box.addEventListener('change',refresh);
    label.append(box,title(layer.role));
    $('layer-keys').append(label);
  }
  room.replaceChildren(new Option('All rooms','all'));
  for (const item of design.rooms.filter(item=>item.windowIds.length)) room.add(new Option(title(item.id),item.id));
  for (const button of $('variants').querySelectorAll('button')) {
    button.setAttribute('aria-pressed',button.dataset.id===design.id);
  }
  refresh();
}

try {
  const catalog=await loadJson('catalog.json');
  for (const [id,record] of Object.entries(catalog.types)) type.add(new Option(record.label,id));
  function filters() {
    profile.replaceChildren(...catalog.types[type.value].profiles.map(p=>new Option(title(p),p)));
    cards().catch(displayError);
  }
  async function cards() {
    const set=catalog.sets.find(set=>set.type===type.value&&set.profile===profile.value);
    $('sheet').href=from(set.contactSheet);
    const entries=catalog.buildings.filter(row=>row.type===type.value&&row.profile===profile.value);
    $('variants').replaceChildren();
    for (const entry of entries) {
      const button=Object.assign(document.createElement('button'),{type:'button'});
      button.dataset.id=entry.id;
      button.setAttribute('aria-pressed','false');
      const image=Object.assign(document.createElement('img'),{src:from(entry.preview),alt:''});
      const label=document.createElement('strong');
      label.textContent=entry.label;
      const finish=document.createElement('span');
      finish.className='finish';
      finish.textContent=entry.variant+' · '+entry.finish;
      button.append(image,label,finish);
      button.addEventListener('click',()=>select(entry).catch(displayError));
      $('variants').append(button);
    }
    $('status').textContent=`${catalog.buildingCount} buildings · ${catalog.setCount} type and profile sets`;
    await select(entries[0]);
    document.documentElement.dataset.ready='true';
  }
  type.addEventListener('change',filters);
  profile.addEventListener('change',()=>cards().catch(displayError));
  for (const id of ['tint','decor','room','light','motion','dark']) $(id).addEventListener('change',refresh);
  $('color').addEventListener('input',()=>{$('tint').checked=true;refresh();});
  filters();
} catch (error) { displayError(error); }
