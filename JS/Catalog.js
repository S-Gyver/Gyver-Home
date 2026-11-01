/* ==========================================================================
   Gyver Home — Catalog Page Controller & Filters
   ========================================================================== */

let allProducts = [];
let filteredProducts = [];
let currentCategory = '';
let currentSort = 'popular';
let minPrice = null;
let maxPrice = null;
let onlySale = false;
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  initCatalog();
});

async function initCatalog() {
  try {
    const res = await fetch('JSON/products.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    allProducts = await res.json();

    // Read URL params
    const params = new URLSearchParams(window.location.search);
    searchQuery = params.get('q') || '';
    currentCategory = params.get('cat') || '';
    currentSort = params.get('sort') || 'popular';
    minPrice = params.get('pmin') ? Number(params.get('pmin')) : null;
    maxPrice = params.get('pmax') ? Number(params.get('pmax')) : null;

    // Sync to UI
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) searchInput.value = searchQuery;

    const catSelect = document.getElementById('filter-category');
    if (catSelect) catSelect.value = currentCategory;

    const sortSelect = document.getElementById('filter-sort');
    if (sortSelect) sortSelect.value = currentSort;

    if (minPrice && document.getElementById('filter-pmin')) {
      document.getElementById('filter-pmin').value = minPrice;
    }
    if (maxPrice && document.getElementById('filter-pmax')) {
      document.getElementById('filter-pmax').value = maxPrice;
    }

    setupEventListeners();
    applyFilters();

  } catch (error) {
    console.error('Error loading catalog:', error);
  }
}

function setupEventListeners() {
  // Search
  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
  }

  // Category Dropdown & Quick Chips
  const catSelect = document.getElementById('filter-category');
  if (catSelect) {
    catSelect.addEventListener('change', () => {
      currentCategory = catSelect.value;
      updateCategoryChipsUI();
      applyFilters();
    });
  }

  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.getAttribute('data-cat') || '';
      if (catSelect) catSelect.value = currentCategory;
      updateCategoryChipsUI();
      applyFilters();
    });
  });

  // Sort
  const sortSelect = document.getElementById('filter-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      applyFilters();
    });
  }

  // Price
  const pminInput = document.getElementById('filter-pmin');
  const pmaxInput = document.getElementById('filter-pmax');
  const priceApplyBtn = document.getElementById('btn-apply-price');

  if (priceApplyBtn) {
    priceApplyBtn.addEventListener('click', () => {
      minPrice = pminInput && pminInput.value ? Number(pminInput.value) : null;
      maxPrice = pmaxInput && pmaxInput.value ? Number(pmaxInput.value) : null;
      applyFilters();
    });
  }

  // Sale Only checkbox
  const saleCheckbox = document.getElementById('filter-sale-only');
  if (saleCheckbox) {
    saleCheckbox.addEventListener('change', () => {
      onlySale = saleCheckbox.checked;
      applyFilters();
    });
  }

  // Clear filters
  const clearBtn = document.getElementById('btn-clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllFilters);
  }
}

function updateCategoryChipsUI() {
  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    const cat = btn.getAttribute('data-cat') || '';
    if (cat === currentCategory) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function clearAllFilters() {
  searchQuery = '';
  currentCategory = '';
  currentSort = 'popular';
  minPrice = null;
  maxPrice = null;
  onlySale = false;

  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) searchInput.value = '';

  const catSelect = document.getElementById('filter-category');
  if (catSelect) catSelect.value = '';

  const sortSelect = document.getElementById('filter-sort');
  if (sortSelect) sortSelect.value = 'popular';

  const pminInput = document.getElementById('filter-pmin');
  if (pminInput) pminInput.value = '';

  const pmaxInput = document.getElementById('filter-pmax');
  if (pmaxInput) pmaxInput.value = '';

  const saleCheckbox = document.getElementById('filter-sale-only');
  if (saleCheckbox) saleCheckbox.checked = false;

  updateCategoryChipsUI();
  applyFilters();
}

function applyFilters() {
  let list = [...allProducts];

  // 1. Search Query
  if (searchQuery) {
    list = list.filter(p => {
      const name = (p.name || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      const desc = (p.desc || '').toLowerCase();
      return name.includes(searchQuery) || id.includes(searchQuery) || desc.includes(searchQuery);
    });
  }

  // 2. Category
  if (currentCategory) {
    list = list.filter(p => {
      if (!p.category) return false;
      if (Array.isArray(p.category)) {
        return p.category.includes(currentCategory);
      }
      return p.category === currentCategory;
    });
  }

  // 3. Price Filter
  if (minPrice !== null && !isNaN(minPrice)) {
    list = list.filter(p => {
      const price = Number(p.salePrice || p.price || 0);
      return price >= minPrice;
    });
  }
  if (maxPrice !== null && !isNaN(maxPrice)) {
    list = list.filter(p => {
      const price = Number(p.salePrice || p.price || 0);
      return price <= maxPrice;
    });
  }

  // 4. Only Sale
  if (onlySale) {
    list = list.filter(p => p.salePrice && p.salePrice < p.price);
  }

  // 5. Sorting
  if (currentSort === 'price-asc') {
    list.sort((a, b) => (a.salePrice || a.price || 0) - (b.salePrice || b.price || 0));
  } else if (currentSort === 'price-desc') {
    list.sort((a, b) => (b.salePrice || b.price || 0) - (a.salePrice || a.price || 0));
  } else if (currentSort === 'bestseller') {
    list.sort((a, b) => (b.sold || 0) - (a.sold || 0));
  } else if (currentSort === 'name-asc') {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else {
    // popular or latest
    list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  filteredProducts = list;
  renderCatalogGrid(filteredProducts);
  updateFilterCountBadge(filteredProducts.length);
}

function updateFilterCountBadge(count) {
  const countEl = document.getElementById('catalog-result-count');
  if (countEl) {
    countEl.textContent = `พบ ${count} รายการ`;
  }
}

function renderCatalogGrid(products) {
  const container = document.getElementById('catalog-grid');
  const emptyState = document.getElementById('catalog-empty-state');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  container.innerHTML = '';

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const imageUrl = product.images?.[0] || 'image/placeholder.jpg';
    const price = Number(product.price || 0);
    const salePrice = product.salePrice ? Number(product.salePrice) : null;
    const hasSale = salePrice !== null && salePrice < price;
    const finalPrice = hasSale ? salePrice : price;
    const discount = hasSale ? Math.round(((price - salePrice) / price) * 100) : 0;
    const rating = (product.rating || 4.9).toFixed(1);
    const sold = Number(product.sold || 0).toLocaleString('th-TH');
    const isFav = GyverStore.isFavorite(product.id);

    card.innerHTML = `
      <div class="card-media-wrap">
        <a href="product.html?id=${product.id}">
          <img src="${imageUrl}" alt="${product.name}" loading="lazy" onerror="this.src='image/placeholder.jpg'">
        </a>
        <div class="card-badges">
          ${hasSale ? `<span class="card-badge sale">-${discount}%</span>` : ''}
          ${product.id.startsWith('D') ? `<span class="card-badge tag-3d">3D</span>` : ''}
        </div>
        <button class="btn-wishlist ${isFav ? 'active' : ''}" data-fav-id="${product.id}" title="บันทึกรายการโปรด">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>

      <div class="card-body">
        <div class="card-id-category">
          <span>รหัส: ${product.id}</span>
          <span>${Array.isArray(product.category) ? product.category[0] : ''}</span>
        </div>
        <a href="product.html?id=${product.id}" class="card-title">${product.name}</a>

        <div class="card-rating-sold">
          <span class="rating-stars">★</span>
          <span>${rating}</span>
          <span>·</span>
          <span>ขายแล้ว ${sold} ชิ้น</span>
        </div>

        <div class="card-price-row">
          <div class="card-prices">
            <span class="price-current">฿${finalPrice.toLocaleString('th-TH')}</span>
            ${hasSale ? `<span class="price-original">฿${price.toLocaleString('th-TH')}</span>` : ''}
          </div>
          <div style="display:flex; gap:6px;">
            <button class="card-quick-add" title="ดูตัวอย่างด่วน" style="background:var(--bg-secondary); color:var(--ink-secondary);" onclick='GyverStore.openQuickView(${JSON.stringify(product).replace(/'/g, "&apos;")})'>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="card-quick-add" title="หยิบใส่ตะกร้า" onclick='GyverStore.addToCart({ id: "${product.id}", name: "${product.name}", price: ${finalPrice}, originalPrice: ${price}, image: "${imageUrl}" })'>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    card.querySelector('.btn-wishlist').addEventListener('click', (e) => {
      e.preventDefault();
      GyverStore.toggleFavorite(product);
    });

    container.appendChild(card);
  });
}
