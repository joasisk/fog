import { manifest, buildings, image, layerCanvas, placeBuilding, placePlant } from './render.js';
const sceneWidth = 1440, sceneHeight = 810;
const buildingNames = { C: 'cafe', B: 'bookshop', T: 'terrace', G: 'cottage' };

const streets = [
  { base: 431, scale: .79, from: 135, to: 1374, bias: -17,
    groups: [[219,'GG'], [414,'TGT'], [695,'TG'], [930,'GTT'], [1176,'GG']],
    trees: [[169,'spruce',67],[291,'beech',49],[343,'spruce',62],[589,'beech',73],[636,'spruce',53],[815,'beech',56],[1100,'spruce',74],[1269,'beech',57],[1310,'spruce',65]] },
  { base: 555, scale: .94, from: 42, to: 1425, bias: -31,
    groups: [[89,'GGT'], [300,'TBT'], [539,'GT'], [744,'TCG'], [999,'GT'], [1223,'TG']],
    trees: [[57,'beech',71],[201,'spruce',84],[248,'beech',78],[478,'spruce',71],[510,'beech',68],[669,'beech',78],[898,'spruce',70],[941,'beech',67],[1103,'beech',79],[1154,'spruce',86],[1362,'spruce',90]] },
  { base: 683, scale: 1.04, from: -12, to: 1455, bias: -12,
    groups: [[31,'GTG'], [248,'TCTB'], [540,'TGT'], [785,'TCG'], [1031,'GTG'], [1290,'GT']],
    trees: [[4,'spruce',113],[192,'beech',86],[224,'spruce',74],[491,'beech',88],[717,'beech',85],[749,'spruce',87],[963,'beech',89],[1001,'spruce',105],[1216,'beech',88],[1260,'spruce',96],[1433,'beech',83]] },
];
const fogBanks = [
  [[351,425,349,41,.44],[674,458,490,43,.59],[1075,428,415,55,.50]],
  [[173,551,341,38,.47],[583,574,532,46,.59],[1119,553,430,48,.53]],
  [[286,693,352,32,.25],[786,686,437,36,.40],[1211,660,302,33,.34]],
];

function elevation(street, x) {
  return street.base + street.bias * (x / sceneWidth - .5) +
    12 * Math.sin(x / 271 + street.base / 215) + 5 * Math.cos(x / 137 + street.base);
}

function strokeRoad(context, path, width, color) {
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = color;
  context.stroke(path);
}

function drawCrossing(context, upper, lower, x1, x2) {
  const y1 = elevation(upper, x1) + 5;
  const y2 = elevation(lower, x2) + 5;
  const path = new Path2D();
  path.moveTo(x1, y1);
  path.bezierCurveTo(x1 + 61, y1 + 7, x2 - 30, y2 - 24, x2, y2);
  strokeRoad(context, path, 10, 'rgba(116,110,102,.21)');
  strokeRoad(context, path, 6, 'rgba(193,183,164,.43)');
}

function drawRoad(context, street) {
  const path = new Path2D();
  path.moveTo(street.from, elevation(street, street.from) + 6);
  for (let x = street.from+12; x < street.to; x += 12) {
    path.lineTo(x, elevation(street, x) + 6 + .36 * Math.sin(x/18));
  }
  path.lineTo(street.to, elevation(street, street.to) + 6);
  context.save();
  context.filter = 'blur(.48px)';
  strokeRoad(context, path, 18 * street.scale, 'rgba(124,116,105,.11)');
  strokeRoad(context, path, 12 * street.scale, 'rgba(137,130,120,.40)');
  strokeRoad(context, path, 7 * street.scale, 'rgba(204,195,180,.52)');
  context.restore();
}

function makeFogLayer(banks) {
  const layer = layerCanvas(sceneWidth, sceneHeight);
  const context = layer.getContext('2d');
  for (const [x,y,rx,ry,density] of banks) {
    context.save();
    context.translate(x,y);
    context.scale(rx,ry);
    const wash = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    wash.addColorStop(0, `rgba(234,235,225,${density})`);
    wash.addColorStop(.31, `rgba(230,233,225,${density*.87})`);
    wash.addColorStop(.66, `rgba(229,233,226,${density*.35})`);
    wash.addColorStop(1, 'rgba(229,233,226,0)');
    context.fillStyle = wash;
    context.fillRect(-1,-1,2,2);
    context.restore();
  }
  return layer;
}
const fogLayers = fogBanks.map(makeFogLayer);

const widths = {cafe:53,bookshop:53,terrace:42,cottage:63};
export const dressing = {
  cafe:['awning','hanging-sign','chalkboard','window-box'],
  bookshop:['fascia','hanging-sign','wall-lantern'],
  terrace:['shutter','window-box'],
  cottage:['window-box','ivy','wall-lantern'],
};

function drawStreet(context,street,level) {
  drawRoad(context,street);
  for (const [x,key,height] of street.trees) {
    placePlant(context,key,x,elevation(street,x)-4-x%12,height,[.66,.78,.89][level]);
  }
  const heights = [];
  for (const [group,[start,mix]] of street.groups.entries()) {
    let x = start;
    for (const [lot,code] of [...mix].entries()) {
      const key = buildingNames[code];
      const variation = 1 + ((group*19+lot*11+level*7)%13-6)/100;
      const frontage = widths[key]*street.scale*variation;
      const ground = elevation(street,x+frontage/2);
      const index = (group*5+lot*3+level)%manifest.facadePalette.length;
      const color = (lot+group)%4 === 0 ? null : manifest.facadePalette[index][1];
      const ornaments = (lot+group+level)%3 === 1 ? dressing[key] : [];
      const lights = key === 'cafe' && group % 3 === 0 ? { cafe:.60 } : {};
      heights.push(placeBuilding(context,key,x,ground,frontage,{color,ornaments,lights}));
      if ((lot+group)%3 === 1) placePlant(context,'heather',x+frontage-4,ground+2,7*street.scale,.91);
      if ((lot+group)%4 === 0) placePlant(context,'hawthorn',x+2,ground+2,9*street.scale,.81);
      x += frontage + (key === 'cottage' ? 9*street.scale : -.55);
    }
  }
  return heights;
}

export function renderTown(canvas,fog) {
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.save();
  context.filter = 'saturate(.67) contrast(.88) brightness(1.07)';
  context.drawImage(image('review/art/terrain.png'),0,0,sceneWidth,sceneHeight);
  context.restore();
  let seed = 7243;
  const random = () => {
    seed = (1664525*seed+1013904223)>>>0;
    return seed/4294967296;
  };
  for (let i=0;i<48;i++) {
    const x = i*32+random()*43;
    placePlant(context,i%3===0?'beech':'spruce',x,
      337+Math.cos(x/234)*17+random()*21,11+random()*26,.32+random()*.2);
  }
  drawCrossing(context,streets[0],streets[1],841,914);
  drawCrossing(context,streets[1],streets[2],621,713);
  let heights;
  streets.forEach((street,index) => {
    heights = drawStreet(context,street,index);
    if (fog > 0) {
      context.save();
      context.globalAlpha = fog;
      context.drawImage(fogLayers[index],0,0);
      context.restore();
    }
  });
  placePlant(context,'streetlamp',462,elevation(streets[2],462)+8,19);
  for (const [x,key,height] of [[81,'hawthorn',16],[414,'fern',12],
      [708,'heather',14],[948,'fern',16],[1112,'heather',12],[1325,'hawthorn',18]]) {
    placePlant(context,key,x,754+Math.cos(x/123)*20,height,.86);
  }
  return [Math.round(Math.min(...heights)),Math.round(Math.max(...heights))];
}
