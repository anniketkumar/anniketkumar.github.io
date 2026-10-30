/* =========================================================
   Aniket Kumar Pradhan — site behaviour
   - theme toggle (remembers the choice)
   - nav: goes solid on scroll, mobile menu, highlights the current section
   - cover: detection boxes over the photo, or an animated loss
     landscape if images/hero.jpg is missing
   You shouldn't need to edit this file to change content.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function theme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  /* ---------- Theme ---------- */
  var themeBtn = document.getElementById('theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function syncTheme() {
    var t = theme();
    if (themeBtn) themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    if (themeMeta) themeMeta.setAttribute('content', t === 'dark' ? '#04070f' : '#ffffff');
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = theme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncTheme();
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  }
  syncTheme();

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Nav ---------- */
  var nav = document.querySelector('.nav');
  var menuBtn = document.getElementById('menu-toggle');
  var navLinks = document.getElementById('nav-links');
  var links = {};
  Array.prototype.forEach.call(navLinks.querySelectorAll('a[href^="#"]'), function (a) {
    links[a.getAttribute('href').slice(1)] = a;
  });

  function setActive(id) {
    Object.keys(links).forEach(function (key) {
      var on = key === id;
      links[key].classList.toggle('active', on);
      if (on) links[key].setAttribute('aria-current', 'true');
      else links[key].removeAttribute('aria-current');
    });
  }

  // The current section is the last one whose heading has passed a line
  // just below the nav. Clicking a link sets it directly.
  var spySections = ['hero'].concat(Object.keys(links))
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var lockUntil = 0;

  function updateActive() {
    if (Date.now() < lockUntil) return;
    var line = nav.offsetHeight + Math.min(200, window.innerHeight * 0.3);
    var current = null;
    spySections.forEach(function (s) {
      if (s.getBoundingClientRect().top <= line) current = s.id;
    });
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom && links.contact) current = 'contact';
    setActive(current);
  }

  var scrollQueued = false;
  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(function () {
      scrollQueued = false;
      nav.classList.toggle('scrolled', window.scrollY > 24);
      updateActive();
    });
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  navLinks.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    setMenu(false);
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#' && links[href.slice(1)]) {
      setActive(href.slice(1));
      lockUntil = Date.now() + 1200; // let the smooth scroll finish first
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1040) setMenu(false); });

  /* ---------- Cover ---------- */
  var hero = document.getElementById('hero');
  if (!hero) return;

  /* Detection boxes. data-box values are % of the photo, so map them onto
     however object-fit: cover has cropped the photo at this screen size. */
  function layoutBoxes() {
    var photo = hero.querySelector('.hero-photo');
    var boxes = hero.querySelectorAll('.det');
    if (!photo || !photo.naturalWidth || !boxes.length) return;

    var W = photo.clientWidth, H = photo.clientHeight;
    var iw = photo.naturalWidth, ih = photo.naturalHeight;
    var s = Math.max(W / iw, H / ih);
    var rw = iw * s, rh = ih * s;
    var pos = getComputedStyle(photo).objectPosition.split(/\s+/);
    var fx = parseFloat(pos[0]) / 100, fy = parseFloat(pos[1]) / 100;
    if (isNaN(fx)) fx = 0.5;
    if (isNaN(fy)) fy = 0.5;
    var ox = (W - rw) * fx, oy = (H - rh) * fy;
    var minTop = (nav ? nav.offsetHeight : 64) + 26; // keep labels clear of the nav

    Array.prototype.forEach.call(boxes, function (box) {
      var v = (box.getAttribute('data-box') || '').trim().split(/[\s,]+/).map(Number);
      if (v.length !== 4 || v.some(isNaN)) { box.style.display = 'none'; return; }
      var l = Math.max(6, ox + v[0] / 100 * rw);
      var t = Math.max(minTop, oy + v[1] / 100 * rh);
      var r = Math.min(W - 6, ox + (v[0] + v[2]) / 100 * rw);
      var b = Math.min(H - 6, oy + (v[1] + v[3]) / 100 * rh);
      var visible = r - l > 40 && b - t > 40;
      box.style.display = visible ? '' : 'none';
      if (!visible) return;
      box.style.left = l + 'px';
      box.style.top = t + 'px';
      box.style.width = (r - l) + 'px';
      box.style.height = (b - t) + 'px';
    });
  }

  function showBoxes() {
    layoutBoxes();
    // the photo's frame also changes when fonts load or the layout switches, not just on resize
    if ('ResizeObserver' in window) new ResizeObserver(layoutBoxes).observe(photo);
    else window.addEventListener('resize', layoutBoxes);
    Array.prototype.forEach.call(hero.querySelectorAll('.det'), function (box, i) {
      if (reduceMotion) box.classList.add('on');
      else setTimeout(function () { box.classList.add('on'); }, 500 + i * 380);
    });
  }

  var photo = hero.querySelector('.hero-photo');
  if (photo) {
    if (photo.complete && photo.naturalWidth) showBoxes();
    else photo.addEventListener('load', showBoxes);
  }

  /* ---------- Loss landscape ----------
     Shown until there's a photo: a made-up loss surface drawn as contour
     lines, with an SGD-with-momentum optimiser rolling down it. */
  function startLandscape() {
    var canvas = hero.querySelector('.landscape');
    if (!canvas || canvas.getAttribute('data-on')) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.setAttribute('data-on', '1');

    var layer = document.createElement('canvas');
    var lctx = layer.getContext('2d');
    var readout = hero.querySelector('.readout');

    var LR = 0.0012, MOMENTUM = 0.9, MAX_STEP = 0.006, STEP_MS = 1000 / 45;

    var W = 0, H = 0, A = 1, dpr = 1;
    var wells = [], centre = [0, 0];
    var fmin = 0, fmax = 1;
    var col = {};
    var run = null, ghosts = [];
    var restartAt = 0, last = 0, acc = 0, frame = 0;
    var inView = true, rafId = 0;

    // u runs 0..A across (A = width / height), v runs 0..1 down
    function loss(u, v) {
      var du = u - centre[0], dv = v - centre[1];
      var z = 0.5 * (du * du + dv * dv);
      for (var i = 0; i < wells.length; i++) {
        var w = wells[i], a = u - w[0], b = v - w[1];
        z -= w[2] * Math.exp(-(a * a + b * b) / (2 * w[3] * w[3]));
      }
      return z + 0.03 * Math.sin(7 * u + 1.3) * Math.cos(6 * v - 0.4);
    }

    function grad(u, v) {
      var h = 1e-4;
      return [
        (loss(u + h, v) - loss(u - h, v)) / (2 * h),
        (loss(u, v + h) - loss(u, v - h)) / (2 * h)
      ];
    }

    function readColours() {
      var cs = getComputedStyle(root);
      col.accent = cs.getPropertyValue('--accent-rgb').trim();
      col.spark = cs.getPropertyValue('--spark').trim();
      col.light = theme() === 'light';
    }

    function resize() {
      var w = hero.clientWidth, h = hero.clientHeight;
      if (!w || !h || (w === W && h === H)) return false;
      W = w; H = h; A = W / H;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = layer.width = Math.round(W * dpr);
      canvas.height = layer.height = Math.round(H * dpr);
      // the minima sit up and to the right, away from your name in the lower-left
      centre = [0.74 * A, 0.36];
      wells = [
        [0.74 * A, 0.36, 1.00, 0.16],
        [0.92 * A, 0.64, 0.55, 0.10],
        [0.50 * A, 0.17, 0.45, 0.11],
        [0.26 * A, 0.50, 0.30, 0.13]
      ];
      return true;
    }

    function drawContours() {
      readColours();
      var cell = 7;
      var cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
      var g = new Float32Array(cols * rows);
      fmin = Infinity; fmax = -Infinity;
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var z = loss(i * cell / H, j * cell / H);
          g[j * cols + i] = z;
          if (z < fmin) fmin = z;
          if (z > fmax) fmax = z;
        }
      }

      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.clearRect(0, 0, W, H);
      lctx.lineWidth = 1;

      var N = 24;
      for (var k = 1; k < N; k++) {
        var t = k / N;
        var level = fmin + (fmax - fmin) * Math.pow(t, 1.35);
        var alpha = col.light ? 0.5 - 0.36 * t : 0.6 - 0.46 * t;
        lctx.strokeStyle = 'rgba(' + col.accent + ',' + alpha.toFixed(3) + ')';
        lctx.beginPath();
        march(g, cols, rows, cell, level);
        lctx.stroke();
      }
    }

    // Marching squares: trace one contour level through the grid
    function march(g, cols, rows, cell, L) {
      for (var j = 0; j < rows - 1; j++) {
        for (var i = 0; i < cols - 1; i++) {
          var a = g[j * cols + i], b = g[j * cols + i + 1];
          var c = g[(j + 1) * cols + i + 1], d = g[(j + 1) * cols + i];
          var idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          var x = i * cell, y = j * cell, x2 = x + cell, y2 = y + cell;
          var tx = x + cell * (L - a) / (b - a);
          var ry = y + cell * (L - b) / (c - b);
          var bx = x + cell * (L - d) / (c - d);
          var ly = y + cell * (L - a) / (d - a);
          switch (idx) {
            case 1: case 14: seg(x, ly, bx, y2); break;
            case 2: case 13: seg(bx, y2, x2, ry); break;
            case 3: case 12: seg(x, ly, x2, ry); break;
            case 4: case 11: seg(tx, y, x2, ry); break;
            case 6: case 9: seg(tx, y, bx, y2); break;
            case 7: case 8: seg(x, ly, tx, y); break;
            case 5: seg(tx, y, x2, ry); seg(x, ly, bx, y2); break;
            case 10: seg(x, ly, tx, y); seg(bx, y2, x2, ry); break;
          }
        }
      }
    }
    function seg(x1, y1, x2, y2) { lctx.moveTo(x1, y1); lctx.lineTo(x2, y2); }

    function newRun() {
      // start from one of the higher points, away from the text in the lower-left
      var picks = [];
      for (var k = 0; k < 14; k++) {
        var u = (0.3 + 0.66 * Math.random()) * A;
        var v = 0.08 + 0.42 * Math.random();
        picks.push([u, v, loss(u, v)]);
      }
      picks.sort(function (p, q) { return q[2] - p[2]; });
      var p = picks[Math.floor(Math.random() * 5)];
      run = { u: p[0], v: p[1], vu: 0, vv: 0, step: 0, still: 0, done: false, path: [[p[0], p[1]]] };
    }

    function stepRun() {
      var g = grad(run.u, run.v);
      run.vu = MOMENTUM * run.vu - LR * g[0];
      run.vv = MOMENTUM * run.vv - LR * g[1];
      var sp = Math.sqrt(run.vu * run.vu + run.vv * run.vv);
      if (sp > MAX_STEP) { run.vu *= MAX_STEP / sp; run.vv *= MAX_STEP / sp; }
      run.u += run.vu;
      run.v += run.vv;
      run.step++;
      run.path.push([run.u, run.v]);
      run.still = sp < 0.0002 ? run.still + 1 : 0;
      if (run.still > 40 || run.step > 1400) run.done = true;
    }

    function drawPath(path, alpha, width) {
      if (path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(path[0][0] * H, path[0][1] * H);
      for (var i = 1; i < path.length; i++) ctx.lineTo(path[i][0] * H, path[i][1] * H);
      ctx.strokeStyle = 'rgba(' + col.accent + ',' + alpha + ')';
      ctx.lineWidth = width;
      ctx.stroke();
    }

    function pad(n) { return ('000' + n).slice(-4); }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(layer, 0, 0, W, H);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (var i = 0; i < ghosts.length; i++) drawPath(ghosts[i], col.light ? 0.2 : 0.26, 1.2);
      drawPath(run.path, 0.9, 1.8);

      // where this run started
      var s = run.path[0];
      ctx.beginPath();
      ctx.arc(s[0] * H, s[1] * H, 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + col.accent + ',.85)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // the optimiser
      ctx.save();
      ctx.shadowColor = col.spark;
      ctx.shadowBlur = 18;
      ctx.fillStyle = col.spark;
      ctx.beginPath();
      ctx.arc(run.u * H, run.v * H, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (readout && (frame % 4 === 0 || run.done)) {
        var z = Math.max(0, (loss(run.u, run.v) - fmin) / (fmax - fmin));
        readout.textContent = 'sgd(momentum=0.9)   step ' + pad(run.step) + '   loss ' + z.toFixed(4);
      }
    }

    function settle() { while (!run.done) stepRun(); }

    function tick(now) {
      rafId = 0;
      if (!inView || document.hidden) { last = 0; return; }
      if (!last) last = now;
      acc += Math.min(now - last, 100);
      last = now;
      frame++;

      if (run.done) {
        if (!restartAt) restartAt = now + 1600;
        else if (now >= restartAt) {
          ghosts.push(run.path);
          if (ghosts.length > 2) ghosts.shift();
          newRun();
          restartAt = 0;
        }
        acc = 0;
      } else {
        while (acc >= STEP_MS && !run.done) { stepRun(); acc -= STEP_MS; }
      }
      render();
      rafId = requestAnimationFrame(tick);
    }

    function play() { if (!reduceMotion && !rafId) rafId = requestAnimationFrame(tick); }

    resize();
    drawContours();
    newRun();
    if (reduceMotion) settle();
    render();
    play();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) play();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) play(); });

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!resize()) return;
        drawContours();
        ghosts = [];
        newRun();
        if (reduceMotion) settle();
        render();
      }, 150);
    });

    document.addEventListener('themechange', function () {
      drawContours();
      render();
    });
  }

  if (hero.classList.contains('no-photo')) startLandscape();
  document.addEventListener('hero:nophoto', startLandscape);
})();
