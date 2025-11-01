/* =============================================
 * JS/3d-measure.js
 * (ฉบับ "v7 - แก้บั๊ก \r\n" (Newline))
 * ============================================= */

// 1. "นำเข้า" เครื่องมือ
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- (ตัวแปรหลัก - เหมือนเดิม) ---
let scene, camera, renderer, controls, loader;
let ambientLight, directionalLight1, directionalLight2, directionalLight3;
const baseIntensity = { amb: 0.5, dir1: 1.5, dir2: 0.8, dir3: 0.6 };
let model;

// [ตลับเมตร - เหมือนเดิม]
let raycaster, mouse;
let measurementPoints = [], measurementLines = [], measurementLabels = [];
let isMeasureModeActive = false, measureBtn, clearBtn, resetCameraBtn;

// --- (ที่ที่เราจะวาด - เหมือนเดิม) ---
const container = document.getElementById('canvas-container');

// --- "สตาร์ทเครื่องยนต์" ---
init();
animate();

// ---------------------------------------------
// ด้านล่างนี้คือฟังก์ชันทั้งหมด
// ---------------------------------------------

/**
 * 1. ฟังก์ชัน "เริ่มต้น" (Init)
 */
function init() {
  // (1.1 - 1.6: สร้าง Scene, Camera, Renderer, Lights, Controls, Loader)
  // (โค้ดส่วนนี้ "เหมือนเดิม" ทั้งหมด...)
  // ...
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  ambientLight = new THREE.AmbientLight(0xffffff, baseIntensity.amb);
  scene.add(ambientLight);
  directionalLight1 = new THREE.DirectionalLight(0xffffff, baseIntensity.dir1);
  directionalLight1.position.set(2, 3, 2);
  scene.add(directionalLight1);
  directionalLight2 = new THREE.DirectionalLight(0xffffff, baseIntensity.dir2);
  directionalLight2.position.set(-2, 1, -5);
  scene.add(directionalLight2);
  directionalLight3 = new THREE.DirectionalLight(0xffffff, baseIntensity.dir3);
  directionalLight3.position.set(-2, -2, 2);
  scene.add(directionalLight3);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  loader = new GLTFLoader();
  // ... (จบส่วนย่อ)

  // 1.7 "ค้นหา & โหลดข้อมูล" (จาก URL)
  const lightSlider = document.getElementById('light-slider');
  loadProductDetails(lightSlider);

  // [ตลับเมตร - เหมือนเดิม]
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  measureBtn = document.getElementById('measure-toggle-btn');
  if (measureBtn) measureBtn.addEventListener('click', toggleMeasureMode);
  clearBtn = document.getElementById('measure-clear-btn');
  if (clearBtn) clearBtn.addEventListener('click', clearMeasurements);
  resetCameraBtn = document.getElementById('reset-camera-btn');
  if (resetCameraBtn) resetCameraBtn.addEventListener('click', resetCamera);

  // 1.8 (สำคัญ) ทำให้จอปรับขนาดตามหน้าต่าง
  window.addEventListener('resize', onWindowResize, false);
}


/**
 * ฟังก์ชัน: อ่าน URL, โหลด JSON, อัปเดต UI, และโหลดโมเดล
 * ( ⭐️ "อัปเกรด" ส่วน "รายละเอียด" (Description) ครับ ⭐️ )
 */
async function loadProductDetails(lightSliderElement) {
  // (ค้นหา Elements ใน UI...)
  const productNameEl = document.querySelector('.product-name');
  const productIdEl = document.querySelector('.product-id');
  const infoCategoryEl = document.querySelector('#info-category');
  const infoMaterialEl = document.querySelector('#info-material');
  const infoDescriptionEl = document.querySelector('#info-description');
  const priceRegularEl = document.querySelector('#price-regular');
  const priceSpecialEl = document.querySelector('#price-special');

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (!productId) { /* ... (จัดการ Error) ... */ return; }
    const response = await fetch('JSON/3d-products.json');
    if (!response.ok) throw new Error('ไม่สามารถโหลด 3d-products.json');
    const allProducts = await response.json();
    const product = allProducts.find(p => p.id === productId);

    if (product) {
      // 4. "อัปเดต UI" (Header & Sidebar)
      if (productIdEl) productIdEl.textContent = product.id;
      if (productNameEl) productNameEl.textContent = product.name;
      if (infoCategoryEl) infoCategoryEl.textContent = product.category || '-';
      if (infoMaterialEl) infoMaterialEl.textContent = product.material || '-';

      // ⭐️ 5. (ใหม่!) "อัปเกรด UI รายละเอียด" (Description) ⭐️
      if (infoDescriptionEl) {
        const desc = product.desc || 'ไม่มีรายละเอียด';

        // ( "แปลง" \r\n (ใน JSON) ➔ <br> (ใน HTML) )
        // ( /g = "ทั้งหมด" (Global))
        const formattedDesc = desc.replace(/\r\n/g, '<br>');

        // ( "เปลี่ยน" จาก .textContent ➔ .innerHTML )
        infoDescriptionEl.innerHTML = formattedDesc;
      }

      // 6. "อัปเดต UI ราคา" (เหมือน v6)
      if (priceRegularEl && priceSpecialEl) {
        const regularPrice = product.price || 0;
        const specialPrice = product.salePrice || 0;
        const formattedRegular = regularPrice.toLocaleString('th-TH');
        const formattedSpecial = specialPrice.toLocaleString('th-TH');
        if (specialPrice > 0 && specialPrice < regularPrice) {
          priceRegularEl.innerHTML = `ราคา: <del>${formattedRegular}</del> บาท`;
          priceSpecialEl.innerHTML = `ราคาพิเศษ: <strong>${formattedSpecial}</strong> บาท`;
        } else {
          priceRegularEl.innerHTML = `ราคา: <strong>${formattedRegular}</strong> บาท`;
          priceSpecialEl.innerHTML = ""; // (ซ่อน)
        }
      }

      // 7. "โหลดโมเดล" (เหมือนเดิม)
      const modelPath = `3D/${product.id}/01.glb`;
      loader.load(
        modelPath,
        (gltf) => {
          // (โค้ด Auto-Framing + เชื่อม Slider ... "เหมือนเดิม")
          // ...
          model = gltf.scene;
          scene.add(model);
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);
          controls.target.copy(center);
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
          cameraDistance *= 1.5;
          camera.position.copy(center);
          camera.position.z += cameraDistance;
          camera.updateProjectionMatrix();
          controls.update();
          controls.saveState(); // (บันทึก State ไว้ให้ "รีเซ็ตกล้อง")
          const updateAllLights = (multiplierString) => {
            const m = parseFloat(multiplierString);
            ambientLight.intensity = baseIntensity.amb * m;
            directionalLight1.intensity = baseIntensity.dir1 * m;
            directionalLight2.intensity = baseIntensity.dir2 * m;
            directionalLight3.intensity = baseIntensity.dir3 * m;
          };
          lightSliderElement.addEventListener('input', (event) => {
            updateAllLights(event.target.value);
          });
          updateAllLights(lightSliderElement.value);
          // ... (จบโค้ดเดิม)
        },
        null,
        (error) => { console.error('โหลดโมเดลไม่ผ่าน:', error); }
      );
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดใน loadProductDetails:', error);
  }
}

// [ฟังก์ชัน "สวิตช์" (เหมือนเดิม)]
function toggleMeasureMode() {
  // ... (โค้ด toggleMeasureMode เดิม)
  isMeasureModeActive = !isMeasureModeActive;
  if (isMeasureModeActive) {
    controls.enabled = false;
    measureBtn.textContent = 'ปิดตลับเมตร';
    measureBtn.classList.add('active');
    container.style.cursor = 'crosshair';
  } else {
    controls.enabled = true;
    measureBtn.textContent = 'เปิดตลับเมตร';
    measureBtn.classList.remove('active');
    container.style.cursor = 'grab';
  }
}

// [ตลับเมตร (เหมือนเดิม)]
function onPointerDown(event) {
  // ... (โค้ด onPointerDown เดิม)
  if (!isMeasureModeActive) { return; }
  event.preventDefault();
  if (!model) { return; }
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(model, true);
  if (intersects.length > 0) {
    placeMarker(intersects[0].point);
  }
}
function placeMarker(point) {
  // ... (โค้ด placeMarker เดิม)
  const markerSize = 0.01;
  const sphereGeometry = new THREE.SphereGeometry(markerSize, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false });
  const marker = new THREE.Mesh(sphereGeometry, sphereMaterial);
  marker.position.copy(point);
  scene.add(marker);
  measurementPoints.push(point);
  if (measurementPoints.length % 2 === 0) {
    const point2 = measurementPoints[measurementPoints.length - 1];
    const point1 = measurementPoints[measurementPoints.length - 2];
    const distance = point1.distanceTo(point2);
    const distanceCm = distance * 100;
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([point1, point2]);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, depthTest: false });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    measurementLines.push(line);
    const label = document.createElement('div');
    label.className = 'measurement-label';
    label.textContent = `${distanceCm.toFixed(1)} cm`;
    const midPoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
    label.userData = {};
    label.userData.point3D = midPoint;
    container.appendChild(label);
    measurementLabels.push(label);
  }
}

// [ฟังก์ชัน "ล้างค่า" (เหมือนเดิม)]
function clearMeasurements() {
  // ... (โค้ด clearMeasurements เดิม)
  console.log('กำลังล้างการวัดทั้งหมด...');
  for (const line of measurementLines) {
    line.geometry.dispose();
    line.material.dispose();
    scene.remove(line);
  }
  for (const label of measurementLabels) {
    container.removeChild(label);
  }
  const objectsToKeep = [];
  scene.children.forEach((obj) => {
    if (obj.isMesh && obj.material.isMeshBasicMaterial && obj.material.color.getHex() === 0xff0000) {
      obj.geometry.dispose();
      obj.material.dispose();
    } else {
      objectsToKeep.push(obj);
    }
  });
  scene.children = objectsToKeep;
  measurementPoints = [];
  measurementLines = [];
  measurementLabels = [];
}

// [ฟังก์ชัน "รีเซ็ตกล้อง" (เหมือนเดิม)]
function resetCamera() {
  // ... (โค้ด resetCamera เดิม)
  console.log('กำลังรีเซ็ตกล้อง...');
  controls.reset();
}


// [ฟังก์ชัน "วนลูป" (เหมือนเดิม)]
function animate() {
  // ... (โค้ด animate เดิม)
  requestAnimationFrame(animate);
  updateLabels();
  renderer.render(scene, camera);
}

// [ฟังก์ชัน "ย้ายป้าย" (เหมือนเดิม)]
function updateLabels() {
  // ... (โค้ด updateLabels เดิม)
  for (const label of measurementLabels) {
    const point3D = label.userData.point3D;
    const screenPosition = point3D.clone().project(camera);
    if (screenPosition.z > 1) {
      label.style.display = 'none';
    } else {
      label.style.display = 'block';
      const x = (screenPosition.x * 0.5 + 0.5) * container.clientWidth;
      const y = (screenPosition.y * -0.5 + 0.5) * container.clientHeight;
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
    }
  }
}

// [ฟังก์ชัน "ปรับขนาดจอ" (เหมือนเดิม)]
function onWindowResize() {
  // ... (โค้ด onWindowResize เดิม)
  if (container) {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
}