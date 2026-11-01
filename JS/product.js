/* ==========================================================================
   Gyver Home — Product Detail Page Controller
   ========================================================================== */

const PID = new URLSearchParams(window.location.search).get("id") || "";

let currentProduct = null;
let variantsList = [];
let selectedVariant = null;
let currentQty = 1;

document.addEventListener("DOMContentLoaded", () => {
  initProductPage();
});

async function initProductPage() {
  if (!PID) {
    document.getElementById("product-title").textContent = "ไม่พบรหัสสินค้า (กรุณาเลือกสินค้าจากหน้าแคตตาล็อก)";
    return;
  }

  try {
    const [pRes, vRes] = await Promise.all([
      fetch("JSON/products.json"),
      fetch("JSON/variants.json")
    ]);

    const allProducts = pRes.ok ? await pRes.json() : [];
    const allVariants = vRes.ok ? await vRes.json() : {};

    currentProduct = allProducts.find(p => p.id.toUpperCase() === PID.toUpperCase());
    variantsList = allVariants[PID] || [];

    if (!currentProduct) {
      document.getElementById("product-title").textContent = `ไม่พบสินค้ารหัส ${PID}`;
      return;
    }

    renderProductDetails(currentProduct);
    renderGallery(currentProduct, variantsList);
    renderVariants(variantsList);
    setupActionButtons();
    renderRelatedProducts(allProducts);

  } catch (err) {
    console.error("Error loading product:", err);
  }
}

function renderProductDetails(product) {
  // Title & SKU
  document.title = `${product.name} — Gyver Home`;
  document.getElementById("product-title").textContent = product.name;
  document.getElementById("product-sku").textContent = `รหัสสินค้า: ${product.id}`;
  
  const catEl = document.getElementById("product-category-crumb");
  if (catEl && product.category) {
    catEl.textContent = Array.isArray(product.category) ? product.category.join(" • ") : product.category;
  }

  // Rating & Sold
  const ratingEl = document.getElementById("product-rating");
  if (ratingEl) ratingEl.textContent = (product.rating || 4.9).toFixed(1);

  const soldEl = document.getElementById("product-sold");
  if (soldEl) soldEl.textContent = `ขายแล้ว ${(product.sold || 0).toLocaleString("th-TH")} ชิ้น`;

  // Description
  const descEl = document.getElementById("product-desc-text");
  if (descEl) {
    descEl.textContent = product.desc || "ชิ้นงานไม้แท้แฮนด์เมด ผ่านการคัดสรรเกรดไม้ ขัดผิวเนียนเรียบ และเคลือบสารกันน้ำกันเชื้อรา คงทน สวยงาม เหมาะสำหรับการตกแต่งบ้านทุกสไตล์";
  }

  // Update Wishlist button state
  const favBtn = document.getElementById("btn-product-fav");
  if (favBtn) {
    favBtn.setAttribute("data-fav-id", product.id);
    updateFavButtonUI(favBtn, GyverStore.isFavorite(product.id));
    favBtn.addEventListener("click", () => {
      GyverStore.toggleFavorite(product);
      updateFavButtonUI(favBtn, GyverStore.isFavorite(product.id));
    });
  }

  updatePriceUI();
}

function updateFavButtonUI(btn, isFav) {
  if (isFav) {
    btn.classList.add("active");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <span>บันทึกแล้วในรายการโปรด</span>
    `;
  } else {
    btn.classList.remove("active");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <span>บันทึกในรายการโปรด</span>
    `;
  }
}

function renderGallery(product, variants) {
  const mainImg = document.getElementById("main-product-img");
  const thumbsContainer = document.getElementById("gallery-thumbs");
  if (!mainImg || !thumbsContainer) return;

  const images = new Set();
  if (Array.isArray(product.images)) {
    product.images.forEach(img => img && images.add(img));
  }
  if (Array.isArray(variants)) {
    variants.forEach(v => v && v.image && images.add(v.image));
  }

  const imgList = images.size > 0 ? [...images] : ["image/placeholder.jpg"];

  // Set default main image
  mainImg.src = imgList[0];
  thumbsContainer.innerHTML = "";

  imgList.forEach((src, idx) => {
    const thumb = document.createElement("button");
    thumb.className = `thumb-btn ${idx === 0 ? "active" : ""}`;
    thumb.innerHTML = `<img src="${src}" alt="มุมมอง ${idx + 1}" onerror="this.src='image/placeholder.jpg'">`;
    thumb.addEventListener("click", () => {
      mainImg.src = src;
      thumbsContainer.querySelectorAll(".thumb-btn").forEach(t => t.classList.remove("active"));
      thumb.classList.add("active");
    });
    thumbsContainer.appendChild(thumb);
  });
}

function renderVariants(variants) {
  const container = document.getElementById("variant-options-box");
  const variantSection = document.getElementById("variant-selection-section");
  if (!container || !variantSection) return;

  if (!variants || variants.length === 0) {
    variantSection.style.display = "none";
    return;
  }

  variantSection.style.display = "block";
  container.innerHTML = "";

  // Set first variant as default
  selectedVariant = variants[0];

  variants.forEach((v, idx) => {
    const btn = document.createElement("button");
    btn.className = `variant-chip ${idx === 0 ? "active" : ""}`;
    btn.textContent = v.label || `แบบ ${idx + 1}`;
    btn.addEventListener("click", () => {
      selectedVariant = v;
      container.querySelectorAll(".variant-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // If variant has specific image, switch main img
      if (v.image) {
        const mainImg = document.getElementById("main-product-img");
        if (mainImg) mainImg.src = v.image;
      }

      updatePriceUI();
    });
    container.appendChild(btn);
  });
}

function updatePriceUI() {
  const currentPriceEl = document.getElementById("price-current-display");
  const origPriceEl = document.getElementById("price-orig-display");
  const badgeEl = document.getElementById("badge-discount-display");
  if (!currentPriceEl) return;

  let basePrice = currentProduct.price;
  let salePrice = currentProduct.salePrice;

  // If variant overrides price
  if (selectedVariant) {
    if (selectedVariant.price !== undefined) basePrice = selectedVariant.price;
    if (selectedVariant.salePrice !== undefined) salePrice = selectedVariant.salePrice;
  }

  const hasSale = salePrice && salePrice < basePrice;
  const finalPrice = hasSale ? salePrice : basePrice;

  currentPriceEl.textContent = `฿${Number(finalPrice).toLocaleString("th-TH")}`;

  if (hasSale) {
    const discount = Math.round(((basePrice - salePrice) / basePrice) * 100);
    origPriceEl.style.display = "inline";
    origPriceEl.textContent = `฿${Number(basePrice).toLocaleString("th-TH")}`;
    badgeEl.style.display = "inline-block";
    badgeEl.textContent = `ประหยัด ${discount}%`;
  } else {
    origPriceEl.style.display = "none";
    badgeEl.style.display = "none";
  }
}

function setupActionButtons() {
  // Quantity buttons
  const qtyInput = document.getElementById("product-qty-input");
  const btnMinus = document.getElementById("btn-qty-minus");
  const btnPlus = document.getElementById("btn-qty-plus");

  if (btnMinus && btnPlus && qtyInput) {
    btnMinus.addEventListener("click", () => {
      if (currentQty > 1) {
        currentQty--;
        qtyInput.value = currentQty;
      }
    });

    btnPlus.addEventListener("click", () => {
      currentQty++;
      qtyInput.value = currentQty;
    });

    qtyInput.addEventListener("change", () => {
      const val = parseInt(qtyInput.value, 10);
      currentQty = isNaN(val) || val < 1 ? 1 : val;
      qtyInput.value = currentQty;
    });
  }

  // Add to cart
  const addCartBtn = document.getElementById("btn-add-to-cart");
  if (addCartBtn) {
    addCartBtn.addEventListener("click", () => {
      let finalPrice = currentProduct.salePrice || currentProduct.price;
      if (selectedVariant && selectedVariant.salePrice) finalPrice = selectedVariant.salePrice;
      else if (selectedVariant && selectedVariant.price) finalPrice = selectedVariant.price;

      GyverStore.addToCart({
        id: currentProduct.id,
        name: currentProduct.name,
        price: finalPrice,
        originalPrice: currentProduct.price,
        image: currentProduct.images?.[0] || selectedVariant?.image || "image/placeholder.jpg",
        variant: selectedVariant?.label || null,
        quantity: currentQty
      }, true); // opens drawer
    });
  }

  // Buy now
  const buyNowBtn = document.getElementById("btn-buy-now");
  if (buyNowBtn) {
    buyNowBtn.addEventListener("click", () => {
      let finalPrice = currentProduct.salePrice || currentProduct.price;
      if (selectedVariant && selectedVariant.salePrice) finalPrice = selectedVariant.salePrice;
      else if (selectedVariant && selectedVariant.price) finalPrice = selectedVariant.price;

      GyverStore.addToCart({
        id: currentProduct.id,
        name: currentProduct.name,
        price: finalPrice,
        originalPrice: currentProduct.price,
        image: currentProduct.images?.[0] || selectedVariant?.image || "image/placeholder.jpg",
        variant: selectedVariant?.label || null,
        quantity: currentQty
      }, true);
    });
  }

  // Copy link
  const copyBtn = document.getElementById("btn-copy-link");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        GyverStore.showToast("คัดลอกลิงก์สินค้าเรียบร้อยแล้ว");
      });
    });
  }
}

function renderRelatedProducts(allProducts) {
  const container = document.getElementById("related-products-grid");
  if (!container) return;

  const related = allProducts
    .filter(p => p.id !== PID && p.images && p.images.length > 0)
    .sort(() => 0.5 - Math.random())
    .slice(0, 4);

  container.innerHTML = "";

  related.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    const finalPrice = product.salePrice || product.price;
    const hasSale = product.salePrice && product.salePrice < product.price;
    const imgUrl = product.images?.[0] || "image/placeholder.jpg";

    card.innerHTML = `
      <div class="card-media-wrap">
        <a href="product.html?id=${product.id}">
          <img src="${imgUrl}" alt="${product.name}" onerror="this.src='image/placeholder.jpg'">
        </a>
      </div>
      <div class="card-body">
        <a href="product.html?id=${product.id}" class="card-title">${product.name}</a>
        <div class="card-price-row">
          <div class="card-prices">
            <span class="price-current">฿${Number(finalPrice).toLocaleString("th-TH")}</span>
            ${hasSale ? `<span class="price-original">฿${Number(product.price).toLocaleString("th-TH")}</span>` : ""}
          </div>
          <button class="card-quick-add" onclick='GyverStore.addToCart({ id: "${product.id}", name: "${product.name}", price: ${finalPrice}, image: "${imgUrl}" })'>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}
