// Hero 3D scene: a glossy black blob that slowly morphs, lit with orange/red
// rim lights, with an orbiting ring and floating particles. It follows the
// mouse and reacts to scroll. The CSS orb stays visible if WebGL isn't available.
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
  camera.position.set(0, 0, 7);

  // Lights: warm key, strong orange + red rims so the black surface glows at the edges.
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  var key = new THREE.DirectionalLight(0xffe2cc, 1.6); key.position.set(2, 3, 4); scene.add(key);
  var rimO = new THREE.DirectionalLight(0xff5a1f, 6); rimO.position.set(-4, 1, -2); scene.add(rimO);
  var rimR = new THREE.DirectionalLight(0xe8341c, 5); rimR.position.set(4, -2, -3); scene.add(rimR);
  var fillL = new THREE.PointLight(0xff7a3d, 18, 12, 2); fillL.position.set(0, -2.5, 2.5); scene.add(fillL);

  var group = new THREE.Group();
  scene.add(group);

  // Morphing blob
  var geo = new THREE.SphereGeometry(1.35, 160, 160);
  var base = geo.attributes.position.array.slice();
  var blob = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: 0x0c0c0c, roughness: 0.18, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.6, sheenColor: new THREE.Color(0xff5a1f)
  }));
  group.add(blob);

  // Orbiting ring
  var ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.035, 24, 200),
    new THREE.MeshStandardMaterial({ color: 0xff6a2a, emissive: 0xff3d0f, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.6 })
  );
  ring.rotation.x = Math.PI * 0.42;
  ring.rotation.y = -0.35;
  group.add(ring);

  // Small satellites
  var sats = [];
  var satMat = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.5, clearcoat: 1 });
  var satGlow = new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff5a1f, emissiveIntensity: 1.2 });
  [[0.28, 2.6, 0.2, satMat], [0.16, 2.9, 2.4, satGlow], [0.12, 2.3, 4.2, satMat], [0.09, 3.1, 5.3, satGlow]].forEach(function (s) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(s[0], 32, 32), s[3]);
    m.userData = { r: s[1], a: s[2] };
    sats.push(m);
    group.add(m);
  });

  // Dust particles
  var dustGeo = new THREE.BufferGeometry();
  var N = 260, pts = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) {
    var rr = 2.4 + Math.random() * 2.6, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pts[i * 3] = rr * Math.sin(ph) * Math.cos(th);
    pts[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(th);
    pts[i * 3 + 2] = rr * Math.cos(ph);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffb38a, size: 0.025, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(dust);

  function morph(t) {
    var pos = geo.attributes.position.array;
    for (var i = 0; i < pos.length; i += 3) {
      var x = base[i], y = base[i + 1], z = base[i + 2];
      var n = Math.sin(x * 1.6 + t * 0.9) * Math.sin(y * 1.9 + t * 1.1) * Math.sin(z * 1.4 + t * 0.7)
            + 0.5 * Math.sin(x * 3.1 - t * 1.3 + y * 2.2);
      var k = 1 + n * 0.09;
      pos[i] = x * k; pos[i + 1] = y * k; pos[i + 2] = z * k;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  }

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

    morph(t);
    group.rotation.y = t * 0.18 + smooth.x * 0.5 + scroll * 1.2;
    group.rotation.x = smooth.y * 0.35 + scroll * 0.4;
    group.position.y = Math.sin(t * 0.8) * 0.08 - scroll * 0.6;
    ring.rotation.z = t * 0.35;
    sats.forEach(function (s, i) {
      var a = s.userData.a + t * (0.35 + i * 0.08);
      s.position.set(Math.cos(a) * s.userData.r, Math.sin(a * 1.3) * 0.7, Math.sin(a) * s.userData.r);
    });
    dust.rotation.y = -t * 0.03;
    dust.rotation.x = smooth.y * 0.1;
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
