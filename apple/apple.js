/* AIRO — version « page produit ».
   Principes du skill apple-design : réponse immédiate, ressorts interruptibles
   (amortissement + réponse), passage de vitesse, projection de l'élan, élastique en bord. */
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Ressort (paramètres Apple : amortissement, réponse en s) ---------- */
  var springs = new Set(), last = 0, ticking = false;
  function tick(t) {
    var dt = Math.min(0.064, last ? (t - last) / 1000 : 1 / 60);
    last = t;
    springs.forEach(function (s) { s.step(dt); });
    if (springs.size) requestAnimationFrame(tick); else { ticking = false; last = 0; }
  }
  function Spring(x, onUpdate) { this.x = x; this.v = 0; this.target = x; this.damping = 1; this.response = 0.4; this.cb = onUpdate; }
  Spring.prototype.to = function (target, o) {
    o = o || {};
    this.target = target;
    if (o.velocity !== undefined) this.v = o.velocity;          // vitesse du doigt transmise au ressort
    if (o.damping !== undefined) this.damping = o.damping;
    if (o.response !== undefined) this.response = o.response;
    if (reduce) { this.x = target; this.v = 0; this.cb(this.x); return; }
    springs.add(this);
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  };
  Spring.prototype.stop = function () { springs.delete(this); this.v = 0; };
  Spring.prototype.step = function (dt) {
    var k = Math.pow(2 * Math.PI / this.response, 2), c = 4 * Math.PI * this.damping / this.response;
    for (var n = Math.ceil(dt / (1 / 240)), h = dt / n, i = 0; i < n; i++) {
      this.v += (-k * (this.x - this.target) - c * this.v) * h;
      this.x += this.v * h;
    }
    if (Math.abs(this.x - this.target) < 0.01 && Math.abs(this.v) < 0.05) { this.x = this.target; this.v = 0; springs.delete(this); }
    this.cb(this.x);
  };
  // Projection d'élan (code d'exemple Apple, « Designing Fluid Interfaces »)
  function project(v, d) { d = d || 0.998; return (v / 1000) * d / (1 - d); }
  function rubberband(over, dim, c) { c = c || 0.55; return (over * dim * c) / (dim + c * Math.abs(over)); }

  /* ---------- Navigation : thème selon la section dessous, lien actif ---------- */
  var nav = document.getElementById("nav");
  var themed = [].slice.call(document.querySelectorAll("main > section, .foot"));
  var links = [].slice.call(document.querySelectorAll(".nav__links a")).filter(function (a) { return a.getAttribute("href").charAt(0) === "#"; });
  var hero = document.querySelector(".hero__machine");
  function onScroll() {
    var probe = 24, cur = null;
    for (var i = 0; i < themed.length; i++) {
      var r = themed[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { cur = themed[i]; break; }
    }
    if (cur) nav.setAttribute("data-theme", cur.getAttribute("data-theme"));
    links.forEach(function (a) {
      var s = document.querySelector(a.getAttribute("href"));
      var r = s.getBoundingClientRect(), on = r.top <= innerHeight * 0.4 && r.bottom > innerHeight * 0.4;
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    if (hero && !reduce) hero.style.setProperty("--hp", clamp(scrollY / innerHeight, 0, 1).toFixed(3));
    film.update();
  }

  /* ---------- Film de la borne piloté par le défilement ---------- */
  var film = (function () {
    var sec = document.getElementById("film"), cv = document.getElementById("filmCanvas");
    if (!sec) return { update: function () {} };
    // Connexion lente, économie de données ou petit écran : une image sur deux suffit (le film reste fluide).
    var con = navigator.connection || {};
    var light = con.saveData || /(^|-)2g|3g/.test(con.effectiveType || "") || innerWidth < 600;
    var bar = document.getElementById("filmBar");
    var ctx = cv.getContext("2d"), N = 150, set = null, imgs = [], shown = -1, started = false;
    var caps = [].slice.call(sec.querySelectorAll(".cap")).map(function (el) {
      return { el: el, a: +el.dataset.from, b: +el.dataset.to };
    });
    function pickSet() { return innerWidth / innerHeight < 0.9 ? "m" : "d"; }
    function src(i) { return "assets/film/" + set + "/" + String(i).padStart(3, "0") + ".webp"; }
    function load(i) {
      if (imgs[i]) return;
      var im = new Image(); im.decoding = "async"; imgs[i] = im;
      im.onload = function () { im.ok = true; if (Math.abs(i - want()) < 20 && onScreen()) { shown = -1; draw(); } };
      im.src = src(i);
    }
    function queueAll() {                                  // du grossier au fin
      var order = [];
      (light ? [16, 8, 4, 2] : [16, 8, 4, 2, 1]).forEach(function (s) { for (var i = 0; i < N; i += s) if (order.indexOf(i) < 0) order.push(i); });
      var k = 0;
      (function next() {
        for (var j = 0; j < 6 && k < order.length; j++) load(order[k++]);
        if (k < order.length) setTimeout(next, 60);
      })();
    }
    function progress() {
      var r = sec.getBoundingClientRect();
      return clamp(-r.top / (r.height - innerHeight), 0, 1);
    }
    function onScreen() { var r = sec.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }
    function want() { return Math.round(progress() * (N - 1)); }
    function size() {
      var dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
      var s = pickSet();
      if (s !== set) { set = s; imgs = []; load(0); if (started) queueAll(); }
      shown = -1; draw();
    }
    function draw() {
      var w = want();
      for (var d = 0; d < N; d++) {                         // image chargée la plus proche
        var i = imgs[w - d] && imgs[w - d].ok ? w - d : imgs[w + d] && imgs[w + d].ok ? w + d : -1;
        if (i >= 0) {
          if (i === shown) return;
          var im = imgs[i], s = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight);
          var iw = im.naturalWidth * s, ih = im.naturalHeight * s;
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(im, (cv.width - iw) / 2, (cv.height - ih) / 2, iw, ih);
          shown = i; return;
        }
      }
    }
    function update() {
      var r = sec.getBoundingClientRect();
      if (r.bottom < -innerHeight || r.top > innerHeight * 2) return;
      // les images du film attendent la fin du chargement de la page (le haut de page passe en premier)
      if (!started && document.readyState === "complete") {
        started = true;
        (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(queueAll, { timeout: 1500 });
      }
      if (r.top > innerHeight || r.bottom < 0) return;   // on ne dessine que lorsque le film est à l'écran
      draw();
      var p = progress();
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      caps.forEach(function (c) {
        var span = c.b - c.a, t = (p - c.a) / span, f = 0.22;
        var o = t < 0 || t > 1 ? 0 : Math.min(1, t / f, c.b > 1 ? 1 : (1 - t) / f);
        c.el.style.opacity = o.toFixed(3);
        if (!reduce) c.el.style.transform = "translateY(" + ((1 - o) * (t < 0.5 ? 18 : -18)).toFixed(1) + "px)";
      });
    }
    size();
    addEventListener("resize", size);
    return { update: update };
  })();

  /* ---------- Galerie : glisser 1:1, élan, ressort, élastique ---------- */
  (function () {
    var gal = document.getElementById("gal"), track = document.getElementById("galTrack");
    if (!gal) return;
    var cards = [].slice.call(track.children), dotsEl = document.getElementById("galDots");
    var prev = document.getElementById("galPrev"), next = document.getElementById("galNext");
    var x = 0, min = 0, snaps = [], dots = [];
    var spring = new Spring(0, function (v) { x = v; render(); });

    function measure() {
      var pad = parseFloat(getComputedStyle(track).paddingLeft);
      min = Math.min(0, -(track.scrollWidth - gal.clientWidth));
      snaps = [];
      cards.forEach(function (c) {
        var s = clamp(-(c.offsetLeft - pad), min, 0);
        if (!snaps.length || Math.abs(snaps[snaps.length - 1] - s) > 1) snaps.push(s);
      });
      dotsEl.innerHTML = "";
      dots = snaps.map(function () { var i = document.createElement("i"); dotsEl.appendChild(i); return i; });
    }
    function nearest(pos) {
      var best = 0;
      snaps.forEach(function (s, i) { if (Math.abs(s - pos) < Math.abs(snaps[best] - pos)) best = i; });
      return best;
    }
    function render() {
      track.style.transform = "translate3d(" + x.toFixed(2) + "px,0,0)";
      var i = nearest(x);
      dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
      prev.disabled = x >= -1; next.disabled = x <= min + 1;
    }
    function soft(raw) {                                  // résistance progressive hors des bords
      var dim = gal.clientWidth;
      if (raw > 0) return rubberband(raw, dim);
      if (raw < min) return min - rubberband(min - raw, dim);
      return raw;
    }
    function goTo(i, o) { spring.to(snaps[clamp(i, 0, snaps.length - 1)], Object.assign({ damping: 1, response: 0.42 }, o || {})); }

    // Glisser
    var st = null, moved = false;
    gal.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      spring.stop();                                      // on attrape la carte en vol : départ de la valeur affichée
      st = { x: e.clientX, y: e.clientY, x0: x, dir: 0, hist: [{ t: e.timeStamp, p: e.clientX }] , id: e.pointerId };
      moved = false;
    });
    gal.addEventListener("pointermove", function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.dir) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {      // hystérésis ~10 px
          st.dir = 1; st.x = e.clientX; dx = 0; moved = true;
          gal.setPointerCapture(e.pointerId); gal.classList.add("is-drag");
        } else if (Math.abs(dy) > 10) { st = null; goTo(nearest(x)); return; }
        else return;
      }
      x = soft(st.x0 + dx);
      st.hist.push({ t: e.timeStamp, p: e.clientX });
      if (st.hist.length > 6) st.hist.shift();
      render();
    });
    function release(e) {
      if (!st) return;
      var s = st; st = null; gal.classList.remove("is-drag");
      if (!s.dir) { goTo(nearest(x)); return; }
      var h = s.hist, a = h[0], b = h[h.length - 1], v = 0;
      for (var i = h.length - 1; i > 0; i--) if (b.t - h[i - 1].t > 100) { a = h[i - 1]; break; }
      if (b.t - a.t > 0 && e.timeStamp - b.t < 80) v = (b.p - a.p) / (b.t - a.t) * 1000;
      var target = nearest(x + project(v));               // cible choisie depuis le point projeté
      spring.x = x;
      goTo(target, { velocity: v, damping: Math.abs(v) > 400 ? 0.8 : 1, response: 0.4 });
    }
    gal.addEventListener("pointerup", release);
    gal.addEventListener("pointercancel", release);
    gal.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    gal.addEventListener("dragstart", function (e) { e.preventDefault(); });

    // Pavé tactile (défilement horizontal)
    var wt = 0;
    gal.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      spring.stop();
      x = soft(x - e.deltaX); spring.x = x; render();
      clearTimeout(wt);
      wt = setTimeout(function () { goTo(nearest(x)); }, 120);
    }, { passive: false });

    prev.addEventListener("click", function () { goTo(nearest(x) - 1); });
    next.addEventListener("click", function () { goTo(nearest(x) + 1); });
    gal.tabIndex = 0;
    gal.setAttribute("role", "region");
    gal.setAttribute("aria-roledescription", "carrousel");
    gal.setAttribute("aria-label", "Points forts, faire glisser ou utiliser les flèches");
    gal.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(nearest(x) + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(nearest(x) - 1); }
    });

    measure(); render();
    addEventListener("resize", function () { var i = nearest(x); measure(); spring.stop(); x = spring.x = snaps[Math.min(i, snaps.length - 1)]; render(); });
  })();

  /* ---------- Simulateur : le total suit un ressort depuis sa valeur affichée ---------- */
  (function () {
    var f = document.getElementById("calc");
    if (!f) return;
    var day = f.querySelector("#c-day"), price = f.querySelector("#c-price"), open = f.querySelector("#c-open");
    var outM = document.getElementById("c-month"), outY = document.getElementById("c-year");
    var fmt = function (n) { return Math.round(n).toLocaleString("fr-FR") + " €"; };
    var shown = 1248;
    var sp = new Spring(shown, function (v) { outM.textContent = fmt(v); outY.textContent = fmt(v * 12); });
    function fill(inp) { inp.style.setProperty("--v", ((inp.value - inp.min) / (inp.max - inp.min) * 100) + "%"); }
    function calc() {
      [day, price, open].forEach(fill);
      document.getElementById("c-day-out").textContent = day.value;
      document.getElementById("c-price-out").textContent = price.value + " €";
      document.getElementById("c-open-out").textContent = open.value;
      var month = day.value * price.value * open.value * 52 / 12;
      sp.to(month, { damping: 1, response: 0.35 });
    }
    f.addEventListener("input", calc);
    calc();

    // Estimation envoyée avec la demande de devis : le formulaire arrive déjà chiffré.
    var go = document.getElementById("calcGo"), chip = document.getElementById("estChip");
    var field = document.getElementById("estField"), msg = document.getElementById("f-msg"), auto = "";
    if (!go || !chip) return;
    function summary() {
      var m = day.value * price.value * open.value * 52 / 12;
      return day.value + " casques/jour · " + price.value + " € le nettoyage · " + open.value + " j/semaine ≈ " + fmt(m) + " par mois";
    }
    go.addEventListener("click", function () {
      var txt = summary();
      field.value = txt; field.disabled = false;
      document.getElementById("estTxt").textContent = "Estimation jointe : " + txt;
      chip.hidden = false;
      if (!msg.value || msg.value === auto) {
        auto = "Bonjour, je souhaite un devis pour la borne AIRO. Mon estimation : " + txt + ".";
        msg.value = auto;
      }
      var r = document.querySelector('.seg input[value="Demande de devis"]');
      if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
      document.getElementById("devis").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      setTimeout(function () { document.getElementById("f-name").focus({ preventScroll: true }); }, reduce ? 0 : 700);
    });
    document.getElementById("estDel").addEventListener("click", function () {
      chip.hidden = true; field.disabled = true; field.value = "";
      if (msg.value === auto) msg.value = "";
      auto = "";
    });
  })();

  /* ---------- Contrôle segmenté : la pastille suit un ressort ---------- */
  (function () {
    var seg = document.querySelector(".seg"); if (!seg) return;
    var thumb = seg.querySelector(".seg__thumb"), inputs = [].slice.call(seg.querySelectorAll("input"));
    var sp = new Spring(0, function (v) { thumb.style.transform = "translate3d(" + v.toFixed(2) + "px,0,0)"; });
    function place(jump) {
      var i = inputs.findIndex(function (r) { return r.checked; });
      var t = i * thumb.offsetWidth;
      if (jump) { sp.stop(); sp.x = t; sp.cb(t); } else sp.to(t, { damping: 1, response: 0.3 });
    }
    seg.addEventListener("change", function () { place(false); });
    addEventListener("resize", function () { place(true); });
    place(true);
  })();

  /* ---------- Formulaire de devis (FormSubmit, validation en ligne) ---------- */
  (function () {
    var form = document.getElementById("quoteForm"), status = document.getElementById("formStatus");
    if (!form) return;
    if (form.dataset.sector) { var sel = form.querySelector("#f-sector"); if (sel) sel.value = form.dataset.sector; }
    var btn = form.querySelector("button[type=submit]"), consent = document.getElementById("f-consent");
    var consentErr = form.querySelector(".err--consent");
    var req = [].slice.call(form.querySelectorAll(".field [required]"));
    function valid(inp) {
      var ok = inp.value.trim() !== "" && (inp.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim()));
      inp.parentNode.classList.toggle("is-invalid", !ok);
      inp.setAttribute("aria-invalid", String(!ok));
      return ok;
    }
    req.forEach(function (inp) {
      inp.addEventListener("blur", function () { if (inp.value) valid(inp); });
      inp.addEventListener("input", function () { if (inp.parentNode.classList.contains("is-invalid")) valid(inp); });
    });
    consent.addEventListener("change", function () { consentErr.classList.toggle("on", !consent.checked); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.textContent = ""; status.className = "form__status";
      var first = null;
      req.forEach(function (inp) { if (!valid(inp) && !first) first = inp; });
      consentErr.classList.toggle("on", !consent.checked);
      if (!consent.checked && !first) first = consent;
      if (first) { first.focus(); return; }
      var data = new FormData(form);
      if (data.get("_honey")) return;
      data.set("_replyto", data.get("email"));
      data.set("Page", document.title);
      data.set("_subject", data.get("Type de demande") + " — " + data.get("Nom") + " (site AIRO)");
      var label = btn.querySelector(".btn__label");
      btn.disabled = true; btn.classList.add("is-loading"); label.textContent = "Envoi en cours…";
      fetch("https://formsubmit.co/ajax/airo.casque@gmail.com", { method: "POST", headers: { Accept: "application/json" }, body: data })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || String(j.success) !== "true") throw 0; }); })
        .then(function () {
          var first = String(data.get("Nom") || "").trim().split(" ")[0];
          var sent = document.getElementById("formSent");
          document.getElementById("sentName").textContent = first ? " " + first : "";
          form.reset(); form.hidden = true; sent.hidden = false; sent.focus();
          try { if (window.plausible) plausible("Devis envoyé"); document.dispatchEvent(new CustomEvent("airo:devis")); } catch (x) {}
        })
        .catch(function () {
          btn.disabled = false; btn.classList.remove("is-loading"); label.textContent = "Envoyer la demande";
          status.className = "form__status is-error";
          status.innerHTML = "L’envoi a échoué. Réessayez, ou écrivez à <a href=\"mailto:airo.casque@gmail.com\">airo.casque@gmail.com</a>.";
        });
    });
  })();

  /* ---------- Clip : lecture quand il est visible, son au choix ---------- */
  (function () {
    var v = document.getElementById("clipVideo"), b = document.getElementById("clipSound");
    if (!v) return;
    var userPaused = false;
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting && !reduce && !userPaused) { v.preload = "auto"; v.play().catch(function () {}); }
        else if (!en.isIntersecting) v.pause();
      });
    }, { threshold: 0.5 }).observe(v);
    v.addEventListener("click", function () { if (v.paused) { userPaused = false; v.play(); } else { userPaused = true; v.pause(); } });
    b.addEventListener("click", function () {
      v.muted = !v.muted;
      if (!v.muted && v.paused) v.play().catch(function () {});
      b.textContent = v.muted ? "Activer le son" : "Couper le son";
      b.setAttribute("aria-pressed", String(!v.muted));
    });
  })();

  /* ---------- Apparitions ---------- */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target, sib = [].slice.call(el.parentNode.children).filter(function (c) { return c.classList.contains("reveal"); });
      el.style.transitionDelay = Math.min(sib.indexOf(el), 4) * 80 + "ms";
      el.classList.add("in"); io.unobserve(el);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });


  /* ---------- Démo de l'écran : programme → paiement → dépôt → cycle → prêt ---------- */
  (function () {
    var root = document.getElementById("kiosk"); if (!root) return;
    var screens = [].slice.call(root.querySelectorAll(".ks")), track = [].slice.call(document.querySelectorAll(".demo__track li"));
    var fg = document.getElementById("ringFg"), pct = document.getElementById("ringPct"), phase = document.getElementById("ringPhase");
    var left = document.getElementById("ringLeft"), ring = root.querySelector(".ks__ring"), C = 326.7;
    var prog = "", mins = 10, raf = 0, timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function show(i, focus) {
      screens.forEach(function (s, k) { s.hidden = k !== i; });
      track.forEach(function (t, k) { t.classList.toggle("on", k === i); t.classList.toggle("done", k < i); });
      if (focus) { var t = screens[i].querySelector(".ks__t"); t && t.focus({ preventScroll: true }); }
    }
    function reset() {
      cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = [];
      root.querySelector(".ks__card").classList.remove("is-ok");
      root.querySelectorAll(".is-press").forEach(function (b) { b.classList.remove("is-press"); });
    }
    function cycle() {
      var dur = reduce ? 2500 : 6500, t0 = performance.now();
      var phases = mins === 3 ? [[1, "Séchage"]] : [[0.6, "Vapeur sèche"], [0.8, "Désinfection"], [1, "Séchage"]];
      (function frame(now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 1.4);
        fg.style.strokeDashoffset = (C * (1 - e)).toFixed(1);
        var n = Math.round(e * 100);
        pct.textContent = n + " %"; ring.setAttribute("aria-valuenow", n);
        for (var i = 0; i < phases.length; i++) if (e <= phases[i][0]) { phase.textContent = phases[i][1]; break; }
        left.textContent = p < 1 ? "Reste " + Math.max(1, Math.ceil(mins * (1 - e))) + " min" : "Terminé";
        if (p < 1) raf = requestAnimationFrame(frame); else later(function () { show(4, true); }, 450);
      })(t0);
    }
    root.addEventListener("click", function (e) {
      var opt = e.target.closest(".ks__opt"), go = e.target.closest("[data-go]");
      if (opt) {
        prog = opt.dataset.prog; mins = +opt.dataset.min; opt.classList.add("is-press");
        root.querySelector(".ks__prog").textContent = prog;
        root.querySelector(".ks__min").textContent = mins + " min";
        later(function () { opt.classList.remove("is-press"); show(1, true); }, 180);
      } else if (go) {
        var a = go.dataset.go;
        if (a === "pay") {
          go.classList.add("is-ok"); go.querySelector("span").textContent = "Paiement accepté";
          later(function () { go.querySelector("span").textContent = "Présentez votre carte"; show(2, true); }, 800);
        }
        if (a === "close") { fg.style.strokeDashoffset = C; show(3, true); cycle(); }
        if (a === "again") { reset(); show(0, true); }
      }
    });
  })();


  /* ---------- Héros électrique : fond d'éclairs (WebGL), éclair d'arrivée, borne inclinable ---------- */
  (function () {
    var hero = document.querySelector(".vhero"); if (!hero) return;
    var cv = document.getElementById("volt"), mach = document.getElementById("vmachine"), img = mach.querySelector("img");
    var flash = document.getElementById("vflash"), mobile = matchMedia("(max-width: 900px)").matches;
    var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    var gl = null, U = {}, strike = 0, on = true, raf = 0, last = 0, t0 = performance.now(), soft = false, done = false;
    var mouse = [0.64, 0.45], target = [0.64, 0.45], rx = 0, ry = 0, vx = 0, vy = 0;

    function initGL() {
      try { gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" }); } catch (e) { gl = null; }
      if (!gl) return;
      var fs = [
        "precision mediump float;uniform vec2 r;uniform float t,s;uniform vec2 m;",
        "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
        "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
        "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}",
        "void main(){vec2 uv=gl_FragCoord.xy/r;vec2 q=(gl_FragCoord.xy-.5*r)/r.y;vec3 c=vec3(.006,.01,.024);",
        "float nb=fbm(q*1.6+vec2(t*.03,-t*.02));c+=vec3(.02,.05,.14)*nb*nb*2.2;",
        "vec2 mm=(m-.5)*vec2(r.x/r.y,1.);c+=vec3(.08,.2,.6)*.18/(1.+dot(q-mm,q-mm)*14.);",
        "for(int i=0;i<4;i++){float fi=float(i);",
        " float x=(fi-1.5)*.38+.22*sin(t*.11+fi*2.1)+(fbm(vec2(q.y*2.2+fi*7.,t*.35+fi))-.5)*.55;",
        " float d=abs(q.x-x-mm.x*.15);float fl=.55+.45*n(vec2(t*6.+fi*13.,fi));",
        " c+=vec3(.25,.48,1.)*(.0016+.0022*s)/(d+.002)*fl*(.35+1.4*s)*smoothstep(.95,.2,abs(q.y));",
        " c+=vec3(.1,.25,.8)*.02/(d+.03)*(.4+s);}",
        "c+=vec3(.5,.7,1.)*s*s*.25*(1.-length(q));c*=1.-.55*length(uv-.5);gl_FragColor=vec4(pow(c,vec3(.92)),1.);}"
      ].join("\n");
      var sh = function (type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
      var pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; return; }
      // sans carte graphique (rendu logiciel) : l'animation continue serait lourde → image fixe après l'arrivée
      var dbg = gl.getExtension("WEBGL_debug_renderer_info");
      soft = /swiftshader|llvmpipe|software|basic render/i.test(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "");
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ["r", "t", "s", "m"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
      size();
    }
    function size() {
      // effet doux : une résolution réduite suffit et garde l'animation légère
      var d = Math.min(devicePixelRatio || 1, 2) * (mobile ? 0.5 : 0.6);
      cv.width = Math.max(1, Math.round(cv.clientWidth * d)); cv.height = Math.max(1, Math.round(cv.clientHeight * d));
      if (gl) gl.viewport(0, 0, cv.width, cv.height);
    }
    function draw(now) {
      if (!gl) return;
      gl.uniform2f(U.r, cv.width, cv.height); gl.uniform1f(U.t, reduce ? 4 : (now - t0) / 1000);
      gl.uniform1f(U.s, strike); gl.uniform2f(U.m, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) {
      raf = 0;
      if (!on || document.hidden || (soft && done)) return;
      raf = requestAnimationFrame(loop);
      if (now - last < (soft ? 66 : 25)) return;         // ~40 images/s suffisent pour des éclairs (15 en rendu logiciel)
      last = now;
      mouse[0] += (target[0] - mouse[0]) * 0.08; mouse[1] += (target[1] - mouse[1]) * 0.08;
      draw(now);
      if (fine) {                                         // inclinaison 3D amortie, à la souris seulement
        var tx = (mouse[1] - 0.5) * 10, ty = (mouse[0] - 0.55) * 18;
        vx += (tx - rx) * 0.06; vy += (ty - ry) * 0.06; vx *= 0.8; vy *= 0.8; rx += vx; ry += vy;
        mach.style.transform = "rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
      }
    }
    function start() { if (!raf && on && !reduce) raf = requestAnimationFrame(loop); }
    new IntersectionObserver(function (e) { on = e[0].isIntersecting; if (on) start(); }).observe(hero);
    document.addEventListener("visibilitychange", start);
    addEventListener("resize", size);
    if (fine) addEventListener("pointermove", function (e) { target = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; }, { passive: true });

    var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
    var lines = [].slice.call(hero.querySelectorAll(".vhero__t .ln > span"));
    var parts = [["vkick", 0.25], ["vsub", 0.75], ["vcta", 0.9], ["vscroll", 1.4]].map(function (a) { return [document.getElementById(a[0]), a[1]]; });
    var halo = document.getElementById("vhalo"), floor = document.getElementById("vfloor");
    function lit() {
      hero.classList.add("is-lit"); strike = 0; flash.style.opacity = 0; done = true;
      if (soft) draw(performance.now());
      [img, halo, floor].concat(lines, parts.map(function (p) { return p[0]; })).forEach(function (el) { el.style.removeProperty("filter"); el.style.removeProperty("opacity"); el.style.removeProperty("transform"); });
    }
    function intro() {
      initGL();
      if (reduce) { lit(); draw(performance.now()); return; }
      start();
      var t1 = performance.now() + 300;
      (function step(now) {
        var k = (now - t1) / 1000;                       // secondes depuis l'éclair
        strike = k < 0 ? 0 : Math.max(0, Math.exp(-k * 5) * (k < 0.08 ? 1 : 0.85) + (k > 0.16 && k < 0.26 ? 0.7 : 0));
        flash.style.opacity = (strike * 0.5).toFixed(3);
        var l = ease(clamp((k - 0.05) / 1.1, 0, 1));
        img.style.filter = "brightness(" + (0.15 + 0.85 * l + strike * 0.6).toFixed(3) + ") saturate(" + (0.6 + 0.4 * l).toFixed(3) + ")";
        halo.style.opacity = floor.style.opacity = l.toFixed(3);
        lines.forEach(function (sp, i) { var p = ease(clamp((k - 0.35 - i * 0.12) / 0.9, 0, 1)); sp.style.transform = "translateY(" + ((1 - p) * 105).toFixed(1) + "%)"; });
        parts.forEach(function (a) { var p = ease(clamp((k - a[1]) / 0.8, 0, 1)); a[0].style.opacity = p.toFixed(3); a[0].style.transform = "translateY(" + ((1 - p) * 14).toFixed(1) + "px)"; });
        if (k < 2.3) requestAnimationFrame(step); else lit();
      })(performance.now());
    }
    var go = function () { if (go.done) return; go.done = true; intro(); };
    if (img.complete) go(); else { img.addEventListener("load", go); img.addEventListener("error", go); }
    setTimeout(go, 2500);                                  // filet de sécurité : jamais de héros éteint
  })();

  /* ---------- Cartes « Six promesses » : le bord s'allume là où passe le pointeur ---------- */
  (function () {
    var cards = [].slice.call(document.querySelectorAll(".pcard")); if (!cards.length) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;   // au doigt : bord fixe, lumière en haut
    cards.forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--x", (e.clientX - r.left).toFixed(0) + "px");
        c.style.setProperty("--y", (e.clientY - r.top).toFixed(0) + "px");
      });
    });
  })();

  /* ---------- Menu mobile : feuille ancrée sous la barre ---------- */
  (function () {
    var btn = document.getElementById("navToggle"), sheet = document.getElementById("navSheet");
    if (!btn) return;
    var t = 0;
    function set(open) {
      clearTimeout(t);
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      if (open) {
        sheet.hidden = false; sheet.classList.add("is-closed");
        requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.remove("is-closed"); }); });
      } else {
        sheet.classList.add("is-closed");
        t = setTimeout(function () { sheet.hidden = true; }, 260);
      }
    }
    btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
    sheet.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) { set(false); btn.focus(); } });
    document.addEventListener("pointerdown", function (e) { if (nav.classList.contains("is-open") && !nav.contains(e.target)) set(false); });
  })();

  /* ---------- Parcours client : l'étape au centre de l'écran pilote l'image ---------- */
  (function () {
    var steps = [].slice.call(document.querySelectorAll(".step")), imgs = [].slice.call(document.querySelectorAll(".steps__frame img"));
    function on(i) {
      steps.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
      imgs.forEach(function (im, k) { im.classList.toggle("is-on", k === i); });
    }
    var mob = matchMedia("(max-width: 900px)").matches;
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) on(+en.target.dataset.i); });
    }, { rootMargin: mob ? "-62% 0px -30% 0px" : "-45% 0px -45% 0px" });
    steps.forEach(function (s) { io2.observe(s); });
  })();

  /* ---------- Barre d'action mobile : après le haut de page, jamais sur le formulaire ---------- */
  var dock = document.getElementById("dock"), heroSec = document.getElementById("top"), devis = document.getElementById("devis");
  function dockUpdate() {
    if (!dock || !heroSec || !devis) return;
    var past = heroSec.getBoundingClientRect().bottom < 0;
    var r = devis.getBoundingClientRect(), atForm = r.top < innerHeight && r.bottom > 0;
    dock.classList.toggle("is-on", past && !atForm);
  }

  var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();

  addEventListener("scroll", function () { onScroll(); dockUpdate(); }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll(); dockUpdate();

  /* ---------- Arrivée : on attend l'image de la borne pour une entrée nette ---------- */
  var heroImg = document.querySelector(".hero__machine img");
  function ready() { requestAnimationFrame(function () { document.documentElement.classList.add("ready"); }); }
  if (heroImg && !heroImg.complete && heroImg.decode) heroImg.decode().then(ready, ready); else ready();
  setTimeout(ready, 1200);
  addEventListener("load", onScroll);
})();
