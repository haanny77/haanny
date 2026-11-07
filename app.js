'use strict';

/* ---------- 설정 ---------- */
const API = {
  geo: 'https://geocoding-api.open-meteo.com/v1/search',
  forecast: 'https://api.open-meteo.com/v1/forecast',
  air: 'https://air-quality-api.open-meteo.com/v1/air-quality',
};
const DEFAULT_PLACE = { name: '서울', detail: '대한민국', lat: 37.566, lon: 126.978 };
const STORE = { recents: 'weather.recents', place: 'weather.place', unit: 'weather.unit' };
const MAX_RECENTS = 5;
const TIMEOUT_MS = 12000;

/* 지오코더는 대도시를 '부산광역시' 같은 정식 명칭으로만 등록해 두어 '부산', '대구'로 검색하면
   동명의 작은 마을이 나오거나 결과가 없다. 그래서 주요 도시는 직접 찾아 맨 위에 보여준다.
   [이름, 시·도, 위도, 경도, 영문명] — 좌표는 Open-Meteo 지오코더 값 */
const KR_CITIES = [
  ['서울', '서울특별시', 37.566, 126.978, 'Seoul'],
  ['부산', '부산광역시', 35.102, 129.030, 'Busan'],
  ['대구', '대구광역시', 35.871, 128.601, 'Daegu'],
  ['인천', '인천광역시', 37.456, 126.705, 'Incheon'],
  ['광주', '전남광주통합특별시', 35.155, 126.916, 'Gwangju'],
  ['대전', '대전광역시', 36.350, 127.385, 'Daejeon'],
  ['울산', '울산광역시', 35.539, 129.312, 'Ulsan'],
  ['세종', '세종특별자치시', 36.592, 127.292, 'Sejong'],
  ['제주', '제주특별자치도', 33.510, 126.522, 'Jeju'],
  ['서귀포', '제주특별자치도', 33.253, 126.562, 'Seogwipo'],
  ['수원', '경기도', 37.278, 127.032, 'Suwon'],
  ['고양', '경기도', 37.656, 126.835, 'Goyang'],
  ['성남', '경기도', 37.439, 127.138, 'Seongnam'],
  ['부천', '경기도', 37.499, 126.783, 'Bucheon'],
  ['안산', '경기도', 37.324, 126.822, 'Ansan'],
  ['안양', '경기도', 37.393, 126.927, 'Anyang'],
  ['화성', '경기도', 37.207, 126.817, 'Hwaseong'],
  ['평택', '경기도', 36.995, 127.089, 'Pyeongtaek'],
  ['파주', '경기도', 37.761, 126.773, 'Paju'],
  ['김포', '경기도', 37.624, 126.714, 'Gimpo'],
  ['남양주', '경기도', 37.637, 127.214, 'Namyangju'],
  ['의정부', '경기도', 37.742, 127.047, 'Uijeongbu'],
  ['용인', '경기도', 37.297, 127.080, 'Yongin'],
  ['춘천', '강원특별자치도', 37.883, 127.729, 'Chuncheon'],
  ['원주', '강원특별자치도', 37.351, 127.945, 'Wonju'],
  ['강릉', '강원특별자치도', 37.753, 128.872, 'Gangneung'],
  ['속초', '강원특별자치도', 38.207, 128.592, 'Sokcho'],
  ['청주', '충청북도', 36.637, 127.490, 'Cheongju'],
  ['충주', '충청북도', 36.977, 127.929, 'Chungju'],
  ['천안', '충청남도', 36.807, 127.152, 'Cheonan'],
  ['아산', '충청남도', 36.784, 127.004, 'Asan'],
  ['전주', '전북특별자치도', 35.825, 127.148, 'Jeonju'],
  ['군산', '전북특별자치도', 35.979, 126.711, 'Gunsan'],
  ['익산', '전북특별자치도', 35.944, 126.954, 'Iksan'],
  ['목포', '전남광주통합특별시', 34.813, 126.392, 'Mokpo'],
  ['여수', '전남광주통합특별시', 34.761, 127.662, 'Yeosu'],
  ['순천', '전남광주통합특별시', 34.951, 127.488, 'Suncheon'],
  ['포항', '경상북도', 36.029, 129.365, 'Pohang'],
  ['경주', '경상북도', 35.843, 129.212, 'Gyeongju'],
  ['구미', '경상북도', 36.114, 128.336, 'Gumi'],
  ['안동', '경상북도', 36.568, 128.730, 'Andong'],
  ['창원', '경상남도', 35.228, 128.681, 'Changwon'],
  ['김해', '경상남도', 35.234, 128.881, 'Gimhae'],
  ['진주', '경상남도', 35.193, 128.085, 'Jinju'],
  ['거제', '경상남도', 34.814, 128.706, 'Geoje'],
  ['통영', '경상남도', 34.850, 128.428, 'Tongyeong'],
  ['양산', '경상남도', 35.342, 129.034, 'Yangsan'],
];

/* WMO 날씨 코드 → 설명, 아이콘, 배경 */
const WMO = {
  0: ['맑음', 'clear', 'clear'],
  1: ['대체로 맑음', 'clear', 'clear'],
  2: ['구름 조금', 'partly', 'cloud'],
  3: ['흐림', 'cloudy', 'cloud'],
  45: ['안개', 'fog', 'fog'],
  48: ['서리 안개', 'fog', 'fog'],
  51: ['약한 이슬비', 'rain', 'rain'],
  53: ['이슬비', 'rain', 'rain'],
  55: ['강한 이슬비', 'rain', 'rain'],
  56: ['어는 이슬비', 'rain', 'rain'],
  57: ['강한 어는 이슬비', 'rain', 'rain'],
  61: ['약한 비', 'rain', 'rain'],
  63: ['비', 'rain', 'rain'],
  65: ['강한 비', 'rain', 'rain'],
  66: ['어는 비', 'rain', 'rain'],
  67: ['강한 어는 비', 'rain', 'rain'],
  71: ['약한 눈', 'snow', 'snow'],
  73: ['눈', 'snow', 'snow'],
  75: ['강한 눈', 'snow', 'snow'],
  77: ['싸락눈', 'snow', 'snow'],
  80: ['약한 소나기', 'rain', 'rain'],
  81: ['소나기', 'rain', 'rain'],
  82: ['강한 소나기', 'rain', 'rain'],
  85: ['약한 소낙눈', 'snow', 'snow'],
  86: ['강한 소낙눈', 'snow', 'snow'],
  95: ['뇌우', 'storm', 'storm'],
  96: ['우박 동반 뇌우', 'storm', 'storm'],
  99: ['강한 우박 동반 뇌우', 'storm', 'storm'],
};
const wmo = (code) => WMO[code] || ['알 수 없음', 'cloudy', 'cloud'];

/* ---------- 요소 ---------- */
const $ = (id) => document.getElementById(id);
const els = {
  form: $('search-form'), input: $('search-input'), results: $('search-results'),
  locate: $('locate-btn'), unit: $('unit-btn'), recents: $('recents'),
  banner: $('banner'), bannerText: $('banner-text'), bannerRetry: $('banner-retry'),
  content: $('content'),
};

/* ---------- 상태 ---------- */
const state = {
  place: null,
  forecast: null,
  air: null,
  unit: load(STORE.unit, 'C') === 'F' ? 'F' : 'C',
  recents: load(STORE.recents, []),
  loadToken: 0,
  searchResults: [],
  activeIndex: -1,
};
if (!Array.isArray(state.recents)) state.recents = [];

/* ---------- 저장소: 비공개 창 등에서 실패해도 앱은 계속 동작 ---------- */
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 생략 */ }
}

/* ---------- 유틸 ---------- */
function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

const inUnit = (celsius) => (state.unit === 'F' ? celsius * 9 / 5 + 32 : celsius);
const roundedTemp = (celsius) => Math.round(inUnit(celsius)) + 0;

function temp(celsius) {
  return isNum(celsius) ? `${roundedTemp(celsius)}°` : '–';
}

function hourLabel(hour) {
  const period = hour < 12 ? '오전' : '오후';
  return `${period} ${hour % 12 === 0 ? 12 : hour % 12}시`;
}

/* API 시간은 해당 도시의 현지 시각 문자열이므로 Date로 변환하지 않고 그대로 읽는다 */
const hourOf = (iso) => Number(iso.slice(11, 13));
const clock = (iso) => {
  const h = hourOf(iso);
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${iso.slice(14, 16)}`;
};

function dayLabel(dateStr, index) {
  if (index === 0) return '오늘';
  if (index === 1) return '내일';
  const [y, m, d] = dateStr.split('-').map(Number);
  return ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()] + '요일';
}

function windDirection(deg) {
  if (!isNum(deg)) return '';
  const names = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  return names[Math.round(deg / 45) % 8];
}

function uvLevel(uv) {
  if (uv < 3) return ['낮음', 0];
  if (uv < 6) return ['보통', 1];
  if (uv < 8) return ['높음', 2];
  if (uv < 11) return ['매우 높음', 3];
  return ['위험', 3];
}

/* 환경부 예보 등급 기준 */
function pmLevel(value, limits) {
  if (value <= limits[0]) return ['좋음', 0];
  if (value <= limits[1]) return ['보통', 1];
  if (value <= limits[2]) return ['나쁨', 2];
  return ['매우 나쁨', 3];
}
const PM10_LIMITS = [30, 80, 150];
const PM25_LIMITS = [15, 35, 75];

async function getJSON(url, params) {
  const query = new URLSearchParams(params);
  const res = await fetch(`${url}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---------- 아이콘 ---------- */
const CLOUD_PATH = 'M19 50h27a11 11 0 0 0 2-21.8A15.5 15.5 0 0 0 18.3 26.5 12 12 0 0 0 19 50z';

function sunShape(cx, cy, r) {
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x = (t) => (cx + Math.cos(a) * t).toFixed(1);
    const y = (t) => (cy + Math.sin(a) * t).toFixed(1);
    rays.push(`<line class="sun-ray" x1="${x(r + 5)}" y1="${y(r + 5)}" x2="${x(r + 10)}" y2="${y(r + 10)}"/>`);
  }
  return `<circle class="sun" cx="${cx}" cy="${cy}" r="${r}"/>${rays.join('')}`;
}

function icon(code, isDay, cls = 'wx') {
  const kind = wmo(code)[1];
  const cloudUp = (extra = '') => `<path class="cloud ${extra}" transform="translate(0 -10)" d="${CLOUD_PATH}"/>`;
  let body;
  switch (kind) {
    case 'clear':
      body = isDay
        ? sunShape(32, 32, 12)
        : '<path class="moon" d="M46 41A20 20 0 0 1 25 13a21 21 0 1 0 21 28z"/>';
      break;
    case 'partly':
      body = (isDay
        ? sunShape(42, 21, 8)
        : '<path class="moon" d="M54 25A12 12 0 0 1 41 9a13 13 0 1 0 13 16z"/>')
        + `<path class="cloud" transform="translate(-3 4)" d="${CLOUD_PATH}"/>`;
      break;
    case 'cloudy':
      body = `<path class="cloud dark" transform="translate(7 -7) scale(.85)" d="${CLOUD_PATH}"/>`
        + `<path class="cloud" transform="translate(-3 5)" d="${CLOUD_PATH}"/>`;
      break;
    case 'fog':
      body = cloudUp() + '<path class="haze" d="M12 48h40M18 56h28"/>';
      break;
    case 'rain':
      body = cloudUp() + '<path class="drop" d="M22 46l-3 9M33 46l-3 9M44 46l-3 9"/>';
      break;
    case 'snow':
      body = cloudUp() + '<circle class="flake" cx="20" cy="49" r="3"/><circle class="flake" cx="32" cy="55" r="3"/><circle class="flake" cx="44" cy="49" r="3"/>';
      break;
    default:
      body = cloudUp('dark') + '<path class="bolt" d="M35 36 24 51h8l-3 11 12-16h-8l4-10z"/>';
  }
  return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
}

/* ---------- 렌더링 ---------- */
function render() {
  const { place, forecast: f, air } = state;
  if (!f) return;
  const c = f.current;
  const [condition, , sky] = wmo(c.weather_code);
  document.body.dataset.sky = sky;
  document.body.dataset.night = String(!c.is_day);
  document.title = `${place.name} ${temp(c.temperature_2m)} ${condition}`;

  const startIndex = Math.max(0, f.hourly.time.findIndex((t) => t.slice(0, 13) === c.time.slice(0, 13)));
  const cmp = buildComparison(f);
  const ti = cmp.todayIndex;

  els.content.innerHTML = `
    <section class="hero">
      <div>
        <h1 class="hero-place">${esc(place.name)}</h1>
        <p class="hero-sub">${esc(place.detail || '')}${place.detail ? ' · ' : ''}현지 시각 ${clock(c.time)} 기준</p>
        <p class="hero-temp">${temp(c.temperature_2m)}</p>
        <p class="hero-cond">${condition}</p>
        <p class="hero-range">최고 ${temp(f.daily.temperature_2m_max[ti])} · 최저 ${temp(f.daily.temperature_2m_min[ti])} · 체감 ${temp(c.apparent_temperature)}</p>
        ${heroYesterday(c.temperature_2m, cmp.yesterdayNow)}
      </div>
      ${icon(c.weather_code, c.is_day, 'wx hero-icon')}
    </section>
    <div class="grid">
      <section class="card wide">
        <h2>시간별 예보</h2>
        <ol class="hours" tabindex="0" aria-label="앞으로 24시간 예보">${renderHours(f, startIndex)}</ol>
      </section>
      ${renderCompare(f, cmp)}
      <section class="card">
        <h2>7일 예보</h2>
        <ol class="days">${renderDays(f, ti)}</ol>
      </section>
      <section class="tiles" aria-label="상세 정보">${renderTiles(f, air, startIndex, ti)}</section>
    </div>`;
  els.content.setAttribute('aria-busy', 'false');
  mountChart(cmp);
  renderRecents();
}

/* ---------- 어제와 비교 ---------- */
function buildComparison(f) {
  const c = f.current;
  const today = c.time.slice(0, 10);
  const todayIndex = Math.max(0, f.daily.time.indexOf(today));
  const yesterday = todayIndex > 0 ? f.daily.time[todayIndex - 1] : null;
  // 현지 시각 문자열로 찾는다. 인덱스에서 24를 빼면 서머타임 전환일에 어긋난다
  const lookup = new Map(f.hourly.time.map((t, i) => [t, i]));
  const at = (date, key, hour) => {
    const i = lookup.get(`${date}T${String(hour).padStart(2, '0')}:00`);
    return i === undefined ? null : f.hourly[key][i];
  };
  const series = (date) => Array.from({ length: 24 }, (_, h) => (date ? at(date, 'temperature_2m', h) : null));
  const hour = hourOf(c.time);
  const minute = Number(c.time.slice(14, 16));
  // 현재 값은 15분 단위이므로 어제 값도 같은 분까지 보간해야 아침·저녁에 차이가 부풀지 않는다
  const interpolate = (date, key) => {
    if (!date) return null;
    const a = at(date, key, hour);
    const b = hour < 23 ? at(date, key, hour + 1) : null;
    return isNum(a) && isNum(b) ? a + (b - a) * (minute / 60) : a;
  };
  return {
    todayIndex,
    hasYesterday: todayIndex > 0,
    todaySeries: series(today),
    yesterdaySeries: series(yesterday),
    nowHour: hour + minute / 60,
    nowOnLine: interpolate(today, 'temperature_2m'),
    yesterdayNow: interpolate(yesterday, 'temperature_2m'),
    yesterdayFeels: interpolate(yesterday, 'apparent_temperature'),
  };
}

/* 표에 보이는 반올림 값끼리 빼서, 7°와 5°의 차이가 3°로 보이는 일이 없게 한다 */
function tempDelta(today, yesterday) {
  return isNum(today) && isNum(yesterday) ? roundedTemp(today) - roundedTemp(yesterday) : null;
}

function heroYesterday(now, yesterdayNow) {
  const d = tempDelta(now, yesterdayNow);
  if (d === null) return '';
  const text = d === 0 ? '어제 이 시각과 비슷해요' : `어제 이 시각보다 ${Math.abs(d)}° ${d > 0 ? '높아요' : '낮아요'}`;
  return `<p class="hero-yesterday">${text}</p>`;
}

function deltaCell(d, unit, up, down, same) {
  if (d === null) return '–';
  if (d === 0) return same;
  return `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${unit} ${d > 0 ? up : down}`;
}

function renderCompare(f, cmp) {
  if (!cmp.hasYesterday) return '';
  const c = f.current;
  const d = f.daily;
  const ti = cmp.todayIndex;
  const yi = ti - 1;
  const tempRow = (label, yesterday, today) => `<tr><th scope="row">${label}</th><td>${temp(yesterday)}</td><td>${temp(today)}</td>
    <td>${deltaCell(tempDelta(today, yesterday), '°', '높음', '낮음', '비슷')}</td></tr>`;
  const rainY = d.precipitation_sum[yi];
  const rainT = d.precipitation_sum[ti];
  const rainDelta = isNum(rainY) && isNum(rainT) ? Number((rainT - rainY).toFixed(1)) : null;
  const mm = (v) => (isNum(v) ? `${v}mm` : '–');
  return `
    <section class="card wide" aria-labelledby="compare-title">
      <h2 id="compare-title">어제와 비교</h2>
      <div class="compare">
        <div>
          <div class="legend">
            <span><svg viewBox="0 0 24 8" aria-hidden="true"><line x1="0" y1="4" x2="24" y2="4"/></svg>오늘 (지금 이후는 예보)</span>
            <span><svg viewBox="0 0 24 8" aria-hidden="true"><line class="yesterday" x1="0" y1="4" x2="24" y2="4"/></svg>어제</span>
          </div>
          <div class="chart" id="compare-chart"></div>
        </div>
        <table class="cmp">
          <caption class="sr-only">어제와 오늘의 날씨 비교</caption>
          <thead><tr><th scope="col"><span class="sr-only">항목</span></th><th scope="col">어제</th><th scope="col">오늘</th><th scope="col">차이</th></tr></thead>
          <tbody>
            ${tempRow('이 시각 기온', cmp.yesterdayNow, c.temperature_2m)}
            ${tempRow('이 시각 체감', cmp.yesterdayFeels, c.apparent_temperature)}
            ${tempRow('최고 기온', d.temperature_2m_max[yi], d.temperature_2m_max[ti])}
            ${tempRow('최저 기온', d.temperature_2m_min[yi], d.temperature_2m_min[ti])}
            <tr><th scope="row">강수량</th><td>${mm(rainY)}</td><td>${mm(rainT)}</td>
              <td>${deltaCell(rainDelta, 'mm', '많음', '적음', '같음')}</td></tr>
            <tr><th scope="row">날씨</th><td>${wmo(d.weather_code[yi])[0]}</td><td>${wmo(d.weather_code[ti])[0]}</td><td></td></tr>
          </tbody>
        </table>
      </div>
      <p class="cmp-note">어제 값은 측정소 관측이 아닌 기상 모델 값입니다. 오늘의 최고·최저·강수량에는 남은 시간의 예보가 포함됩니다.</p>
    </section>`;
}

let chartObserver = null;

function mountChart(cmp) {
  chartObserver?.disconnect();
  chartObserver = null;
  const el = $('compare-chart');
  if (!el) return;
  let drawnWidth = 0;
  const draw = () => {
    const width = el.clientWidth;
    if (!width || width === drawnWidth) return;
    drawnWidth = width;
    drawChart(el, cmp, width);
  };
  draw();
  chartObserver = new ResizeObserver(draw);
  chartObserver.observe(el);
}

function drawChart(el, cmp, W) {
  const H = 196;
  const m = { l: 30, r: 36, t: 22, b: 24 };
  const today = cmp.todaySeries.map((v) => (isNum(v) ? inUnit(v) : null));
  const yesterday = cmp.yesterdaySeries.map((v) => (isNum(v) ? inUnit(v) : null));
  const values = [...today, ...yesterday].filter(isNum);
  if (!values.length) { el.innerHTML = ''; return; }
  const low = Math.min(...values);
  const high = Math.max(...values);
  const step = high - low <= 8 ? 2 : high - low <= 20 ? 5 : 10;
  const yMin = Math.floor(low / step) * step;
  const yMax = Math.max(Math.ceil(high / step) * step, yMin + step);
  const x = (h) => m.l + (h / 23) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - (v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
  const path = (s) => {
    let d = '';
    let pen = false;
    s.forEach((v, h) => {
      if (!isNum(v)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(h).toFixed(1)} ${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  let grid = '';
  for (let v = yMin; v <= yMax; v += step) {
    grid += `<line class="grid-line" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`
      + `<text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v + 0}°</text>`;
  }
  const xTicks = [0, 6, 12, 18, 23].map((h) => `<text x="${x(h)}" y="${H - 6}" text-anchor="middle">${h}시</text>`).join('');

  // 선 끝 이름표: 두 값이 가까우면 겹치지 않게 위아래로 벌린다
  const lastOf = (s) => { for (let h = 23; h >= 0; h--) if (isNum(s[h])) return { h, v: s[h] }; return null; };
  const endT = lastOf(today);
  const endY = lastOf(yesterday);
  let labelT = endT ? y(endT.v) + 4 : 0;
  let labelY = endY ? y(endY.v) + 4 : 0;
  if (endT && endY && Math.abs(labelT - labelY) < 14) {
    const mid = (labelT + labelY) / 2;
    const todayAbove = endT.v >= endY.v;
    labelT = mid + (todayAbove ? -7 : 7);
    labelY = mid + (todayAbove ? 7 : -7);
  }
  const endLabels = (endT ? `<text class="end-label" x="${W - m.r + 6}" y="${labelT}">오늘</text>` : '')
    + (endY ? `<text class="end-label" x="${W - m.r + 6}" y="${labelY}">어제</text>` : '');

  const nowInUnit = isNum(cmp.nowOnLine) ? inUnit(cmp.nowOnLine) : null;
  const nowX = x(Math.min(cmp.nowHour, 23));
  let nowMark = '';
  if (nowInUnit !== null) {
    const dotCy = y(nowInUnit);
    // 어제 선이 바로 위에 지나가면 이름표를 점 아래로 내린다
    const yesterdayCy = isNum(cmp.yesterdayNow) ? y(inUnit(cmp.yesterdayNow)) : null;
    const blockedAbove = yesterdayCy !== null && yesterdayCy < dotCy && dotCy - yesterdayCy < 28;
    const labelCy = blockedAbove ? dotCy + 20 : Math.max(12, dotCy - 10);
    nowMark = `<circle class="now-dot" r="5" cx="${nowX}" cy="${dotCy}"/>`
      + `<text class="end-label" x="${nowX}" y="${labelCy}" text-anchor="middle">지금</text>`;
  }

  el.innerHTML = `<svg class="plot" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="오늘과 어제의 시간별 기온 그래프. 주요 값은 옆의 비교 표에 있습니다.">
      ${grid}${xTicks}
      <path class="line yesterday" d="${path(yesterday)}"/>
      <path class="line" d="${path(today)}"/>
      ${nowMark}${endLabels}
      <g class="hover" visibility="hidden">
        <line class="cross" y1="${m.t}" y2="${H - m.b}"/>
        <circle class="now-dot" r="4" data-s="t"/><circle class="now-dot" r="4" data-s="y"/>
      </g>
      <rect class="hit" x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}"/>
    </svg><div class="tip" hidden></div>`;

  const hover = el.querySelector('.hover');
  const cross = el.querySelector('.cross');
  const dotT = el.querySelector('[data-s="t"]');
  const dotY = el.querySelector('[data-s="y"]');
  const tip = el.querySelector('.tip');
  const placeDot = (dot, h, v) => {
    dot.setAttribute('visibility', isNum(v) ? 'inherit' : 'hidden');
    if (isNum(v)) { dot.setAttribute('cx', x(h)); dot.setAttribute('cy', y(v)); }
  };
  const hit = el.querySelector('.hit');
  hit.addEventListener('pointermove', (e) => {
    const box = el.getBoundingClientRect();
    const h = Math.max(0, Math.min(23, Math.round(((e.clientX - box.left - m.l) / (W - m.l - m.r)) * 23)));
    hover.setAttribute('visibility', 'visible');
    cross.setAttribute('x1', x(h));
    cross.setAttribute('x2', x(h));
    placeDot(dotT, h, today[h]);
    placeDot(dotY, h, yesterday[h]);
    tip.hidden = false;
    tip.innerHTML = `<b>${hourLabel(h)}</b>오늘 ${temp(cmp.todaySeries[h])} · 어제 ${temp(cmp.yesterdaySeries[h])}`;
    const w = tip.offsetWidth;
    tip.style.left = `${Math.max(0, Math.min(W - w, x(h) - w / 2))}px`;
  });
  hit.addEventListener('pointerleave', () => {
    hover.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  });
}

function renderHours(f, start) {
  const h = f.hourly;
  const items = [];
  const end = Math.min(start + 24, h.time.length);
  for (let i = start; i < end; i++) {
    const isNow = i === start;
    const hour = hourOf(h.time[i]);
    const label = isNow ? '지금' : hour === 0 ? '내일' : hourLabel(hour);
    const value = isNow ? f.current.temperature_2m : h.temperature_2m[i];
    const code = isNow ? f.current.weather_code : h.weather_code[i];
    const day = isNow ? f.current.is_day : h.is_day[i];
    const pop = h.precipitation_probability[i];
    // 강수 확률은 의미 있는 값일 때만 표시해 시간대 줄이 복잡해지지 않게 한다
    const popText = isNum(pop) && pop >= 20 ? `${pop}%` : '';
    const name = isNow ? '지금' : hourLabel(hour);
    items.push(`<li class="${isNow ? 'now' : ''}" aria-label="${name}, ${wmo(code)[0]}, ${temp(value)}${popText ? `, 강수 확률 ${popText}` : ''}">
      <div class="h-time">${label}</div>
      ${icon(code, day)}
      <div class="h-temp">${temp(value)}</div>
      <div class="h-pop">${popText}</div>
    </li>`);
  }
  return items.join('');
}

function renderDays(f, todayIndex) {
  const d = f.daily;
  const lows = d.temperature_2m_min.slice(todayIndex).filter(isNum);
  const highs = d.temperature_2m_max.slice(todayIndex).filter(isNum);
  const weekMin = Math.min(...lows);
  const span = Math.max(Math.max(...highs) - weekMin, 1);
  return d.time.slice(todayIndex).map((date, offset) => {
    const i = offset + todayIndex;
    const lo = d.temperature_2m_min[i];
    const hi = d.temperature_2m_max[i];
    const left = ((lo - weekMin) / span) * 100;
    const width = ((hi - lo) / span) * 100;
    const pop = d.precipitation_probability_max[i];
    const popText = isNum(pop) && pop >= 20 ? `${pop}%` : '';
    const name = dayLabel(date, offset);
    const [cond] = wmo(d.weather_code[i]);
    const tip = `${name}: ${cond}, 최저 ${temp(lo)}, 최고 ${temp(hi)}${popText ? `, 강수 확률 ${popText}` : ''}`;
    return `<li title="${tip}">
      <span class="d-name">${offset < 2 ? name : name.charAt(0)}</span>
      ${icon(d.weather_code[i], 1)}
      <span class="d-pop">${popText}</span>
      <span class="d-t d-min"><span class="sr-only">최저 </span>${temp(lo)}</span>
      <div class="track" aria-hidden="true"><span style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></span></div>
      <span class="d-t"><span class="sr-only">최고 </span>${temp(hi)}</span>
    </li>`;
  }).join('');
}

function tile(title, value, unit, note = '') {
  return `<article class="tile"><h3>${title}</h3>
    <p class="v">${value}${unit ? `<small>${unit}</small>` : ''}</p>
    ${note ? `<p class="note">${note}</p>` : ''}</article>`;
}
function levelNote([text, level]) {
  return `<span class="level" data-lv="${level}">${text}</span>`;
}
function pmTile(title, value, limits) {
  return isNum(value)
    ? tile(title, Math.round(value), '㎍/㎥', levelNote(pmLevel(value, limits)))
    : tile(title, '–', '', '정보 없음');
}

function renderTiles(f, air, start, todayIndex) {
  const c = f.current;
  const uv = f.hourly.uv_index[start];
  const dir = windDirection(c.wind_direction_10m);
  return [
    pmTile('미세먼지', air?.pm10, PM10_LIMITS),
    pmTile('초미세먼지', air?.pm2_5, PM25_LIMITS),
    isNum(uv) ? tile('자외선 지수', Math.round(uv), '', levelNote(uvLevel(uv))) : tile('자외선 지수', '–', '', '정보 없음'),
    tile('습도', c.relative_humidity_2m, '%'),
    tile('바람', c.wind_speed_10m.toFixed(1), 'm/s', dir ? `${dir}풍` : ''),
    tile('기압', Math.round(c.surface_pressure), 'hPa'),
    tile('강수량', c.precipitation, 'mm', '현재'),
    tile('일출', clock(f.daily.sunrise[todayIndex]), '', `일몰 ${clock(f.daily.sunset[todayIndex])}`),
  ].join('');
}

function renderRecents() {
  els.recents.hidden = state.recents.length === 0;
  els.recents.innerHTML = state.recents.map((p, i) => {
    const current = state.place && samePlace(p, state.place);
    return `<button type="button" class="chip" data-index="${i}" aria-current="${current ? 'true' : 'false'}">${esc(p.name)}</button>`;
  }).join('');
}

function samePlace(a, b) {
  return Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;
}

function showBanner(message, retry) {
  els.bannerText.textContent = message;
  els.bannerRetry.hidden = !retry;
  els.bannerRetry.onclick = retry || null;
  els.banner.hidden = false;
}
const hideBanner = () => { els.banner.hidden = true; };

/* ---------- 데이터 ---------- */
function fetchForecast({ lat, lon }) {
  return getJSON(API.forecast, {
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,is_day,uv_index',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    past_days: 1, // 어제와 비교용. 시간별·일별 배열이 어제부터 시작한다
    forecast_days: 7,
  });
}

function fetchAir({ lat, lon }) {
  return getJSON(API.air, { latitude: lat, longitude: lon, current: 'pm10,pm2_5', timezone: 'auto' })
    .then((data) => data.current)
    // 미세먼지만 실패하면 해당 칸만 '정보 없음'으로 표시한다
    .catch(() => null);
}

async function showPlace(place, { remember = true } = {}) {
  const token = ++state.loadToken;
  els.content.setAttribute('aria-busy', 'true');
  hideBanner();
  try {
    const [forecast, air] = await Promise.all([fetchForecast(place), fetchAir(place)]);
    if (token !== state.loadToken) return; // 그 사이 다른 도시를 선택한 경우 이전 응답은 버린다
    Object.assign(state, { place, forecast, air });
    save(STORE.place, place);
    if (remember) addRecent(place);
    render();
  } catch (err) {
    if (token !== state.loadToken) return;
    console.error(err);
    els.content.setAttribute('aria-busy', 'false');
    const loading = $('loading');
    if (loading) loading.textContent = '';
    showBanner(`${place.name} 날씨를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.`, () => showPlace(place, { remember }));
  }
}

function addRecent(place) {
  const others = state.recents.filter((p) => !samePlace(p, place));
  state.recents = [place, ...others].slice(0, MAX_RECENTS);
  save(STORE.recents, state.recents);
}

/* ---------- 검색 ---------- */
let searchTimer = 0;
let searchAbort = null;
let searchSeq = 0;

const MAX_RESULTS = 8;
const CITY_SUFFIXES = ['', '시', '광역시', '특별시', '특별자치시', '특별자치도', '도'];

function matchKoreanCities(query) {
  const q = query.replace(/\s+/g, '').toLowerCase();
  return KR_CITIES
    // '거제면', '대구면' 같은 면 이름이 거제시·대구시로 잡히지 않도록 긴 입력은 정해진 접미사만 허용한다
    .filter(([name, , , , en]) => name.startsWith(q)
      || CITY_SUFFIXES.some((suffix) => q === name + suffix)
      || en.toLowerCase().startsWith(q))
    .map(([name, region, lat, lon]) => ({ name, detail: `${region}, 대한민국`, lat, lon }));
}

/* 시·도 약칭과 옛 이름으로도 찾을 수 있게 검색 경로에 함께 넣는다 */
const SIDO_ALIASES = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 대전광역시: '대전',
  울산광역시: '울산', 세종특별자치시: '세종', 경기도: '경기', 강원특별자치도: '강원 강원도',
  충청북도: '충북', 충청남도: '충남', 전북특별자치도: '전북 전라북도',
  전남광주통합특별시: '전남 전라남도 광주 광주광역시', 경상북도: '경북', 경상남도: '경남',
  제주특별자치도: '제주 제주도',
};

const REGION_INDEX = (() => {
  const rows = typeof KR_REGIONS === 'undefined' ? [] : KR_REGIONS;
  const label = (sgg) => sgg.replace(/^(.+시)(.+구)$/, '$1 $2'); // 수원시장안구 → 수원시 장안구
  const groups = new Map();
  const dongs = rows.map(([sido, sgg, dong, lat, lon]) => {
    const groupKey = `${sido}|${sgg}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { sido, sgg, lat: 0, lon: 0, n: 0 });
    const g = groups.get(groupKey);
    g.lat += lat; g.lon += lon; g.n += 1;
    return {
      kind: 'dong',
      name: dong,
      key: dong.replace(/제?\d+(?:[.,·]\d+)*/g, ''), // 삼성1동 → 삼성동, 구로제1동 → 구로동
      path: `${sido} ${SIDO_ALIASES[sido] || ''} ${sgg}`,
      detail: `${sido} ${label(sgg)}`,
      lat,
      lon,
    };
  });
  const sggs = [...groups.values()]
    .filter((g) => g.sgg && g.sgg !== '세종시')
    .map((g) => ({
      kind: 'sgg',
      name: label(g.sgg),
      key: g.sgg,
      path: `${g.sido} ${SIDO_ALIASES[g.sido] || ''} ${g.sgg}`,
      detail: g.sido,
      lat: Number((g.lat / g.n).toFixed(3)),
      lon: Number((g.lon / g.n).toFixed(3)),
    }));
  return [...sggs, ...dongs];
})();

function matchRegions(query) {
  const tokens = query.trim().split(/\s+/);
  const last = tokens[tokens.length - 1];
  const parents = tokens.slice(0, -1);
  const scored = [];
  for (const r of REGION_INDEX) {
    if (!parents.every((t) => r.path.includes(t))) continue;
    let rank = -1;
    if (r.kind === 'dong') {
      if (r.name === last || r.key === last) rank = 1;
      else if (r.name.startsWith(last) || r.key.startsWith(last)) rank = 3;
    } else if (r.key === last || ['시', '군', '구'].some((s) => r.key === last + s)) {
      rank = 0;
    } else if (r.key.includes(last)) {
      rank = 2;
    }
    if (rank >= 0) scored.push({ rank, r });
  }
  // sort는 안정 정렬이므로 같은 순위끼리는 데이터 순서(시·도별)를 유지한다
  return scored.sort((a, b) => a.rank - b.rank).map(({ r }) => r);
}

const isNear = (a, b, deg) => Math.abs(a.lat - b.lat) < deg && Math.abs(a.lon - b.lon) < deg;

/* 내장 데이터만으로 찾는 결과. 네트워크를 기다리지 않는다 */
function localSearch(query) {
  const cities = matchKoreanCities(query);
  const regions = matchRegions(query)
    // 제주시 같은 시 단위 항목이 주요 도시 목록과 겹치면 하나만 남긴다
    .filter((r) => !(r.kind === 'sgg' && cities.some((c) => r.key === `${c.name}시` && isNear(c, r, 0.2))));
  const all = [...cities, ...regions.map(({ name, detail, lat, lon }) => ({ name, detail, lat, lon }))];
  return { items: all.slice(0, MAX_RESULTS), hidden: Math.max(0, all.length - MAX_RESULTS) };
}

async function fetchRemotePlaces(query) {
  const params = new URLSearchParams({ name: query, count: 10, language: 'ko', format: 'json' });
  const res = await fetch(`${API.geo}?${params}`, {
    signal: AbortSignal.any([searchAbort.signal, AbortSignal.timeout(TIMEOUT_MS)]),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || [])
    .slice()
    .sort((a, b) => (b.population || 0) - (a.population || 0))
    .map((r) => ({
      name: r.name,
      detail: [r.admin1, r.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i && v !== r.name).join(', '),
      lat: r.latitude,
      lon: r.longitude,
      population: r.population || 0,
    }));
}

async function searchCities(query) {
  searchAbort?.abort();
  searchAbort = new AbortController();
  const { items: local } = localSearch(query);
  let remote = [];
  try {
    remote = await fetchRemotePlaces(query);
  } catch (err) {
    // 내장 데이터에서 찾은 곳이 있으면 Open-Meteo 검색이 실패해도 그대로 보여준다
    if (err.name === 'AbortError' || !local.length) throw err;
  }
  // 내장 결과가 있으면 지오코더의 인구 정보 없는 항목(동명의 산·작은 마을)은 혼란만 주므로 뺀다
  const extra = remote
    .filter((r) => !local.length || r.population > 0)
    .filter((r) => !local.some((c) => isNear(c, r, 0.1)));
  return [...local, ...extra].slice(0, MAX_RESULTS);
}

function closeResults() {
  els.results.hidden = true;
  els.results.innerHTML = '';
  els.input.setAttribute('aria-expanded', 'false');
  els.input.removeAttribute('aria-activedescendant');
  state.searchResults = [];
  state.activeIndex = -1;
}

function showResults(results, hidden = 0) {
  const previousActive = state.activeIndex;
  state.searchResults = results;
  state.activeIndex = -1;
  const hint = hidden > 0
    ? `<li class="hint" role="presentation">외 ${hidden}곳 더 있음 · "평창 봉평면"처럼 시·군을 함께 입력해 보세요</li>`
    : '';
  els.results.innerHTML = results.length
    ? results.map((r, i) => `<li id="result-${i}" role="option" aria-selected="false" data-index="${i}">${esc(r.name)}${r.detail ? `<small>${esc(r.detail)}</small>` : ''}</li>`).join('') + hint
    : '<li class="empty">검색 결과가 없습니다.</li>';
  els.results.hidden = false;
  els.input.setAttribute('aria-expanded', 'true');
  // 내장 결과를 먼저 보여준 뒤 온라인 결과를 합칠 때 방향키 선택이 풀리지 않게 한다
  if (previousActive >= 0 && previousActive < results.length) setActive(previousActive);
}

function setActive(index) {
  state.activeIndex = index;
  [...els.results.querySelectorAll('[role="option"]')].forEach((li, i) => {
    const on = i === index;
    li.classList.toggle('active', on);
    li.setAttribute('aria-selected', String(on));
    if (on) els.input.setAttribute('aria-activedescendant', li.id);
  });
}

function choose(place) {
  clearTimeout(searchTimer);
  searchSeq++;
  searchAbort?.abort();
  els.input.value = '';
  closeResults();
  els.input.blur();
  showPlace(place);
}

async function runSearch(query) {
  const seq = ++searchSeq;
  const local = localSearch(query);
  if (local.items.length) showResults(local.items, local.hidden);
  try {
    const results = await searchCities(query);
    if (seq === searchSeq) showResults(results, local.hidden);
    return seq === searchSeq ? results : null;
  } catch (err) {
    if (err.name === 'AbortError') return null;
    if (seq === searchSeq) {
      closeResults();
      showBanner('도시 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.', () => { hideBanner(); runSearch(query); });
    }
    return null;
  }
}

els.input.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const query = els.input.value.trim();
  if (query.length < 2) {
    searchSeq++;
    searchAbort?.abort();
    closeResults();
    return;
  }
  searchTimer = setTimeout(() => runSearch(query), 250);
});

els.input.addEventListener('keydown', (e) => {
  // 한글 조합 중의 Enter·방향키는 IME 입력이므로 처리하지 않는다
  if (e.isComposing || e.keyCode === 229) return;
  const count = state.searchResults.length;
  if (e.key === 'ArrowDown' && count) {
    e.preventDefault();
    setActive((state.activeIndex + 1) % count);
  } else if (e.key === 'ArrowUp' && count) {
    e.preventDefault();
    setActive((state.activeIndex - 1 + count) % count);
  } else if (e.key === 'Escape') {
    closeResults();
  }
});

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearTimeout(searchTimer);
  if (state.activeIndex >= 0) {
    choose(state.searchResults[state.activeIndex]);
    return;
  }
  const query = els.input.value.trim();
  if (query.length < 2) return;
  const instant = localSearch(query).items[0];
  if (instant) {
    choose(instant);
    return;
  }
  const results = await runSearch(query);
  if (results?.length) choose(results[0]);
});

els.results.addEventListener('mousedown', (e) => e.preventDefault()); // 클릭 전에 입력창 blur로 목록이 닫히는 것을 방지
els.results.addEventListener('click', (e) => {
  const li = e.target.closest('[role="option"]');
  if (li) choose(state.searchResults[Number(li.dataset.index)]);
});
els.input.addEventListener('blur', () => setTimeout(closeResults, 100));

els.recents.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip) showPlace(state.recents[Number(chip.dataset.index)]);
});

/* ---------- 단위 / 현재 위치 ---------- */
function syncUnitButton() {
  els.unit.textContent = `°${state.unit}`;
  els.unit.setAttribute('aria-label', `온도 단위를 ${state.unit === 'C' ? '화씨' : '섭씨'}로 변경`);
}

els.unit.addEventListener('click', () => {
  state.unit = state.unit === 'C' ? 'F' : 'C';
  save(STORE.unit, state.unit);
  syncUnitButton();
  render();
});

els.locate.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showBanner('이 브라우저는 위치 정보를 지원하지 않습니다.');
    return;
  }
  els.locate.disabled = true;
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      await showPlace({ name: '현재 위치', detail: '', lat: coords.latitude, lon: coords.longitude }, { remember: false });
      els.locate.disabled = false;
    },
    (err) => {
      els.locate.disabled = false;
      showBanner(err.code === err.PERMISSION_DENIED
        ? '위치 권한이 거부되었습니다. 브라우저 설정에서 허용하거나 도시를 검색해 주세요.'
        : '현재 위치를 확인하지 못했습니다. 도시를 검색해 주세요.');
    },
    { timeout: 10000, maximumAge: 300000 },
  );
});

/* ---------- 시작 ---------- */
syncUnitButton();
renderRecents();
const savedPlace = load(STORE.place, null);
const validSaved = savedPlace && isNum(savedPlace.lat) && isNum(savedPlace.lon) && typeof savedPlace.name === 'string';
showPlace(validSaved ? savedPlace : DEFAULT_PLACE, { remember: !validSaved || savedPlace.name !== '현재 위치' });
