/*
  ▼▼▼ นี่คือโค้ดใหม่ทั้งหมดที่ต้องอยู่ใน JS/index.js ▼▼▼
*/

// 1. รอให้ HTML โหลดเสร็จ แล้วเริ่มทำงาน
document.addEventListener('DOMContentLoaded', () => {
  initializeApp(); // <--- เรียกฟังก์ชันหลักอันใหม่
});

/**
 * ฟังก์ชันหลัก: ดึงข้อมูล JSON แค่ครั้งเดียว
 */
async function initializeApp() {
  try {
    // 1.1 ดึงข้อมูลสินค้าทั้งหมด
    const response = await fetch('JSON/products.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const allProducts = await response.json();

    // 1.2 สร้าง "Pool" (S001-S070) ที่เราจะใช้สุ่ม
    const targetIdsS001toS070 = [];
    for (let i = 1; i <= 70; i++) {
      const id = 'S' + String(i).padStart(3, '0');
      targetIdsS001toS070.push(id);
    }
    const productPool = allProducts.filter(product => {
      return targetIdsS001toS070.includes(product.id);
    });

    // 1.3 เรียกใช้ฟังก์ชันสร้างการ์ด (2 ครั้ง!)
    
    // ครั้งที่ 1: สร้าง 5 การ์ด ลงในถาด "ของแต่งบ้าน"
    createRandomCards(productPool, 'product-grid-container', 5);

    // ครั้งที่ 2: สร้าง 5 การ์ด ลงในถาด "สินค้าแนะนำ"
    createRandomCards(productPool, 'recommended-grid-container', 5);

  } catch (error) {
    console.error('ไม่สามารถโหลดข้อมูลสินค้าได้:', error);
  }
}


/**
 * ฟังก์ชัน "แม่พิมพ์" สำหรับสุ่มและสร้างการ์ด
 * (ฟังก์ชันนี้ถูกเรียก 2 ครั้งจากข้างบน)
 */
function createRandomCards(productPool, containerId, count) {
  
 // 1. หาถาด
  const gridContainer = document.getElementById(containerId);
  if (!gridContainer) {
    console.error(`Error: ไม่พบ "#${containerId}"`);
    return;
  }

   // 2. สับไพ่ (shuffle)
  let poolCopy = [...productPool];
  for (let i = poolCopy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
  }

  // 3. เลือกสินค้ามา count ชิ้น
  const randomProducts = poolCopy.slice(0, count);

  // 4. วาดการ์ด
  randomProducts.forEach(product => {
    // สร้าง <a> แทน <div>
    const card = document.createElement('a');
    card.className = 'product-card';
    // ไปหน้า Product พร้อมพารามิเตอร์ id สินค้า
    card.href = `Product.html?id=${product.id}`;

    const imageUrl = (product.images && product.images.length > 0)
      ? product.images[0]
      : 'image/placeholder.png';

    // product.name ตอนนี้ใน JSON ของน้องมักเป็นแบบ "S050 บ้านไม้ งานแฮนด์เมด..." อยู่แล้ว
    // ถ้าชื่อเต็มยาวเกิน จะใช้แค่ส่วนแรกก็ได้ แต่นี่ขอใส่เต็มไปก่อน
    const cardHTML = `
      <img class="card-img" src="${imageUrl}" alt="${product.name || 'รูปสินค้า'}">
      <div class="card-content">
        <h3 class="card-title">${product.name || 'ไม่มีชื่อสินค้า'}</h3>
      </div>
    `;

     card.innerHTML = cardHTML;
    gridContainer.appendChild(card);
  });
}



