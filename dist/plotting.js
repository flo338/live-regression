"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('plot');
    var ctx = canvas.getContext('2d');
    var clearBtn = document.getElementById('clearBtn');
    var fitMethodSelect = document.getElementById('fitMethod');
    if (!ctx || !clearBtn || !fitMethodSelect) {
        throw new Error('Required DOM elements not found');
    }
    var dataPoints = [];
    var currentFitMethod = 'linear';
    function fitLine(points) {
        var n = points.length;
        if (n < 2)
            return null;
        var A = points.map(function (p) { return [p.x, 1]; });
        var Y = points.map(function (p) { return p.y; });
        var AT = numeric.transpose(A);
        var ATA = numeric.dot(AT, A);
        if (numeric.det(ATA) === 0)
            return null;
        var ATY = numeric.dot(AT, Y);
        var coef = numeric.solve(ATA, ATY);
        return { a: coef[0], b: coef[1] };
    }
    function fitCubic(points) {
        if (points.length < 4)
            return null;
        var A = points.map(function (p) { return [Math.pow(p.x, 3), Math.pow(p.x, 2), p.x, 1]; });
        var Y = points.map(function (p) { return p.y; });
        var AT = numeric.transpose(A);
        var ATA = numeric.dot(AT, A);
        if (numeric.det(ATA) === 0)
            return null;
        var ATY = numeric.dot(AT, Y);
        var coef = numeric.solve(ATA, ATY);
        return coef;
    }
    function evalCubic(coefs, x) {
        return coefs[0] * Math.pow(x, 3) + coefs[1] * Math.pow(x, 2) + coefs[2] * x + coefs[3];
    }
    function generateResidualLines() {
        var lines = [];
        if (currentFitMethod === 'linear') {
            var fit = fitLine(dataPoints);
            if (!fit)
                return [];
            for (var _i = 0, dataPoints_1 = dataPoints; _i < dataPoints_1.length; _i++) {
                var p = dataPoints_1[_i];
                var yFit = fit.a * p.x + fit.b;
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
        else if (currentFitMethod === 'cubic') {
            var coefs = fitCubic(dataPoints);
            if (!coefs)
                return [];
            for (var _a = 0, dataPoints_2 = dataPoints; _a < dataPoints_2.length; _a++) {
                var p = dataPoints_2[_a];
                var yFit = evalCubic(coefs, p.x);
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
    function computeStatistics() {
        if (dataPoints.length < 2)
            return 'Not enough points';
        var residuals = [];
        if (currentFitMethod === 'linear') {
            var fit_1 = fitLine(dataPoints);
            if (!fit_1)
                return 'Linear fit failed';
            residuals = dataPoints.map(function (p) { return p.y - (fit_1.a * p.x + fit_1.b); });
        }
        else {
            var coefs_1 = fitCubic(dataPoints);
            if (!coefs_1)
                return 'Cubic fit failed';
            residuals = dataPoints.map(function (p) { return p.y - evalCubic(coefs_1, p.x); });
        }
        var mse = residuals.reduce(function (sum, r) { return sum + Math.pow(r, 2); }, 0) / residuals.length;
        var yMean = dataPoints.reduce(function (sum, p) { return sum + p.y; }, 0) / dataPoints.length;
        var ssTotal = dataPoints.reduce(function (sum, p) { return sum + Math.pow((p.y - yMean), 2); }, 0);
        var ssResidual = residuals.reduce(function (sum, r) { return sum + Math.pow(r, 2); }, 0);
        var rSquared = 1 - ssResidual / ssTotal;
        return "\n    <strong>Statistics (".concat(currentFitMethod, "):</strong><br>\n    n = ").concat(dataPoints.length, "<br>\n    MSE = ").concat(mse.toFixed(3), "<br>\n    R\u00B2 = ").concat(rSquared.toFixed(3), "\n  ");
    }
    var scatterDataset = {
        label: 'Data',
        data: [],
        backgroundColor: 'red',
        showLine: false,
        pointRadius: 6,
    };
    var fitDataset = {
        label: 'Fit',
        data: [],
        borderColor: 'blue',
        borderWidth: 3,
        fill: false,
        showLine: true,
        pointRadius: 0,
        tension: 0,
    };
    var residualLineDatasets = [];
    var chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: __spreadArray([scatterDataset, fitDataset], residualLineDatasets, true),
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
    ctx.canvas.addEventListener('click', function (event) {
        var rect = ctx.canvas.getBoundingClientRect();
        var xClick = event.clientX - rect.left;
        var yClick = event.clientY - rect.top;
        var xScale = chart.scales.x;
        var yScale = chart.scales.y;
        var xValue = xScale.getValueForPixel(xClick);
        var yValue = yScale.getValueForPixel(yClick);
        if (xValue < 0 || xValue > 20 || yValue < 0 || yValue > 10)
            return;
        dataPoints.push({ x: xValue, y: yValue });
        updatePlot();
    });
    function updatePlot() {
        scatterDataset.data = __spreadArray([], dataPoints, true);
        if (currentFitMethod === 'linear') {
            var fit = fitLine(dataPoints);
            if (fit) {
                var fitLineX = [0, 20];
                var fitLineY = [fit.a * 0 + fit.b, fit.a * 20 + fit.b];
                fitDataset.data = [
                    { x: fitLineX[0], y: fitLineY[0] },
                    { x: fitLineX[1], y: fitLineY[1] },
                ];
                fitDataset.tension = 0;
            }
            else {
                fitDataset.data = [];
            }
            residualLineDatasets.length = 0;
            residualLineDatasets.push.apply(residualLineDatasets, generateResidualLines());
            chart.data.datasets = __spreadArray([scatterDataset, fitDataset], residualLineDatasets, true);
            chart.update();
        }
        else if (currentFitMethod === 'cubic') {
            var coefs = fitCubic(dataPoints);
            if (coefs) {
                var samples = 100;
                var step = 20 / (samples - 1);
                var curvePoints = [];
                for (var i = 0; i < samples; i++) {
                    var x = i * step;
                    var y = evalCubic(coefs, x);
                    if (y >= 0 && y <= 10) {
                        curvePoints.push({ x: x, y: y });
                    }
                }
                fitDataset.data = curvePoints;
                fitDataset.tension = 0.4;
            }
            else {
                fitDataset.data = [];
            }
            residualLineDatasets.length = 0;
            residualLineDatasets.push.apply(residualLineDatasets, generateResidualLines());
            chart.data.datasets = __spreadArray([scatterDataset, fitDataset], residualLineDatasets, true);
            chart.update();
        }
        var statsBox = document.getElementById('statsBox');
        if (statsBox) {
            statsBox.innerHTML = computeStatistics();
        }
    }
    clearBtn.addEventListener('click', function () {
        dataPoints = [];
        updatePlot();
    });
    fitMethodSelect.addEventListener('change', function () {
        currentFitMethod = fitMethodSelect.value;
        updatePlot();
    });
});
