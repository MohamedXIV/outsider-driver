/**
 * Original vector passenger artwork for the architecture evaluation.
 * All three renderers rasterize this identical character drawing.
 * No Inochi/puppet assets or runtime dependencies are involved.
 */
export type AlienExpression = 'neutral' | 'guarded' | 'firm' | 'amused';
export type AlienLayer = 'body' | 'head' | 'antennae' | 'eyes' | 'mouth' | 'base' | 'all';

export interface AlienPose {
  readonly expression: AlienExpression;
  readonly talk: number;
  readonly blink: number;
  readonly sway: number;
  readonly gazeX: number;
  readonly gazeY: number;
}

export const PORTRAIT_WIDTH = 256;
export const PORTRAIT_HEIGHT = 320;
export const ALIEN_EXPRESSIONS: readonly AlienExpression[] = [
  'neutral', 'guarded', 'firm', 'amused',
];

const ink = '#13252d';
const gold = '#d6a568';

function path(
  ctx: CanvasRenderingContext2D,
  points: readonly [number, number][],
  color: string,
): void {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rx: number, ry: number, fill: string,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function stroke(
  ctx: CanvasRenderingContext2D,
  color: string, width: number, points: readonly [number, number][],
): void {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function body(ctx: CanvasRenderingContext2D, pose: AlienPose): void {
  ctx.save();
  ctx.translate(128, 264);
  ctx.rotate(pose.sway * 0.022);
  ctx.translate(-128, -264);
  // Embroidered copper collar and the layered, worn night-driver coat.
  ellipse(ctx, 128, 290, 113, 98, ink);
  path(ctx, [[18,319],[27,269],[47,236],[81,218],[103,232],[128,252],[154,231],[182,220],[213,253],[238,319]], '#334d52');
  path(ctx, [[19,319],[35,275],[62,245],[99,231],[128,270],[157,230],[194,247],[223,283],[240,319]], '#26404b');
  path(ctx, [[48,241],[91,217],[128,276],[94,290]], '#5a6470');
  path(ctx, [[207,241],[166,216],[128,276],[162,290]], '#435a61');
  path(ctx, [[96,227],[128,259],[159,225],[150,260],[128,286],[105,259]], gold);
  path(ctx, [[110,254],[128,270],[146,254],[142,319],[114,319]], '#1d3443');
  stroke(ctx, '#ad8157', 2, [[78,246],[63,267],[54,305]]);
  stroke(ctx, '#ad8157', 2, [[178,246],[194,267],[201,305]]);
  for (const x of [62, 195]) {
    ellipse(ctx, x, 274, 8, 8, '#bf8656');
    ellipse(ctx, x, 274, 4, 4, '#8be1c7');
  }
  path(ctx, [[111,291],[145,291],[148,304],[108,304]], '#a16b48');
  stroke(ctx, '#f5c782', 2, [[117,298],[139,298]]);
  ctx.restore();
}

function head(ctx: CanvasRenderingContext2D, pose: AlienPose): void {
  ctx.save();
  ctx.translate(128, 147);
  ctx.rotate(pose.sway * 0.012);
  ctx.translate(-128, -147);
  // Neck, flared ears, organic face silhouette.
  path(ctx, [[110,191],[147,190],[155,239],[128,251],[100,237]], '#315d62');
  path(ctx, [[77,134],[44,115],[52,165],[83,185]], '#348d89');
  path(ctx, [[178,133],[213,112],[207,165],[171,183]], '#348d89');
  path(ctx, [[60,140],[77,145],[78,169],[65,160]], '#bc8f73');
  path(ctx, [[194,143],[179,146],[181,171],[193,159]], '#bc8f73');
  const skin = ctx.createLinearGradient(63, 70, 197, 229);
  skin.addColorStop(0, '#8dd1ba');
  skin.addColorStop(0.38, '#4ca7a0');
  skin.addColorStop(0.8, '#327b87');
  skin.addColorStop(1, '#26465f');
  ctx.beginPath();
  ctx.moveTo(128, 66);
  ctx.bezierCurveTo(82, 60, 64, 103, 69, 159);
  ctx.bezierCurveTo(70, 207, 110, 238, 127, 241);
  ctx.bezierCurveTo(156, 228, 187, 197, 189, 149);
  ctx.bezierCurveTo(191, 89, 163, 63, 128, 66);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();
  stroke(ctx, '#194852', 3, [[69,153],[82,204],[127,242],[172,205],[189,151]]);
  // Sculpted brow, forehead markings and luminous central crest.
  path(ctx, [[68,121],[74,81],[91,53],[126,49],[164,57],[184,93],[190,128],[169,99],[147,83],[128,95],[109,82],[83,100]], '#29394c');
  path(ctx, [[73,113],[88,77],[106,63],[117,76],[101,100]], '#4d4a65');
  path(ctx, [[183,111],[171,77],[154,66],[141,78],[154,100]], '#4e506a');
  stroke(ctx, '#e8be7d', 3, [[108,79],[127,94],[149,79]]);
  path(ctx, [[125,97],[128,113],[131,97]], '#d9a96c');
  ellipse(ctx, 128, 119, 3, 6, '#b9eadb');
  // Cheek ridges / nose plates, never covered by expression sprites.
  stroke(ctx, '#6cb1ab', 3, [[86,172],[103,180]]);
  stroke(ctx, '#2d777e', 3, [[155,180],[174,171]]);
  path(ctx, [[119,168],[126,174],[135,168],[131,189],[125,192]], '#287d86');
  ellipse(ctx, 128, 191, 3, 2, '#1a4951');
  // Ornament and travel-worn headset.
  ellipse(ctx, 73, 177, 9, 15, '#b68150');
  ellipse(ctx, 183, 177, 9, 15, '#b68150');
  ellipse(ctx, 73, 177, 4, 9, '#233e49');
  ellipse(ctx, 183, 177, 4, 9, '#233e49');
  ctx.restore();
}

function antennae(ctx: CanvasRenderingContext2D, pose: AlienPose): void {
  const shift = pose.sway * 6;
  stroke(ctx, '#293e53', 8, [[100,76],[84+shift,43],[76+shift,20]]);
  stroke(ctx, '#d8a56e', 2, [[100,76],[84+shift,43],[76+shift,20]]);
  stroke(ctx, '#293e53', 8, [[155,75],[170+shift,43],[180+shift,18]]);
  stroke(ctx, '#d8a56e', 2, [[155,75],[170+shift,43],[180+shift,18]]);
  ellipse(ctx, 76+shift, 18, 8, 9, '#cc865e');
  ellipse(ctx, 180+shift, 17, 8, 9, '#cc865e');
  ellipse(ctx, 76+shift, 17, 4, 6, '#fff0b0');
  ellipse(ctx, 180+shift, 16, 4, 6, '#fff0b0');
}

function eyes(ctx: CanvasRenderingContext2D, pose: AlienPose): void {
  const guarded = pose.expression === 'guarded';
  const amused = pose.expression === 'amused';
  const firm = pose.expression === 'firm';
  for (const [i, x] of [100,157].entries()) {
    const y = 146;
    if (pose.blink > 0.5) {
      stroke(ctx, ink, 4, [[x-19,y+1],[x,y+4],[x+18,y+1]]);
    } else {
      ellipse(ctx,x,y,23,12,'#173840');
      ellipse(ctx,x,y,19,8,amused ? '#b5edb3' : '#c5dbcf');
      ellipse(ctx,x+pose.gazeX*6,y+pose.gazeY*4,8,9,'#a9654b');
      ellipse(ctx,x+pose.gazeX*6,y+pose.gazeY*4,4,8,'#192d3a');
      ellipse(ctx,x+pose.gazeX*6-2,y+pose.gazeY*4-3,2,2,'#fff4df');
    }
    const tilt = guarded ? (i===0 ? 7 : -7) : firm ? (i===0 ? -4 : 4) : amused ? (i===0 ? -5 : 5) : 0;
    stroke(ctx,'#244a57',6,[[x-19,126+tilt],[x,124],[x+18,126-tilt]]);
    stroke(ctx,'#a7ddd0',1,[[x-18,125+tilt],[x,123],[x+17,125-tilt]]);
  }
}

function mouth(ctx: CanvasRenderingContext2D, pose: AlienPose): void {
  const y = 211;
  if (pose.talk > 0.25) {
    ellipse(ctx,128,y,11+pose.talk*4,4+pose.talk*10,'#2b3441');
    ellipse(ctx,128,y+5,8,3,'#ad706e');
  } else if (pose.expression === 'amused') {
    ctx.beginPath();
    ctx.arc(128,202,20,0.18,Math.PI-0.18);
    ctx.strokeStyle = '#274851';
    ctx.lineWidth=4;
    ctx.stroke();
  } else if (pose.expression === 'guarded') {
    stroke(ctx,'#294c56',3,[[114,214],[128,210],[142,214]]);
  } else if (pose.expression === 'firm') {
    stroke(ctx,'#29424e',4,[[114,211],[142,211]]);
  } else {
    stroke(ctx,'#294c56',3,[[115,210],[128,212],[141,210]]);
  }
  ellipse(ctx,128,224,9,2,'#508d8a');
}

export function drawAlienLayer(
  ctx: CanvasRenderingContext2D,
  layer: AlienLayer,
  pose: AlienPose,
): void {
  ctx.save();
  if (layer === 'body' || layer === 'base' || layer === 'all') body(ctx,pose);
  if (layer === 'head' || layer === 'base' || layer === 'all') head(ctx,pose);
  if (layer === 'antennae' || layer === 'base' || layer === 'all') antennae(ctx,pose);
  if (layer === 'eyes' || layer === 'all') eyes(ctx,pose);
  if (layer === 'mouth' || layer === 'all') mouth(ctx,pose);
  ctx.restore();
}

export function neutralPose(): AlienPose {
  return { expression: 'neutral', talk: 0, blink: 0, sway: 0, gazeX: 0, gazeY: 0 };
}
