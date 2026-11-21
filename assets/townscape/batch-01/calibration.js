const swap = document.querySelector("#swap");
const slope = document.querySelector("#slope");
let bookshop = false;
swap.addEventListener("click", () => {
  bookshop = !bookshop;
  slope.src = `preview/slope-${bookshop ? "bookshop" : "cafe"}-960x540.png`;
  slope.alt = `${bookshop ? "Bookshop" : "Café"} in the center of three joined storefronts on a rainy hillside`;
  swap.textContent = bookshop ? "Place café in center" : "Place bookshop in center";
});

async function animateStorefront() {
  const manifestUrl = new URL("./manifest.v1.json", import.meta.url);
  const response = await fetch(manifestUrl);
  if (!response.ok) throw Error(`Manifest request returned ${response.status}`);
  const manifest = await response.json();
  const cafe = manifest.assets.find(({ asset_id }) => asset_id === "townscape.b01.cafe");
  const { frames, frame_duration_ms: interval } = cafe.rooms[0].motion;
  const labels = new Set([...cafe.layer_order, ...frames]);
  const layers = Object.fromEntries(await Promise.all([...labels].map(async (label) => {
    const image = new Image();
    image.src = new URL(cafe.files[label], manifestUrl);
    await image.decode();
    return [label, image];
  })));
  const canvas = document.querySelector("#storefront");
  const button = document.querySelector("#motion");
  const context = canvas.getContext("2d");
  [canvas.width, canvas.height] = cafe.source_dimensions_px;
  let frame = 0;
  let timer;
  const draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const label of cafe.layer_order) {
      context.drawImage(layers[label === frames[0] ? frames[frame] : label], 0, 0);
    }
  };
  const start = () => {
    timer = setInterval(() => {
      frame = (frame + 1) % frames.length;
      draw();
    }, interval);
    button.textContent = "Pause motion";
  };
  button.addEventListener("click", () => {
    if (timer === undefined) {
      start();
    } else {
      clearInterval(timer);
      timer = undefined;
      button.textContent = "Play motion";
    }
  });
  draw();
  button.disabled = false;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    button.textContent = "Play motion";
  } else {
    start();
  }
}

const status = document.querySelector("#status");
try {
  await animateStorefront();
  status.hidden = true;
} catch (error) {
  status.textContent = `Could not load the storefront layers. ${error.message}`;
}
