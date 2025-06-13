// Remove imports because you use CDN scripts
// declare globals for TS to not complain
declare const numeric: any;
declare const Chart: any;

interface Point {
  x: number;
  y: number;
}

type FitMethod = 'linear' | 'cubic';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('plot') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
  const fitMethodSelect = document.getElementById('fitMethod') as HTMLSelectElement;

  if (!ctx || !clearBtn || !fitMethodSelect) {
    throw new Error('Required DOM elements not found');
  }

  let dataPoints: Point[] = [];
  let currentFitMethod: FitMethod = 'linear';

  function fitLine(points: Point[]): { a: number; b: number } | null {
    const n = points.length;
    if (n < 2) return null;

    const A = points.map(p => [p.x, 1]);
    const Y = points.map(p => p.y);

    const AT = numeric.transpose(A);
    const ATA = numeric.dot(AT, A);

    if (numeric.det(ATA) === 0) return null;

    const ATY = numeric.dot(AT, Y);
    const coef = numeric.solve(ATA, ATY) as number[];

    return { a: coef[0], b: coef[1] };
  }

  function fitCubic(points: Point[]): number[] | null {
    if (points.length < 4) return null;

    const A = points.map(p => [p.x ** 3, p.x ** 2, p.x, 1]);
    const Y = points.map(p => p.y);

    const AT = numeric.transpose(A);
    const ATA = numeric.dot(AT, A);

    if (numeric.det(ATA) === 0) return null;

    const ATY = numeric.dot(AT, Y);
    const coef = numeric.solve(ATA, ATY) as number[];

    return coef;
  }

  function evalCubic(coefs: number[], x: number): number {
    return coefs[0] * x ** 3 + coefs[1] * x ** 2 + coefs[2] * x + coefs[3];
  }

  function generateResidualLines(): any[] {
  const lines: any[] = [];

  if (currentFitMethod === 'linear') {
    const fit = fitLine(dataPoints);
    if (!fit) return [];

    for (const p of dataPoints) {
      const yFit = fit.a * p.x + fit.b;
      lines.push({
        label: '',
        data: [
          { x: p.x, y: p.y },
          { x: p.x, y: yFit },
        ],
        borderColor: 'black',
        borderWidth: 2,
        borderDash: [5, 5],
        showLine: true,
        pointRadius: 0,
        fill: false,
      });
    }
  } else if (currentFitMethod === 'cubic') {
    const coefs = fitCubic(dataPoints);
    if (!coefs) return [];

    for (const p of dataPoints) {
      const yFit = evalCubic(coefs, p.x);
      lines.push({
        label: '',
        data: [
          { x: p.x, y: p.y },
          { x: p.x, y: yFit },
        ],
        borderColor: 'black',
        borderWidth: 2,
        borderDash: [5, 5],
        showLine: true,
        pointRadius: 0,
        fill: false,
      });
    }
  }

  return lines;
}
function computeStatistics(): string {
  if (dataPoints.length < 2) return 'Not enough points';

  let residuals: number[] = [];

  if (currentFitMethod === 'linear') {
    const fit = fitLine(dataPoints);
    if (!fit) return 'Linear fit failed';
    residuals = dataPoints.map(p => p.y - (fit.a * p.x + fit.b));
  } else {
    const coefs = fitCubic(dataPoints);
    if (!coefs) return 'Cubic fit failed';
    residuals = dataPoints.map(p => p.y - evalCubic(coefs, p.x));
  }

  const mse = residuals.reduce((sum, r) => sum + r ** 2, 0) / residuals.length;

  const yMean = dataPoints.reduce((sum, p) => sum + p.y, 0) / dataPoints.length;
  const ssTotal = dataPoints.reduce((sum, p) => sum + (p.y - yMean) ** 2, 0);
  const ssResidual = residuals.reduce((sum, r) => sum + r ** 2, 0);
  const rSquared = 1 - ssResidual / ssTotal;

  return `
    <strong>Statistics (${currentFitMethod}):</strong><br>
    n = ${dataPoints.length}<br>
    MSE = ${mse.toFixed(3)}<br>
    R² = ${rSquared.toFixed(3)}
  `;
}

  const scatterDataset = {
    label: 'Data',
    data: [] as { x: number; y: number }[],
    backgroundColor: 'red',
    showLine: false,
    pointRadius: 6,
  };

  const fitDataset = {
    label: 'Fit',
    data: [] as { x: number; y: number }[],
    borderColor: 'blue',
    borderWidth: 3,
    fill: false,
    showLine: true,
    pointRadius: 0,
    tension: 0,
  };

const residualLineDatasets: any[] = [];

const chart = new Chart(ctx, {
  type: 'scatter',
  data: {
    datasets: [scatterDataset, fitDataset, ...residualLineDatasets],
  },
    options: {
      animation: true,
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 20,
          title: { display: true, text: 'x' },
        },
        y: {
          min: 0,
          max: 10,
          title: { display: true, text: 'y' },
        },
      },
      plugins: {
        legend: { display: false },
      },
      interaction: { mode: 'nearest', intersect: true },
    },
  });

  ctx.canvas.addEventListener('click', (event: MouseEvent) => {
    const rect = ctx.canvas.getBoundingClientRect();

    const xClick = event.clientX - rect.left;
    const yClick = event.clientY - rect.top;

    const xScale = chart.scales.x;
    const yScale = chart.scales.y;

    const xValue = xScale.getValueForPixel(xClick);
    const yValue = yScale.getValueForPixel(yClick);

    if (xValue < 0 || xValue > 20 || yValue < 0 || yValue > 10) return;

    dataPoints.push({ x: xValue, y: yValue });
    updatePlot();
  });

  function updatePlot(): void {
    scatterDataset.data = [...dataPoints];

    if (currentFitMethod === 'linear') {
      const fit = fitLine(dataPoints);
      if (fit) {
        const fitLineX = [0, 20];
        const fitLineY = [fit.a * 0 + fit.b, fit.a * 20 + fit.b];
        fitDataset.data = [
          { x: fitLineX[0], y: fitLineY[0] },
          { x: fitLineX[1], y: fitLineY[1] },
        ];
        fitDataset.tension = 0;
      } else {
        fitDataset.data = [];
      }
      residualLineDatasets.length = 0;
      residualLineDatasets.push(...generateResidualLines());
      chart.data.datasets = [scatterDataset, fitDataset, ...residualLineDatasets];

      chart.update();
    } else if (currentFitMethod === 'cubic') {
      const coefs = fitCubic(dataPoints);
      if (coefs) {
        const samples = 100;
        const step = 20 / (samples - 1);
        const curvePoints: { x: number; y: number }[] = [];
        for (let i = 0; i < samples; i++) {
          const x = i * step;
          const y = evalCubic(coefs, x);
          if (y >= 0 && y <= 10) {
            curvePoints.push({ x, y });
          }
        }
        fitDataset.data = curvePoints;
        fitDataset.tension = 0.4;
      } else {
        fitDataset.data = [];
      }
      residualLineDatasets.length = 0;
      residualLineDatasets.push(...generateResidualLines());
      chart.data.datasets = [scatterDataset, fitDataset, ...residualLineDatasets];
      chart.update();
    }
    const statsBox = document.getElementById('statsBox');
if (statsBox) {
  statsBox.innerHTML = computeStatistics();
}

  }

  clearBtn.addEventListener('click', () => {
    dataPoints = [];
    updatePlot();
  });

  fitMethodSelect.addEventListener('change', () => {
    currentFitMethod = fitMethodSelect.value as FitMethod;
    updatePlot();
  });
});
