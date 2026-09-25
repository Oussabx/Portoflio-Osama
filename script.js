(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var data = window.PORTFOLIO || {};
  var site = data.site || {};
  var projectsData = data.projects || [];
  var ARROW = '<svg><use href="#i-arrow"/></svg>';

  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------- Helpers ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  // Renders *word* as <em>word</em>; everything else stays plain text.
  function setEmphasis(node, text) {
    node.textContent = '';
    text.split(/\*([^*]+)\*/).forEach(function (part, i) {
      node.appendChild(i % 2 ? el('em', null, part) : document.createTextNode(part));
    });
  }
  function fill(container, items, build) {
    if (!container || !items) return;
    container.innerHTML = '';
    items.forEach(function (item, i) { container.appendChild(build(item, i)); });
  }
  function allSkills() {
    return ((site.about && site.about.skillGroups) || []).reduce(function (a, g) { return a.concat(g.skills || []); }, []);
  }

  // ---------- Nav ----------
  var header = document.getElementById('header');
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');
  function setNav(open) {
    nav.classList.toggle('is-open', open);
    navToggle.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  navToggle.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });

  // ---------- Site content ----------
  document.querySelectorAll('[data-field]').forEach(function (node) {
    var value = get(site, node.dataset.field);
    if (typeof value !== 'string' || !value) return;
    if (node.dataset.format === 'emphasis') setEmphasis(node, value);
    else node.textContent = value;
  });
  if (site.name) document.title = site.name + ' — ' + (site.title || 'Portfolio');

  var hero = site.hero || {};
  document.getElementById('availability').hidden = hero.showAvailability === false;

  var services = (site.services && site.services.length ? site.services : allSkills()).slice(0, 4);
  fill(document.getElementById('services'), services, function (s, i) {
    var li = el('li');
    li.appendChild(el('b', null, ('0' + (i + 1)).slice(-2)));
    li.appendChild(document.createTextNode(s));
    return li;
  });

  var skills = allSkills();
  var track = document.getElementById('marquee');
  if (skills.length) {
    track.innerHTML = '';
    // Two copies so the loop is seamless.
    skills.concat(skills).forEach(function (s, i) {
      var item = el('span', 'marquee-item');
      if (i >= skills.length) item.setAttribute('aria-hidden', 'true');
      item.appendChild(el('i'));
      item.appendChild(document.createTextNode(s));
      track.appendChild(item);
    });
  }

  var about = site.about || {};
  fill(document.getElementById('aboutText'), about.paragraphs, function (t) { return el('p', null, t); });
  if (about.photo) {
    var media = document.getElementById('aboutMedia');
    var photo = el('img');
    photo.src = about.photo;
    photo.alt = 'Portrait of ' + (site.name || 'me');
    media.appendChild(photo);
    media.hidden = false;
  }

  var statsEl = document.getElementById('heroStats');
  fill(statsEl, hero.stats, function (s) {
    var li = el('li', 'reveal');
    var strong = el('strong', null, s.value);
    // Numbers count up when they scroll into view, e.g. "5+" or "100".
    var m = /^(\d+)(.*)$/.exec(s.value || '');
    if (m) { strong.dataset.count = m[1]; strong.dataset.suffix = m[2]; }
    li.appendChild(strong);
    li.appendChild(el('span', null, s.label));
    return li;
  });

  var contact = site.contact || {};
  var email = contact.email || '';
  if (email) {
    var mail = document.getElementById('contactEmail');
    mail.href = 'mailto:' + email;
    mail.textContent = email;
  }
  if (contact.phone) {
    var phone = document.getElementById('contactPhone');
    phone.textContent = contact.phone;
    phone.href = 'tel:' + contact.phone.replace(/[^\d+]/g, '');
    document.getElementById('phoneLine').hidden = false;
  }
  fill(document.getElementById('socials'), contact.socials, function (s) {
    var li = el('li');
    var a = el('a', null, s.label);
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    li.appendChild(a);
    return li;
  });
  var copyBtn = document.getElementById('copyEmail');
  copyBtn.addEventListener('click', function () {
    var text = document.getElementById('contactEmail').textContent;
    var done = function () {
      copyBtn.textContent = 'Copied ✓';
      copyBtn.classList.add('is-done');
      setTimeout(function () { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('is-done'); }, 1800);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
  });

  // ---------- Projects ----------
  var grid = document.getElementById('projects');
  var activeFilter = 'all';
  function renderProjects() {
    grid.innerHTML = '';
    var shown = projectsData.filter(function (p) {
      return p.visible !== false && (activeFilter === 'all' || (p.categories || []).indexOf(activeFilter) !== -1);
    });
    if (!shown.length) { grid.appendChild(el('p', 'projects-empty', 'No projects here yet.')); return; }
    shown.forEach(function (p, i) {
      var card = el('article', 'project');
      card.style.animationDelay = (i * 0.08) + 's';
      var inner = el('div', 'project-inner');
      var media = el('div', 'project-media');
      if (p.image) {
        var img = el('img');
        img.src = p.image;
        img.alt = p.title + ' preview';
        img.loading = 'lazy';
        media.appendChild(img);
      } else {
        media.appendChild(el('div', 'no-image'));
      }
      media.appendChild(el('span', 'project-num', ('0' + (i + 1)).slice(-2)));
      var mainLink = p.links && p.links[0];
      if (mainLink) {
        var go = el('a', 'project-go');
        go.href = mainLink.href;
        go.target = '_blank';
        go.rel = 'noopener';
        go.setAttribute('aria-label', 'Open ' + p.title);
        go.innerHTML = ARROW;
        media.appendChild(go);
      }
      var body = el('div', 'project-body');
      if (p.role) body.appendChild(el('p', 'project-role', p.role));
      body.appendChild(el('h3', 'project-title', p.title));
      if (p.summary) body.appendChild(el('p', 'project-summary', p.summary));
      var tags = el('ul', 'tags');
      (p.tags || []).forEach(function (t) { tags.appendChild(el('li', null, t)); });
      body.appendChild(tags);
      if (p.links && p.links.length) {
        var links = el('div', 'project-links');
        p.links.forEach(function (l) {
          var a = el('a', 'link-arrow', l.label + ' ↗');
          a.href = l.href;
          a.target = '_blank';
          a.rel = 'noopener';
          links.appendChild(a);
        });
        body.appendChild(links);
      }
      inner.appendChild(media);
      inner.appendChild(body);
      card.appendChild(inner);
      grid.appendChild(card);
      if (finePointer && !reduceMotion) addTilt(card);
    });
  }
  function addTilt(card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', ((x - 0.5) * 12).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
      card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', function () {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }
  var filters = document.querySelectorAll('.filter');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      activeFilter = btn.dataset.filter;
      renderProjects();
    });
  });
  renderProjects();

  // ---------- Arc of tiles ----------
  var ring = document.getElementById('arcRing');
  var images = projectsData.filter(function (p) { return p.visible !== false && p.image; }).map(function (p) { return p.image; });
  var TILES = 16;
  for (var t = 0; t < TILES; t++) {
    var tile = el('div', 'arc-tile');
    var angle = (360 / TILES) * t;
    tile.style.setProperty('--a', angle + 'deg');
    tile.style.setProperty('--tilt', ((t % 3) - 1) * 8 + 'deg');
    // Alternate real project images with orange/black art tiles.
    if (images.length && t % 2 === 0) {
      var ti = el('img');
      ti.src = images[(t / 2) % images.length];
      ti.alt = '';
      ti.loading = 'lazy';
      tile.appendChild(ti);
    } else {
      tile.classList.add('fill-' + ((t % 3) + 1));
    }
    ring.appendChild(tile);
  }

  // ---------- Reveal on scroll ----------
  var reveals = document.querySelectorAll('.reveal');
  function countUp(node) {
    var target = +node.dataset.count, suffix = node.dataset.suffix || '', start = null;
    function step(ts) {
      if (!start) start = ts;
      var k = Math.min(1, (ts - start) / 1400);
      var eased = 1 - Math.pow(1 - k, 3);
      node.textContent = Math.round(target * eased) + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    root.classList.add('js-reveal');
    // Stagger siblings that reveal together.
    document.querySelectorAll('.stats .reveal').forEach(function (n, i) { n.style.setProperty('--d', (i * 0.12) + 's'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        var counter = entry.target.querySelector('[data-count]');
        if (counter) countUp(counter);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (r) { io.observe(r); });
  }

  // ---------- Motion loop: parallax, card images, arc rotation, cursor ----------
  var speedEls = [].slice.call(document.querySelectorAll('[data-speed]'));
  var arcSection = document.getElementById('arc');
  var cursor = document.querySelector('.cursor');
  var dot = cursor && cursor.querySelector('.cursor-dot');
  var ringEl = cursor && cursor.querySelector('.cursor-ring');
  var mouse = { x: -100, y: -100 }, ringPos = { x: -100, y: -100 };
  var showCursor = finePointer && !reduceMotion && cursor && getComputedStyle(cursor).display !== 'none';

  if (showCursor) {
    window.addEventListener('pointermove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
      cursor.classList.remove('is-hidden');
      var hover = e.target.closest('a, button, .project, input, textarea, select');
      cursor.classList.toggle('is-hover', !!hover);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.add('is-hidden'); });
  }

  var start = performance.now();
  function frame(now) {
    var vh = window.innerHeight;
    header.classList.toggle('is-scrolled', window.scrollY > 20);

    if (!reduceMotion) {
      speedEls.forEach(function (n) {
        var r = n.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var offset = (r.top + r.height / 2 - vh / 2) - (n.__p || 0); // undo our own shift
        var p = -offset * parseFloat(n.dataset.speed);
        n.__p = p;
        n.style.setProperty('--p', p.toFixed(1) + 'px');
      });

      grid.querySelectorAll('.project-media img').forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var k = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 across the screen
        img.style.setProperty('--py', (k * -40).toFixed(1) + 'px');
      });

      var ar = arcSection.getBoundingClientRect();
      if (ar.bottom > 0 && ar.top < vh) {
        var progress = (vh - ar.top) / (vh + ar.height);
        var rot = (now - start) * 0.004 + progress * 70;
        ring.style.setProperty('--ring', (-rot).toFixed(2) + 'deg');
      }

      if (showCursor) {
        ringPos.x += (mouse.x - ringPos.x) * 0.18;
        ringPos.y += (mouse.y - ringPos.y) * 0.18;
        dot.style.transform = 'translate(' + mouse.x + 'px,' + mouse.y + 'px) translate(-50%,-50%)';
        ringEl.style.transform = 'translate(' + ringPos.x + 'px,' + ringPos.y + 'px) translate(-50%,-50%)';
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- Contact form ----------
  // Posts to the form service set in admin.html (e.g. Formspree),
  // otherwise opens the visitor's email app.
  var form = document.getElementById('contactForm');
  var note = document.getElementById('formNote');
  var submitBtn = form.querySelector('button[type="submit"]');
  function setNote(text, kind) {
    note.textContent = text;
    note.className = 'form-note' + (kind ? ' is-' + kind : '');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      setNote('Please fill in your name, a valid email and a message.', 'error');
      return;
    }
    var name = document.getElementById('name').value.trim();
    var from = document.getElementById('email').value.trim();
    var type = document.getElementById('projectType').value;
    var message = document.getElementById('message').value.trim();

    if (contact.formEndpoint) {
      submitBtn.disabled = true;
      setNote('Sending…');
      fetch(contact.formEndpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          form.reset();
          setNote('Thanks, ' + name + '! Your message was sent — I\'ll get back to you soon.', 'success');
        })
        .catch(function () { setNote('Sorry, that didn\'t send. Please email me directly instead.', 'error'); })
        .then(function () { submitBtn.disabled = false; });
      return;
    }
    var subject = encodeURIComponent('Portfolio enquiry' + (type ? ' — ' + type : '') + ' from ' + name);
    var body = encodeURIComponent(message + '\n\n— ' + name + ' (' + from + ')');
    window.location.href = 'mailto:' + (email || 'you@example.com') + '?subject=' + subject + '&body=' + body;
    setNote('Opening your email app… thanks for reaching out!', 'success');
  });
})();
