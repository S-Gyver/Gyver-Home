// JS/Catalog.js

// ---------- state กลางที่ไฟล์อื่นใช้ร่วม ----------
let allProducts = [];   // สินค้าทั้งหมด
let filtered = [];      // สินค้าหลังกรอง
let page = 1;           // ไม่ได้ใช้แบ่งหน้าแล้ว แต่เก็บไว้ใน URL ได้

document.addEventListener('DOMContentLoaded', () => {
    loadCatalog();
});

// ดึงค่าจาก query string เช่น ?q=หิ้งพระ&cat=ชั้นวาง
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);

    return {
        q:    params.get('q')    || "",
        cat:  params.get('cat')  || "",
        sort: params.get('sort') || "",
        pmin: params.get('pmin') || "",
        pmax: params.get('pmax') || "",
        page: params.get('page') || ""
    };
}

async function loadCatalog() {
    try {
        const response = await fetch('JSON/3d-products.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // โหลดข้อมูลสินค้า
        allProducts = await response.json();

        // เรียงขั้นต้นตาม id S001,S002,...
        allProducts.sort((a, b) => a.id.localeCompare(b.id));

        // ตั้งค่าเริ่มต้น
        filtered = allProducts.slice();
        page = 1;

        // อ่านค่า query จาก URL (เช่น มาจากหน้า index ตอนกดค้นหา)
        const query = getQueryParams();

        // map ค่านั้นกลับเข้า UI filter ในหน้านี้
        const qInput     = document.getElementById("q");
        const catSelect  = document.getElementById("category");
        const sortSelect = document.getElementById("sort");
        const pminInput  = document.getElementById("pmin");
        const pmaxInput  = document.getElementById("pmax");

        if (qInput && query.q)        qInput.value = query.q;
        if (catSelect && query.cat)   catSelect.value = query.cat;
        if (sortSelect && query.sort) sortSelect.value = query.sort;
        if (pminInput && query.pmin)  pminInput.value = query.pmin;
        if (pmaxInput && query.pmax)  pmaxInput.value = query.pmax;

        // วาดครั้งแรก (กันหน้าโล่ง)
        renderGrid(filtered);

        // ผูก event ของฟิลเตอร์ และเรียก applyFilters() รอบแรก
        // initFilters() อยู่ใน Filters.js
        if (typeof initFilters === "function") {
            initFilters();
        } else {
            console.warn("initFilters() ยังไม่พร้อมตอนโหลด");
        }

    } catch (error) {
        console.error('ไม่สามารถโหลดข้อมูลสินค้าได้:', error);
    }
}

// วาดสินค้าทั้งหมด (ไม่มีแบ่งหน้าแล้ว)
function renderGrid(list) {
    const gridContainer = document.getElementById('product-grid-container');
    if (!gridContainer) {
        console.error('Error: ไม่พบ "#product-grid-container"');
        return;
    }

    gridContainer.innerHTML = '';

    list.forEach(product => {
        const card = createProductCard(product);
        gridContainer.appendChild(card);
    });

    const countElement = document.getElementById('count');
    if (countElement) {
        countElement.textContent = list.length;
    }
}

// สร้างการ์ดสินค้า 1 ชิ้น
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const imageUrl = (product.images && product.images.length > 0)
        ? product.images[0]
        : 'image/placeholder.jpg'; // ตามโปรเจกต์ของหนูมี placeholder.jpg

    const price = Number(product.price || 0);
    const salePrice = product.salePrice ? Number(product.salePrice) : null;

    const hasSale = salePrice !== null && salePrice < price;
    const finalPrice = hasSale ? salePrice : price;

    let discountPercent = 0;
    if (hasSale) {
        discountPercent = Math.round(((price - salePrice) / price) * 100);
    }

    const rating = (product.rating || 4.9).toFixed(1);
    const sold = Number(product.sold || 0).toLocaleString('th-TH');

    card.innerHTML = `
      <a href="3D-measure.html?id=${product.id}">
        <img class="card-img" src="${imageUrl}" alt="${product.name || 'รูปสินค้า'}">
      </a>
      
      <div class="card-content">
        <a href="3D-measure.html?id=${product.id}" class="card-title">
          ${product.id +' '+ product.name || 'ไม่มีชื่อสินค้า'}
        </a>

        <div class="meta">
          <span class="star">★</span>
          <span class="rating">${rating}</span>
          <span>·</span>
          <span class="sold">ขายแล้ว ${sold}</span>
        </div>

        <div class="price-line">
          <span class="price-current">฿ ${finalPrice.toLocaleString('th-TH')}</span>
          ${hasSale ? `<span class="price-old">฿ ${price.toLocaleString('th-TH')}</span>` : ''}
          ${hasSale ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
        </div>
      </div>
    `;
    return card;
}

// อัปเดต URL ให้สวย (เวลาผู้ใช้เปลี่ยนตัวกรองในหน้า catalog เอง)
function updateURL(params) {
    const searchParams = new URLSearchParams();

    if (params.q)    searchParams.set('q', params.q);
    if (params.cat)  searchParams.set('cat', params.cat);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.pmin) searchParams.set('pmin', params.pmin);
    if (params.pmax) searchParams.set('pmax', params.pmax);
    if (params.page) searchParams.set('page', params.page);

    const newUrl = window.location.pathname + '?' + searchParams.toString();
    history.replaceState(null, '', newUrl);
}
