/* app.js - builds the sidebar, renders a lesson (or the welcome page), and
   drives the OS switcher. All content lives in lessons.js; the reading level
   comes from level.js. Same skeleton as the Protocols site's app.js, minus the
   packet decoding. */
(function () {
  var nav = document.getElementById('nav');
  var content = document.getElementById('content');
  var main = document.getElementById('main');

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- the slide-out site menu behind the rail ---------- */

  function buildMenu() {
    var btn = document.getElementById('menu-btn'), panel = document.getElementById('sitemenu');
    if (!btn || !panel || !SITE.menu) return;
    panel.innerHTML = '<div class="sitemenu-title">Sites</div>' + SITE.menu.map(function (m) {
      if (m.current) return '<span class="menu-item current" aria-current="page">' + esc(m.label) + '<small>You are here</small></span>';
      if (!m.href) return '<span class="menu-item soon">' + esc(m.label) + '<small>Coming soon</small></span>';
      return '<a class="menu-item" href="' + esc(m.href) + '">' + esc(m.label) + '</a>';
    }).join('') + '<div class="sitemenu-foot">Packet Lessons</div>';
    var leaveTimer = null;
    function setOpen(open) {
      panel.classList.toggle('open', open);
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
    }
    function isOpen() { return panel.classList.contains('open'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!isOpen()); });
    panel.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.target.closest('a.menu-item')) setOpen(false);
    });
    document.addEventListener('click', function () { if (isOpen()) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); } });
    panel.addEventListener('mouseleave', function () { if (isOpen()) leaveTimer = setTimeout(function () { setOpen(false); }, 1200); });
    panel.addEventListener('mouseenter', function () { if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; } });
    panel.addEventListener('focusout', function (e) { if (!panel.contains(e.relatedTarget) && e.relatedTarget !== btn) setOpen(false); });
  }

  /* ---------- left column ---------- */

  function buildNav() {
    var last = null;
    LESSONS.forEach(function (l) {
      if (l.group && l.group !== last) {
        var g = document.createElement('div');
        g.className = 'nav-group';
        g.textContent = GROUPS[l.group] || l.group;
        nav.appendChild(g);
        last = l.group;
      }
      var b = document.createElement('button');
      b.className = 'row';
      b.type = 'button';
      b.dataset.id = l.id;
      b.innerHTML =
        '<span class="text"><span class="title">' + esc(l.title) + '</span>' +
        '<span class="sub">' + esc(l.subtitle) + '</span></span>' +
        (l.chip ? '<span class="lay">' + esc(l.chip) + '</span>' : '');
      b.addEventListener('click', function () { location.hash = l.id; });
      nav.appendChild(b);
    });
  }

  function setActive(id) {
    Array.prototype.forEach.call(nav.querySelectorAll('.row'), function (b) {
      b.classList.toggle('active', b.dataset.id === id);
    });
  }

  /* ---------- sequence diagram ---------- */

  function diagram(lesson) {
    var actors = lesson.actors, steps = lv(lesson.steps);
    var colW = 280, left = 140, top = 70, rowH = 34;
    var width = left * 2 + colW * (actors.length - 1);
    var height = top + rowH * steps.length + 30;
    var xs = actors.map(function (a, i) { return left + colW * i; });
    var out = [];
    out.push('<svg class="seq" viewBox="0 0 ' + width + ' ' + height + '" style="max-width:' + width + 'px" role="img" aria-label="Sequence diagram">');
    var head = '<path d="M0 0 L10 5 L0 10 z"/>';
    function marker(id) { return '<marker id="' + id + '" class="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">' + head + '</marker>'; }
    out.push('<defs>' + marker('arrow') + marker('arrow-bcast') + marker('arrow-dashed') + '</defs>');
    actors.forEach(function (a, i) {
      out.push('<line class="life" x1="' + xs[i] + '" y1="' + (top - 10) + '" x2="' + xs[i] + '" y2="' + (height - 10) + '"/>');
      out.push('<text class="actor" x="' + xs[i] + '" y="24" text-anchor="middle">' + esc(a.name) + '</text>');
      out.push('<text class="addr" x="' + xs[i] + '" y="42" text-anchor="middle">' + esc(a.addr) + '</text>');
    });
    steps.forEach(function (s, i) {
      var y = top + rowH * i + 12;
      var x1 = xs[s.from], x2, cls = 'msg' + (s.dashed ? ' dashed' : '');
      var label = lv(s.label);
      if (s.to === 'all') {
        /* broadcast: a line across the whole LAN, with a dot at the sender */
        cls += ' bcast';
        out.push('<line class="' + cls + '" x1="40" y1="' + y + '" x2="' + (width - 20) + '" y2="' + y + '" marker-start="url(#arrow-bcast)" marker-end="url(#arrow-bcast)"/>');
        out.push('<circle class="origin" cx="' + x1 + '" cy="' + y + '" r="4"/>');
        out.push('<text class="label" x="' + (width / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + esc(label) + '</text>');
      } else {
        x2 = xs[s.to];
        out.push('<line class="' + cls + '" x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" marker-end="url(#' + (s.dashed ? 'arrow-dashed' : 'arrow') + ')"/>');
        out.push('<text class="label" x="' + ((x1 + x2) / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + esc(label) + '</text>');
      }
      out.push('<text class="stepno" x="18" y="' + (y + 4) + '" text-anchor="middle">' + (i + 1) + '</text>');
    });
    out.push('</svg>');
    return out.join('');
  }

  /* ---------- OS switcher (Windows Server | Ubuntu | Alma/Rocky) ---------- */

  var OS_KEY = 'servers-os';
  var OS = getOs();

  function getOs() {
    var v = null;
    try { v = localStorage.getItem(OS_KEY); } catch (e) { v = null; }
    if (!v) { var q = /[?&]os=([a-z]+)/i.exec(location.search); if (q) v = q[1].toLowerCase(); }
    return OSES.some(function (o) { return o.id === v; }) ? v : OSES[0].id;
  }

  function setOs(id) {
    if (id === OS || !OSES.some(function (o) { return o.id === id; })) return;
    OS = id;
    try { localStorage.setItem(OS_KEY, OS); } catch (e) { /* private mode: lasts for this page only */ }
    window.rerender();
  }

  /* A step inside an OS list is a string / level object (one <li>), or
   * { text, cmd, out } for a step that carries a command and its output. */
  function stepHtml(step) {
    if (typeof step === 'string') return '<li>' + step + '</li>';
    var text = lv(step.text), cmd = lv(step.cmd), out = lv(step.out);
    if (!text && !cmd && !out) return '';   /* nothing at this level: no empty bullet */
    var h = '<li>';
    if (text) h += text;
    if (cmd) h += '<pre class="cmd">' + esc(cmd) + '</pre>';
    if (out) h += '<pre class="out">' + esc(out) + '</pre>';
    return h + '</li>';
  }

  function osHtml(os) {
    var h = ['<div class="os-tabs" role="group" aria-label="Operating system">'];
    OSES.forEach(function (o) {
      h.push('<button type="button" class="os-btn" data-os="' + o.id + '" aria-pressed="' + (o.id === OS ? 'true' : 'false') + '">' + esc(o.label) + '</button>');
    });
    h.push('</div>');
    var block = os[OS] || {};
    h.push('<div class="os-body">');
    var intro = lv(block.intro);
    if (intro) h.push('<p class="os-note">' + intro + '</p>');
    h.push('<ol class="steps">');
    var steps = block.steps || [];
    steps.forEach(function (st) {
      /* Level objects at the step level: resolve first, then render. */
      if (st !== null && typeof st === 'object' && !('text' in st) && !('cmd' in st)) st = lv(st);
      if (st === '' || st === null || st === undefined) return;
      var li = stepHtml(st);
      if (li) h.push(li);
    });
    h.push('</ol>');
    var after = lv(block.after);
    if (after) h.push('<p class="os-note">' + after + '</p>');
    h.push('</div>');
    return h.join('');
  }

  /* ---------- lesson ---------- */

  function sectionHtml(s) {
    var h = ['<section><h2>' + esc(lv(s.h)) + '</h2>'];
    lv(s.p || []).forEach(function (p) { h.push('<p>' + p + '</p>'); });
    if (s.steps) { h.push('<ol class="steps">'); lv(s.steps).forEach(function (t) { h.push('<li>' + t + '</li>'); }); h.push('</ol>'); }
    if (s.table) h.push(tableHtml(s.table));
    if (s.tryit) h.push(tryitHtml());
    if (s.os) h.push(osHtml(s.os));
    lv(s.after || []).forEach(function (p) { h.push('<p>' + p + '</p>'); });
    h.push('</section>');
    return h.join('');
  }

  /* { head: [...], rows: [[...], ...] } - cells may be level objects; a cell
   * starting with a backtick is shown in monospace. */
  function tableHtml(t) {
    var h = ['<div class="table-wrap"><table class="lab"><tr>'];
    t.head.forEach(function (c) { h.push('<th>' + esc(lv(c)) + '</th>'); });
    h.push('</tr>');
    t.rows.forEach(function (r) {
      h.push('<tr>');
      r.forEach(function (c) {
        var v = lv(c);
        if (typeof v === 'string' && v.charAt(0) === '`') h.push('<td class="mono">' + esc(v.slice(1)) + '</td>');
        else h.push('<td>' + v + '</td>');
      });
      h.push('</tr>');
    });
    h.push('</table></div>');
    return h.join('');
  }

  /* ---------- "try a request on this site": sends any method with fetch() and shows the raw answer ---------- */

  var TRY_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  var TRY_EXAMPLES = [
    { label: 'GET a page', m: 'GET', p: 'index.html' },
    { label: 'HEAD the same page', m: 'HEAD', p: 'index.html' },
    { label: 'GET a page that is not there', m: 'GET', p: 'missing.html' },
    { label: 'POST a form', m: 'POST', p: 'index.html', b: 'name=alice&role=student', t: 'application/x-www-form-urlencoded' },
    { label: 'PUT a file', m: 'PUT', p: 'notes.txt', b: 'hello from alice', t: 'text/plain' },
    { label: 'DELETE a page', m: 'DELETE', p: 'index.html' },
    { label: 'OPTIONS: what is allowed?', m: 'OPTIONS', p: 'index.html' },
    { label: 'POST to /echo (container only)', m: 'POST', p: 'echo', b: 'name=alice&role=student', t: 'application/x-www-form-urlencoded' }
  ];

  function tryitHtml() {
    var h = ['<div class="tryit" id="tryit">'];
    h.push('<div class="tryit-examples">' + TRY_EXAMPLES.map(function (x, i) { return '<button type="button" class="tryit-ex" data-i="' + i + '">' + esc(x.label) + '</button>'; }).join('') + '</div>');
    h.push('<div class="tryit-row">');
    h.push('<select class="tryit-method" aria-label="Method">' + TRY_METHODS.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select>');
    h.push('<span class="tryit-origin">' + esc(location.origin + location.pathname.replace(/[^\/]*$/, '')) + '</span>');
    h.push('<input class="tryit-path" aria-label="Path" value="index.html" spellcheck="false">');
    h.push('<button type="button" class="tryit-send">Send</button>');
    h.push('</div>');
    h.push('<div class="tryit-row tryit-bodyrow" hidden><label>Body <input class="tryit-type" aria-label="Content-Type" value="application/x-www-form-urlencoded" spellcheck="false"></label>');
    h.push('<textarea class="tryit-body" rows="2" spellcheck="false">name=alice&amp;role=student</textarea></div>');
    h.push('<pre class="cmd tryit-curl" aria-label="The same request as a curl command"></pre>');
    h.push('<pre class="out tryit-out">Pick an example above, or choose a method and a path, then Send. The answer appears here exactly as the server sent it.</pre>');
    h.push('</div>');
    return h.join('');
  }

  function wireTryIt() {
    var box = document.getElementById('tryit');
    if (!box) return;
    var method = box.querySelector('.tryit-method'), path = box.querySelector('.tryit-path'), bodyRow = box.querySelector('.tryit-bodyrow');
    var body = box.querySelector('.tryit-body'), type = box.querySelector('.tryit-type'), out = box.querySelector('.tryit-out'), curl = box.querySelector('.tryit-curl');
    function hasBody() { return /^(POST|PUT|PATCH)$/.test(method.value); }
    function base() { return location.origin + location.pathname.replace(/[^\/]*$/, ''); }
    function update() {
      bodyRow.hidden = !hasBody();
      var url = base() + path.value.replace(/^\//, '');
      var c = 'curl -i';
      if (method.value === 'HEAD') c += ' -I';
      else if (method.value !== 'GET') c += ' -X ' + method.value;
      if (hasBody()) c += " -H 'Content-Type: " + type.value + "' -d '" + body.value.replace(/'/g, "'\\''") + "'";
      curl.textContent = c + ' ' + url;
    }
    function send() {
      var url = base() + path.value.replace(/^\//, '');
      var opts = { method: method.value, cache: 'no-store', headers: {} };
      if (hasBody()) { opts.body = body.value; opts.headers['Content-Type'] = type.value; }
      var lines = ['> ' + method.value + ' /' + path.value.replace(/^\//, '') + ' HTTP/1.1', '> Host: ' + location.host];
      if (hasBody()) { lines.push('> Content-Type: ' + type.value, '> Content-Length: ' + new Blob([body.value]).size, '>', '> ' + body.value); }
      lines.push('');
      out.textContent = lines.join('\n') + 'sending...';
      var t0 = Date.now();
      fetch(url, opts).then(function (r) {
        lines.push('< HTTP ' + r.status + (r.statusText ? ' ' + r.statusText : '') + '   (' + (Date.now() - t0) + ' ms)');
        r.headers.forEach(function (v, k) { lines.push('< ' + k + ': ' + v); });
        return r.text().then(function (txt) {
          lines.push('<');
          if (method.value === 'HEAD') lines.push('(no body: HEAD asks for the headers only)');
          else if (!txt) lines.push('(empty body)');
          else lines.push(txt.length > 700 ? txt.slice(0, 700) + '\n... (' + txt.length + ' characters in total)' : txt);
          out.textContent = lines.join('\n');
        });
      }).catch(function (e) {
        lines.push('The browser could not send that request: ' + e.message + '. If you opened this page from a file, serve it over HTTP instead (see the welcome page).');
        out.textContent = lines.join('\n');
      });
    }
    box.addEventListener('click', function (e) {
      var ex = e.target.closest('.tryit-ex');
      if (ex) {
        var x = TRY_EXAMPLES[+ex.dataset.i];
        method.value = x.m; path.value = x.p;
        if (x.b !== undefined) { body.value = x.b; type.value = x.t || 'text/plain'; }
        update(); send(); return;
      }
      if (e.target.closest('.tryit-send')) send();
    });
    box.addEventListener('input', update);
    box.addEventListener('change', update);
    path.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    update();
  }

  var CLIENT_OS = { win: 'Windows client', linux: 'Linux client', any: 'Any client' };

  function checkHtml(lesson) {
    var h = ['<section><h2>Check it from a client</h2>'];
    lv(lesson.checkIntro || []).forEach(function (p) { h.push('<p>' + p + '</p>'); });
    var last = null;
    lesson.check.forEach(function (c) {
      if (c.os !== last) { h.push('<h3>' + esc(CLIENT_OS[c.os] || c.os) + '</h3>'); last = c.os; }
      h.push('<div class="cmdblock">');
      h.push('<pre class="cmd">' + esc(lv(c.cmd)) + '</pre>');
      var out = lv(c.out);
      if (out) h.push('<pre class="out">' + esc(out) + '</pre>');
      var why = lv(c.why);
      if (why) h.push('<p class="why">' + why + '</p>');
      h.push('</div>');
    });
    if (lesson.protocolRow && SITE.protocols) {
      h.push('<p class="protolink">Want to see the packets of this exchange? The <a href="' + esc(SITE.protocols + '#' + lesson.protocolRow) + '">' +
        esc(lesson.protocolRowTitle || lesson.title) + ' row on the Protocols site</a> shows a real capture of it, decoded packet by packet.</p>');
    }
    h.push('</section>');
    return h.join('');
  }

  function renderLesson(lesson) {
    var h = [];
    h.push('<article class="lesson" id="lesson-' + lesson.id + '">');
    h.push('<p class="crumb">' + esc(GROUPS[lesson.group] || 'Server role') + '</p>');
    h.push('<h1>' + esc(lesson.title) + ' <small>' + esc(lesson.subtitle) + '</small></h1>');
    h.push('<p class="lead">' + esc(lv(lesson.oneLiner)) + '</p>');
    h.push('<div class="facts">' +
      '<div><span class="k">Ports</span><span class="v">' + esc(lv(lesson.ports)) + '</span></div>' +
      '<div><span class="k">Windows Server role</span><span class="v">' + esc(lesson.winRole) + '</span></div>' +
      '<div><span class="k">Linux packages</span><span class="v">' + esc(lesson.linuxPkgs) + '</span></div></div>');
    if (lesson.project) h.push('<p class="hint"><b>Your part of the project.</b> ' + lv(lesson.project) + '</p>');
    lesson.sections.forEach(function (s) {
      if (s.diagram) {
        h.push('<section><h2>' + esc(lv(s.h)) + '</h2>');
        lv(s.p || []).forEach(function (p) { h.push('<p>' + p + '</p>'); });
        h.push('<div class="diagram">' + diagram(lesson) + '</div>');
        lv(s.after || []).forEach(function (p) { h.push('<p>' + p + '</p>'); });
        h.push('</section>');
      } else h.push(sectionHtml(s));
    });
    if (lesson.check) h.push(checkHtml(lesson));
    if (lesson.breaks) {
      h.push('<section><h2>When it breaks</h2><ul class="lookfor">');
      lv(lesson.breaks).forEach(function (t) { h.push('<li>' + t + '</li>'); });
      h.push('</ul></section>');
    }
    h.push('</article>');
    content.innerHTML = h.join('');
    content.addEventListener('click', onOsClick);
    wireTryIt();
  }

  function onOsClick(e) {
    var b = e.target.closest('.os-btn');
    if (b) setOs(b.dataset.os);
  }

  /* ---------- welcome page ---------- */

  function renderWelcome() {
    var w = SITE.welcome;
    var h = ['<article class="welcome"><h1>Server Basics</h1>'];
    h.push('<p class="lead">' + lv(w.lead) + '</p>');
    h.push('<h2>The project</h2>');
    lv(w.project).forEach(function (p) { h.push('<p>' + p + '</p>'); });
    h.push('<ol class="steps">');
    lv(w.projectSteps).forEach(function (t) { h.push('<li>' + t + '</li>'); });
    h.push('</ol>');
    h.push('<h2>What a server is</h2>');
    lv(w.server).forEach(function (p) { h.push('<p>' + p + '</p>'); });
    h.push('<h2>The four roles on this site</h2>');
    h.push('<div class="table-wrap"><table class="lab"><tr><th>Role</th><th>What it answers</th><th>Ports</th><th>Windows Server role</th><th>Linux packages</th></tr>');
    LESSONS.forEach(function (l) {
      h.push('<tr><td><a href="#' + l.id + '">' + esc(l.title) + '</a></td><td>' + lv(l.answers) + '</td><td class="mono">' + esc(lv(l.ports)) + '</td><td>' + esc(l.winRole) + '</td><td>' + esc(l.linuxPkgs) + '</td></tr>');
    });
    h.push('</table></div>');
    h.push('<h2>How to use this page</h2><ol>');
    lv(w.howTo).forEach(function (t) { h.push('<li>' + t + '</li>'); });
    h.push('</ol>');
    h.push('<p class="hint"><b>Reading level.</b> The <b>Simple</b>, <b>Moderate</b> and <b>Engineer</b> buttons at the top right change how deep every explanation goes. Simple is the big idea in plain words, Moderate is CCNA-student depth, Engineer is the full technical detail kept short. Your choice is remembered on this browser, and a link with <code>?level=simple</code> (or moderate, engineer) opens the site at that level.</p>');
    h.push('<p class="hint"><b>Operating system.</b> Inside each lesson, the <b>Windows Server</b>, <b>Ubuntu</b> and <b>Alma / Rocky</b> buttons switch the setup steps. That choice is remembered too, and <code>?os=ubuntu</code> (or win, rhel) opens the site on that system.</p>');
    h.push('<h2>Run this site on your own machine</h2>');
    h.push('<p class="hint">Everything here is static, so it also runs as a small Docker container. In the foreground (Ctrl+C stops and removes it):</p>');
    h.push('<pre class="cmd">docker run --rm -it --name server-basics -p ' + SITE.port + ':' + SITE.port + ' ' + esc(SITE.image) + '</pre>');
    h.push('<p class="hint">Then open <a href="http://127.0.0.1:' + SITE.port + '/">http://127.0.0.1:' + SITE.port + '/</a>.</p>');
    h.push('</article>');
    content.innerHTML = h.join('');
  }

  /* ---------- light / dark mode: dark unless the visitor picks light; index.html applies it before first paint ---------- */

  var THEME_KEY = 'packet-lessons-theme';
  function currentTheme() { return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; }
  function applyTheme(t, remember) {
    document.documentElement.dataset.theme = t;
    if (remember) { try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* private mode: lasts for this page only */ } }
    var b = document.getElementById('theme-btn');
    if (b) { b.innerHTML = t === 'dark' ? '&#9728;' : '&#9790;'; b.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; b.setAttribute('aria-label', b.title); }
  }
  function wireThemeButton(wrap) {
    if (!wrap) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'theme-btn'; b.className = 'theme-btn';
    b.addEventListener('click', function () { applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true); });
    wrap.appendChild(b);
    applyTheme(currentTheme(), false);
  }

  /* ---------- routing ---------- */

  function route() {
    content.removeEventListener('click', onOsClick);
    var id = location.hash.replace('#', '');
    var idx = -1;
    LESSONS.forEach(function (l, i) { if (l.id === id) idx = i; });
    setActive(idx >= 0 ? id : null);
    if (idx >= 0) renderLesson(LESSONS[idx]);
    else renderWelcome();
    document.title = (idx >= 0 ? LESSONS[idx].title + ' - ' : '') + 'Server Basics';
  }

  buildMenu();
  buildNav();
  window.rerender = function () { var y = main.scrollTop; route(); main.scrollTop = y; };
  wireLevelBar(document.getElementById('level-bar'));
  wireThemeButton(document.getElementById('level-bar'));
  window.addEventListener('hashchange', route);
  route();
})();
