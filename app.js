
/** Day/night follows Asia/Hong_Kong clock: day 06:30–18:29, night otherwise. */
const THEME_STORAGE = 'hk-weather-theme-mode';

function hkParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  return { hour, minute, minutes: hour * 60 + minute };
}

function autoTheme() {
  const { minutes } = hkParts();
  // 06:30–18:29 day
  return minutes >= 6 * 60 + 30 && minutes < 18 * 60 + 30 ? 'day' : 'night';
}

function savedThemeMode() {
  const saved = localStorage.getItem(THEME_STORAGE);
  return saved === 'day' || saved === 'night' || saved === 'auto' ? saved : 'auto';
}

function applyTheme() {
  const mode = savedThemeMode();
  const theme = mode === 'auto' ? autoTheme() : mode;
  document.body.dataset.theme = theme;
  const toggle = $('themeToggle');
  if (toggle) {
    toggle.setAttribute('aria-label', theme === 'day' ? '轉做夜間' : '轉做日間');
  }
}

function initTheme() {
  const toggle = $('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.body.dataset.theme === 'night' ? 'night' : 'day';
      localStorage.setItem(THEME_STORAGE, current === 'day' ? 'night' : 'day');
      applyTheme();
    });
  }
  applyTheme();
  setInterval(() => {
    if (savedThemeMode() === 'auto') applyTheme();
  }, 60 * 1000);
}

const API = {
  rhr: 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc',
  fnd: 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=tc',
};

const REFRESH_MS = 12 * 60 * 1000;
const HKO_ICON = (n) => `https://www.hko.gov.hk/images/HKOWxIconOutline/pic${n}.png`;

const $ = (id) => document.getElementById(id);

function formatHk(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

function formatHkClock(date) {
  return new Intl.DateTimeFormat('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function formatDateKey(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || '—';
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function pickStation(list, name) {
  if (!Array.isArray(list)) return null;
  return list.find((x) => x.place === name) || list[0] || null;
}

function maxRain(rainfall) {
  const rows = rainfall?.data || [];
  let best = null;
  for (const r of rows) {
    const v = Number(r.max);
    if (!Number.isFinite(v)) continue;
    if (!best || v > best.max) best = { place: r.place, max: v };
  }
  return best;
}

function psrClass(psr) {
  if (psr === '高') return 'chip chip--high';
  if (psr === '中等') return 'chip chip--mid';
  return 'chip';
}

function setStatus(state, text) {
  const el = $('refreshBtn');
  el.dataset.state = state;
  $('statusText').textContent = text;
  el.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
}

function showError(msg) {
  const banner = $('errorBanner');
  banner.hidden = false;
  $('errorText').textContent = msg;
  setStatus('error', '更新失敗');
}

function clearError() {
  $('errorBanner').hidden = true;
}

function renderWarnings(rhr) {
  const strip = $('warningStrip');
  const list = $('warningList');
  list.innerHTML = '';
  let msgs = rhr.warningMessage;
  if (!msgs) {
    strip.hidden = true;
    return;
  }
  if (!Array.isArray(msgs)) msgs = [msgs];
  msgs = msgs.map((m) => String(m).trim()).filter(Boolean);
  if (!msgs.length) {
    strip.hidden = true;
    return;
  }
  strip.hidden = false;
  strip.classList.remove('warning-strip--calm');
  $('warningMeta').textContent = `${msgs.length} 則`;
  for (const m of msgs) {
    const li = document.createElement('li');
    li.className = 'warning-strip__item';
    li.textContent = m;
    list.appendChild(li);
  }
}

function renderCurrent(rhr, fnd) {
  const temps = rhr.temperature?.data || [];
  const hko = pickStation(temps, '香港天文台');
  const humid = pickStation(rhr.humidity?.data || [], '香港天文台');
  const uv = rhr.uvindex?.data?.[0];
  const rain = maxRain(rhr.rainfall);
  const icon = Array.isArray(rhr.icon) ? rhr.icon[0] : rhr.icon;
  const today = fnd.weatherForecast?.[0];

  $('currentStation').textContent = hko?.place || '香港天文台';
  $('currentTemp').textContent = hko?.value ?? '—';
  const img = $('currentIcon');
  if (icon != null) {
    img.src = HKO_ICON(icon);
    img.alt = `天氣圖示 ${icon}`;
  } else {
    img.removeAttribute('src');
    img.alt = '';
  }

  if (today) {
    $('todayRange').textContent = `${today.forecastMintemp.value}–${today.forecastMaxtemp.value} °C`;
  } else {
    $('todayRange').textContent = '—';
  }

  if (humid) {
    $('kpiHumidity').innerHTML = `${humid.value}<span class="kpi-cell__unit">%</span>`;
    $('kpiHumidityPlace').textContent = humid.place || '';
  }
  if (uv) {
    $('kpiUv').textContent = String(uv.value);
    $('kpiUvDesc').textContent = `${uv.desc || ''} · ${rhr.uvindex?.recordDesc || ''}`.trim();
  } else {
    $('kpiUv').textContent = '—';
    $('kpiUvDesc').textContent = '夜間或未有資料';
  }
  if (rain) {
    $('kpiRain').innerHTML = `${rain.max}<span class="kpi-cell__unit">mm</span>`;
    $('kpiRainPlace').textContent = rain.place;
  } else {
    $('kpiRain').innerHTML = `0<span class="kpi-cell__unit">mm</span>`;
    $('kpiRainPlace').textContent = '';
  }
  $('kpiUpdate').textContent = formatHk(rhr.updateTime);
  $('kpiIconTime').textContent = rhr.iconUpdateTime ? `圖示更新 ${formatHk(rhr.iconUpdateTime)}` : '';

  $('generalSituation').textContent = fnd.generalSituation || '（未有概況文字）';
  $('synopsisMeta').textContent = fnd.updateTime ? `預報更新 ${formatHk(fnd.updateTime)}` : '九天預報';

  const notes = $('specialNotes');
  const bits = [];
  if (fnd.seaTemp?.place) bits.push(`海水溫度（${fnd.seaTemp.place}）：${fnd.seaTemp.value}°${fnd.seaTemp.unit || 'C'}`);
  if (fnd.soilTemp?.length) {
    for (const s of fnd.soilTemp) bits.push(`土壤溫度（${s.place} ${s.depth?.value ?? ''}${s.depth?.unit || ''}）：${s.value}°${s.unit || 'C'}`);
  }
  if (bits.length) {
    notes.hidden = false;
    notes.innerHTML = bits.map((b) => `<p>${b}</p>`).join('');
  } else {
    notes.hidden = true;
    notes.innerHTML = '';
  }

  renderWarnings(rhr);
}

function renderForecast(fnd) {
  const ledger = $('fndLedger');
  ledger.querySelectorAll('.fnd-card:not(.fnd-card--head)').forEach((n) => n.remove());
  const days = fnd.weatherForecast || [];
  if (!days.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '未有九天預報資料';
    ledger.appendChild(empty);
    return;
  }
  const mins = days.map((d) => d.forecastMintemp.value);
  const maxs = days.map((d) => d.forecastMaxtemp.value);
  const gMin = Math.min(...mins);
  const gMax = Math.max(...maxs);
  const span = Math.max(gMax - gMin, 1);

  for (const d of days) {
    const card = document.createElement('article');
    card.className = 'fnd-card';
    const tMin = d.forecastMintemp.value;
    const tMax = d.forecastMaxtemp.value;
    const left = ((tMin - gMin) / span) * 100;
    const width = ((tMax - tMin) / span) * 100;
    const rh = `${d.forecastMinrh?.value ?? '—'}–${d.forecastMaxrh?.value ?? '—'}%`;
    card.innerHTML = `
      <div class="fnd-date">
        <span class="fnd-date__day num">${formatDateKey(d.forecastDate)}</span>
        <span class="fnd-date__week">${d.week || ''}</span>
      </div>
      <div class="wx-icon-frame wx-icon-frame--sm">
        <img src="${HKO_ICON(d.ForecastIcon)}" alt="" width="28" height="28" />
      </div>
      <p class="fnd-wx">${d.forecastWeather || ''}</p>
      <div class="temp-span" title="${tMin}–${tMax} °C">
        <span class="temp-span__min num">${tMin}°</span>
        <div class="temp-span__track" aria-hidden="true">
          <span class="temp-span__bar" style="left:${left}%;width:${Math.max(width, 4)}%"></span>
        </div>
        <span class="temp-span__max num">${tMax}°</span>
      </div>
      <span class="fnd-rh num">${rh}</span>
      <div class="fnd-psr"><span class="${psrClass(d.PSR)}">降雨概率 ${d.PSR || '—'}</span></div>
      <p class="fnd-wind">${d.forecastWind || ''}</p>
    `;
    ledger.appendChild(card);
  }
}

function renderStations(rhr) {
  const body = $('stationBody');
  const temps = [...(rhr.temperature?.data || [])];
  temps.sort((a, b) => a.place.localeCompare(b.place, 'zh-HK'));
  if (!temps.length) {
    body.innerHTML = '<tr><td colspan="2" class="empty-state">未有溫度資料</td></tr>';
    return;
  }
  const values = temps.map((t) => Number(t.value)).filter(Number.isFinite);
  const tMin = Math.min(...values);
  const tMax = Math.max(...values);
  const span = Math.max(tMax - tMin, 1);
  body.innerHTML = temps.map((t) => {
    const v = Number(t.value);
    const pct = Number.isFinite(v) ? ((v - tMin) / span) * 100 : 0;
    const primary = t.place === '香港天文台' ? 'true' : 'false';
    return `<tr data-primary="${primary}">
      <td>${t.place}</td>
      <td class="num">
        <div class="temp-bar-cell">
          <span class="mini-bar" aria-hidden="true"><span class="mini-bar__fill" style="width:${pct}%"></span></span>
          <span>${t.value}</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderRain(rhr) {
  const body = $('rainBody');
  const rows = [...(rhr.rainfall?.data || [])];
  if (rhr.rainfall?.startTime && rhr.rainfall?.endTime) {
    $('rainWindow').textContent = `${formatHk(rhr.rainfall.startTime)} – ${formatHk(rhr.rainfall.endTime)}`;
  }
  rows.sort((a, b) => Number(b.max) - Number(a.max));
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="2" class="empty-state">未有雨量資料</td></tr>';
    return;
  }
  body.innerHTML = rows.map((r) => `<tr>
    <td>${r.place}</td>
    <td class="num">${r.max}</td>
  </tr>`).join('');
}

let loading = false;

async function loadAll() {
  if (loading) return;
  loading = true;
  clearError();
  setStatus('loading', '更新緊…');
  $('refreshBtn').disabled = true;
  try {
    const [rhrRes, fndRes] = await Promise.all([fetch(API.rhr), fetch(API.fnd)]);
    if (!rhrRes.ok || !fndRes.ok) {
      throw new Error(`天文台 API 回應異常（rhr ${rhrRes.status} / fnd ${fndRes.status}）`);
    }
    const rhr = await rhrRes.json();
    const fnd = await fndRes.json();
    renderCurrent(rhr, fnd);
    renderForecast(fnd);
    renderStations(rhr);
    renderRain(rhr);
    setStatus('ok', `上次成功更新 ${formatHkClock(new Date())}`);
  } catch (err) {
    console.error(err);
    showError(`讀取香港天文台資料失敗：${err.message || err}。請檢查網絡後再試。`);
  } finally {
    loading = false;
    $('refreshBtn').disabled = false;
  }
}

initTheme();
$('refreshBtn').addEventListener('click', () => loadAll());
$('errorRetry').addEventListener('click', () => loadAll());
loadAll();
setInterval(loadAll, REFRESH_MS);


const VIEWS = ['now', 'forecast', 'districts'];

function showView(id, historyMode) {
  const view = VIEWS.includes(id) ? id : 'now';
  for (const name of VIEWS) {
    const section = $(name);
    if (section) section.hidden = name !== view;
  }
  document.querySelectorAll('.cat-nav__link').forEach((btn) => {
    const on = btn.getAttribute('data-view') === view;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const next = `#${view}`;
  if (historyMode === 'push' && location.hash !== next) history.pushState(null, '', next);
  if (historyMode === 'replace' && location.hash !== next) history.replaceState(null, '', next);
}

function setupCategoryNav() {
  const tabs = [...document.querySelectorAll('.cat-nav__link')];
  if (!tabs.length) return;
  const initial = location.hash.replace('#', '');
  showView(initial, VIEWS.includes(initial) ? 'none' : 'replace');
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      showView(btn.getAttribute('data-view'), 'push');
      window.scrollTo(0, 0);
    });
  });
  window.addEventListener('popstate', () => {
    showView(location.hash.replace('#', ''), 'none');
  });
}

setupCategoryNav();
