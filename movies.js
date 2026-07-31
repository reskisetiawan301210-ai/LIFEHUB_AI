/* ==================================================================
   REEL — movies.js (TMDB API Primary + YouTube/Stream Fallback)
   ================================================================== */

// 🔑 OPSIONAL: Masukkan TMDB API Key kamu di sini jika punya (https://www.themoviedb.org)
// Jika dikosongkan (""), sistem akan otomatis menggunakan Fallback Opsi 2.
const TMDB_API_KEY = "6d5008c8211b09f6357ab4f45e10554d"; 

const PUBLIC_BASE = "https://api.tvmaze.com";
const PLACEHOLDER_POSTER = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450'><rect width='300' height='450' fill='#1b1c22'/><text x='150' y='230' fill='#5a5a63' font-size='16' font-family='sans-serif' text-anchor='middle'>No Image</text></svg>`
);

/* Cache memory */
const _cache = new Map();
async function publicApi(endpoint){
  const url = PUBLIC_BASE + endpoint;
  if (_cache.has(url)) return _cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error("API_ERROR_" + res.status);
  const data = await res.json();
  _cache.set(url, data);
  return data;
}

/* ------------------------------------------------------------------
   LOCAL STORAGE — favorites / watchlist / history / continue
   ------------------------------------------------------------------ */
const LS_KEYS = { fav:"reel_favorites", watch:"reel_watchlist", hist:"reel_history", cont:"reel_continue" };
function lsGet(key){ try{ return JSON.parse(localStorage.getItem(key)) || []; } catch(e){ return []; } }
function lsSet(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

function isInList(key, id){ return lsGet(key).some(x => x.id === id); }
function toggleList(key, item){
  let list = lsGet(key);
  const idx = list.findIndex(x => x.id === item.id);
  if (idx > -1){ list.splice(idx,1); } else { list.unshift({ ...item, ts: Date.now() }); }
  lsSet(key, list.slice(0, 200));
  updateSidebarCounts();
  return idx === -1;
}
function pushHistory(item){
  let list = lsGet(LS_KEYS.hist).filter(x => x.id !== item.id);
  list.unshift({ ...item, ts: Date.now() });
  lsSet(LS_KEYS.hist, list.slice(0, 100));
  updateSidebarCounts();
}
function setContinueWatching(item, progressPct){
  let list = lsGet(LS_KEYS.cont).filter(x => x.id !== item.id);
  list.unshift({ ...item, progress: progressPct ?? Math.floor(10 + Math.random()*70), ts: Date.now() });
  lsSet(LS_KEYS.cont, list.slice(0, 30));
}
function updateSidebarCounts(){
  document.getElementById('cntFav').textContent   = lsGet(LS_KEYS.fav).length;
  document.getElementById('cntWatch').textContent = lsGet(LS_KEYS.watch).length;
  document.getElementById('cntHist').textContent  = lsGet(LS_KEYS.hist).length;
}

/* ------------------------------------------------------------------
   HELPERS & UTILS
   ------------------------------------------------------------------ */
function debounce(fn, ms){ let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), ms); }; }
function stripHtml(html){ if(!html) return ""; return html.replace(/<[^>]*>?/gm, ''); }
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(showToast._tt);
  showToast._tt = setTimeout(()=>t.classList.remove('show'), 2200);
}

function normalizeShow(raw){
  const s = raw.show || raw;
  return {
    id: s.id,
    type: 'tv',
    title: s.name,
    poster: s.image?.original || s.image?.medium || PLACEHOLDER_POSTER,
    backdrop: s.image?.original || s.image?.medium || PLACEHOLDER_POSTER,
    date: s.premiered || '—',
    rating: s.rating?.average || 7.5,
    overview: stripHtml(s.summary) || 'No overview available.',
    genres: s.genres || [],
    language: s.language || 'English',
    status: s.status || 'Running',
    network: s.network?.name || s.webChannel?.name || 'Streaming',
    imdbId: s.externals?.imdb || null
  };
}

let GENRES_LIST = ["Action", "Anime", "Comedy", "Crime", "Drama", "Espionage", "Family", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller"];

/* ------------------------------------------------------------------
   CARD RENDERING
   ------------------------------------------------------------------ */
function cardHTML(item){
  const fav = isInList(LS_KEYS.fav, item.id);
  const watch = isInList(LS_KEYS.watch, item.id);
  const yearStr = item.date ? item.date.slice(0,4) : '—';
  const genresStr = (item.genres||[]).slice(0,2).join(" · ") || "Cinema";

  return `
  <div class="card" data-id="${item.id}" tabindex="0">
    <div class="card-poster">
      <img loading="lazy" src="${item.poster}" alt="${item.title||''} poster" />
      <div class="card-rating"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg>${item.rating ? Number(item.rating).toFixed(1) : '7.5'}</div>
      <div class="card-overlay">
        <div class="co-genres">${genresStr}</div>
        <div class="co-actions">
          <button class="act-fav ${fav?'active':''}" title="Favorite" aria-label="Favorite">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0121.5 12c-2.5 4.5-9.5 9-9.5 9z"/></svg>
          </button>
          <button class="act-watch ${watch?'active':''}" title="Watch Later" aria-label="Watch Later">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14v18l-7-4-7 4z"/></svg>
          </button>
        </div>
      </div>
    </div>
    <div class="card-title">${item.title||'Untitled'}</div>
    <div class="card-sub">${yearStr} · Series</div>
  </div>`;
}

function cardSkeletonHTML(){
  return `<div class="card card-skel"><div class="card-poster skel"></div><div class="card-title skel" style="height:13px;border-radius:4px;margin-top:9px;"></div><div class="card-sub skel" style="height:10px;width:60%;border-radius:4px;margin-top:6px;"></div></div>`;
}

function wireCardEvents(container){
  container.querySelectorAll('.card').forEach(card => {
    const id = Number(card.dataset.id);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.act-fav') || e.target.closest('.act-watch')) return;
      openDetail(id);
    });
    card.querySelector('.act-fav')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const title = card.querySelector('.card-title').textContent;
      const poster = card.querySelector('img').getAttribute('src');
      const added = toggleList(LS_KEYS.fav, { id, title, poster });
      e.currentTarget.classList.toggle('active', added);
      showToast(added ? "Added to Favorites" : "Removed from Favorites");
    });
    card.querySelector('.act-watch')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const title = card.querySelector('.card-title').textContent;
      const poster = card.querySelector('img').getAttribute('src');
      const added = toggleList(LS_KEYS.watch, { id, title, poster });
      e.currentTarget.classList.toggle('active', added);
      showToast(added ? "Added to Watch Later" : "Removed from Watch Later");
    });
  });
}

/* ==================================================================
   HOME VIEW
   ================================================================== */
let allShowsData = [];

function renderGenreSidebar(){
  const nav = document.getElementById('navGenres');
  nav.innerHTML = `<div class="nav-label">Genres</div>` + GENRES_LIST.slice(0,8).map(g =>
    `<button class="nav-item" data-genre="${g}">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
       ${g}
     </button>`).join("");

  const filterGenre = document.getElementById('filterGenre');
  filterGenre.innerHTML = `<option value="">All Genres</option>` + GENRES_LIST.map(g => `<option value="${g}">${g}</option>`).join("");
}

function renderGenreRail(){
  const rail = document.getElementById('genreRail');
  rail.innerHTML = GENRES_LIST.map((g,i) => `<button class="genre-chip ${i===0?'active':''}" data-genre="${g}">${g}</button>`).join("");
}

let heroItems = [], heroIdx = 0, heroTimer = null;

async function loadMainData(){
  try{
    const raw = await publicApi("/shows?page=1");
    allShowsData = raw.map(normalizeShow);
  }catch(e){
    allShowsData = [];
  }
}

function renderHero(){
  const hero = document.getElementById('hero');
  heroItems = allShowsData.slice(0, 6);

  if (!heroItems.length){
    hero.innerHTML = `<div class="hero-scrim"></div><div class="hero-content"><div class="hero-title">Loading Featured Titles…</div></div>`;
    return;
  }

  hero.innerHTML = heroItems.map((it,i) => `
    <div class="hero-slide ${i===0?'active':''}" data-idx="${i}">
      <img src="${it.backdrop}" alt="" />
      <div class="hero-scrim"></div>
      <div class="hero-content">
        <div class="hero-badge">#${i+1} Featured Today</div>
        <div class="hero-title">${it.title}</div>
        <div class="hero-meta">
          <span>${it.date ? it.date.slice(0,4) : '—'}</span>
          <span class="rating">★ ${it.rating}</span>
          <span>${it.genres.join(', ') || 'Drama'}</span>
        </div>
        <div class="hero-overview">${it.overview}</div>
        <div class="hero-actions">
          <button class="btn btn-primary" data-action="trailer" data-id="${it.id}">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg><span>Play Video</span>
          </button>
          <button class="btn btn-ghost" data-action="info" data-id="${it.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/></svg><span>More Info</span>
          </button>
          <button class="btn btn-icon" data-action="fav" data-id="${it.id}" aria-label="Add to favorites">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0121.5 12c-2.5 4.5-9.5 9-9.5 9z"/></svg>
          </button>
        </div>
      </div>
    </div>`).join("") + `<div class="hero-dots" id="heroDots">${heroItems.map((_,i)=>`<button class="hero-dot ${i===0?'active':''}" data-idx="${i}"></button>`).join("")}</div>`;

  hero.querySelectorAll('[data-action="info"], [data-action="trailer"]').forEach(btn => {
    btn.addEventListener('click', () => openDetail(Number(btn.dataset.id), btn.dataset.action === 'trailer' ? 'trailer' : 'overview'));
  });
  hero.querySelector('[data-action="fav"]')?.addEventListener('click', (e) => {
    const it = heroItems[heroIdx];
    const added = toggleList(LS_KEYS.fav, { id: it.id, title: it.title, poster: it.poster });
    e.currentTarget.classList.toggle('active', added);
    showToast(added ? "Added to Favorites" : "Removed from Favorites");
  });
  hero.querySelectorAll('.hero-dot').forEach(d => d.addEventListener('click', () => setHeroSlide(Number(d.dataset.idx))));

  startHeroAutoplay();
}

function setHeroSlide(i){
  heroIdx = i;
  document.querySelectorAll('.hero-slide').forEach((el,idx) => el.classList.toggle('active', idx===i));
  document.querySelectorAll('.hero-dot').forEach((el,idx) => el.classList.toggle('active', idx===i));
}
function startHeroAutoplay(){
  clearInterval(heroTimer);
  heroTimer = setInterval(() => setHeroSlide((heroIdx+1) % Math.max(heroItems.length, 1)), 6500);
}

function renderContinueWatching(){
  const wrap = document.getElementById('continueWrap');
  const list = lsGet(LS_KEYS.cont);
  if (!list.length){ wrap.innerHTML = ""; return; }
  wrap.innerHTML = `
    <section class="row-section">
      <div class="row-head"><div class="row-title">Continue Watching</div></div>
      <div class="filmstrip"><div class="filmstrip-track" id="continueTrack"></div></div>
    </section>
    <hr class="dotted-divider"/>`;
  const track = document.getElementById('continueTrack');
  track.innerHTML = list.slice(0,12).map(it => `
    <div class="card" data-id="${it.id}">
      <div class="card-poster">
        <img loading="lazy" src="${it.poster || PLACEHOLDER_POSTER}" alt="${it.title}"/>
        <div style="position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(255,255,255,.15);">
          <div style="height:100%;width:${it.progress||30}%;background:var(--gold);"></div>
        </div>
      </div>
      <div class="card-title">${it.title}</div>
      <div class="card-sub">${it.progress||30}% watched</div>
    </div>`).join("");
  wireCardEvents(track);
}

function renderHomeRows(){
  const wrap = document.getElementById('homeRows');
  const ROW_TYPES = [
    { title: "Trending Movies & Shows", filter: () => allShowsData.slice(6, 20) },
    { title: "Top Rated Cinema", filter: () => [...allShowsData].sort((a,b)=>b.rating-a.rating).slice(0, 15) },
    { title: "Action & Adventure", filter: () => allShowsData.filter(s => s.genres.includes("Action") || s.genres.includes("Adventure")).slice(0, 15) },
    { title: "Drama & Romance", filter: () => allShowsData.filter(s => s.genres.includes("Drama") || s.genres.includes("Romance")).slice(0, 15) },
    { title: "Sci-Fi & Mystery", filter: () => allShowsData.filter(s => s.genres.includes("Science-Fiction") || s.genres.includes("Mystery")).slice(0, 15) }
  ];

  wrap.innerHTML = ROW_TYPES.map((r, i) => `
    <section class="row-section">
      <div class="row-head">
        <div class="row-title"><span class="sprocket-strip"><span></span><span></span><span></span></span>${r.title}</div>
        <a class="row-see-all" data-row-idx="${i}">See all →</a>
      </div>
      <div class="filmstrip"><div class="filmstrip-track" id="track-${i}"></div></div>
    </section>
    <hr class="dotted-divider"/>
  `).join("");

  ROW_TYPES.forEach((r, i) => {
    const track = document.getElementById(`track-${i}`);
    const items = r.filter();
    track.innerHTML = items.map(cardHTML).join("");
    wireCardEvents(track);
  });

  document.querySelectorAll('[data-row-idx]').forEach(a => {
    a.addEventListener('click', () => {
      const idx = Number(a.dataset.rowIdx);
      openBrowse({ title: ROW_TYPES[idx].title, items: ROW_TYPES[idx].filter() });
    });
  });
}

/* ==================================================================
   SEARCH
   ================================================================== */
const searchInput = document.getElementById('searchInput');
const suggestPanel = document.getElementById('suggestPanel');

const doInstantSearch = debounce(async (q) => {
  if (!q || q.length < 2){ suggestPanel.classList.add('hidden'); return; }
  try{
    const raw = await publicApi(`/search/shows?q=${encodeURIComponent(q)}`);
    const results = raw.map(normalizeShow).slice(0, 8);
    if (!results.length){
      suggestPanel.innerHTML = `<div class="suggest-item"><span class="st-title">No matches found</span></div>`;
    } else {
      suggestPanel.innerHTML = results.map(it => `
        <div class="suggest-item" data-id="${it.id}">
          <img src="${it.poster}" alt=""/>
          <div><div class="st-title">${it.title}</div><div class="st-meta">${it.genres.slice(0,2).join(', ')||'Show'} · ${it.date.slice(0,4)}</div></div>
        </div>
      `).join("");
      suggestPanel.querySelectorAll('.suggest-item[data-id]').forEach(el => {
        el.addEventListener('click', () => { openDetail(Number(el.dataset.id)); suggestPanel.classList.add('hidden'); searchInput.value=""; });
      });
    }
    suggestPanel.classList.remove('hidden');
  }catch(e){
    suggestPanel.classList.add('hidden');
  }
}, 320);

searchInput.addEventListener('input', (e) => doInstantSearch(e.target.value.trim()));
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && searchInput.value.trim()){
    suggestPanel.classList.add('hidden');
    openBrowse({ title:`Search: "${searchInput.value.trim()}"`, query: searchInput.value.trim() });
  }
});
document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrap')) suggestPanel.classList.add('hidden'); });

/* Voice search */
const micBtn = document.getElementById('micBtn');
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
micBtn.addEventListener('click', () => {
  if (!SpeechRec){ showToast("Voice search isn't supported in this browser"); return; }
  const rec = new SpeechRec();
  rec.lang = 'en-US'; rec.interimResults = false;
  micBtn.classList.add('listening');
  rec.start();
  rec.onresult = (ev) => {
    const text = ev.results[0][0].transcript;
    searchInput.value = text;
    doInstantSearch(text);
  };
  rec.onerror = () => showToast("Couldn't hear that — try again");
  rec.onend = () => micBtn.classList.remove('listening');
});

document.getElementById('btnPerson').addEventListener('click', () => {
  const name = prompt("Search for an actor or director:");
  if (name) {
    searchInput.value = name;
    openBrowse({ title:`Person search: "${name}"`, query: name });
  }
});

/* ==================================================================
   BROWSE VIEW
   ================================================================== */
const viewHome = document.getElementById('view-home');
const viewBrowse = document.getElementById('view-browse');
const viewLibrary = document.getElementById('view-library');

async function openBrowse(config){
  viewHome.classList.add('hidden'); viewBrowse.classList.remove('hidden'); viewLibrary.classList.add('hidden');
  document.getElementById('browseTitle').textContent = config.title || "Browse";
  const grid = document.getElementById('browseGrid');
  grid.innerHTML = Array(12).fill(cardSkeletonHTML()).join("");

  let items = config.items || [];

  if (config.query) {
    try {
      const raw = await publicApi(`/search/shows?q=${encodeURIComponent(config.query)}`);
      items = raw.map(normalizeShow);
    } catch(e) { items = []; }
  } else if (config.genre) {
    items = allShowsData.filter(s => s.genres.includes(config.genre));
  } else if (!items.length) {
    items = allShowsData;
  }

  const selectedGenre = document.getElementById('filterGenre').value;
  if (selectedGenre) {
    items = items.filter(s => s.genres.includes(selectedGenre));
  }

  document.getElementById('browseCount').textContent = `${items.length} titles found`;

  if (!items.length){
    grid.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <h3>No titles found</h3><div>Try another search or filter.</div></div>`;
  } else {
    grid.innerHTML = items.map(cardHTML).join("");
    wireCardEvents(grid);
  }
}

document.getElementById('filterGenre').addEventListener('change', () => {
  openBrowse({ title: document.getElementById('browseTitle').textContent });
});

/* Sidebar Navigation */
document.getElementById('navBrowse').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-browse]');
  if (!btn) return;
  setActiveNav(btn);
  const b = btn.dataset.browse;
  if (b === 'action') openBrowse({ title: "Action & Adventure", genre: "Action" });
  else if (b === 'drama') openBrowse({ title: "Drama Series", genre: "Drama" });
  else if (b === 'comedy') openBrowse({ title: "Comedy Hits", genre: "Comedy" });
  else if (b === 'anime') openBrowse({ title: "Anime & Cartoons", genre: "Anime" });
});

document.getElementById('navGenres').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-genre]'); if (!btn) return;
  setActiveNav(btn);
  openBrowse({ title: btn.dataset.genre, genre: btn.dataset.genre });
});

document.getElementById('genreRail').addEventListener('click', (e) => {
  const chip = e.target.closest('.genre-chip'); if (!chip) return;
  document.querySelectorAll('.genre-chip').forEach(c=>c.classList.remove('active'));
  chip.classList.add('active');
  openBrowse({ title: chip.dataset.genre, genre: chip.dataset.genre });
});

document.getElementById('bnSearch').addEventListener('click', () => searchInput.focus());

/* ==================================================================
   LIBRARY VIEWS
   ================================================================== */
function openLibrary(kind){
  viewHome.classList.add('hidden'); viewBrowse.classList.add('hidden'); viewLibrary.classList.remove('hidden');
  const titles = { favorites:["Favorites", LS_KEYS.fav], watchlist:["Watch Later", LS_KEYS.watch], history:["History", LS_KEYS.hist] };
  const [label, key] = titles[kind];
  document.getElementById('libraryTitle').textContent = label;
  const list = lsGet(key);
  document.getElementById('libraryCount').textContent = `${list.length} title${list.length===1?'':'s'}`;
  const grid = document.getElementById('libraryGrid');
  if (!list.length){
    grid.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0121.5 12c-2.5 4.5-9.5 9-9.5 9z"/></svg>
      <h3>Nothing here yet</h3><div>Titles you save will show up in ${label}.</div></div>`;
    return;
  }
  grid.innerHTML = list.map(it => cardHTML({ id:it.id, title:it.title, poster:it.poster||PLACEHOLDER_POSTER, date:'', rating:'7.5', genres:[] })).join("");
  wireCardEvents(grid);
}

function setActiveNav(activeEl){
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  activeEl?.classList.add('active');
}

document.getElementById('navLibrary').addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item'); if (!btn) return;
  setActiveNav(btn); openLibrary(btn.dataset.view);
});

document.querySelectorAll('[data-view="home"]').forEach(btn => btn.addEventListener('click', () => {
  viewBrowse.classList.add('hidden'); viewLibrary.classList.add('hidden'); viewHome.classList.remove('hidden');
  setActiveNav(document.querySelector('.nav-item[data-view="home"]'));
}));

document.querySelectorAll('.bottom-nav [data-view]').forEach(btn => btn.addEventListener('click', (e) => {
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));
  e.currentTarget.classList.add('active');
  if (btn.dataset.view === 'home') return;
  openLibrary(btn.dataset.view);
}));

/* ==================================================================
   HELPER: TMDB API ENGINE (OPSI 1 & FALLBACK OPSI 2)
   ================================================================== */

// Fungsi Opsi 1: Mengambil ID Trailer Resmi via TMDB API
async function fetchTmdbTrailerKey(title) {
  if (!TMDB_API_KEY || TMDB_API_KEY.trim() === "") return null;
  try {
    // 1. Cari Film/Series di TMDB
    const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) return null;

    const media = searchData.results[0];
    const mediaType = media.media_type === "tv" ? "tv" : "movie";

    // 2. Ambil Video Trailer Resmi
    const videoRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${media.id}/videos?api_key=${TMDB_API_KEY}`);
    const videoData = await videoRes.json();
    
    const trailer = videoData.results?.find(v => v.type === "Trailer" && v.site === "YouTube") || videoData.results?.[0];
    return trailer ? trailer.key : null;
  } catch (err) {
    console.warn("[Reel] TMDB API Gagal/Bermasalah, beralih ke Fallback Opsi 2...", err);
    return null;
  }
}

/* ==================================================================
   DETAIL MODAL & MULTI-PLAYER ENGINE
   ================================================================== */
const modalBackdrop = document.getElementById('modalBackdrop');

async function openDetail(id, focusPane){
  modalBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('mTitle').textContent = "Loading…";
  document.getElementById('mTagline').textContent = "";
  document.getElementById('mOverview').textContent = "";
  document.getElementById('mMetaGrid').innerHTML = "";
  document.getElementById('mCast').innerHTML = "";
  document.getElementById('mProviders').innerHTML = "";
  document.getElementById('mTrailer').innerHTML = "";
  document.getElementById('mHeroImg').src = "";

  try{
    const d = normalizeShow(await publicApi(`/shows/${id}`));
    const embedded = await publicApi(`/shows/${id}?embed[]=cast&embed[]=episodes`);
    const castData = embedded._embedded?.cast || [];

    await renderDetail(d, castData);
    pushHistory({ id: d.id, title: d.title, poster: d.poster });
    setContinueWatching({ id: d.id, title: d.title, poster: d.poster });
  }catch(e){
    document.getElementById('mTitle').textContent = "Couldn't load details";
    document.getElementById('mOverview').textContent = "Unable to fetch information from the public API.";
  }

  if (focusPane) switchPane(focusPane);
}

async function renderDetail(d, cast){
  document.getElementById('mHeroImg').src = d.backdrop;
  document.getElementById('mTitle').textContent = d.title;
  document.getElementById('mTagline').textContent = `${d.language} · ${d.status}`;
  document.getElementById('mOverview').textContent = d.overview;

  const meta = [
    ["Premiered", d.date],
    ["Rating", `★ ${d.rating}`],
    ["Genres", d.genres.join(", ") || "—"],
    ["Network", d.network],
    ["Language", d.language],
    ["Status", d.status]
  ];

  document.getElementById('mMetaGrid').innerHTML = meta.map(([label,val]) => `
    <div class="meta-item"><div class="mi-label">${label}</div><div class="mi-value">${val}</div></div>
  `).join("");

  /* -------------------------------------------------------------
     PROSES PEMUTAR VIDEO: OPSI 1 (TMDB) -> FALLBACK OPSI 2
     ------------------------------------------------------------- */
  const trailerWrap = document.getElementById('mTrailer');
  
  // Coba Opsi 1: TMDB API
  const tmdbKey = await fetchTmdbTrailerKey(d.title);
  
  let playerIframeUrl = "";
  if (tmdbKey) {
    // ✅ Opsi 1 Berhasil
    playerIframeUrl = `https://www.youtube.com/embed/${tmdbKey}?autoplay=1`;
  } else {
    // 🔄 Opsi 2 Fallback: Gunakan Server Stream Embed
    playerIframeUrl = d.imdbId 
      ? `https://vidsrc.cc/v2/embed/tv/${d.imdbId}` 
      : `https://autoembed.co/tv/imdb/${d.imdbId}`;
  }

  const youtubeDirectSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(d.title + " official trailer")}`;

  trailerWrap.innerHTML = `
    <div style="position:absolute; top:12px; right:12px; z-index:10; display:flex; gap:8px;">
      <button onclick="changePlayerSource('${playerIframeUrl}')" style="background:var(--gold); color:#000; border:none; padding:7px 14px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.5);">▶ Putar Video</button>
      <button onclick="window.open('${youtubeDirectSearch}', '_blank')" style="background:rgba(255,255,255,0.2); color:#fff; border:none; padding:7px 14px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer; backdrop-filter:blur(4px);">🔴 Buka di YouTube</button>
    </div>
    <iframe 
      id="mainVideoIframe"
      src="${playerIframeUrl}" 
      style="width:100%; height:100%; border:none; border-radius:12px;" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
  `;

  /* Cast List */
  document.getElementById('mCast').innerHTML = cast.slice(0, 12).map(c => `
    <div class="cast-card">
      <img loading="lazy" src="${c.person?.image?.medium || PLACEHOLDER_POSTER}" alt="${c.person?.name}"/>
      <div class="cc-name">${c.person?.name}</div>
      <div class="cc-role">${c.character?.name || ''}</div>
    </div>
  `).join("") || `<div class="provider-empty">No cast information available.</div>`;

  /* Watch Providers */
  document.getElementById('mProviders').innerHTML = `
    <div class="provider-chip"><span>Broadcast / Streamed on <b>${d.network}</b></span></div>
    <div class="provider-chip"><a href="https://www.google.com/search?q=watch+${encodeURIComponent(d.title)}+online" target="_blank" style="color:var(--cyan); text-decoration:underline;">Cari Nonton Legal Online</a></div>
  `;

  /* Actions */
  const fav = isInList(LS_KEYS.fav, d.id);
  const watch = isInList(LS_KEYS.watch, d.id);

  document.getElementById('mActions').innerHTML = `
    <button class="btn btn-primary" id="mPlayTrailer">
      <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg><span>Play Video</span>
    </button>
    <button class="btn btn-icon ${fav?'active':''}" id="mFav" aria-label="Favorite">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0121.5 12c-2.5 4.5-9.5 9-9.5 9z"/></svg>
    </button>
    <button class="btn btn-icon ${watch?'active':''}" id="mWatch" aria-label="Watch Later">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3h14v18l-7-4-7 4z"/></svg>
    </button>`;

  document.getElementById('mPlayTrailer').addEventListener('click', () => switchPane('trailer'));
  document.getElementById('mFav').addEventListener('click', (e) => {
    const added = toggleList(LS_KEYS.fav, { id: d.id, title: d.title, poster: d.poster });
    e.currentTarget.classList.toggle('active', added);
    showToast(added ? "Added to Favorites" : "Removed from Favorites");
  });
  document.getElementById('mWatch').addEventListener('click', (e) => {
    const added = toggleList(LS_KEYS.watch, { id: d.id, title: d.title, poster: d.poster });
    e.currentTarget.classList.toggle('active', added);
    showToast(added ? "Added to Watch Later" : "Removed from Watch Later");
  });
}

function changePlayerSource(url) {
  const iframe = document.getElementById('mainVideoIframe');
  if (iframe) iframe.src = url;
}

function switchPane(name){
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.pane===name));
  document.querySelectorAll('.modal-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${name}`));
}
document.querySelectorAll('.modal-tab').forEach(t => t.addEventListener('click', () => switchPane(t.dataset.pane)));
document.getElementById('modalClose').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
function closeModal(){
  modalBackdrop.classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('mTrailer').innerHTML = "";
}

/* ==================================================================
   INIT
   ================================================================== */
async function init(){
  updateSidebarCounts();
  renderGenreSidebar();
  renderGenreRail();
  await loadMainData();
  renderHero();
  renderContinueWatching();
  renderHomeRows();
}
init();