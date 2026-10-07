/* AIRO — mouvement : défilement fluide (Lenis) et révélations GSAP.
   Un seul langage de mouvement : les mots montent derrière un masque, comme une plaque qu'on découvre. */
(function () {
  "use strict";

  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger, Lenis = window.Lenis;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var root = document.documentElement;

  /* Défilement fluide : Lenis pilote le défilement, ScrollTrigger le lit. */
  var lenis = null;
  if (Lenis && !reduce) {
    // « prevent » doit être une fonction avec Lenis 1.1.0 (sinon erreur à chaque molette)
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true, prevent: function (node) { return node.closest && !!node.closest("[data-lenis-prevent]"); } });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.airoLenis = lenis;
  }

  // Ancres internes : défilement fluide en tenant compte du menu fixe
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !lenis) return;
    var id = a.getAttribute("href");
    var target = id.length > 1 && document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var navH = parseFloat(getComputedStyle(root).getPropertyValue("--nav-h")) || 68;
    lenis.scrollTo(target, { offset: id === "#xp" ? 0 : -(navH + 16), duration: 1.4 });
    if (history.replaceState) history.replaceState(null, "", id);
  });

  /* Découpe un titre en mots masqués (le texte reste lisible tel quel par les lecteurs d'écran). */
  function splitWords(el) {
    if (el.dataset.split) return el.querySelectorAll(".w > span");
    el.dataset.split = "1";
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement("span"); w.className = "w"; w.setAttribute("aria-hidden", "true");
            var i = document.createElement("span"); i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) { walk(n); }
      });
    };
    walk(el);
    return el.querySelectorAll(".w > span");
  }

  if (!reduce) {
    root.classList.add("has-motion");

    /* Arrivée : le titre principal se découvre mot à mot, puis le reste suit. */
    var hero = document.querySelector(".xp-step--hero h1");
    var heroRest = document.querySelectorAll(".xp-step--hero .lead, .xp-step--hero .actions");
    if (hero) {
      var words = splitWords(hero);
      gsap.set(words, { yPercent: 110 });
      gsap.set(heroRest, { autoAlpha: 0, y: 16 });
      var play = function () {
        gsap.timeline({ defaults: { ease: "expo.out" } })
          .to(words, { yPercent: 0, duration: 1.15, stagger: 0.045 })
          .to(heroRest, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" }, "-=0.75");
      };
      var intro = document.getElementById("intro");
      if (!intro || intro.classList.contains("is-done")) play();
      else {
        var mo = new MutationObserver(function () {
          if (intro.classList.contains("is-done")) { mo.disconnect(); setTimeout(play, 150); }
        });
        mo.observe(intro, { attributes: true, attributeFilter: ["class"] });
      }
    }

    /* Grands titres de section : même découverte, une seule fois, à l'entrée dans l'écran. */
    gsap.utils.toArray(".block__title").forEach(function (title) {
      var w = splitWords(title);
      gsap.set(w, { yPercent: 110 });
      ScrollTrigger.create({
        trigger: title, start: "top 85%", once: true,
        onEnter: function () { gsap.to(w, { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.035 }); }
      });
    });

    /* Grand « AIRO » du pied de page : légère profondeur au défilement. */
    var mark = document.querySelector(".footer__mark");
    if (mark) {
      gsap.fromTo(mark, { yPercent: 18 }, {
        yPercent: 0, ease: "none",
        scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true }
      });
    }
  }

  /* Secteurs : l'aperçu photo suit le pointeur avec inertie (souris uniquement). */
  var preview = document.getElementById("sectorPreview");
  var index = document.getElementById("sectorIndex");
  if (preview && index && finePointer && !reduce) {
    gsap.set(preview, { xPercent: 0, yPercent: -50, scale: 0.92 });
    var qx = gsap.quickTo(preview, "x", { duration: 0.55, ease: "power3.out" });
    var qy = gsap.quickTo(preview, "y", { duration: 0.55, ease: "power3.out" });
    var shown = false;
    index.addEventListener("pointermove", function (e) {
      var li = e.target.closest("li");
      if (!li) return;
      if (!shown) { gsap.set(preview, { x: e.clientX + 28, y: e.clientY }); }
      qx(e.clientX + 28); qy(e.clientY);
      if (preview.getAttribute("src") !== li.dataset.img) preview.setAttribute("src", li.dataset.img);
      if (!shown) { shown = true; gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power3.out" }); }
    });
    index.addEventListener("pointerleave", function () {
      shown = false;
      gsap.to(preview, { autoAlpha: 0, scale: 0.92, duration: 0.2, ease: "power2.out" });
    });
  }

  // Les polices et la scène 3D modifient les hauteurs : on recalcule les déclencheurs une fois prêts.
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
