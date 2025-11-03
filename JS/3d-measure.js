/* =============================================
 * JS/3d-measure.js  (สลับโมเดลตามรูปเล็ก 1–5)
 * - โหลด 01.glb..05.glb จากโฟลเดอร์ 3D/<productId>/
 * - วัดระยะ/ล้างค่า/รีเซ็ตกล้อง เหมือนเดิม
 * ============================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls, loader;
let ambientLight, directionalLight1, directionalLight2, directionalLight3;
const baseIntensity = { amb: 0.5, dir1: 1.5, dir2: 0.8, dir3: 0.6 };

let model;
let currentProductId = null;
let currentModelIndex = 1;   // 1..5

// ตลับเมตร
let raycaster, mouse;
let measurementPoints = [];
let measurementLines = [];
let measurementLabels = [];
let measurementMarkers = [];
let isMeasureModeActive = false;

// UI
let measureBtn, clearBtn, resetCameraBtn;
const container = document.getElementById('canvas-container');

init();
animate();

/* ---------- Init ---------- */
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const w = container.clientWidth;
  const h = container.clientHeight;
  camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
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
  controls.enableDamping = true;
  controls.dampingFactor = 1;

  loader = new GLTFLoader();

  const lightSlider = document.getElementById('light-slider');
  measureBtn = document.getElementById('measure-toggle-btn');
  clearBtn   = document.getElementById('measure-clear-btn');
  resetCameraBtn = document.getElementById('reset-camera-btn');

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  if (measureBtn) measureBtn.addEventListener('click', toggleMeasureMode);
  if (clearBtn) clearBtn.addEventListener('click', clearMeasurements);
  if (resetCameraBtn) resetCameraBtn.addEventListener('click', resetCamera);

  window.addEventListener('resize', onWindowResize, false);

  loadProductDetails(lightSlider);
}

/* ---------- Helpers ---------- */
function frameToObject(obj){
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);

  controls.target.copy(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let dist = maxDim / (2 * Math.tan(fov / 2));
  dist *= 1.5;

  camera.position.copy(center);
  camera.position.z += dist;
  camera.updateProjectionMatrix();
  controls.update();
  controls.saveState();
}

function disposeObject3D(obj){
  obj.traverse(o=>{
    if (o.geometry) o.geometry.dispose();
    if (o.material){
      if (Array.isArray(o.material)) o.material.forEach(m=>m.dispose?.());
      else o.material.dispose?.();
    }
  });
}

function loadModelByIndex(idx){
  // ล้างโมเดลเก่า
  if (model){
    scene.remove(model);
    disposeObject3D(model);
    model = null;
  }

  const baseDir = `3D/${currentProductId}/`;
  const glb = `${String(idx).padStart(2,'0')}.glb`;

  loader.load(
    baseDir + glb,
    (gltf)=>{
      model = gltf.scene;
      scene.add(model);
      frameToObject(model);
    },
    undefined,
    (err)=> console.error('โหลดโมเดลไม่ผ่าน:', err)
  );

  // ไฮไลต์รูปเล็ก
  const thumbs = document.querySelectorAll('#thumb-strip img.thumb');
  thumbs.forEach((im,i)=> im.classList.toggle('active', i === (idx-1)));
  currentModelIndex = idx;
}

/* ---------- Load details & thumbnails ---------- */
async function loadProductDetails(lightSliderElement) {
  const productNameEl   = document.querySelector('.product-name');
  const productIdEl     = document.querySelector('.product-id');
  const infoCategoryEl  = document.querySelector('#info-category');
  const infoMaterialEl  = document.querySelector('#info-material');
  const infoDescriptionEl = document.querySelector('#info-description');
  const priceRegularEl  = document.querySelector('#price-regular');
  const priceSpecialEl  = document.querySelector('#price-special');

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (!productId) return;

    const res = await fetch('JSON/3d-products.json');
    if (!res.ok) throw new Error('ไม่สามารถโหลด 3d-products.json');
    const all = await res.json();
    const product = all.find(p => p.id === productId);
    if (!product) return;

    // อัปเดต UI
    if (productIdEl) productIdEl.textContent = product.id || '';
    if (productNameEl) productNameEl.textContent = product.name || '';

    if (infoCategoryEl) {
      const cat = Array.isArray(product.category)
        ? product.category.join(' / ')
        : (product.category || '-');
      infoCategoryEl.textContent = cat;
    }
    if (infoMaterialEl) infoMaterialEl.textContent = product.material || '-';

    if (infoDescriptionEl) {
      const desc = product.desc || 'ไม่มีรายละเอียด';
      infoDescriptionEl.innerHTML = desc.replace(/\r?\n/g, '<br>');
    }

    if (priceRegularEl && priceSpecialEl) {
      const regularPrice = Number(product.price || 0);
      const specialPrice = Number(product.salePrice || 0);
      const fr = regularPrice.toLocaleString('th-TH');
      const fs = specialPrice.toLocaleString('th-TH');
      if (specialPrice > 0 && specialPrice < regularPrice) {
        priceRegularEl.innerHTML = `ราคา: <del>${fr}</del> บาท`;
        priceSpecialEl.innerHTML = `ราคาพิเศษ: <strong>${fs}</strong> บาท`;
      } else {
        priceRegularEl.innerHTML = `ราคา: <strong>${fr}</strong> บาท`;
        priceSpecialEl.innerHTML = '';
      }
    }

    // เก็บ productId ปัจจุบัน
    currentProductId = product.id;

    // สร้างรูปเล็ก 001..005
    const thumbsHost = document.getElementById('thumb-strip');
    if (thumbsHost){
      thumbsHost.innerHTML = '';
      const baseDir = `3D/${currentProductId}/`;
      for (let i=1;i<=5;i++){
        const n = String(i).padStart(3,'0');
        const img = new Image();
        img.src = `${baseDir}${n}.png`;
        img.alt = `${product.name} — รูปที่ ${i}`;
        img.loading = 'lazy';
        img.className = 'thumb';
        img.addEventListener('click', ()=> loadModelByIndex(i));
        thumbsHost.appendChild(img);
      }
    }

    // สไลเดอร์ไฟ (bind ครั้งเดียว)
    const updateAllLights = (val)=>{
      const m = Math.max(0, Math.min(14, parseFloat(val || 1)));
      ambientLight.intensity      = baseIntensity.amb  * m;
      directionalLight1.intensity = baseIntensity.dir1 * m;
      directionalLight2.intensity = baseIntensity.dir2 * m;
      directionalLight3.intensity = baseIntensity.dir3 * m;
    };
    if (lightSliderElement){
      lightSliderElement.addEventListener('input', e=> updateAllLights(e.target.value));
      updateAllLights(lightSliderElement.value);
    } else {
      updateAllLights(1);
    }

    // โหลดโมเดลเริ่มต้น 01.glb
    loadModelByIndex(1);

  } catch (err) {
    console.error('เกิดข้อผิดพลาดใน loadProductDetails:', err);
  }
}

/* ---------- Measure mode ---------- */
function toggleMeasureMode() {
  isMeasureModeActive = !isMeasureModeActive;
  const canvasEl = renderer && renderer.domElement;
  if (isMeasureModeActive) {
    controls.enabled = false;
    if (measureBtn){ measureBtn.textContent = 'ปิดตลับเมตร'; measureBtn.classList.add('active'); }
    if (canvasEl) canvasEl.style.cursor = 'crosshair';
  } else {
    controls.enabled = true;
    if (measureBtn){ measureBtn.textContent = 'เปิดตลับเมตร'; measureBtn.classList.remove('active'); }
    if (canvasEl) canvasEl.style.cursor = 'grab';
  }
}

/* ---------- Pointer & placing ---------- */
function onPointerDown(event) {
  if (!isMeasureModeActive || !model) return;
  event.preventDefault();

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(model, true);
  if (intersects.length > 0) placeMarker(intersects[0].point);
}

function placeMarker(point) {
  const markerSize = 0.01;
  const sphereGeometry = new THREE.SphereGeometry(markerSize, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false });
  const marker = new THREE.Mesh(sphereGeometry, sphereMaterial);
  marker.position.copy(point);
  scene.add(marker);
  measurementMarkers.push(marker);

  measurementPoints.push(point);

  if (measurementPoints.length % 2 === 0) {
    const p2 = measurementPoints[measurementPoints.length - 1];
    const p1 = measurementPoints[measurementPoints.length - 2];

    const distance = p1.distanceTo(p2);
    const distanceCm = distance * 100;

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, depthTest: false });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    measurementLines.push(line);

    const label = document.createElement('div');
    label.className = 'measurement-label';
    label.textContent = `${distanceCm.toFixed(1)} cm`;

    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    label.userData = { point3D: midPoint };
    container.appendChild(label);
    measurementLabels.push(label);
  }
}

/* ---------- Clear & Reset ---------- */
function clearMeasurements() {
  // lines
  for (const line of measurementLines) {
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
  }
  measurementLines = [];

  // markers
  for (const m of measurementMarkers) {
    scene.remove(m);
    m.geometry.dispose();
    m.material.dispose();
  }
  measurementMarkers = [];

  // labels
  for (const label of measurementLabels) {
    if (label.parentNode) label.parentNode.removeChild(label);
  }
  measurementLabels = [];

  measurementPoints = [];
}

function resetCamera() {
  controls.reset();
  camera.updateProjectionMatrix();
}

/* ---------- Render loop ---------- */
function animate() {
  requestAnimationFrame(animate);
  updateLabels();
  controls.update();
  renderer.render(scene, camera);
}

/* ---------- Labels follow 3D ---------- */
function updateLabels() {
  for (const label of measurementLabels) {
    const p3 = label.userData.point3D;
    if (!p3) continue;

    const s = p3.clone().project(camera);
    if (s.z > 1) { label.style.display = 'none'; continue; }
    label.style.display = 'block';

    const x = (s.x * 0.5 + 0.5) * container.clientWidth;
    const y = (s.y * -0.5 + 0.5) * container.clientHeight;
    label.style.left = `${x}px`;
    label.style.top  = `${y}px`;
  }
}

/* ---------- Resize ---------- */
function onWindowResize() {
  if (!container) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
