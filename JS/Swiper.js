
const swiper = new Swiper('.swiper', {
  // (ตัวเลือกเดิมที่คุณอาจจะมีอยู่แล้ว)
  loop: true,
  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },

  // ▼▼▼ เพิ่ม 3 บรรทัดนี้เข้าไปครับ ▼▼▼
  autoplay: {
    delay: 3000, // 3000ms = 3 วินาที (เปลี่ยนเลขได้ตามชอบ)
    disableOnInteraction: false, // (สำคัญ) ให้มันเล่นต่อแม้ผู้ใช้จะปัดเอง
  },
  // ▲▲▲ สิ้นสุดส่วนที่เพิ่ม ▲▲▲
});