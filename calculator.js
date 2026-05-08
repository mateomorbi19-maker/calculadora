(function () {
  'use strict';

  var INPUT_IDS = [
    'horasAntes',
    'horasDespues',
    'costoHora',
    'volumenMensual',
    'tasaErrorAntes',
    'tasaErrorDespues',
    'costoError',
    'costoUnico',
    'costoMensual'
  ];

  var DEFAULTS = {
    horasAntes: '20',
    horasDespues: '4',
    costoHora: '30',
    volumenMensual: '200',
    tasaErrorAntes: '5',
    tasaErrorDespues: '1',
    costoError: '50',
    costoUnico: '5000',
    costoMensual: '300'
  };

  var COLOR_POSITIVE = '#16A34A';
  var COLOR_NEGATIVE = '#DC2626';
  var COLOR_BORDER = '#E5E5E5';
  var COLOR_TEXT_SOFT = '#6B6B6B';

  // ---------- Parsing ----------

  function parseNumber(raw) {
    if (raw === null || raw === undefined) return 0;
    var str = String(raw).trim();
    if (str === '') return 0;

    // Remove spaces and any character that isn't digit, comma, dot, or minus.
    var cleaned = str.replace(/\s/g, '').replace(/[^\d.,-]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === ',') return 0;

    var lastDot = cleaned.lastIndexOf('.');
    var lastComma = cleaned.lastIndexOf(',');

    if (lastDot !== -1 && lastComma !== -1) {
      // Both present: the rightmost is the decimal separator.
      if (lastDot > lastComma) {
        cleaned = cleaned.replace(/,/g, '');
      } else {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      }
    } else if (lastComma !== -1) {
      // Only comma: treat as decimal separator.
      cleaned = cleaned.replace(',', '.');
    }
    // Only dot or none: parseFloat handles it.

    var num = parseFloat(cleaned);
    if (!isFinite(num) || isNaN(num)) return 0;
    if (num < 0) return 0;
    return num;
  }

  // ---------- Math ----------

  function compute(values) {
    var horasAntes = values.horasAntes;
    var horasDespues = values.horasDespues;
    var costoHora = values.costoHora;
    var volumenMensual = values.volumenMensual;
    var tasaErrorAntes = values.tasaErrorAntes;
    var tasaErrorDespues = values.tasaErrorDespues;
    var costoError = values.costoError;
    var costoUnico = values.costoUnico;
    var costoMensual = values.costoMensual;

    var ahorroTiempoAnual = Math.max(0, horasAntes - horasDespues) * costoHora * 52;
    var erroresEvitadosAnual =
      volumenMensual * Math.max(0, (tasaErrorAntes - tasaErrorDespues) / 100) * costoError * 12;
    var beneficioBrutoAnual = ahorroTiempoAnual + erroresEvitadosAnual;
    var costosAno1 = costoUnico + costoMensual * 12;
    var ahorroNetoAnual = beneficioBrutoAnual - costosAno1;
    var beneficioMensualNeto = beneficioBrutoAnual / 12 - costoMensual;

    var roi = costosAno1 > 0 ? (ahorroNetoAnual / costosAno1) * 100 : null;
    var payback;
    if (beneficioMensualNeto <= 0) {
      payback = null; // "Sin payback"
    } else if (costoUnico <= 0) {
      payback = 0;
    } else {
      payback = costoUnico / beneficioMensualNeto;
    }

    return {
      ahorroTiempoAnual: ahorroTiempoAnual,
      erroresEvitadosAnual: erroresEvitadosAnual,
      beneficioBrutoAnual: beneficioBrutoAnual,
      costosAno1: costosAno1,
      ahorroNetoAnual: ahorroNetoAnual,
      beneficioMensualNeto: beneficioMensualNeto,
      roi: roi,
      payback: payback,
      costoUnico: costoUnico
    };
  }

  // ---------- Formatting ----------

  function makeCurrencyFormatter(currency) {
    var locale = currency === 'ARS' ? 'es-AR' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
  }

  function formatCurrency(value, currency) {
    var n = Math.round(value);
    return makeCurrencyFormatter(currency).format(n);
  }

  function formatRoi(roi) {
    if (roi === null || !isFinite(roi)) return '—';
    return Math.round(roi).toLocaleString('en-US') + '%';
  }

  function formatPayback(months) {
    if (months === null) return 'Sin payback';
    if (!isFinite(months)) return '—';
    if (months > 60) return '60+ meses';
    var rounded = Math.round(months * 10) / 10;
    return rounded.toFixed(1) + ' meses';
  }

  // ---------- DOM ----------

  function readValues() {
    var out = {};
    for (var i = 0; i < INPUT_IDS.length; i++) {
      var id = INPUT_IDS[i];
      var el = document.getElementById(id);
      out[id] = parseNumber(el ? el.value : 0);
    }
    return out;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ---------- Chart ----------

  var chart = null;
  var chartState = { currency: 'USD' };

  function buildChartData(result) {
    var months = 24;
    var labels = [];
    var data = [];
    var acc = -result.costoUnico;
    labels.push('0');
    data.push(Math.round(acc));
    for (var m = 1; m <= months; m++) {
      acc = acc + result.beneficioMensualNeto;
      labels.push(String(m));
      data.push(Math.round(acc));
    }
    return { labels: labels, data: data };
  }

  function ensureChart() {
    if (chart) return chart;
    var ctx = document.getElementById('breakEvenChart');
    if (!ctx || !window.Chart) return null;

    chart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Beneficio acumulado',
          data: [],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.15,
          spanGaps: true,
          segment: {
            borderColor: function (ctx) {
              var y0 = ctx.p0.parsed.y;
              var y1 = ctx.p1.parsed.y;
              return ((y0 + y1) / 2) < 0 ? COLOR_NEGATIVE : COLOR_POSITIVE;
            }
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (items) {
                if (!items || !items.length) return '';
                return 'Mes ' + items[0].label;
              },
              label: function (item) {
                return formatCurrency(item.parsed.y, chartState.currency);
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Meses', color: COLOR_TEXT_SOFT, font: { size: 12 } },
            grid: { color: COLOR_BORDER, drawBorder: false },
            ticks: { color: COLOR_TEXT_SOFT, font: { size: 11 }, maxRotation: 0, autoSkip: true }
          },
          y: {
            grid: { color: COLOR_BORDER, drawBorder: false },
            ticks: {
              color: COLOR_TEXT_SOFT,
              font: { size: 11 },
              callback: function (value) {
                return formatCurrency(value, chartState.currency);
              }
            }
          }
        }
      }
    });
    return chart;
  }

  function updateChart(result, currency) {
    chartState.currency = currency;
    var c = ensureChart();
    if (!c) return;
    var d = buildChartData(result);
    c.data.labels = d.labels;
    c.data.datasets[0].data = d.data;
    c.update();
  }

  // ---------- Render ----------

  function render() {
    var values = readValues();
    var result = compute(values);
    var currencySel = document.getElementById('currency');
    var currency = currencySel ? currencySel.value : 'USD';

    setText('r-roi', formatRoi(result.roi));
    setText('r-payback', formatPayback(result.payback));
    setText('r-neto', formatCurrency(result.ahorroNetoAnual, currency));
    setText('r-bruto', formatCurrency(result.beneficioBrutoAnual, currency));

    updateChart(result, currency);
  }

  // ---------- Wiring ----------

  function attachListeners() {
    for (var i = 0; i < INPUT_IDS.length; i++) {
      var el = document.getElementById(INPUT_IDS[i]);
      if (el) el.addEventListener('input', render);
    }
    var cur = document.getElementById('currency');
    if (cur) cur.addEventListener('change', render);

    var resetBtn = document.getElementById('reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        for (var i = 0; i < INPUT_IDS.length; i++) {
          var id = INPUT_IDS[i];
          var el = document.getElementById(id);
          if (el) el.value = DEFAULTS[id];
        }
        render();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      attachListeners();
      render();
    });
  } else {
    attachListeners();
    render();
  }
})();
