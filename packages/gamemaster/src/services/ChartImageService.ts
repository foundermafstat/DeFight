/**
 * ChartImageService — generates a simple PnL line chart as a PNG buffer.
 * Uses the `canvas` npm package (@napi-rs/canvas or node-canvas).
 * 
 * Produces a 600×400 dark-themed chart with a green or red line
 * depending on whether the final PnL is positive or negative.
 */

let createCanvasImpl: any = null;

async function getCanvas() {
	if (createCanvasImpl) return createCanvasImpl;
	try {
		const mod = await eval('import("canvas")');
		createCanvasImpl = mod.createCanvas;
	} catch {
		console.warn("[ChartImageService] 'canvas' package not available, using fallback SVG→Buffer");
		createCanvasImpl = null;
	}
	return createCanvasImpl;
}

export interface ChartDataPoint {
	label: string;  // e.g. "Run 1", "Cycle 5"
	value: number;  // PnL value
}

const WIDTH = 600;
const HEIGHT = 400;
const PADDING = 50;
const BG_COLOR = '#121418';
const GRID_COLOR = 'rgba(255,255,255,0.06)';
const TEXT_COLOR = '#737373';
const GREEN = '#0AC18E';
const RED = '#ef4444';

/**
 * Generates a PnL chart as a PNG Buffer.
 * Line is green if final value >= 0, red otherwise.
 * Falls back to a minimal SVG-based PNG if canvas is not installed.
 */
export async function generateChartImage(points: ChartDataPoint[]): Promise<Buffer> {
	if (!points || points.length === 0) {
		points = [{ label: '0', value: 0 }, { label: '1', value: 0 }];
	}

	if (points.length === 1) {
		points = [{ label: '0', value: 0 }, ...points];
	}

	const createCanvas = await getCanvas();

	if (!createCanvas) {
		// Fallback: generate a simple SVG and return as buffer
		return generateSvgFallback(points);
	}

	const canvas = createCanvas(WIDTH, HEIGHT);
	const ctx = canvas.getContext('2d');

	// Background
	ctx.fillStyle = BG_COLOR;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);

	const values = points.map(p => p.value);
	const minVal = Math.min(...values, 0);
	const maxVal = Math.max(...values, 0);
	const range = maxVal - minVal || 1;

	const chartW = WIDTH - PADDING * 2;
	const chartH = HEIGHT - PADDING * 2;

	// Grid lines
	ctx.strokeStyle = GRID_COLOR;
	ctx.lineWidth = 1;
	for (let i = 0; i <= 4; i++) {
		const y = PADDING + (chartH / 4) * i;
		ctx.beginPath();
		ctx.moveTo(PADDING, y);
		ctx.lineTo(WIDTH - PADDING, y);
		ctx.stroke();
	}

	// Zero line
	const zeroY = PADDING + chartH - ((0 - minVal) / range) * chartH;
	ctx.strokeStyle = 'rgba(255,255,255,0.15)';
	ctx.setLineDash([4, 4]);
	ctx.beginPath();
	ctx.moveTo(PADDING, zeroY);
	ctx.lineTo(WIDTH - PADDING, zeroY);
	ctx.stroke();
	ctx.setLineDash([]);

	// PnL line
	const finalValue = values[values.length - 1];
	const lineColor = finalValue >= 0 ? GREEN : RED;

	ctx.strokeStyle = lineColor;
	ctx.lineWidth = 2.5;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.beginPath();

	for (let i = 0; i < points.length; i++) {
		const x = PADDING + (i / (points.length - 1)) * chartW;
		const y = PADDING + chartH - ((values[i] - minVal) / range) * chartH;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();

	// Gradient fill under the line
	const gradient = ctx.createLinearGradient(0, PADDING, 0, HEIGHT - PADDING);
	gradient.addColorStop(0, finalValue >= 0 ? 'rgba(10,193,142,0.25)' : 'rgba(239,68,68,0.25)');
	gradient.addColorStop(1, 'rgba(0,0,0,0)');

	ctx.fillStyle = gradient;
	ctx.beginPath();
	for (let i = 0; i < points.length; i++) {
		const x = PADDING + (i / (points.length - 1)) * chartW;
		const y = PADDING + chartH - ((values[i] - minVal) / range) * chartH;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.lineTo(WIDTH - PADDING, HEIGHT - PADDING);
	ctx.lineTo(PADDING, HEIGHT - PADDING);
	ctx.closePath();
	ctx.fill();

	// Labels
	ctx.fillStyle = TEXT_COLOR;
	ctx.font = '11px monospace';
	ctx.textAlign = 'right';

	for (let i = 0; i <= 4; i++) {
		const y = PADDING + (chartH / 4) * i;
		const val = maxVal - (range / 4) * i;
		ctx.fillText(val.toFixed(1), PADDING - 8, y + 4);
	}

	// Title
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 14px sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText('PnL Performance', PADDING, 28);

	// Final value badge
	ctx.fillStyle = lineColor;
	ctx.font = 'bold 13px monospace';
	ctx.textAlign = 'right';
	ctx.fillText(`${finalValue >= 0 ? '+' : ''}${finalValue.toFixed(2)} USDT`, WIDTH - PADDING, 28);

	return canvas.toBuffer('image/png');
}

/**
 * SVG fallback when `canvas` npm package is not installed.
 * Returns a Buffer containing a PNG-like SVG (browsers can render it).
 */
function generateSvgFallback(points: ChartDataPoint[]): Buffer {
	const values = points.map(p => p.value);
	const minVal = Math.min(...values, 0);
	const maxVal = Math.max(...values, 0);
	const range = maxVal - minVal || 1;

	const chartW = WIDTH - PADDING * 2;
	const chartH = HEIGHT - PADDING * 2;

	const finalValue = values[values.length - 1];
	const lineColor = finalValue >= 0 ? GREEN : RED;

	const pathPoints = points.map((p, i) => {
		const x = PADDING + (i / (points.length - 1)) * chartW;
		const y = PADDING + chartH - ((p.value - minVal) / range) * chartH;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});

	const polyline = pathPoints.join(' ');
	const fillPoints = [...pathPoints, `${(WIDTH - PADDING).toFixed(1)},${(HEIGHT - PADDING).toFixed(1)}`, `${PADDING.toFixed(1)},${(HEIGHT - PADDING).toFixed(1)}`].join(' ');

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG_COLOR}"/>
  <polygon points="${fillPoints}" fill="${lineColor}" opacity="0.15"/>
  <polyline points="${polyline}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  <text x="${PADDING}" y="28" fill="white" font-size="14" font-weight="bold" font-family="sans-serif">PnL Performance</text>
  <text x="${WIDTH - PADDING}" y="28" fill="${lineColor}" font-size="13" font-weight="bold" font-family="monospace" text-anchor="end">${finalValue >= 0 ? '+' : ''}${finalValue.toFixed(2)} USDT</text>
</svg>`;

	return Buffer.from(svg, 'utf-8');
}
