const $ = id => document.getElementById(id);
try {
  const {manifest,buildings,placeBuilding,placePlant} = await import('./render.js');
  const {renderTown,dressing} = await import('./town.js');
  const fog = $('fog');
  const building = $('building');
  const palette = $('palette');
  const paint = $('paint');
  const decor = $('decor');
  const light = $('light');
  const motion = $('motion');
  for (const [key,record] of Object.entries(buildings)) building.add(new Option(record.label,key));
  palette.add(new Option('Original','original'));
  for (const [name,color] of manifest.facadePalette) {
    palette.add(new Option(name[0].toUpperCase()+name.slice(1),color));
  }
  palette.add(new Option('Custom','custom'));

  function town() {
    const [small,large] = renderTown($('town'),Number(fog.value)/100);
    $('status').textContent = `Three streets · Closest buildings ${small}–${large} px high at 1440 × 810`;
    $('fog-value').textContent = fog.value+'%';
  }
  fog.addEventListener('input',town);
  town();

  const comparison = $('comparison').getContext('2d');
  comparison.imageSmoothingQuality = 'high';
  comparison.fillStyle = '#e4e7dd';
  comparison.fillRect(0,0,1280,462);
  comparison.fillStyle = '#d2d4c8';
  comparison.fillRect(38,382,1204,2);
  for (const [index,key] of ['cafe','bookshop'].entries()) {
    const x = 70+index*625;
    placeBuilding(comparison,'terrace',x,383,161);
    placeBuilding(comparison,key,x+160,383,208);
    placeBuilding(comparison,'cottage',x+397,383,123);
    comparison.fillStyle = '#33453d';
    comparison.font = '24px system-ui';
    comparison.textAlign = 'center';
    comparison.fillText(buildings[key].label, x+262, 424);
  }

  const foliage = $('foliage').getContext('2d');
  foliage.imageSmoothingQuality = 'high';
  foliage.fillStyle = '#e4e7dd';
  foliage.fillRect(0,0,1280,302);
  const variants = ['original',...manifest.trees.beech.compatiblePalettes];
  for (const [index,preset] of variants.entries()) {
    const x = 128+index*256;
    placePlant(foliage,'beech',x,236,208,1,preset);
    foliage.font = '23px system-ui';
    foliage.textAlign = 'center';
    foliage.fillStyle = '#33453d';
    foliage.fillText(preset.charAt(0).toUpperCase()+preset.slice(1).replaceAll('-',' '),x,273);
  }

  const smooth = x => {const u = Math.max(0,Math.min(1,x)); return u*u*(3-2*u);};
  let animation;
  let started = performance.now();
  const context = $('inspection').getContext('2d');
  context.imageSmoothingQuality = 'high';
  function inspect(now) {
    const key = building.value;
    const record = buildings[key];
    const [x0,x1] = record.groundSpanXPx;
    const lamps = {};
    const seconds = (now-started)/1000;
    for (const [index,room] of record.rooms.entries()) {
      const duration = 13+index*2.1;
      const phase = (seconds+index*2.7)%duration;
      if (light.value==='auto') lamps[room.id] = smooth((phase-1.2)/2.1)*smooth((8-phase)/2.1)*.92;
      if (light.value==='on') {
        lamps[room.id] = key==='cafe' ? (['cafe','flats-1-living'].includes(room.id)?1:0) : 1;
      }
    }
    let activity;
    if (motion.value!=='off') {
      const room = record.windows.find(window => window.activity.includes(motion.value));
      if (room) activity = {
        roomId:room.roomId,kind:motion.value,
        progress: motion.value==='walking' ? seconds%4.5/4.5 :
                  ['curtain','blind'].includes(motion.value) ? .5+.42*Math.sin(seconds*1.18) : .53
      };
    }
    const color = palette.value==='custom' ? paint.value : palette.value==='original' ? null : palette.value;
    const width = Math.min(440,430*(x1-x0)/record.groundAnchorPx[1]);
    context.fillStyle = '#e6e7dc';
    context.fillRect(0,0,800,500);
    context.fillStyle = '#cfd3c7';
    context.fillRect(42,458,716,1);
    placeBuilding(context,key,400-width/2,459,width,
      {color,ornaments:decor.checked ? dressing[key] : [],lights:lamps,activity},
      {fresh:true});
    if (light.value==='auto' || motion.value!=='off') animation = requestAnimationFrame(inspect);
  }

  function update() {
    cancelAnimationFrame(animation);
    started = performance.now();
    inspect(started);
  }
  for (const control of [building,palette,decor,light,motion]) control.addEventListener('change',update);
  paint.addEventListener('input',() => { palette.value='custom'; update(); });
  update();
  document.documentElement.dataset.ready = 'true';
} catch(error) {
  $('review-error').textContent = error.message;
  $('review-error').hidden = false;
  throw error;
}
