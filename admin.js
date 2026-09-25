(function () {
  var DRAFT_KEY = 'portfolio-admin-draft';
  var original = window.PORTFOLIO || { site: {}, projects: [] };
  var state = clone(original);
  var fileHandle = null;   // Chrome/Edge: remembered data.js file for direct saving
  var dirty = false;
  var openProject = 0;     // index of the expanded project card

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function serialize(data) {
    return '// Your portfolio content. Edit it with admin.html (or by hand).\n' +
      'window.PORTFOLIO = ' + JSON.stringify(data, null, 2) + ';\n';
  }

  // Make sure every section the forms use exists.
  function normalize(d) {
    d.site = d.site || {};
    var s = d.site;
    s.hero = s.hero || {};
    s.hero.stats = s.hero.stats || [];
    s.about = s.about || {};
    s.about.paragraphs = s.about.paragraphs || [];
    s.about.skillGroups = s.about.skillGroups || [];
    s.contact = s.contact || {};
    s.contact.socials = s.contact.socials || [];
    d.projects = d.projects || [];
    d.projects.forEach(function (p) {
      p.categories = p.categories || [];
      p.tags = p.tags || [];
      p.links = p.links || [];
    });
    return d;
  }
  normalize(state);

  // ---------- Status, drafts ----------
  var statusEl = document.getElementById('saveStatus');
  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'save-status' + (kind ? ' is-' + kind : '');
  }
  function changed() {
    dirty = true;
    setStatus('Unsaved changes', 'dirty');
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch (e) {}
    document.getElementById('adminInitials').textContent = state.site.initials || 'O';
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

  var banner = document.getElementById('draftBanner');
  try {
    var draft = localStorage.getItem(DRAFT_KEY);
    if (draft && draft !== JSON.stringify(state)) banner.hidden = false;
  } catch (e) {}
  document.getElementById('restoreDraft').addEventListener('click', function () {
    try { state = normalize(JSON.parse(localStorage.getItem(DRAFT_KEY))); } catch (e) {}
    banner.hidden = true;
    renderAll();
    changed();
  });
  document.getElementById('discardDraft').addEventListener('click', function () {
    clearDraft();
    banner.hidden = true;
  });

  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- Saving ----------
  var saveBtn = document.getElementById('saveBtn');
  function saved() {
    dirty = false;
    clearDraft();
    setStatus('Saved ✓ — refresh the site to see it', 'saved');
  }
  function download(text) {
    var blob = new Blob([text], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.js';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    saved();
    document.getElementById('saveHelp').showModal();
  }
  saveBtn.addEventListener('click', function () {
    var text = serialize(state);
    if (!window.showSaveFilePicker) { download(text); return; }
    var getHandle = fileHandle ? Promise.resolve(fileHandle) : window.showSaveFilePicker({
      suggestedName: 'data.js',
      types: [{ description: 'Portfolio content', accept: { 'text/javascript': ['.js'] } }]
    });
    getHandle.then(function (h) {
      fileHandle = h;
      return h.createWritable();
    }).then(function (w) {
      return w.write(text).then(function () { return w.close(); });
    }).then(saved).catch(function (err) {
      if (err && err.name === 'AbortError') return; // user closed the picker
      download(text);
    });
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveBtn.click(); }
  });

  // ---------- Tabs ----------
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        document.getElementById('panel-' + t.dataset.tab).hidden = !on;
      });
    });
  });

  // ---------- Small UI builders ----------
  function h(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  // Text input / textarea bound to obj[key].
  function field(label, obj, key, opts) {
    opts = opts || {};
    var input = opts.multiline ? h('textarea', { rows: opts.rows || 3 }) : h('input', { type: opts.type || 'text' });
    input.value = obj[key] || '';
    if (opts.placeholder) input.placeholder = opts.placeholder;
    input.addEventListener('input', function () {
      obj[key] = input.value;
      changed();
      if (opts.onInput) opts.onInput(input.value);
    });
    return h('label', { class: 'fld' }, [h('span', { text: label }), input, opts.hint ? h('small', { text: opts.hint }) : null]);
  }

  function checkbox(label, get, set) {
    var input = h('input', { type: 'checkbox' });
    input.checked = get();
    input.addEventListener('change', function () { set(input.checked); changed(); });
    return h('label', { class: 'check' }, [input, label]);
  }

  // Editable list of small rows, e.g. stats or links. cols: [{key, placeholder}]
  function rowList(items, cols, addLabel, rerender) {
    var wrap = h('div');
    var rows = h('div', { class: 'rows' });
    items.forEach(function (item, i) {
      var row = h('div', { class: 'row' });
      cols.forEach(function (c) {
        var input = h('input', { type: 'text', placeholder: c.placeholder, 'aria-label': c.placeholder });
        input.value = c.get ? c.get(item) : (item[c.key] || '');
        input.addEventListener('input', function () {
          if (c.set) c.set(item, input.value); else item[c.key] = input.value;
          changed();
        });
        row.appendChild(input);
      });
      row.appendChild(h('button', { class: 'icon', type: 'button', title: 'Move up', 'aria-label': 'Move up', text: '↑',
        onclick: function () { if (i > 0) { items.splice(i - 1, 0, items.splice(i, 1)[0]); changed(); rerender(); } } }));
      row.appendChild(h('button', { class: 'icon del', type: 'button', title: 'Remove', 'aria-label': 'Remove', text: '✕',
        onclick: function () { items.splice(i, 1); changed(); rerender(); } }));
      rows.appendChild(row);
    });
    wrap.appendChild(rows);
    wrap.appendChild(h('button', { class: 'add', type: 'button', text: '+ ' + addLabel, onclick: function () {
      var blank = {};
      cols.forEach(function (c) { if (c.key) blank[c.key] = ''; });
      if (cols[0].init) cols[0].init(blank);
      items.push(blank);
      changed();
      rerender();
    } }));
    return wrap;
  }

  // Shrinks big photos so data.js stays small; SVGs are kept as-is.
  function readImage(file, maxWidth) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        if (file.type === 'image/svg+xml') { resolve(reader.result); return; }
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var scale = Math.min(1, maxWidth / img.width);
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          var out = canvas.toDataURL('image/webp', 0.85);
          if (out.indexOf('data:image/webp') !== 0) out = canvas.toDataURL('image/jpeg', 0.85);
          resolve(out);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function imageField(label, obj, key, opts) {
    opts = opts || {};
    var thumb = h('div', { class: 'image-thumb' + (opts.round ? ' round' : '') });
    function paint() {
      thumb.style.backgroundImage = obj[key] ? 'url("' + obj[key] + '")' : '';
      thumb.textContent = obj[key] ? '' : 'No image';
      if (opts.onChange) opts.onChange();
    }
    var fileInput = h('input', { type: 'file', accept: 'image/*', 'aria-label': 'Upload ' + label });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0];
      if (!f) return;
      readImage(f, opts.maxWidth || 1600).then(function (url) {
        obj[key] = url;
        changed();
        paint();
      }).catch(function () { alert('Sorry, that image could not be read.'); });
      fileInput.value = '';
    });
    var remove = h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Remove', onclick: function () {
      obj[key] = '';
      changed();
      paint();
    } });
    paint();
    return h('div', { class: 'fld' }, [
      h('span', { text: label }),
      h('div', { class: 'image-field' }, [
        thumb,
        h('div', { class: 'image-buttons' }, [
          h('span', { class: 'btn btn-ghost btn-sm file-btn' }, ['Upload image', fileInput]),
          remove
        ])
      ]),
      opts.hint ? h('small', { text: opts.hint }) : null
    ]);
  }

  function panelHead(title, text, action) {
    return h('div', { class: 'panel-head' }, [h('div', {}, [h('h1', { text: title }), h('p', { text: text })]), action || null]);
  }
  function card(title, children) {
    return h('div', { class: 'card' }, [title ? h('h2', { text: title }) : null].concat(children));
  }
  function csv(list) { return (list || []).join(', '); }
  function uncsv(text) { return text.split(',').map(function (s) { return s.trim(); }).filter(Boolean); }

  // ---------- Projects ----------
  function renderProjects() {
    var panel = document.getElementById('panel-projects');
    panel.innerHTML = '';
    var projects = state.projects;
    panel.appendChild(panelHead('Projects', projects.length + ' project' + (projects.length === 1 ? '' : 's') + ' — shown on the site in this order.',
      h('button', { class: 'btn btn-primary btn-sm', type: 'button', text: '+ Add project', onclick: function () {
        projects.unshift({ title: 'New project', role: '', summary: '', categories: ['uiux'], tags: [], image: '', links: [], visible: true });
        openProject = 0;
        changed();
        renderProjects();
      } })));

    projects.forEach(function (p, i) {
      var isOpen = openProject === i;
      var thumb = h('div', { class: 'thumb' });
      thumb.style.backgroundImage = p.image ? 'url("' + p.image + '")' : '';
      var titleEl = h('strong', { text: p.title || 'Untitled' });
      var summary = h('div', { class: 'project-summary-row' }, [
        thumb,
        h('div', { class: 'info' }, [titleEl, h('small', {}, [p.role || '', p.visible === false ? h('span', { class: 'pill', text: 'Hidden' }) : null])]),
        h('button', { class: 'icon', type: 'button', title: 'Move up', 'aria-label': 'Move up', text: '↑', disabled: i === 0 ? '' : null,
          onclick: function () { projects.splice(i - 1, 0, projects.splice(i, 1)[0]); if (openProject === i) openProject = i - 1; changed(); renderProjects(); } }),
        h('button', { class: 'icon', type: 'button', title: 'Move down', 'aria-label': 'Move down', text: '↓', disabled: i === projects.length - 1 ? '' : null,
          onclick: function () { projects.splice(i + 1, 0, projects.splice(i, 1)[0]); if (openProject === i) openProject = i + 1; changed(); renderProjects(); } }),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: isOpen ? 'Close' : 'Edit',
          onclick: function () { openProject = isOpen ? -1 : i; renderProjects(); } })
      ]);
      // h() sets disabled="null" for null; clean that up.
      summary.querySelectorAll('[disabled="null"]').forEach(function (b) { b.removeAttribute('disabled'); });

      var el = h('div', { class: 'card project-card' + (p.visible === false ? ' is-hidden-project' : '') }, [summary]);
      if (isOpen) {
        el.appendChild(h('div', { class: 'project-body-edit' }, [
          h('div', { class: 'grid-2' }, [
            field('Title', p, 'title', { onInput: function (v) { titleEl.textContent = v || 'Untitled'; } }),
            field('Role', p, 'role', { placeholder: 'e.g. UX research · UI design' })
          ]),
          field('Summary', p, 'summary', { multiline: true, rows: 3 }),
          h('div', {}, [
            checkbox('UI/UX', function () { return p.categories.indexOf('uiux') !== -1; }, function (on) { toggleCat(p, 'uiux', on); }),
            checkbox('Development', function () { return p.categories.indexOf('dev') !== -1; }, function (on) { toggleCat(p, 'dev', on); }),
            checkbox('Show on site', function () { return p.visible !== false; }, function (on) { p.visible = on; })
          ]),
          h('label', { class: 'fld' }, [
            h('span', { text: 'Tags' }),
            (function () {
              var input = h('input', { type: 'text', placeholder: 'Figma, React, Accessibility' });
              input.value = csv(p.tags);
              input.addEventListener('input', function () { p.tags = uncsv(input.value); changed(); });
              return input;
            })(),
            h('small', { text: 'Separate with commas.' })
          ]),
          imageField('Image', p, 'image', { hint: 'A screenshot works best (wide, about 800×520).', onChange: function () {
            thumb.style.backgroundImage = p.image ? 'url("' + p.image + '")' : '';
          } }),
          h('div', { class: 'fld' }, [h('span', { text: 'Links' }), rowList(p.links, [
            { key: 'label', placeholder: 'Label (e.g. Live site)' },
            { key: 'href', placeholder: 'https://…' }
          ], 'Add link', renderProjects)]),
          h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Delete project', onclick: function () {
            if (!confirm('Delete "' + (p.title || 'this project') + '"?')) return;
            projects.splice(i, 1);
            openProject = -1;
            changed();
            renderProjects();
          } })
        ]));
      }
      panel.appendChild(el);
    });
  }
  function toggleCat(p, cat, on) {
    var i = p.categories.indexOf(cat);
    if (on && i === -1) p.categories.push(cat);
    if (!on && i !== -1) p.categories.splice(i, 1);
  }

  // ---------- Profile & hero ----------
  function renderProfile() {
    var s = state.site, hero = s.hero;
    var panel = document.getElementById('panel-profile');
    panel.innerHTML = '';
    panel.appendChild(panelHead('Profile & hero', 'Your name and the first thing visitors see.'));
    panel.appendChild(card('You', [
      h('div', { class: 'grid-2' }, [field('Name', s, 'name'), field('Initials (logo)', s, 'initials', { hint: '1–2 letters' })]),
      field('Job title', s, 'title')
    ]));
    panel.appendChild(card('Hero', [
      checkbox('Show availability badge', function () { return hero.showAvailability !== false; }, function (on) { hero.showAvailability = on; }),
      field('Availability text', hero, 'availability'),
      field('Headline', hero, 'headline', { multiline: true, rows: 2, hint: 'Wrap a word in *asterisks* to highlight it in colour.' }),
      field('Intro', hero, 'lead', { multiline: true, rows: 3 }),
      h('div', { class: 'fld' }, [h('span', { text: 'Stats' }), rowList(hero.stats, [
        { key: 'value', placeholder: 'Value (e.g. 5+)' },
        { key: 'label', placeholder: 'Label (e.g. Shipped projects)' }
      ], 'Add stat', renderProfile)])
    ]));
  }

  // ---------- About & skills ----------
  function renderAbout() {
    var about = state.site.about;
    var panel = document.getElementById('panel-about');
    panel.innerHTML = '';
    panel.appendChild(panelHead('About & skills', 'Your story, photo and skills.'));
    var paragraphs = h('textarea', { rows: 8 });
    paragraphs.value = about.paragraphs.join('\n\n');
    paragraphs.addEventListener('input', function () {
      about.paragraphs = paragraphs.value.split(/\n\s*\n/).map(function (t) { return t.trim(); }).filter(Boolean);
      changed();
    });
    panel.appendChild(card('About', [
      field('Heading', about, 'heading'),
      imageField('Photo', about, 'photo', { round: true, maxWidth: 800, hint: 'Leave empty to show your initials instead.' }),
      h('label', { class: 'fld' }, [h('span', { text: 'Text' }), paragraphs, h('small', { text: 'Leave an empty line between paragraphs.' })])
    ]));
    panel.appendChild(card('Skills', [
      rowList(about.skillGroups, [
        { key: 'name', placeholder: 'Group (e.g. Design)', init: function (g) { g.skills = []; } },
        { placeholder: 'Skills, separated by commas', get: function (g) { return csv(g.skills); }, set: function (g, v) { g.skills = uncsv(v); } }
      ], 'Add skill group', renderAbout)
    ]));
  }

  // ---------- Contact & messages ----------
  function renderContact() {
    var c = state.site.contact;
    var panel = document.getElementById('panel-contact');
    panel.innerHTML = '';
    panel.appendChild(panelHead('Contact & messages', 'How people reach you.'));
    panel.appendChild(card('Contact section', [
      field('Heading', c, 'heading'),
      field('Text', c, 'text', { multiline: true, rows: 2 }),
      field('Email', c, 'email', { type: 'email' }),
      h('div', { class: 'fld' }, [h('span', { text: 'Social links' }), rowList(c.socials, [
        { key: 'label', placeholder: 'Label (e.g. LinkedIn)' },
        { key: 'url', placeholder: 'https://…' }
      ], 'Add link', renderContact)])
    ]));
    panel.appendChild(card('Messages from the contact form', [
      h('ul', { class: 'info-list' }, [
        h('li', { text: 'With no form service set, the Send button opens the visitor\'s email app, addressed to the email above. Messages land in your normal inbox.' }),
        h('li', { text: 'To collect messages without that step, create a free form at formspree.io and paste its link below. Messages then arrive in your email and your Formspree inbox.' })
      ]),
      field('Form service link (optional)', c, 'formEndpoint', { type: 'url', placeholder: 'https://formspree.io/f/abcd1234' }),
      h('a', { class: 'btn btn-ghost btn-sm', href: 'https://formspree.io/forms', target: '_blank', rel: 'noopener', text: 'Open Formspree inbox ↗' })
    ]));
  }

  function renderAll() {
    renderProjects();
    renderProfile();
    renderAbout();
    renderContact();
    document.getElementById('adminInitials').textContent = state.site.initials || 'O';
  }

  renderAll();
  setStatus('All changes saved');
})();
