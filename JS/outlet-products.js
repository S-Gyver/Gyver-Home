/* =============================================
 * JS/outlet-products.js
 * (ฉบับ "v4 Final" - อ่าน "grade" และ "reason")
 * (และ "แก้บั๊ก" .toFixed ที่ "rating")
 * ============================================= */

// ---------- state กลาง ----------
let allProducts = [];   // สินค้า outlet ทั้งหมด
let filtered = [];  // สินค้าหลังกรอง

document.addEventListener('DOMContentLoaded', () => {
  loadCatalog();
});

// (ฟังก์ชัน getQueryParams ... เหมือนเดิม)
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get('q') || "",
    cat: params.get('cat') || "",
    sort: params.get('sort') || "",
    pmin: params.get('pmin') || "",
    pmax: params.get('pmax') || "",
    page: params.get('page') || ""
  };
}

async function loadCatalog() {
  try {
    // (ถูกต้อง!) ดึง "outlet.json"
    const response = await fetch('JSON/outlet.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    allProducts = await response.json();
    allProducts.sort((a, b) => a.id.localeCompare(b.id));
    filtered = allProducts.slice();

    // (Map ค่า query... เหมือนเดิม)
    const query = getQueryParams();
    const qInput = document.getElementById("q");
    const catSelect = document.getElementById("category");
    const sortSelect = document.getElementById("sort");
    const pminInput = document.getElementById("pmin");
    const pmaxInput = document.getElementById("pmax");
    if (qInput && query.q) qInput.value = query.q;
    if (catSelect && query.cat) catSelect.value = query.cat;
    if (sortSelect && query.sort) sortSelect.value = query.sort;
    if (pminInput && query.pmin) pminInput.value = query.pmin;
    if (pmaxInput && query.pmax) pmaxInput.value = query.pmax;

    // วาดครั้งแรก
    renderGrid(filtered);

    // ผูก event ของฟิลเตอร์
    if (typeof initFilters === "function") {
      initFilters();
    }
  } catch (error) {
    console.error('ไม่สามารถโหลดข้อมูล outlet ได้:', error);
  }
}

// (ฟังก์ชัน renderGrid ... เหมือนเดิม)
function renderGrid(list) {
  const gridContainer = document.getElementById('product-grid-container');
  if (!gridContainer) { return; }
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

// ⭐️⭐️⭐️ (นี่คือ "ฟังก์ชัน" createProductCard ที่ "ถูกต้อง") ⭐️⭐️⭐️
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card outlet-card'; // (เพิ่มคลาส "outlet-card")

  // (1. "ป้ายเกรด" - อ่าน "product.grade" (ตัวอักษร))
  const outletGrade = product.grade || "สินค้า outlet";
  const gradeBadge = document.createElement('span');
  gradeBadge.className = 'outlet-grade-badge';
  gradeBadge.textContent = outletGrade;
  // (เราจะ "แปะ" (appendChild) มันทีหลังสุด)

  // (ดึงรูป ... เหมือนเดิม)
  const imageUrl = (product.images && product.images.length > 0)
    ? product.images[0]
    : 'image/placeholder.jpg';

  // (โค้ด "ราคา" ... เหมือนเดิม)
  const price = Number(product.price || 0);
  const salePrice = product.salePrice ? Number(product.salePrice) : null;
  const hasSale = salePrice !== null && salePrice < price;
  const finalPrice = hasSale ? salePrice : price;
  let discountPercent = 0;
  if (hasSale) {
    discountPercent = Math.round(((price - salePrice) / price) * 100);
  }

  // ⭐️ (แก้บั๊ก .toFixed - "ที่นี่" ครับ) ⭐️
  // (เรา "แปลง" `product.rating` (ตัวเลข) ... ไม่ใช่ `product.grade` (ตัวอักษร))
  const rating = Number(product.rating || 4.9).toFixed(1);
  const sold = Number(product.sold || 0).toLocaleString('th-TH');

  // (1. สร้าง Link หุ้มรูป)
  const linkAnchor = document.createElement('a');
  linkAnchor.href = `outlet-product.html?id=${product.id}`; // (ชี้ไปหน้า 2D)

  // (2. สร้าง รูป)
  const img = document.createElement('img');
  img.className = 'card-img';
  img.src = imageUrl;
  img.alt = `${product.id} - ${product.name}`;
  linkAnchor.appendChild(img);

  // (3. สร้าง เนื้อหา)
  const contentDiv = document.createElement('div');
  contentDiv.className = 'card-content';

  // ⭐️ (4. "ดึง" เหตุผล (Reason) - อ่าน "product.reason" (ตัวอักษร)) ⭐️
  const outletReason = product.reason || ""; // (ดึงจาก JSON)
  const reasonHtml = outletReason
    ? `<div class="outlet-reason"><strong>สาเหตุ:</strong> ${outletReason}</div>`
    : "";

  contentDiv.innerHTML = `
        <a href="outlet-product.html?id=${product.id}" class="card-title">
          ${product.name || 'ไม่มีชื่อสินค้า'}
        </a>
        
        ${reasonHtml} 
        
        <div class="meta">
          <span class="grade-label">grade:</span>
          <span class="grade">${outletGrade}</span>
          </div>
        
        <div class="price-line">
          <span class="price-current">฿ ${finalPrice.toLocaleString('th-TH')}</span>
          ${hasSale ? `<span class="price-old">฿ ${price.toLocaleString('th-TH')}</span>` : ''}
          ${hasSale ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
        </div>
    `;

  // (6. "ประกอบร่าง" การ์ด)
  card.appendChild(gradeBadge);  // (ป้ายเกรด)
  card.appendChild(linkAnchor);  // (Link หุ้มรูป)
  card.appendChild(contentDiv);  // (เนื้อหา)

  return card;
}

// (ฟังก์ชัน updateURL ... เหมือนเดิม)
function updateURL(params) {
  // ... (โค้ด updateURL เดิม)
}