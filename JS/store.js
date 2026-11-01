/* ==========================================================================
   Gyver Home — Store & Application State Manager
   Cart, Wishlist, Slide-Over Drawer, Toast, and Shared Components
   ========================================================================== */

const GyverStore = (() => {
  const CART_KEY = 'gyver_cart_v1';
  const FAV_KEY = 'gyver_favorites_v1';
  const PRODUCTS_CACHE_KEY = 'gyver_products_cache';

  // State
  let cart = [];
  let favorites = [];
  let allProducts = [];

  // Init
  function init() {
    loadCart();
    loadFavorites();
    injectCartDrawer();
    injectToastContainer();
    injectQuickViewModal();
    updateUIBadges();
    setupGlobalSearch();
    preloadProducts();

    // Listen to storage events across tabs
    window.addEventListener('storage', (e) => {
      if (e.key === CART_KEY) {
        loadCart();
        renderCartDrawer();
        updateUIBadges();
      } else if (e.key === FAV_KEY) {
        loadFavorites();
        updateUIBadges();
        updateWishlistHeartIcons();
      }
    });
  }

  /* ------------------- Cart Logic ------------------- */
  function loadCart() {
    try {
      const data = localStorage.getItem(CART_KEY);
      cart = data ? JSON.parse(data) : [];
    } catch (e) {
      cart = [];
    }
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateUIBadges();
    renderCartDrawer();
    window.dispatchEvent(new CustomEvent('gyver:cart-updated', { detail: { cart } }));
  }

  function addToCart(item, openDrawer = true) {
    // item: { id, name, price, originalPrice, image, variant, quantity }
    const existingIndex = cart.findIndex(
      (i) => i.id === item.id && (i.variant || '') === (item.variant || '')
    );

    const qtyToAdd = item.quantity || 1;

    if (existingIndex > -1) {
      cart[existingIndex].quantity += qtyToAdd;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: Number(item.price || 0),
        originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
        image: item.image || 'image/placeholder.jpg',
        variant: item.variant || null,
        quantity: qtyToAdd,
      });
    }

    saveCart();
    showToast(`เพิ่ม "${item.name}" ลงในตะกร้าแล้ว`);

    if (openDrawer) {
      openCartDrawer();
    }
  }

  function updateItemQty(index, delta) {
    if (!cart[index]) return;
    const newQty = cart[index].quantity + delta;
    if (newQty <= 0) {
      removeFromCart(index);
    } else {
      cart[index].quantity = newQty;
      saveCart();
    }
  }

  function removeFromCart(index) {
    if (!cart[index]) return;
    const name = cart[index].name;
    cart.splice(index, 1);
    saveCart();
    showToast(`ลบ "${name}" ออกจากตะกร้าแล้ว`);
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function getCartCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  /* ------------------- Favorites Logic ------------------- */
  function loadFavorites() {
    try {
      const data = localStorage.getItem(FAV_KEY);
      favorites = data ? JSON.parse(data) : [];
    } catch (e) {
      favorites = [];
    }
  }

  function saveFavorites() {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    updateUIBadges();
    updateWishlistHeartIcons();
    window.dispatchEvent(new CustomEvent('gyver:favorites-updated', { detail: { favorites } }));
  }

  function toggleFavorite(product) {
    const id = typeof product === 'string' ? product : product.id;
    const idx = favorites.findIndex((p) => (typeof p === 'string' ? p : p.id) === id);

    if (idx > -1) {
      favorites.splice(idx, 1);
      showToast('นำออกจากรายการโปรดแล้ว');
    } else {
      const itemToSave = typeof product === 'object'
        ? { id: product.id, name: product.name, price: product.price, salePrice: product.salePrice, image: product.images?.[0] }
        : { id };
      favorites.push(itemToSave);
      showToast('บันทึกลงในรายการโปรดแล้ว ❤️');
    }

    saveFavorites();
  }

  function isFavorite(productId) {
    return favorites.some((p) => (typeof p === 'string' ? p : p.id) === productId);
  }

  function updateWishlistHeartIcons() {
    document.querySelectorAll('[data-fav-id]').forEach((btn) => {
      const id = btn.getAttribute('data-fav-id');
      if (isFavorite(id)) {
        btn.classList.add('active');
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
      } else {
        btn.classList.remove('active');
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
      }
    });
  }

  function updateUIBadges() {
    const cartCount = getCartCount();
    const favCount = favorites.length;

    document.querySelectorAll('.cart-badge-count, .cart-count').forEach((el) => {
      el.textContent = cartCount;
      el.style.display = cartCount > 0 ? 'inline-flex' : 'none';
    });

    document.querySelectorAll('.fav-badge-count, .fav-count').forEach((el) => {
      el.textContent = favCount;
      el.style.display = favCount > 0 ? 'inline-flex' : 'none';
    });
  }

  /* ------------------- Cart Drawer UI ------------------- */
  function injectCartDrawer() {
    if (document.getElementById('gyver-cart-drawer')) return;

    const drawerHtml = `
      <div id="gyver-cart-backdrop" class="cart-backdrop"></div>
      <aside id="gyver-cart-drawer" class="cart-drawer" aria-label="ตะกร้าสินค้า">
        <div class="cart-header">
          <h3>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            ตะกร้าสินค้า (<span id="drawer-item-count">0</span>)
          </h3>
          <button class="btn-close-drawer" id="btn-close-cart" aria-label="ปิดตะกร้า">✕</button>
        </div>
        
        <div class="cart-items-container" id="drawer-items-list">
          <!-- Items will render here -->
        </div>

        <div class="cart-footer">
          <div class="cart-summary-line">
            <span>ยอดรวมสินค้า</span>
            <span id="drawer-subtotal">฿0</span>
          </div>
          <div class="cart-summary-line">
            <span>ค่าจัดส่ง</span>
            <span id="drawer-shipping" style="color: var(--brand-sage); font-weight:600;">ฟรี (ยอดเกิน 990.-)</span>
          </div>
          <div class="cart-summary-line total">
            <span>ยอดชำระทั้งหมด</span>
            <span class="total-amount" id="drawer-total">฿0</span>
          </div>
          <button class="btn-checkout" id="btn-cart-checkout">ดำเนินการสั่งซื้อ (Checkout)</button>
        </div>
      </aside>
    `;

    document.body.insertAdjacentHTML('beforeend', drawerHtml);

    document.getElementById('btn-close-cart')?.addEventListener('click', closeCartDrawer);
    document.getElementById('gyver-cart-backdrop')?.addEventListener('click', closeCartDrawer);

    // Global listener for opening cart
    document.querySelectorAll('[data-open-cart]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openCartDrawer();
      });
    });

    document.getElementById('btn-cart-checkout')?.addEventListener('click', () => {
      if (cart.length === 0) {
        alert('ตะกร้าของคุณยังว่างอยู่');
        return;
      }
      alert('ขอบคุณที่สนใจสั่งซื้อสินค้า Gyver Home!\nระบบจะนำท่านเข้าสู่ขั้นตอนกรอกที่อยู่จัดส่งและชำระเงิน');
    });

    renderCartDrawer();
  }

  function openCartDrawer() {
    renderCartDrawer();
    document.getElementById('gyver-cart-backdrop')?.classList.add('open');
    document.getElementById('gyver-cart-drawer')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    document.getElementById('gyver-cart-backdrop')?.classList.remove('open');
    document.getElementById('gyver-cart-drawer')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderCartDrawer() {
    const listEl = document.getElementById('drawer-items-list');
    const subtotalEl = document.getElementById('drawer-subtotal');
    const shippingEl = document.getElementById('drawer-shipping');
    const totalEl = document.getElementById('drawer-total');
    const countEl = document.getElementById('drawer-item-count');

    if (!listEl) return;

    countEl.textContent = getCartCount();

    if (cart.length === 0) {
      listEl.innerHTML = `
        <div class="cart-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p style="font-weight:600; margin-bottom: 6px; color: var(--ink-secondary);">ตะกร้าสินค้ายังว่างอยู่</p>
          <p style="font-size:0.85rem;">เลือกชมของแต่งบ้านงานไม้แฮนด์เมดเพื่อเพิ่มลงในตะกร้า</p>
        </div>
      `;
      subtotalEl.textContent = '฿0';
      totalEl.textContent = '฿0';
      return;
    }

    const subtotal = getCartTotal();
    const shipping = subtotal >= 990 ? 0 : 45;
    const finalTotal = subtotal + shipping;

    subtotalEl.textContent = `฿${subtotal.toLocaleString('th-TH')}`;
    shippingEl.textContent = shipping === 0 ? 'ฟรี (ยอดเกิน 990.-)' : `฿${shipping}`;
    totalEl.textContent = `฿${finalTotal.toLocaleString('th-TH')}`;

    listEl.innerHTML = cart
      .map(
        (item, idx) => `
        <div class="cart-item">
          <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='image/placeholder.jpg'">
          <div class="cart-item-details">
            <div class="cart-item-title">${item.name}</div>
            ${item.variant ? `<div class="cart-item-variant">แบบ: ${item.variant}</div>` : ''}
            <div class="cart-item-bottom">
              <div class="qty-control">
                <button type="button" onclick="GyverStore.updateItemQty(${idx}, -1)">−</button>
                <span>${item.quantity}</span>
                <button type="button" onclick="GyverStore.updateItemQty(${idx}, 1)">+</button>
              </div>
              <div class="cart-item-price">฿${(item.price * item.quantity).toLocaleString('th-TH')}</div>
            </div>
          </div>
        </div>
      `
      )
      .join('');
  }

  /* ------------------- Toast Notification ------------------- */
  function injectToastContainer() {
    if (document.getElementById('gyver-toast-container')) return;
    const container = document.createElement('div');
    container.id = 'gyver-toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  function showToast(message, duration = 2800) {
    const container = document.getElementById('gyver-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'gyver-toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#68D391" stroke-width="2.5">
        <path d="M20 6L9 17l-5-5"></path>
      </svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  /* ------------------- Quick View Modal ------------------- */
  function injectQuickViewModal() {
    if (document.getElementById('gyver-quick-modal')) return;
    const modalHtml = `
      <div id="gyver-quick-backdrop" class="cart-backdrop"></div>
      <div id="gyver-quick-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#fff; border-radius:20px; max-width:800px; width:92%; z-index:210; box-shadow:0 25px 60px rgba(0,0,0,0.25); overflow:hidden;">
        <button id="btn-close-quick" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:1.5rem; cursor:pointer; z-index:10;">✕</button>
        <div id="quick-modal-body" style="display:flex; flex-wrap:wrap;"></div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('btn-close-quick')?.addEventListener('click', closeQuickView);
    document.getElementById('gyver-quick-backdrop')?.addEventListener('click', closeQuickView);
  }

  function openQuickView(product) {
    const modal = document.getElementById('gyver-quick-modal');
    const backdrop = document.getElementById('gyver-quick-backdrop');
    const body = document.getElementById('quick-modal-body');
    if (!modal || !body) return;

    const finalPrice = product.salePrice || product.price;
    const hasDiscount = product.salePrice && product.salePrice < product.price;
    const discount = hasDiscount ? Math.round(((product.price - product.salePrice) / product.price) * 100) : 0;
    const imgUrl = product.images?.[0] || 'image/placeholder.jpg';

    body.innerHTML = `
      <div style="flex:1; min-width:300px; background:#f7f4f0; padding:20px; display:flex; align-items:center; justify-content:center;">
        <img src="${imgUrl}" alt="${product.name}" style="max-height:360px; object-fit:contain; border-radius:12px;">
      </div>
      <div style="flex:1.2; min-width:300px; padding:32px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <span style="font-size:0.75rem; color:#966138; font-weight:700; text-transform:uppercase;">${product.id} • ${Array.isArray(product.category) ? product.category.join(', ') : 'ของแต่งบ้าน'}</span>
          <h2 style="font-size:1.4rem; margin:8px 0 12px; line-height:1.3;">${product.name}</h2>
          
          <div style="display:flex; align-items:baseline; gap:10px; margin-bottom:16px;">
            <span style="font-size:1.6rem; font-weight:800; color:#6E3F19;">฿${Number(finalPrice).toLocaleString('th-TH')}</span>
            ${hasDiscount ? `<span style="font-size:1rem; text-decoration:line-through; color:#A8A29E;">฿${Number(product.price).toLocaleString('th-TH')}</span>` : ''}
            ${hasDiscount ? `<span style="background:#C85A32; color:#fff; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:6px;">-${discount}%</span>` : ''}
          </div>

          <p style="font-size:0.9rem; color:#57534E; line-height:1.6; margin-bottom:20px;">
            ${product.desc || 'งานไม้คุณภาพระดับพรีเมียม ผ่านการคัดสรรเนื้อไม้อย่างพิถีพิถัน ขัดและเคลือบผิวอย่างประณีต เพื่อความทนทานและสวยงามตามธรรมชาติ'}
          </p>
        </div>

        <div>
          <button id="quick-add-cart-btn" style="width:100%; padding:14px; background:#6E3F19; color:#fff; border:none; border-radius:10px; font-weight:700; font-size:1rem; cursor:pointer; margin-bottom:10px;">
            เพิ่มลงในตะกร้า (฿${Number(finalPrice).toLocaleString('th-TH')})
          </button>
          <a href="product.html?id=${product.id}" style="display:block; text-align:center; font-size:0.88rem; color:#6E3F19; font-weight:600; text-decoration:underline;">
            ดูรายละเอียดสินค้าทั้งหมด
          </a>
        </div>
      </div>
    `;

    document.getElementById('quick-add-cart-btn')?.addEventListener('click', () => {
      addToCart({
        id: product.id,
        name: product.name,
        price: finalPrice,
        originalPrice: product.price,
        image: imgUrl,
        quantity: 1,
      });
      closeQuickView();
    });

    backdrop.classList.add('open');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeQuickView() {
    const modal = document.getElementById('gyver-quick-modal');
    const backdrop = document.getElementById('gyver-quick-backdrop');
    if (modal) modal.style.display = 'none';
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ------------------- Global Fast Search ------------------- */
  async function preloadProducts() {
    try {
      const res = await fetch('JSON/products.json');
      if (res.ok) {
        allProducts = await res.json();
      }
    } catch (e) {
      console.warn('Cannot preload products', e);
    }
  }

  function setupGlobalSearch() {
    const searchInputs = document.querySelectorAll('.header-search input');
    searchInputs.forEach((input) => {
      const container = input.closest('.header-search');
      if (!container) return;

      let dropdown = container.querySelector('.search-dropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'search-dropdown';
        container.appendChild(dropdown);
      }

      input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        if (query.length < 1) {
          dropdown.classList.remove('active');
          return;
        }

        const matches = allProducts
          .filter(
            (p) =>
              p.name.toLowerCase().includes(query) ||
              p.id.toLowerCase().includes(query) ||
              (p.category && p.category.some((c) => c.toLowerCase().includes(query)))
          )
          .slice(0, 6);

        if (matches.length === 0) {
          dropdown.innerHTML = `<div style="padding:10px; font-size:0.85rem; color:#78716C; text-align:center;">ไม่พบสินค้าที่ตรงกับ "${query}"</div>`;
        } else {
          dropdown.innerHTML = matches
            .map((p) => {
              const price = p.salePrice || p.price;
              const img = p.images?.[0] || 'image/placeholder.jpg';
              return `
                <a href="product.html?id=${p.id}" style="display:flex; align-items:center; gap:12px; padding:8px; border-radius:8px; transition:background 0.2s;" onmouseover="this.style.background='#F5EFEB'" onmouseout="this.style.background='transparent'">
                  <img src="${img}" style="width:42px; height:42px; border-radius:6px; object-fit:cover;" onerror="this.src='image/placeholder.jpg'">
                  <div style="flex:1;">
                    <div style="font-size:0.875rem; font-weight:600; color:#1C1917; line-height:1.2;">${p.name}</div>
                    <div style="font-size:0.75rem; color:#78716C;">รหัส: ${p.id}</div>
                  </div>
                  <div style="font-size:0.9rem; font-weight:700; color:#6E3F19;">฿${Number(price).toLocaleString('th-TH')}</div>
                </a>
              `;
            })
            .join('');
        }
        dropdown.classList.add('active');
      });

      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    });
  }

  // Public API
  return {
    init,
    addToCart,
    removeFromCart,
    updateItemQty,
    openCartDrawer,
    closeCartDrawer,
    toggleFavorite,
    isFavorite,
    openQuickView,
    showToast,
    getAllProducts: () => allProducts,
    getCart: () => cart,
    getFavorites: () => favorites,
  };
})();

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', GyverStore.init);
