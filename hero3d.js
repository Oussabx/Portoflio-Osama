// Hero 3D scene behind the portrait: tilted orange rings, glowing satellites
// and floating particles. It turns with the mouse and scroll. The CSS ring
// stays visible if WebGL isn't available.
(function () {
  var host = document.getElementById('hero3d');
  if (!host || !window.THREE) return;
  var THREE = window.THREE;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  var key = new THREE.DirectionalLight(0xffe2cc, 2); key.position.set(2, 3, 4); scene.add(key);
  var rim = new THREE.DirectionalLight(0xff5a1f, 4); rim.position.set(-4, 1, -2); scene.add(rim);

  var group = new THREE.Group();
  group.position.y = 0.55; // around head/shoulder height
  scene.add(group);

  var glowMat = new THREE.MeshStandardMaterial({ color: 0xff6a2a, emissive: 0xff3d0f, emissiveIntensity: 1.1, roughness: 0.3, metalness: 0.5 });
  var ringA = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.04, 24, 220), glowMat);
  ringA.rotation.set(Math.PI * 0.43, -0.3, 0);
  group.add(ringA);
  var ringB = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.015, 16, 220),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffb38a, emissiveIntensity: 0.6, transparent: true, opacity: 0.55 }));
  ringB.rotation.set(Math.PI * 0.5, 0.25, 0.3);
  group.add(ringB);

  // Satellites
  var sats = [];
  var dark = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.5, clearcoat: 1 });
  var glow = new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff5a1f, emissiveIntensity: 1.4 });
  var white = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 });
  [[0.22, 2.3, 0.4, dark], [0.14, 2.3, 2.6, glow], [0.1, 2.9, 4.1, white], [0.08, 2.9, 5.4, glow]].forEach(function (s) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(s[0], 32, 32), s[3]);
    m.userData = { r: s[1], a: s[2] };
    sats.push(m);
    group.add(m);
  });

  // Dust
  var N = 320, pts = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) {
    var rr = 2 + Math.random() * 3.2, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pts[i * 3] = rr * Math.sin(ph) * Math.cos(th);
    pts[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(th);
    pts[i * 3 + 2] = rr * Math.cos(ph);
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffd2bf, size: 0.03, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(dust);

  function resize() {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);
  window.addEventListener('resize', resize);
  resize();

  var mouse = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(host);
  }

  var clock = new THREE.Clock();
  function render() {
    var t = clock.getElapsedTime();
    var scroll = Math.min(window.scrollY / window.innerHeight, 1.5);
    smooth.x += (mouse.x - smooth.x) * 0.05;
    smooth.y += (mouse.y - smooth.y) * 0.05;
    group.rotation.y = smooth.x * 0.35 + scroll * 0.8;
    group.rotation.x = smooth.y * 0.2 + scroll * 0.3;
    ringA.rotation.z = t * 0.3;
    ringB.rotation.z = -t * 0.18;
    sats.forEach(function (s, i) {
      var a = s.userData.a + t * (0.4 + i * 0.07);
      s.position.set(Math.cos(a) * s.userData.r, Math.sin(a * 1.4) * 0.45, Math.sin(a) * s.userData.r);
    });
    dust.rotation.y = -t * 0.04 + smooth.x * 0.1;
    renderer.render(scene, camera);
  }

  var first = true;
  function loop() {
    if (visible || first) {
      render();
      if (first) { first = false; host.classList.add('is-ready'); }
    }
    if (!reduceMotion) requestAnimationFrame(loop);
  }
  loop();
})();
