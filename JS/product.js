// ----------------------- config / globals -----------------------
const PRODUCTS_URL = "JSON/products.json";
const VARIANTS_URL = "JSON/variants.json";

// ดึง pid จาก query string เช่น product.html?id=S012
const PID = new URLSearchParams(location.search).get("id") || "";

// เก็บสถานะ runtime
let PRODUCT = null;                // object สินค้าจาก products.json
let VARIANTS_BY_ID = {};           // object ทั้งก้อนจาก variants.json
let CURRENT_VARIANT_INDEX = 0;     // index ของตัวเลือกที่ถูกเลือกตอนนี้
let BASE_DIR = "";                 // โฟลเดอร์รูปของสินค้านั้น เช่น "image/products/S012/"
let GALLERY_IMAGES = [];           // list รูปทั้งหมดที่จะแสดงในแกลเลอรี่

// ----------------------- helpers -----------------------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function numberWithCommas(n) {
  // ป้องกัน undefined/null
  const num = Number(n);
  if (isNaN(num)) return n ?? "";
  return num.toLocaleString("th-TH");
}

function calcDiscountPercent(price, salePrice) {
  const p = Number(price);
  const s = Number(salePrice);
  if (!p || !s || s >= p) return 0;
  const off = ((p - s) / p) * 100;
  return Math.round(off);
}

// พยายามเดาโฟลเดอร์รูปจาก product / variant
function getBaseDirFromProduct(product) {
  // ถ้ามี product.images แล้ว path ดูเป็น "image/products/S012/xxx.jpg"
  // เราจะตัดให้เหลือ "image/products/S012/"
  if (product && Array.isArray(product.images) && product.images[0]) {
    const first = product.images[0];
    const slashIdx = first.lastIndexOf("/");
    if (slashIdx > 0) {
      return first.substring(0, slashIdx + 1);
    }
  }

  // ถ้าไม่มี ลองดูจาก variants.json ตัวแรก
  const vlist = VARIANTS_BY_ID[PID];
  if (vlist && vlist[0] && vlist[0].image) {
    const img = vlist[0].image;
    const slashIdx = img.lastIndexOf("/");
    if (slashIdx > 0) {
      return img.substring(0, slashIdx + 1);
    }
  }

  // fallback
  return "";
}

// รวมรูปที่จะใช้ทำแกลเลอรี่
function buildGalleryImages(product, variantsArr) {
  const out = new Set();

  // 1) รูปจากสินค้า (เช่นภาพหลัก/ภาพบรรยากาศ)
  if (product && Array.isArray(product.images)) {
    product.images.forEach(src => {
      if (src) out.add(src);
    });
  }

  // 2) รูปจากแต่ละ variant (เช่นมุมที่ใช้ประกอบ)
  if (Array.isArray(variantsArr)) {
    variantsArr.forEach(v => {
      if (v && v.image) out.add(v.image);
    });
  }

  return [...out];
}

// ----------------------- render funcs -----------------------
function renderTitle(product) {
  // ชื่อสินค้า
  $("#pTitle").textContent = product.name || "ไม่มีชื่อสินค้า";

  // rating / sold / reviews ถ้ามีใน products.json
  if (product.rating) {
    $("#pRating").textContent = product.rating.toFixed
      ? product.rating.toFixed(1)
      : product.rating;
  }
  if (product.reviewsCount != null) {
    $("#pReviews").textContent = `รีวิว ${numberWithCommas(product.reviewsCount)}`;
  }
  if (product.sold != null) {
    $("#pSold").textContent = `ขายแล้ว ${numberWithCommas(product.sold)}`;
  }
}

function renderGallery(product) {
  const mainImgEl = $("#mainImg");
  const thumbsWrap = $("#thumbs");

  thumbsWrap.innerHTML = ""; // reset

  // เตรียม list รูปทั้งหมดของสินค้า
  GALLERY_IMAGES = buildGalleryImages(product, VARIANTS_BY_ID[PID]);

  // ถ้ายังไม่มีรูปเลย ก็ใช้ placeholder
  if (!GALLERY_IMAGES.length) {
    GALLERY_IMAGES = ["image/placeholder.jpg"];
  }

  // ตั้งรูปหลักเป็นรูปแรก
  mainImgEl.src = GALLERY_IMAGES[0];
  mainImgEl.alt = product?.name || "รูปสินค้า";

  // สร้าง thumbnail buttons
  GALLERY_IMAGES.forEach((src, idx) => {
    const btn = document.createElement("button");
    btn.className = "thumb" + (idx === 0 ? " active" : "");
    btn.setAttribute("type", "button");

    const img = document.createElement("img");
    img.src = src;
    img.alt = `ภาพ ${idx + 1}`;

    btn.appendChild(img);

    btn.addEventListener("click", () => {
      // อัปเดตรูปหลัก
      mainImgEl.src = src;
      // เปลี่ยน active
      $$(".thumb", thumbsWrap).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });

    thumbsWrap.appendChild(btn);
  });
}

// วาดปุ่มตัวเลือกสินค้า (variants)
function renderVariantChips(pid) {
  const box = $("#variantBox");
  const wrap = $("#variantOptions");

  const list = VARIANTS_BY_ID[pid] || [];

  // ถ้าไม่มี variant (list ว่าง) ก็ซ่อนกล่อง
  if (!list.length) {
    box.style.display = "none";
    return;
  }

  wrap.innerHTML = "";

  list.forEach((v, idx) => {
    const btn = document.createElement("button");
    btn.className = "chip" + (idx === 0 ? " active" : "");
    btn.type = "button";
    btn.textContent = v.label || `แบบ ${idx + 1}`;

    btn.addEventListener("click", () => {
      CURRENT_VARIANT_INDEX = idx;
      // toggle active
      $$(".chip", wrap).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // อัปเดตราคา/stock/รูปหลักตาม variant ที่เลือก
      updatePriceAndBadge();
      updateStockHint();
      updateGalleryForVariant(idx);
    });

    wrap.appendChild(btn);
  });

  // เริ่มต้นใช้ตัวเลือกตัวแรก
  CURRENT_VARIANT_INDEX = 0;
  updateStockHint();
}

// เวลาเลือกตัวเลือก เปลี่ยนรูปหลักให้ตรงกับ variant ด้วย (ถ้า variant มี image)
function updateGalleryForVariant(idx) {
  const v = getCurrentVariant();
  if (!v || !v.image) return;

  const mainImgEl = $("#mainImg");

  mainImgEl.src = v.image;

  // ทำ active ให้ thumbnail ที่ตรงกับ v.image ถ้ามี
  const thumbsWrap = $("#thumbs");
  $$(".thumb", thumbsWrap).forEach(b => {
    const img = $("img", b);
    if (img && img.src && img.src.includes(v.image.replace(/^.*[\\/]/, ""))) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });
}

// ดึง variant ปัจจุบัน
function getCurrentVariant() {
  const list = VARIANTS_BY_ID[PID] || [];
  if (!list.length) return null;
  return list[CURRENT_VARIANT_INDEX] || list[0];
}

// อัปเดตราคา / badge / ราคาขีดฆ่า
function updatePriceAndBadge() {
  const variant = getCurrentVariant();

  // มีกรณี: ไม่มี variant -> ลอง fallback ไปที่ PRODUCT เอง
  const priceNow  = variant?.salePrice ?? PRODUCT?.salePrice ?? PRODUCT?.price;
  const priceFull = variant?.price      ?? PRODUCT?.price;

  $("#priceMain").textContent   = "฿" + numberWithCommas(priceNow || "-");
  $("#priceStrike").textContent = priceFull && priceFull !== priceNow
    ? "฿" + numberWithCommas(priceFull)
    : "";

  // ส่วนลด %
  const off = calcDiscountPercent(priceFull, priceNow);
  $("#badgeOff").textContent = off > 0 ? `-${off}%` : "";
}

function updateStockHint() {
  const variant = getCurrentVariant();
  const stockNum = variant?.stock ?? PRODUCT?.stock;

  const stockHintEl = $("#pStockHint");
  const stockInfoEl = $("#product-stock");

  if (stockNum == null) {
    stockHintEl.textContent = "มีสินค้า";
    stockInfoEl.textContent = "ไม่ระบุ";
  } else {
    stockHintEl.textContent = stockNum > 0
      ? `พร้อมส่ง (${stockNum} ชิ้น)`
      : "สินค้าหมดแล้ว";

    stockInfoEl.textContent = stockNum + " ชิ้น";
  }
}

// เติมรายละเอียด product ด้านล่าง เช่นหมวดหมู่ / desc
function renderDetails(product) {
  // หมวดหมู่
  const catEl = $("#product-categories");
  if (catEl) {
    if (Array.isArray(product.categories)) {
      catEl.textContent = product.categories.join(" / ");
    } else if (product.category) {
      catEl.textContent = product.category;
    } else {
      catEl.textContent = "—";
    }
  }

  // รายละเอียดสินค้า (HTML description)
  const descEl = $("#product-description");
  if (descEl) {
    // บางร้านอาจเก็บ desc เป็น text ธรรมดา หรือมี <br>
    descEl.innerHTML = product.desc || "";
  }
}

// ----------------------- qty controls -----------------------
function setupQtyButtons() {
  const qtyInput = $("#qty");
  const minusBtn = $('.qtyBtn[data-act="minus"]');
  const plusBtn  = $('.qtyBtn[data-act="plus"]');

  if (!qtyInput) return;

  minusBtn?.addEventListener("click", () => {
    const current = parseInt(qtyInput.value || "1", 10);
    const next = Math.max(1, current - 1);
    qtyInput.value = next;
  });

  plusBtn?.addEventListener("click", () => {
    const current = parseInt(qtyInput.value || "1", 10);
    const next = current + 1;
    qtyInput.value = next;
  });
}

// ----------------------- share / misc -----------------------
function setupShareAndCart() {
  // ปุ่มคัดลอกลิงก์
  const copyBtn = $("#copyLink");
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copyBtn.textContent = "คัดลอกแล้ว";
      setTimeout(() => {
        copyBtn.textContent = "คัดลอกลิงก์";
      }, 2000);
    } catch (err) {
      console.warn("copy failed", err);
    }
  });

  // TODO: ปุ่มตะกร้า / ซื้อสินค้า / แชตกับร้าน
  // ตรงนี้เอาเบาๆ ไว้ก่อน
  $("#addCart")?.addEventListener("click", () => {
    const v = getCurrentVariant();
    const qty = parseInt($("#qty").value || "1", 10);
    console.log("add to cart", {
      productId: PID,
      variant: v?.label || null,
      qty
    });
    alert("เพิ่มลงตะกร้าแล้ว");
  });

  $("#buyNow")?.addEventListener("click", () => {
    const v = getCurrentVariant();
    const qty = parseInt($("#qty").value || "1", 10);
    console.log("buy now", {
      productId: PID,
      variant: v?.label || null,
      qty
    });
    alert("กำลังไปหน้าเช็คเอาท์…");
  });

  $("#chat")?.addEventListener("click", () => {
    alert("เปิดแชตกับร้าน (เดโม่)");
  });
}

// ----------------------- boot -----------------------
(async function init() {
  if (!PID) {
    // ถ้าไม่มี id ใน URL
    $("#pTitle").textContent = "ไม่พบสินค้า (ไม่มี id ในลิงก์)";
    return;
  }

  // โหลด products + variants
  const [pRes, vRes] = await Promise.all([
    fetch(PRODUCTS_URL, { cache: "no-store" }),
    fetch(VARIANTS_URL, { cache: "no-store" })
  ]);

  const allProducts = pRes.ok ? await pRes.json() : [];
  VARIANTS_BY_ID    = vRes.ok ? await vRes.json() : {};

  // หา product ตาม id
  PRODUCT = allProducts.find(
    p => (p.id || "").toUpperCase() === PID.toUpperCase()
  );

  if (!PRODUCT) {
    $("#pTitle").textContent = `ไม่พบสินค้า (id: ${PID})`;
    return;
  }

  // set BASE_DIR จากรูปสินค้า/variant
  BASE_DIR = getBaseDirFromProduct(PRODUCT);

  // render ส่วนต่างๆ
  renderTitle(PRODUCT);
  renderGallery(PRODUCT);
  renderVariantChips(PID);
  updatePriceAndBadge();
  updateStockHint();
  renderDetails(PRODUCT);

  // functional ปุ่มจำนวน / แชร์ / ตะกร้า
  setupQtyButtons();
  setupShareAndCart();
})();

// เลือกปุ่มทั้งหมดที่เป็นปุ่มจำนวน
const qtyInput = document.getElementById("qty");
const qtyBtns = document.querySelectorAll(".qbtn");

qtyBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const action = btn.getAttribute("data-act"); // "plus" หรือ "minus"
    let current = parseInt(qtyInput.value, 10);

    if (isNaN(current)) {
      current = 1; // กันเผื่อมีคนลบค่าทิ้ง
    }

    if (action === "plus") {
      current = current + 1;
    } else if (action === "minus") {
      // อย่าให้ต่ำกว่า min (ถ้ามี)
      const min = parseInt(qtyInput.getAttribute("min"), 10) || 1;
      if (current > min) {
        current = current - 1;
      }
    }

    qtyInput.value = current;
  });
});
