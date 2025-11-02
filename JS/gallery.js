// ===== Elements =====
const els = {
  grid: document.getElementById('grid'),
  count: document.getElementById('count'),
  chips: document.getElementById('chipGroup'),
  searchForm: document.getElementById('searchForm'),
  q: document.getElementById('q'),
  lightbox: document.getElementById('lightbox'),
  lbImg: document.getElementById('lbImg'),
  lbCaption: document.getElementById('lbCaption'),
  lbPins: document.getElementById('lbPins'),
  lbClose: document.getElementById('lbClose'),
};

// ===== State =====
let ALL = [];
let state = { cat: "", q: "" };

// ===== Boot =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadJSON();
  bindEvents();
  applyFilters();
});

async function loadJSON(){
  try{
    const res = await fetch('JSON/gallery.json', { cache: 'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    ALL = await res.json();
  }catch(err){
    console.error('โหลด JSON/gallery.json ไม่สำเร็จ:', err);
    els.grid.innerHTML = `<p style="color:#c00">โหลด <code>JSON/gallery.json</code> ไม่สำเร็จ — เช็กพาธไฟล์หรือรันผ่านเซิร์ฟเวอร์ท้องถิ่น</p>`;
  }
}

function bindEvents(){
  els.chips.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip'); if(!btn) return;
    els.chips.querySelectorAll('.chip').forEach(c=>c.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.cat = btn.dataset.cat || "";
    applyFilters();
  });

  els.searchForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    state.q = els.q.value || "";
    applyFilters();
  });

  els.lbClose.addEventListener('click', ()=> els.lightbox.close());
  els.lightbox.addEventListener('click', (e)=>{
    const r = els.lightbox.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) {
      els.lightbox.close();
    }
  });
}

// ===== Filter & Render =====
function applyFilters(){
  const q = (state.q||"").trim().toLowerCase();
  const cat = state.cat;
  let list = ALL.slice();

  if (cat) list = list.filter(it => (it.cat||[]).includes(cat));
  if (q) list = list.filter(it =>
    (it.title||"").toLowerCase().includes(q) ||
    (it.cat||[]).join(" ").toLowerCase().includes(q)
  );
  render(list);
}

function render(items){
  els.grid.innerHTML = items.map(toCard).join('');
  els.count.textContent = items.length.toString();

  // เปิดภาพใหญ่เมื่อคลิกส่วน "thumb" (ยกเว้นคลิกที่ pin-mini)
  els.grid.querySelectorAll('.thumb').forEach(el=>{
    el.addEventListener('click', () => openLightboxById(el.dataset.id));
  });

  // กัน event เด้งไปเปิด lightbox เมื่อคลิกที่ pin-mini
  els.grid.querySelectorAll('.pin-mini').forEach(a=>{
    a.addEventListener('click', (e)=> e.stopPropagation());
  });
}

function toCard(item){
  const caption = `${item.title} • ${(item.cat||[]).join(", ")}`;

  // แปลง hotspots เป็นจุดคลิกบนการ์ด (ลิงก์ไปสินค้าทันที)
  const pins = (item.hotspots||[]).map(hs => `
    <a class="pin-mini"
       href="${hs.href || '#'}"
       target="${hs.href ? '_blank' : '_self'}"
       rel="noopener"
       style="left:${hs.x}%; top:${hs.y}%;"
       data-label="${escapeHtml((hs.label||'') + (hs.price ? ' • '+hs.price+' บาท' : ''))}"
       aria-label="${escapeHtml(hs.label || 'ไอเท็ม')}"></a>
  `).join('');

  return `
  <article class="card" data-cat="${(item.cat||[]).join(' ')}">
    <div class="thumb" role="button" tabindex="0" data-id="${item.id}">
      <span class="badge">${(item.cat||['idea'])[0]}</span>
      <img loading="lazy" src="${item.img}" alt="${escapeHtml(item.alt || item.title || '')}">
      ${pins}
    </div>
    <div class="body">
      <h3>${escapeHtml(item.title || '')}</h3>
      <p>${escapeHtml((item.cat||[]).join(" · "))}</p>
      <button type="button" onclick="openLightboxById('${item.id}')">ดูภาพใหญ่</button>
    </div>
  </article>`;
}

// ===== Lightbox + Hotspots (เหมือนเดิม) =====
function openLightboxById(id){
  const item = ALL.find(x => x.id === id);
  if(!item) return;

  els.lbImg.src = item.img;
  els.lbImg.alt = item.alt || item.title || '';
  els.lbCaption.textContent = `${item.title} • ${(item.cat||[]).join(", ")}`;

  if (typeof els.lightbox.showModal === "function") els.lightbox.showModal();
  else els.lightbox.setAttribute('open','open');

  if (els.lbImg.complete) renderPins(item.hotspots || []);
  else els.lbImg.onload = () => renderPins(item.hotspots || []);
}

function renderPins(hotspots){
  els.lbPins.innerHTML = "";
  if(!hotspots || hotspots.length === 0) return;

  hotspots.forEach((hs, i) => {
    const btn = document.createElement('button');
    btn.className = 'pin';
    btn.style.left = `${hs.x}%`;
    btn.style.top  = `${hs.y}%`;
    btn.setAttribute('aria-label', hs.label || `ไอเท็มที่ ${i+1}`);

    const card = document.createElement('div');
    card.className = 'pin-card';
    card.style.left = `${hs.x}%`;
    card.style.top  = `${hs.y}%`;
    card.innerHTML = `
      <h4>${escapeHtml(hs.label || '')}</h4>
      ${hs.price ? `<div class="price">${escapeHtml(hs.price)} บาท</div>` : ""}
      ${hs.href ? `<a href="${hs.href}" target="_blank" rel="noopener">ดูสินค้า</a>` : ""}
    `;
    card.hidden = true;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = card.hidden;
      els.lbPins.querySelectorAll('.pin-card').forEach(c => c.hidden = true);
      card.hidden = !isHidden;
    });

    els.lbPins.appendChild(btn);
    els.lbPins.appendChild(card);
  });

  els.lbImg.onclick = () => els.lbPins.querySelectorAll('.pin-card').forEach(c => c.hidden = true);
}

// ===== Utils =====
function escapeHtml(s=""){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
