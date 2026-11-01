/* ==========================================================================
   Gyver Home — Index Page Controller
   Loads featured and recommended products, initializes Swiper and interactions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initIndexPage();
});

async function initIndexPage() {
  try {
    const res = await fetch('JSON/products.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const allProducts = await res.json();

    // 1. Featured Products (Trending)
    const featuredContainer = document.getElementById('featured-grid-container');
    if (featuredContainer) {
      // Pick top products with high sold/rating or sale
      const featured = allProducts
        .filter(p => p.images && p.images.length > 0)
        .slice(0, 8);
      renderProductCards(featured, featuredContainer);
    }

    // 2. Recommended / Curated Picks
    const recommendedContainer = document.getElementById('recommended-grid-container');
    if (recommendedContainer) {
      // Shuffle some items from S010 to S060
      const shuffled = [...allProducts]
        .filter(p => p.images && p.images.length > 0)
        .sort(() => 0.5 - Math.random())
        .slice(0, 8);
      renderProductCards(shuffled, recommendedContainer);
    }

    // 3. Made to Order Form Action
    const mtoBtn = document.getElementById('btn-mto-submit');
    if (mtoBtn) {
      mtoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById('mto-spec-input');
        const spec = input ? input.value.trim() : '';
        if (!spec) {
          alert('กรุณากรอกขนาดหรือสเปกที่ต้องการสั่งทำ');
          return;
        }
        GyverStore.showToast('รับข้อมูลแล้ว! เจ้าหน้าที่จะติดต่อกลับผ่าน LINE ทันที');
        if (input) input.value = '';
      });
    }

    // 4. Newsletter Voucher
    const newsBtn = document.getElementById('btn-newsletter-claim');
    if (newsBtn) {
      newsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById('news-email-input');
        const email = input ? input.value.trim() : '';
        if (!email || !email.includes('@')) {
          alert('กรุณากรอกอีเมลที่ถูกต้อง');
          return;
        }
        alert('ยินดีด้วย! คุณได้รับโค้ดส่วนลด "GYVER100" (ลด 100 บาท เมื่อซื้อครบ 500 บาท)');
        GyverStore.showToast('รับคูปองส่วนลด 100.- เรียบร้อยแล้ว');
        if (input) input.value = '';
      });
    }

  } catch (error) {
    console.error('Error loading index products:', error);
  }
}

function renderProductCards(products, container) {
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
          ${product.id.startsWith('D') ? `<span class="card-badge tag-3d">3D MODEL</span>` : ''}
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
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
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

    // Hook wishlist heart toggle
    card.querySelector('.btn-wishlist').addEventListener('click', (e) => {
      e.preventDefault();
      GyverStore.toggleFavorite(product);
    });

    container.appendChild(card);
  });
}
