// JS/Filters.js

// เก็บ element ต่าง ๆ ที่ใช้กรอง/เรียง
const els = {
    q: document.getElementById("q"),
    sort: document.getElementById("sort"),
    category: document.getElementById("category"),
    pmin: document.getElementById("pmin"),
    pmax: document.getElementById("pmax"),
    applyBtn: document.getElementById("applyPrice"),
    count: document.getElementById("count"),
};

// ฟังก์ชันหลัก กรอง + เรียง + วาด
function applyFilters() {
    // --- 1. อ่านค่าจาก UI ---
    const qRaw = els.q ? els.q.value : "";
    const q = (qRaw || "").trim().toLowerCase();

    const cat = els.category ? els.category.value || "" : "";

    const pminVal = els.pmin ? els.pmin.value.trim() : "";
    const pmaxVal = els.pmax ? els.pmax.value.trim() : "";

    // --- 2. เริ่มจากสินค้าทั้งหมด ---
    let list = allProducts.slice();

    // 2.1 คำค้นหา (ชื่อ/รหัส)
    if (q) {
        list = list.filter((p) => {
            const name = (p.name || "").toLowerCase();
            const id = (p.id || "").toLowerCase();
            return name.includes(q) || id.includes(q);
        });
    }

    // 2.2 หมวดหมู่
    if (cat) {
        list = list.filter((p) => {
            const cats = p.category || [];
            return cats.includes(cat);
        });
    }

    // 2.3 ราคาต่ำสุด (ถ้าใส่มา)
    if (pminVal !== "") {
        const pminNum = Number(pminVal);
        list = list.filter((p) => {
            const n = Number(p.salePrice ?? p.price ?? 0);
            return n >= pminNum;
        });
    }

    // 2.4 ราคาสูงสุด (ถ้าใส่มา)
    if (pmaxVal !== "") {
        const pmaxNum = Number(pmaxVal);
        list = list.filter((p) => {
            const n = Number(p.salePrice ?? p.price ?? 0);
            return n <= pmaxNum;
        });
    }

    // --- 3. เรียงตามตัวเลือก sort ---
    const sortVal = els.sort ? els.sort.value : "popular";

    switch (sortVal) {
        case "id-asc":
            // เรียงตามรหัสสินค้าเลขน้อยไปมาก เช่น S001 -> S002 -> ... -> S102
            list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
            break;

        case "latest":
            // ใหม่สุด (id เยอะอยู่บน เช่น S099 ก่อน S001)
            list.sort((a, b) => String(b.id).localeCompare(String(a.id)));
            break;

        case "bestseller":
            // ขายดี
            list.sort((a, b) => (b.sold || 0) - (a.sold || 0));
            break;

        case "price-asc":
            // ราคาต่ำ -> สูง
            list.sort(
                (a, b) =>
                    Number(a.salePrice ?? a.price ?? 0) -
                    Number(b.salePrice ?? b.price ?? 0)
            );
            break;

        case "price-desc":
            // ราคาสูง -> ต่ำ
            list.sort(
                (a, b) =>
                    Number(b.salePrice ?? b.price ?? 0) -
                    Number(a.salePrice ?? a.price ?? 0)
            );
            break;

        default:
            // popular: rating ดี + sold มาก
            list.sort((a, b) => {
                const diffRate = (b.rating || 0) - (a.rating || 0);
                if (diffRate !== 0) return diffRate;
                return (b.sold || 0) - (a.sold || 0);
            });
    }

    // --- 4. เซ็ต global + วาดใหม่ ---
    filtered = list;
    page = 1;

    updateURL({
        q: qRaw || "",
        cat,
        sort: sortVal,
        pmin: pminVal || "",
        pmax: pmaxVal || "",
        page,
    });

    renderGrid(filtered, page);

    if (els.count) {
        els.count.textContent = filtered.length;
    }
}

// ฟังก์ชันนี้จะถูกเรียกหลังจาก loadCatalog() เสร็จ
// เพื่อผูก event ให้ dropdown / ปุ่ม / ช่องค้นหา
function initFilters() {
    if (els.sort) {
        els.sort.addEventListener("change", applyFilters);
    }

    if (els.category) {
        els.category.addEventListener("change", applyFilters);
    }

    if (els.applyBtn) {
        els.applyBtn.addEventListener("click", applyFilters);
    }

    // ให้ค้นหาแบบพิมพ์แล้วกรองทันที
    if (els.q) {
        els.q.addEventListener("input", applyFilters);
    }

    // ถ้าอยาก refresh ให้ผลครั้งแรกสอดคล้องกับค่า default ใน UI
    applyFilters();
}
