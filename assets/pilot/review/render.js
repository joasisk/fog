export const manifest = await fetch('../manifest.json').then(response => {
  if (!response.ok) throw new Error('Could not load the pilot manifest');
  return response.json();
});
export const { buildings, trees, plants, props, decorations, roomMotion } = manifest;
const images = new Map();
const tinted = new Map();
const presets = new Map();
const windowCanvas = document.createElement('canvas');

export function layerCanvas(width, height) {
  return Object.assign(document.createElement('canvas'), { width, height });
}

export async function load(paths) {
  await Promise.all([...new Set(paths)].filter(path => !images.has(path)).map(async path => {
    const image = new Image();
    image.src = '../'+path;
    await image.decode();
    images.set(path,image);
  }));
}

export const image = path => images.get(path);

const windowPaths = window => [window.mask,window.unlit,window.lit,window.glass];
await load([
  ...Object.values(buildings).flatMap(building => [
    building.shell,building.facadeMask,building.facadeValue,...building.windows.flatMap(windowPaths)
  ]),
  ...Object.values(trees).flatMap(tree => [tree.trunk,tree.originalFoliage,tree.foliage]),
  ...[...Object.values(plants),...Object.values(props),...Object.values(decorations),
      ...Object.values(roomMotion)].map(record => record.image),
  'review/art/terrain.png',
]);

function rgb(hex) {
  return [1,3,5].map(index => parseInt(hex.slice(index,index+2),16));
}

function tintedShell(building, color) {
  if (!color) return image(building.shell);
  const key = building.id+'/'+color;
  if (tinted.has(key)) return tinted.get(key);
  const [width,height] = building.framePx;
  const result = layerCanvas(width,height);
  const context = result.getContext('2d',{willReadFrequently:true});
  const values = layerCanvas(width,height).getContext('2d',{willReadFrequently:true});
  context.drawImage(image(building.shell),0,0);
  const shell = context.getImageData(0,0,width,height);
  values.drawImage(image(building.facadeValue),0,0);
  const valuesAndMask = values.getImageData(0,0,width,height).data;
  const target = rgb(color);
  for (let i=0;i<shell.data.length;i+=4) {
    const strength = valuesAndMask[i+3]/255;
    if (!strength) continue;
    const grain = valuesAndMask[i]-building.facadeMidtone;
    for (let channel=0;channel<3;channel++) {
      const original = shell.data[i+channel];
      shell.data[i+channel] = original + strength*(target[channel]+grain-original);
    }
  }
  context.putImageData(shell,0,0);
  if (tinted.size >= 36) tinted.delete(tinted.keys().next().value);
  tinted.set(key,result);
  return result;
}

function drawActivity(context, window, room, activity) {
  const [x,y,w,h] = window.rectPx;
  const actor = image(roomMotion[activity.kind].image);
  windowCanvas.width = w;
  windowCanvas.height = h;
  const overlay = windowCanvas.getContext('2d');
  const fixture = activity.kind === 'curtain' || activity.kind === 'blind';
  const windowHeight = fixture ? h*.98 : room.height*.87;
  const width = actor.width*windowHeight/actor.height;
  const center = room.left - width + (room.width+2*width)*activity.progress;
  overlay.globalAlpha = fixture ? .64 : .74;
  overlay.drawImage(actor,
    fixture ? (activity.kind === 'blind' ? 0 : (activity.progress-.5)*w) : center-x-width/2,
    fixture ? (activity.kind === 'blind' ? -h*(1-activity.progress) : 0) : room.bottom-y-windowHeight*.66,
    activity.kind === 'blind' ? w : width,windowHeight);
  overlay.globalAlpha = 1;
  overlay.globalCompositeOperation = 'destination-in';
  overlay.drawImage(image(window.mask),0,0);
  context.drawImage(windowCanvas,x,y);
}

export function buildFront(key, {color, ornaments=[], lights={}, activity} = {}) {
  const building = buildings[key];
  const front = layerCanvas(...building.framePx);
  const context = front.getContext('2d');
  const localWindows = activity ? building.windows.filter(w => w.roomId === activity.roomId) : [];
  const left = Math.min(...localWindows.map(w => w.rectPx[0]));
  const top = Math.min(...localWindows.map(w => w.rectPx[1]));
  const right = Math.max(...localWindows.map(w => w.rectPx[0]+w.rectPx[2]));
  const bottom = Math.max(...localWindows.map(w => w.rectPx[1]+w.rectPx[3]));
  const room = {left,bottom,width:right-left,height:bottom-top};
  for (const window of building.windows) {
    const [x,y] = window.rectPx;
    context.drawImage(image(window.unlit),x,y);
    const glow = lights[window.roomId] ?? 0;
    if (glow > 0) {
      context.globalAlpha = glow;
      context.drawImage(image(window.lit),x,y);
      context.globalAlpha = 1;
    }
    if (activity && window.roomId === activity.roomId && window.activity.includes(activity.kind)) {
      drawActivity(context,window,room,activity);
    }
    context.drawImage(image(window.glass),x,y);
  }
  context.drawImage(tintedShell(building,color),0,0);
  for (const mount of building.decorationMounts) {
    if (!ornaments.includes(mount.decoration)) continue;
    const art = decorations[mount.decoration];
    const [mx,my] = art.mountAnchorPx;
    const [w,h] = art.framePx;
    const [x,y] = mount.anchorPx;
    const displayHeight = mount.heightPx ?? mount.widthPx*h/w;
    context.drawImage(image(art.image),x-mx/w*mount.widthPx,y-my/h*displayHeight,
      mount.widthPx,displayHeight);
  }
  return front;
}

export function placeBuilding(context, key, left, ground, frontage, options, {fresh=false}={}) {
  const building = buildings[key];
  const [x0,x1] = building.groundSpanXPx;
  const scale = frontage/(x1-x0);
  const cacheKey = key+JSON.stringify(options ?? {});
  if (!fresh && !presets.has(cacheKey)) {
    if (presets.size >= 44) presets.delete(presets.keys().next().value);
    presets.set(cacheKey,buildFront(key,options));
  }
  const sprite = fresh ? buildFront(key,options) : presets.get(cacheKey);
  const vertical = building.groundAnchorPx[1];
  context.drawImage(sprite,left-x0*scale,ground-vertical*scale,sprite.width*scale,sprite.height*scale);
  return building.referenceHeightUnits*frontage/building.referenceFrontageUnits;
}

const treeCache = new Map();
export function treeLayer(key,palette='original') {
  const id = key+'/'+palette;
  if (treeCache.has(id)) return treeCache.get(id);
  const tree = trees[key];
  const result = layerCanvas(...tree.framePx);
  const context = result.getContext('2d');
  context.drawImage(image(tree.trunk),0,0);
  if (palette === 'original') {
    context.drawImage(image(tree.originalFoliage),0,0);
  } else {
    const foliage = layerCanvas(...tree.framePx);
    const paint = foliage.getContext('2d',{willReadFrequently:true});
    paint.drawImage(image(tree.foliage),0,0);
    const pixels = paint.getImageData(0,0,foliage.width,foliage.height);
    const stops = manifest.foliagePalettes[palette].map(rgb);
    for (let i=0;i<pixels.data.length;i+=4) {
      if (!pixels.data[i+3]) continue;
      const mapped = Math.max(0,Math.min(2,(pixels.data[i]-25)/96));
      const base = Math.min(1,Math.floor(mapped));
      const ratio = mapped-base;
      for (let c=0;c<3;c++) pixels.data[i+c] = stops[base][c]*(1-ratio)+stops[base+1][c]*ratio;
    }
    paint.putImageData(pixels,0,0);
    context.drawImage(foliage,0,0);
  }
  treeCache.set(id,result);
  return result;
}

export function placePlant(context,key,x,ground,height,alpha=1,palette='original') {
  const plant = trees[key] ?? plants[key] ?? props[key];
  const [ax,ay] = plant.groundAnchorPx;
  const sprite = trees[key] ? treeLayer(key,palette) : image(plant.image);
  const scale = height/ay;
  context.save();
  context.globalAlpha *= alpha;
  context.drawImage(sprite,x-ax*scale,ground-height,sprite.width*scale,sprite.height*scale);
  context.restore();
}
