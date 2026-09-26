(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const fmt = (value, digits = 3) => Number(value).toFixed(digits);
  const labels = {
    raw: 'Raw Actor', react: 'ReAct', textual: 'Textual Memory',
    reasoningbank: 'ReasoningBank', ace: 'ACE', static: 'Static Harness',
    bayesian: 'Bayesian opt.',
    full: 'VPEvolve', frozen: 'Frozen Experience',
    without_m1: 'w/o Domain Response Reflection',
    without_m2: 'w/o Scoped Experience Revision',
    without_m3: 'w/o Experiment Guidance'
  };
  const baselineOrder = ['raw', 'react', 'textual', 'reasoningbank', 'ace', 'static', 'bayesian'];
  const mechanismOrder = ['full', 'frozen', 'without_m1', 'without_m2', 'without_m3'];

  function aggregate(rows, method, layer) {
    const explicitOverall = layer === 'all' && rows.find(row => row.method === method && row.layer === 'overall');
    const selected = explicitOverall ? [explicitOverall] : rows.filter(row => row.method === method && (layer === 'all' ? row.layer !== 'overall' : row.layer === layer));
    if (!selected.length) throw Error(`Missing result: ${method}/${layer}`);
    const total = key => selected.reduce((sum, row) => sum + (row[key] ?? 0), 0);
    const n = total('n');
    return {
      method, n, max: selected.reduce((sum, row) => sum + row.max * row.n, 0) / n,
      mean: selected.reduce((sum, row) => sum + row.mean * row.n, 0) / n,
      pvb: selected.reduce((sum, row) => sum + row.pvb * row.n, 0) / n,
      complete: total('complete'), success: total('success'), qualitySuccess: total('qualitySuccess'),
      opc: total('opc'), llm: total('llm')
    };
  }

  function pressGroup(selector, active) {
    document.querySelectorAll(selector).forEach(button => {
      const selected = button === active;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function renderOnline(data) {
    const names = {poly: 'Poly', metal1: 'Metal1'};
    const rows = ['poly', 'metal1'].map(layer => {
      const initial = aggregate(data.main.rows, 'R0', layer);
      const final = aggregate(data.main.rows, 'full', layer);
      const run = aggregate(data.mechanism.rows, 'full', layer);
      return {layer, initial, final, run};
    });
    $('#online-cards').innerHTML = rows.map(({layer, initial, final}) => {
      const reduction = 100 * (1 - final.max / initial.max);
      return `<article class="online-card"><span>${names[layer]} · 10 WINDOWS</span><strong>${fmt(reduction,1)}<small>%</small></strong><p>Lower mean window-maximum EPE</p><div class="online-endpoints"><b>${fmt(initial.max)} nm</b><i>→</i><b>${fmt(final.max)} nm</b></div></article>`;
    }).join('');
    $('#online-table-body').innerHTML = rows.map(({layer, initial, final, run}) =>
      `<tr><th scope="row">${names[layer]}</th><td>${fmt(initial.max)} → <b>${fmt(final.max)}</b></td><td>${fmt(initial.mean)} → <b>${fmt(final.mean)}</b></td><td>${fmt(initial.pvb)} → <b>${fmt(final.pvb)}</b></td><td>${run.complete}/${run.n}</td><td>${run.opc - run.n} / ${run.llm}</td></tr>`
    ).join('');
  }

  function renderBaselines(data, layer) {
    const initial = aggregate(data.main.rows, 'R0', layer);
    const full = aggregate(data.main.rows, 'full', layer);
    const fullRun = aggregate(data.mechanism.rows, 'full', layer);
    Object.assign(full, {complete: fullRun.complete, success: fullRun.qualitySuccess, opc: fullRun.opc, llm: fullRun.llm});
    const baselines = baselineOrder.map(method => aggregate(data.baseline.rows, method, layer));
    const best = baselines.reduce((a, b) => a.max < b.max ? a : b);
    const rows = [initial, ...baselines, full];
    $('#result-main').innerHTML = `${fmt(full.max)} <small>nm</small>`;
    $('#result-comparison').textContent = `${fmt(100 * (1 - full.max / best.max),1)}% below ${labels[best.method]}, the strongest matched baseline`;
    $('#comparison-bars').innerHTML = [initial, best, full].map(row =>
      `<div class="bar-row ${row === full ? 'ours' : ''}"><span>${row.method === 'R0' ? 'Initial recipe' : labels[row.method]}</span><div><i style="width:${fmt(100 * row.max / initial.max,1)}%"></i></div><b>${fmt(row.max)}</b></div>`
    ).join('');
    $('#results-body').innerHTML = rows.map(row => {
      const initialRow = row.method === 'R0';
      return `<tr class="${row === full ? 'ours' : ''}"><th scope="row">${initialRow ? 'Initial recipe' : labels[row.method]}</th><td>${fmt(row.max)}</td><td>${fmt(row.mean)}</td><td>${fmt(row.pvb)}</td><td>${initialRow ? '—' : `${row.complete}/${row.n}`}</td><td>${initialRow ? '—' : `${row.success}/${row.n}`}</td><td>${initialRow ? '—' : `${row.opc - row.n} / ${row.llm}`}</td></tr>`;
    }).join('');
  }

  function renderMechanism(data, layer) {
    const rows = mechanismOrder.map(method => aggregate(data.mechanism.rows, method, layer));
    const max = Math.max(...rows.map(row => row.max));
    $('#ablation-cards').innerHTML = rows.map((row, index) =>
      `<article class="ablation-card ${row.method === 'full' ? 'ours' : ''}"><span>0${index + 1} / MECHANISM TEST</span><h3>${labels[row.method]}</h3><strong>${fmt(row.max)}<small> nm</small></strong><p>Mean window-max EPE</p><div class="ablation-bar"><i style="width:${fmt(100 * row.max / max,1)}%"></i></div><div class="ablation-facts"><span>Mean EPE <b>${fmt(row.mean)} nm</b></span><span>PVB <b>${fmt(row.pvb)} × 10⁻³ µm</b></span><span>Completed <b>${row.complete}/${row.n}</b></span></div></article>`
    ).join('');
    const [full, frozen] = rows;
    const name = {all: 'Across 20 cases', poly: 'On Poly', metal1: 'On Metal1'}[layer];
    $('#ablation-takeaway').textContent = `${name}, Full VPEvolve reaches ${fmt(full.max)} nm maximum EPE versus ${fmt(frozen.max)} nm with frozen experience.`;
  }

  function renderPaired(data) {
    const localNames = {poly: 'Poly', metal1: 'Metal1'};
    $('#experience-body').innerHTML = ['poly', 'metal1'].map(layer => {
      const start = data.experience.paired[layer].startMax;
      const ace = aggregate(data.experience.rows, 'ace', layer);
      const full = aggregate(data.experience.rows, 'vpevolve', layer);
      return `<tr><th scope="row">${localNames[layer]}</th><td>${fmt(start)}</td><td>${fmt(ace.max)}</td><td><b>${fmt(full.max)}</b></td><td>${fmt(ace.max - full.max)} nm</td></tr>`;
    }).join('');
    $('#continuation-body').innerHTML = ['poly', 'metal1'].map(layer => {
      const start = data.local.paired[layer].startMax;
      const global = aggregate(data.local.rows, 'global_only', layer);
      const local = aggregate(data.local.rows, 'global_local', layer);
      return `<tr><th scope="row">${localNames[layer]}</th><td>${fmt(start)}</td><td>${fmt(global.max)}</td><td><b>${fmt(local.max)}</b></td><td>${fmt(global.max - local.max)} nm</td></tr>`;
    }).join('');
  }

  function renderCrossModel(data) {
    $('#cross-model-body').innerHTML = ['poly', 'metal1'].flatMap(layer =>
      data.crossModel.rows.filter(row => row.layer === layer).map(row =>
        `<tr><th scope="row">${layer === 'poly' ? 'Poly' : 'Metal1'}</th><td>${row.model}</td><td>${fmt(row.max)}</td><td>${fmt(row.mean)}</td><td>${fmt(row.pvb)}</td></tr>`
      )
    ).join('');
  }

  function chart(layer, metric, source) {
    const series = source.series.filter(item => item.layer === layer);
    const all = series.flatMap(item => item.points.map(point => point[metric === 'max' ? 1 : 2]));
    const min = metric === 'max' ? Math.floor(Math.min(...all) - 1) : Math.floor(Math.min(0,...all) - 1);
    const max = metric === 'max' ? Math.ceil(Math.max(...all) + 1) : Math.ceil(Math.max(2,...all) + 1);
    const x = round => 48 + round / 100 * 486;
    const y = value => 224 - (value - min) / (max - min) * 190;
    const axis = [0, 0.5, 1].map(t => {
      const value = min + t * (max - min), yy = y(value);
      return `<path class="chart-grid" d="M48 ${yy}H534"/><text class="chart-axis" x="40" y="${yy + 4}" text-anchor="end">${fmt(value, metric === 'max' ? 0 : 1)}${metric === 'pvb' ? '%' : ''}</text>`;
    }).join('');
    const ticks = [0, 50, 100].map(round => `<text class="chart-axis" x="${x(round)}" y="247" text-anchor="middle">${round}</text>`).join('');
    const paths = series.map(item => {
      const valueIndex = metric === 'max' ? 1 : 2;
      const path = item.points.map((point, index) => `${index ? 'L' : 'M'}${x(point[0]).toFixed(1)},${y(point[valueIndex]).toFixed(1)}`).join(' ');
      const end = item.points[item.points.length - 1], full = item.method === 'full';
      return `<path class="${full ? 'series-full' : 'series-frozen'}" d="${path}"/><circle class="${full ? 'end-full' : 'end-frozen'}" cx="${x(end[0])}" cy="${y(end[valueIndex])}" r="4"><title>${full ? 'VPEvolve' : 'Frozen Experience'}: trial ${end[0]}, ${fmt(end[valueIndex], metric === 'max' ? 3 : 2)}${metric === 'pvb' ? '%' : ' nm'}</title></circle>`;
    }).join('');
    const limit = metric === 'pvb' ? `<path class="chart-limit" d="M48 ${y(2)}H534"/><text class="chart-axis" x="530" y="${y(2)-6}" text-anchor="end">+2% limit</text>` : '';
    const label = `${layer === 'poly' ? 'Poly02' : 'Metal29'} ${metric === 'max' ? 'maximum EPE' : 'PVB change relative to R0'} across measured optimization trials`;
    return `<svg viewBox="0 0 560 270" role="img" aria-label="${label}">${axis}${limit}${paths}${ticks}<text class="chart-axis" x="291" y="267" text-anchor="middle">Optimization trial</text></svg>`;
  }

  function renderLong(source, metric) {
    $('#long-chart-poly').innerHTML = chart('poly', metric, source);
    $('#long-chart-metal1').innerHTML = chart('metal1', metric, source);
    const signed = value => `${value > 0 ? '+' : ''}${fmt(value, 2)}%`;
    for (const [layer, selector] of [['poly', '#long-chart-poly'], ['metal1', '#long-chart-metal1']]) {
      const card = $(selector).closest('.long-chart-card');
      const full = source.series.find(item => item.layer === layer && item.method === 'full').points.at(-1);
      const frozen = source.series.find(item => item.layer === layer && item.method === 'frozen').points.at(-1);
      card.querySelector('h3').innerHTML = metric === 'max' ? `${fmt(full[1])} <small>nm</small>` : `${signed(full[2])}`;
      card.querySelector('p').textContent = metric === 'max'
        ? `VPEvolve maximum EPE at trial ${full[0]} · Frozen: ${fmt(frozen[1])} nm at trial ${frozen[0]}`
        : `VPEvolve PVB change at trial ${full[0]} · Frozen: ${signed(frozen[2])} at trial ${frozen[0]}`;
    }
  }

  Promise.all([
    fetch('assets/current/final-results.json?v=20260926-paper').then(response => {if (!response.ok) throw Error('Final results unavailable'); return response.json();}),
    fetch('assets/current/long-horizon-curves.json?v=20260925-final').then(response => {if (!response.ok) throw Error('Long-horizon curves unavailable'); return response.json();})
  ]).then(([data, curves]) => {
    renderOnline(data);
    renderBaselines(data, 'all');
    renderMechanism(data, 'all');
    renderPaired(data);
    renderCrossModel(data);
    renderLong(curves, 'max');
    document.querySelectorAll('[data-group]').forEach(button => button.addEventListener('click', () => {
      pressGroup('[data-group]', button); renderBaselines(data, button.dataset.group);
    }));
    document.querySelectorAll('[data-ablation]').forEach(button => button.addEventListener('click', () => {
      pressGroup('[data-ablation]', button); renderMechanism(data, button.dataset.ablation);
    }));
    document.querySelectorAll('[data-long-metric]').forEach(button => button.addEventListener('click', () => {
      pressGroup('[data-long-metric]', button); renderLong(curves, button.dataset.longMetric);
    }));
  }).catch(error => {
    ['#online-cards','#ablation-cards','#long-chart-poly','#long-chart-metal1'].forEach(selector => {
      const element = $(selector); if (element) element.textContent = 'Final result data could not load. Please refresh.';
    });
    console.error(error);
  });
})();
