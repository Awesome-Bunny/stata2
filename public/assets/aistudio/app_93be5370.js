
(function() {
  let currentTab = 'trainer'; // 'trainer' | 'compare' | 'df_lab' | 'tests' | 'glossary'
  let currentVariant = 'v1';  // 'v1' | 'v3'

  // Convert [[term|label]] or [[term]] into clickable glossary chips
  function parseTerms(text) {
    if (!text) return '';
    return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, function(_, key, label) {
      const display = label || key;
      const safeKey = key.trim().toLowerCase();
      return `<span class="term-chip" onclick="window.openGlossaryTerm('${safeKey}')" title="Нажмите, чтобы открыть определение из учебника Наследова">📖 ${display}</span>`;
    });
  }

  window.openGlossaryTerm = function(termKey) {
    const entry = window.NASLEDOV_GLOSSARY[termKey];
    const modal = document.getElementById('glossary-modal');
    const body = document.getElementById('glossary-modal-body');
    const title = document.getElementById('glossary-modal-title');
    if (!entry) {
      title.textContent = "Словарь терминов (А. Д. Наследов)";
      body.innerHTML = `<p>Термин «${termKey}» не найден. Выберите любой термин из полного списка во вкладке «📖 Словарь Наследова».</p>`;
    } else {
      title.textContent = entry.title;
      body.innerHTML = `
        <div style="margin-bottom:14px;">
          <span class="badge">Строго по учебнику А. Д. Наследова</span>
          <p style="margin-top:6px; font-size:0.98rem;">${entry.academic}</p>
        </div>
        <div style="margin-bottom:14px; background:rgba(56,189,248,0.1); padding:12px; border-radius:8px; border-left:3px solid #38bdf8;">
          <strong>💡 Простыми словами:</strong>
          <p style="margin-top:4px;">${entry.simple}</p>
        </div>
        <div style="margin-bottom:14px;">
          <strong>📐 Формула / Правило:</strong>
          <code style="display:block; margin-top:6px; padding:8px 12px; background:#0f172a; border-radius:6px; color:#38bdf8; font-weight:700;">${entry.formula}</code>
        </div>
        <div style="background:rgba(245,158,11,0.15); padding:12px; border-radius:8px; border-left:3px solid #f59e0b;">
          <strong>⚠️ Ловушка на экзамене (Вариант 1 vs Вариант 3):</strong>
          <p style="margin-top:4px;">${entry.trap}</p>
        </div>
      `;
    }
    modal.classList.add('open');
  };

  window.closeGlossaryModal = function() {
    document.getElementById('glossary-modal').classList.remove('open');
  };

  window.switchTab = function(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderMain();
  };

  window.switchVariant = function(v) {
    currentVariant = v;
    renderMain();
  };

  window.checkStep = function(variantKey, taskIdx, stepIdx) {
    const task = window.TASKS_DATA[variantKey][taskIdx];
    const step = task.steps[stepIdx];
    const inputEl = document.getElementById(`inp-${variantKey}-${taskIdx}-${stepIdx}`);
    const fbEl = document.getElementById(`fb-${variantKey}-${taskIdx}-${stepIdx}`);
    if (!inputEl || !fbEl) return;
    const val = inputEl.value.trim().toLowerCase().replace(/\s+/g, ' ');
    const isOk = step.ans.some(a => val === a.toLowerCase() || val.includes(a.toLowerCase()));
    if (isOk && val.length > 0) {
      fbEl.className = 'feedback ok';
      fbEl.innerHTML = `✅ <strong>Верно!</strong> ${step.hint}`;
    } else {
      fbEl.className = 'feedback err';
      fbEl.innerHTML = `❌ <strong>Пока неверно.</strong> Попробуйте ещё раз или нажмите «Подсказка».`;
    }
  };

  window.showStepHint = function(variantKey, taskIdx, stepIdx) {
    const task = window.TASKS_DATA[variantKey][taskIdx];
    const step = task.steps[stepIdx];
    const fbEl = document.getElementById(`fb-${variantKey}-${taskIdx}-${stepIdx}`);
    if (!fbEl) return;
    fbEl.className = 'feedback hint';
    fbEl.innerHTML = `💡 <strong>Подсказка и решение шага:</strong> ${step.hint} (Эталонный ответ: <code>${step.ans[0]}</code>)`;
  };

  function renderTrainer() {
    const tasks = window.TASKS_DATA[currentVariant];
    let html = `
      <div class="card" style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">
        <div>
          <h2 style="font-size:1.15rem;">Пошаговая тренировка заданий №1–9 (с кликабельными терминами 📖)</h2>
          <p style="color:var(--text-muted); font-size:0.9rem;">Нажимайте на любой подсвеченный пунктиром термин 📖 в тексте задачи, чтобы открыть определение из учебника Наследова.</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn ${currentVariant === 'v1' ? 'active' : ''}" onclick="window.switchVariant('v1')">Вариант 1 (Марина Жукурмало)</button>
          <button class="btn ${currentVariant === 'v3' ? 'active' : ''}" onclick="window.switchVariant('v3')">Вариант 3 (Из файла)</button>
        </div>
      </div>
    `;

    tasks.forEach((t, tIdx) => {
      let stepsHtml = '';
      t.steps.forEach((s, sIdx) => {
        stepsHtml += `
          <div class="step-box">
            <div class="step-title">${s.label}</div>
            <div class="input-row">
              <input type="text" id="inp-${currentVariant}-${tIdx}-${sIdx}" placeholder="Ваш ответ..." onkeydown="if(event.key==='Enter') window.checkStep('${currentVariant}', ${tIdx}, ${sIdx})">
              <button class="btn btn-primary" onclick="window.checkStep('${currentVariant}', ${tIdx}, ${sIdx})">Проверить шаг</button>
              <button class="btn" onclick="window.showStepHint('${currentVariant}', ${tIdx}, ${sIdx})">💡 Подсказка / Решение</button>
            </div>
            <div id="fb-${currentVariant}-${tIdx}-${sIdx}" class="feedback"></div>
          </div>
        `;
      });

      html += `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="badge">${t.points}</span>
            <span class="badge badge-trap">⚠️ Экзаменационная ловушка внутри</span>
          </div>
          <h3 style="margin-bottom:8px;">${t.title}</h3>
          <p style="margin-bottom:12px;">${parseTerms(t.text)}</p>
          <div style="background:rgba(245,158,11,0.12); border-left:3px solid #f59e0b; padding:10px 12px; border-radius:6px; font-size:0.88rem; margin-bottom:10px;">
            <strong>⚠️ На что обратить внимание:</strong> ${parseTerms(t.trap)}
          </div>
          ${stepsHtml}
        </div>
      `;
    });
    return html;
  }

  function renderCompare() {
    const v1 = window.TASKS_DATA.v1;
    const v3 = window.TASKS_DATA.v3;
    let html = `
      <div class="card">
        <h2>⚖️ Кардинальные отличия: Вариант 1 (Марина Ж.) vs Вариант 3 рядом</h2>
        <p style="color:var(--text-muted); font-size:0.9rem;">Сравнение всех 9 расчётных и аналитических заданий бок о бок, чтобы вы никогда не перепутали формулу при смене варианта.</p>
      </div>
    `;
    for (let i = 0; i < v1.length; i++) {
      html += `
        <div class="card">
          <h3 style="color:var(--primary); margin-bottom:12px;">Номер №${v1[i].num}</h3>
          <div class="grid-2">
            <div style="background:#0f172a; padding:14px; border-radius:10px; border:1px solid var(--border);">
              <span class="badge">Вариант 1 (Марина Жукурмало)</span>
              <h4 style="margin:8px 0;">${v1[i].title}</h4>
              <p style="font-size:0.9rem; margin-bottom:8px;">${parseTerms(v1[i].text)}</p>
              <p style="font-size:0.85rem; color:#fcd34d;"><strong>Ключ и ловушка:</strong> ${parseTerms(v1[i].trap)}</p>
            </div>
            <div style="background:#0f172a; padding:14px; border-radius:10px; border:1px solid var(--border);">
              <span class="badge" style="background:rgba(168,85,247,0.2); color:#d8b4fe;">Вариант 3 (Из файла)</span>
              <h4 style="margin:8px 0;">${v3[i].title}</h4>
              <p style="font-size:0.9rem; margin-bottom:8px;">${parseTerms(v3[i].text)}</p>
              <p style="font-size:0.85rem; color:#fcd34d;"><strong>Ключ и ловушка:</strong> ${parseTerms(v3[i].trap)}</p>
            </div>
          </div>
        </div>
      `;
    }
    return html;
  }

  window.calcCustomDf = function() {
    const mode = document.getElementById('df-sim-mode').value;
    const k = parseInt(document.getElementById('df-sim-k').value, 10) || 6;
    const r = parseInt(document.getElementById('df-sim-r').value, 10) || 4;
    const c = parseInt(document.getElementById('df-sim-c').value, 10) || 4;
    const emp = parseFloat(document.getElementById('df-sim-emp').value) || 8.74;

    let df = mode === 'norm' ? (k - 3) : ((r - 1) * (c - 1));
    if (df < 1) df = 1;
    const row = window.CHI2_TABLE.find(x => x.df === df) || window.CHI2_TABLE[window.CHI2_TABLE.length - 1];
    const crit = row.p05;
    const isLess = emp < crit;

    const out = document.getElementById('df-sim-result');
    if (mode === 'norm') {
      out.innerHTML = `
        <div style="padding:14px; background:#0f172a; border-radius:10px; border:1px solid var(--primary);">
          <p><strong>1. Формула степеней свободы для проверки нормальности (Задание №4):</strong></p>
          <p style="font-size:1.05rem; color:#38bdf8; font-weight:700; margin:6px 0;">df = k - 3 = ${k} - 3 = ${df}</p>
          <p style="font-size:0.86rem; color:var(--text-muted);">Почему вычитаем 3? Минус 1 за фиксированную сумму частот (n), минус 1 за выборочное среднее (x̄) и минус 1 за выборочное стандартное отклонение (σ).</p>
          <hr style="border-color:var(--border); margin:10px 0;">
          <p><strong>2. Критическое значение из Приложения 4 учебника Наследова (при p = 0,05 и df = ${df}):</strong> <code>χ²_табл = ${crit}</code></p>
          <p><strong>3. Сравнение и вывод:</strong> Ваше χ²_эмп = <code>${emp}</code> ${isLess ? '&lt;' : '&gt;'} <code>${crit}</code> →
            <strong style="color:${isLess ? '#22c55e' : '#ef4444'};">${isLess ? 'СООТВЕТСТВУЕТ нормальному закону (как в Варианте 3)' : 'НЕ СООТВЕТСТВУЕТ нормальному закону (как в Варианте 1 Марины Ж.)'}</strong>
          </p>
        </div>
      `;
    } else {
      out.innerHTML = `
        <div style="padding:14px; background:#0f172a; border-radius:10px; border:1px solid var(--accent);">
          <p><strong>1. Формула степеней свободы для таблицы сопряжённости r × c (Задание №6):</strong></p>
          <p style="font-size:1.05rem; color:#d8b4fe; font-weight:700; margin:6px 0;">df = (r - 1) × (c - 1) = (${r} - 1) × (${c} - 1) = ${df}</p>
          <p style="font-size:0.86rem; color:var(--text-muted);">В таблице сопряжённости двух качественных признаков среднее и сигма не считаются — фиксированы только суммы по строкам и столбцам.</p>
          <hr style="border-color:var(--border); margin:10px 0;">
          <p><strong>2. Критическое значение (при p = 0,05 и df = ${df}):</strong> <code>χ²_табл = ${crit}</code></p>
          <p><strong>3. Вывод о связи признаков:</strong> χ²_эмп = <code>${emp}</code> ${isLess ? '&lt; (связь не доказана, признаки независимы)' : '&gt; (связь статистически значима!)'}</p>
        </div>
      `;
    }
  };

  window.checkDfDrill = function(idx) {
    const ex = window.DF_DRILL_EXERCISES[idx];
    const inpDf = parseInt(document.getElementById(`df-drill-inp-${idx}`).value, 10);
    const fb = document.getElementById(`df-drill-fb-${idx}`);
    if (inpDf === ex.correct_df) {
      fb.className = 'feedback ok';
      fb.innerHTML = `✅ <strong>Отлично!</strong> ${ex.explain}`;
    } else {
      fb.className = 'feedback err';
      fb.innerHTML = `❌ <strong>Неверно.</strong> Подсказка: ${ex.explain}`;
    }
  };

  function renderDfLab() {
    let tableRows = window.CHI2_TABLE.map(r => `
      <tr class="${(r.df === 3 || r.df === 11) ? 'highlight-row' : ''}">
        <td>df = ${r.df}</td>
        <td><strong>${r.p05}</strong></td>
        <td>${r.p01}</td>
        <td style="text-align:left;">${r.note}</td>
      </tr>
    `).join('');

    let drillsHtml = window.DF_DRILL_EXERCISES.map((ex, idx) => `
      <div class="step-box">
        <div class="step-title">Практическая задача #${idx + 1} (${ex.k_or_rc})</div>
        <p style="font-size:0.92rem; margin-bottom:8px;">${ex.scenario}</p>
        <div class="input-row">
          <input type="number" id="df-drill-inp-${idx}" placeholder="Введите число степеней свободы df...">
          <button class="btn btn-primary" onclick="window.checkDfDrill(${idx})">Проверить df и вывод</button>
        </div>
        <div id="df-drill-fb-${idx}" class="feedback"></div>
      </div>
    `).join('');

    return `
      <div class="card">
        <h2>🎓 Лаборатория степеней свободы (df) и критерия χ² Пирсона</h2>
        <p style="margin-top:6px;">По учебнику А. Д. Наследова <strong>[[степени свободы]] (df)</strong> — это число элементов ряда (интервалов или ячеек), которые могут свободно варьировать, за вычетом числа связей (параметров, оцененных по самой выборке).</p>
        <div class="grid-2" style="margin-top:14px;">
          <div style="background:#0f172a; padding:14px; border-radius:10px; border-left:4px solid #38bdf8;">
            <h4>Формула №1: Проверка нормальности (Задание №4)</h4>
            <p style="font-size:1.1rem; font-weight:700; color:#38bdf8; margin:6px 0;">df = k - 3</p>
            <p style="font-size:0.88rem; color:var(--text-muted);">где <strong>k</strong> — количество интервалов, на которые разбили ряд. Вычитаем <strong>3</strong>, потому что по выборке мы зафиксировали: 1) объём выборки n, 2) среднее арифметическое x̄, 3) стандартное отклонение σ.</p>
          </div>
          <div style="background:#0f172a; padding:14px; border-radius:10px; border-left:4px solid #a855f7;">
            <h4>Формула №2: Таблица сопряжённости (Задание №6)</h4>
            <p style="font-size:1.1rem; font-weight:700; color:#d8b4fe; margin:6px 0;">df = (r - 1) × (c - 1)</p>
            <p style="font-size:0.88rem; color:var(--text-muted);">где <strong>r</strong> — число строк (градаций первой переменной), <strong>c</strong> — число столбцов (градаций второй переменной). Например, для таблицы 4×4: df = 3 × 3 = 9.</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>🧮 Интерактивный калькулятор степеней свободы и χ²</h3>
        <div class="input-row" style="margin-bottom:12px;">
          <label>Тип задачи:</label>
          <select id="df-sim-mode" onchange="window.calcCustomDf()">
            <option value="norm">Задание №4: Проверка нормальности (df = k - 3)</option>
            <option value="cont">Задание №6: Таблица сопряжённости (df = (r-1)(c-1))</option>
          </select>
          <label>Интервалов k:</label>
          <input type="number" id="df-sim-k" value="6" min="4" max="15" style="width:75px;" oninput="window.calcCustomDf()">
          <label>Строк r / Столбцов c:</label>
          <input type="number" id="df-sim-r" value="4" min="2" max="6" style="width:65px;" oninput="window.calcCustomDf()">
          <input type="number" id="df-sim-c" value="4" min="2" max="6" style="width:65px;" oninput="window.calcCustomDf()">
          <label>Эмпирический χ²:</label>
          <input type="number" id="df-sim-emp" value="8.74" step="0.01" style="width:95px;" oninput="window.calcCustomDf()">
        </div>
        <div id="df-sim-result"></div>
      </div>

      <div class="card">
        <h3>🏋️ Тренажёр по степеням свободы (4 ситуации из вариантов)</h3>
        ${drillsHtml}
      </div>

      <div class="card">
        <h3>📋 Таблица критических значений χ² Пирсона (Приложение 4 учебника А. Д. Наследова)</h3>
        <table class="stat-table">
          <thead>
            <tr>
              <th>Степени свободы (df)</th>
              <th>Критическое χ² при p = 0,05 (стандарт)</th>
              <th>Критическое χ² при p = 0,01</th>
              <th>Где встречается в экзаменационных билетах</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  }

  window.answerTestOption = function(qIdx, optIdx) {
    const q = window.TEST_QUESTIONS_BANK[qIdx];
    const opt = q.options[optIdx];
    const fb = document.getElementById(`test-fb-${qIdx}`);
    q.options.forEach((_, i) => {
      const btn = document.getElementById(`test-btn-${qIdx}-${i}`);
      if (!btn) return;
      btn.classList.remove('correct', 'wrong');
      if (i === optIdx) {
        btn.classList.add(opt.isCorrect ? 'correct' : 'wrong');
      }
    });
    fb.className = 'feedback ' + (opt.isCorrect ? 'ok' : 'err');
    fb.innerHTML = `${opt.isCorrect ? '✅' : '❌'} ${opt.explain}`;
  };

  function renderTests() {
    let html = `
      <div class="card">
        <h2>📝 Тренажёр тестовых заданий (№10–13 из Варианта 1 и Варианта 3 + бонусные вопросы)</h2>
        <p style="color:var(--text-muted); font-size:0.9rem;">Нажимайте на любой вариант ответа — тренажёр сразу объяснит, почему этот пункт верный или в какой ловушке здесь ошибаются студенты.</p>
      </div>
    `;
    window.TEST_QUESTIONS_BANK.forEach((q, qIdx) => {
      let optsHtml = q.options.map((o, oIdx) => `
        <button id="test-btn-${qIdx}-${oIdx}" class="option-btn" onclick="window.answerTestOption(${qIdx}, ${oIdx})">
          ${o.text}
        </button>
      `).join('');
      html += `
        <div class="card">
          <span class="badge">${q.variants}</span>
          <h3 style="margin:8px 0;">${q.question}</h3>
          ${optsHtml}
          <div id="test-fb-${qIdx}" class="feedback"></div>
        </div>
      `;
    });
    return html;
  }

  function renderGlossary() {
    const keys = Object.keys(window.NASLEDOV_GLOSSARY);
    let cards = keys.map(k => {
      const item = window.NASLEDOV_GLOSSARY[k];
      return `
        <div class="card" style="margin-bottom:0;">
          <h3 style="color:var(--primary); margin-bottom:6px;">${item.title}</h3>
          <p style="font-size:0.9rem; margin-bottom:8px;"><strong>По учебнику А. Д. Наследова:</strong> ${item.academic}</p>
          <p style="font-size:0.88rem; color:#bae6fd; margin-bottom:8px;"><strong>Простыми словами:</strong> ${item.simple}</p>
          <code style="display:block; padding:6px 10px; background:#0f172a; border-radius:6px; color:#38bdf8; margin-bottom:8px;">${item.formula}</code>
          <p style="font-size:0.85rem; color:#fcd34d;"><strong>⚠️ Ловушка экзамена:</strong> ${item.trap}</p>
        </div>
      `;
    }).join('');

    return `
      <div class="card">
        <h2>📖 Интерактивный словарь статистических терминов (по учебнику А. Д. Наследова)</h2>
        <p style="color:var(--text-muted); font-size:0.9rem;">Все определения синхронизированы с программой курса и экзаменационными билетами Варианта 1 и Варианта 3.</p>
      </div>
      <div class="grid-2">${cards}</div>
    `;
  }

  function renderMain() {
    const root = document.getElementById('app-root');
    if (!root) return;
    if (currentTab === 'trainer') root.innerHTML = renderTrainer();
    else if (currentTab === 'compare') root.innerHTML = renderCompare();
    else if (currentTab === 'df_lab') {
      root.innerHTML = renderDfLab();
      window.calcCustomDf();
    }
    else if (currentTab === 'tests') root.innerHTML = renderTests();
    else if (currentTab === 'glossary') root.innerHTML = renderGlossary();
  }

  window.addEventListener('DOMContentLoaded', renderMain);
})();
