(function () {
  "use strict";

  var EMAIL = "airo.casque@gmail.com";
  var ENDPOINT = "https://formsubmit.co/ajax/" + EMAIL;

  document.documentElement.classList.add("js");
  document.getElementById("year").textContent = new Date().getFullYear();

  /* Écran d'introduction : disparaît quand la scène 3D est prête (ou au bout de 4 s). */
  var intro = document.getElementById("intro");
  if (intro) {
    var seen = false;
    try { seen = sessionStorage.getItem("airo-intro") === "1"; sessionStorage.setItem("airo-intro", "1"); } catch (e) { /* stockage indisponible */ }
    var minDelay = seen ? 400 : 1700, start = Date.now(), closed = false;
    var close = function () {
      if (closed) return;
      closed = true;
      setTimeout(function () { intro.classList.add("is-done"); }, Math.max(0, minDelay - (Date.now() - start)));
    };
    window.addEventListener("airo:ready", close);
    setTimeout(close, 4000);
  }

  /* Navigation */
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");

  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 20); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    toggle.querySelector("use").setAttribute("href", open ? "#i-close" : "#i-menu");
  }
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  links.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* Secteurs : aperçu photo qui suit le pointeur (souris uniquement) */
  var preview = document.getElementById("sectorPreview");
  var index = document.getElementById("sectorIndex");
  if (preview && index && window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var tx = 0, ty = 0, px = 0, py = 0, raf = 0, on = false;
    var tick = function () {
      px += (tx - px) * 0.18; py += (ty - py) * 0.18; // suivi amorti, pas collé au curseur
      preview.style.transform = "translate3d(" + (px + 24) + "px," + (py - 120) + "px,0)";
      raf = on || Math.abs(tx - px) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    index.addEventListener("pointermove", function (e) {
      var li = e.target.closest("li");
      if (!li) return;
      if (!on) { px = e.clientX; py = e.clientY; }
      tx = e.clientX; ty = e.clientY;
      if (preview.getAttribute("src") !== li.dataset.img) preview.setAttribute("src", li.dataset.img);
      on = true; preview.classList.add("is-on");
      if (!raf) raf = requestAnimationFrame(tick);
    });
    index.addEventListener("pointerleave", function () { on = false; preview.classList.remove("is-on"); });
  }

  /* Quote form */
  var form = document.getElementById("quoteForm");
  var submit = document.getElementById("quoteSubmit");
  var status = document.getElementById("formStatus");
  var consent = document.getElementById("f-consent");
  var consentErr = document.getElementById("f-consent-err");

  // Les champs professionnels ne s'affichent que pour un profil "Professionnel".
  function syncProfile() {
    var pro = form.querySelector('input[name="Profil"]:checked').value === "Professionnel";
    form.querySelectorAll("[data-pro]").forEach(function (f) {
      f.hidden = !pro;
      f.querySelectorAll("input, select").forEach(function (i) { i.disabled = !pro; });
    });
  }
  form.querySelectorAll('input[name="Profil"]').forEach(function (r) { r.addEventListener("change", syncProfile); });
  syncProfile();

  function validateField(input) {
    var field = input.closest(".field");
    var ok = input.checkValidity() && input.value.trim() !== "";
    if (input.type === "email") ok = ok && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    field.classList.toggle("is-invalid", !ok);
    input.setAttribute("aria-invalid", String(!ok));
    var err = field.querySelector(".field__err");
    if (err) input.setAttribute("aria-describedby", err.id);
    return ok;
  }

  var required = form.querySelectorAll("input[required]:not([type=checkbox]), textarea[required]");
  required.forEach(function (input) {
    input.addEventListener("blur", function () { if (input.value) validateField(input); });
    input.addEventListener("input", function () {
      if (input.closest(".field").classList.contains("is-invalid")) validateField(input);
    });
  });
  consent.addEventListener("change", function () { consentErr.classList.toggle("is-visible", !consent.checked); });

  function mailtoFallback(data) {
    var body = [];
    data.forEach(function (v, k) { if (k.charAt(0) !== "_" && v) body.push(k + " : " + v); });
    return "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Demande depuis le site AIRO") +
      "&body=" + encodeURIComponent(body.join("\n"));
  }

  function showSuccess(name) {
    form.classList.add("is-sent");
    form.innerHTML =
      '<div class="form__success" role="status">' +
      "<h3>Demande envoyée" + (name ? ", merci " + name.replace(/[<>&"]/g, "") : "") + ".</h3>" +
      "<p>Nous l'avons bien reçue et vous répondons par e-mail ou par téléphone.</p>" +
      '<a class="btn btn--ghost" href="#xp">Retour en haut</a></div>';
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.textContent = "";
    status.className = "form__status";

    var firstInvalid = null;
    required.forEach(function (input) { if (!validateField(input) && !firstInvalid) firstInvalid = input; });
    consentErr.classList.toggle("is-visible", !consent.checked);
    if (!consent.checked && !firstInvalid) firstInvalid = consent;
    if (firstInvalid) { firstInvalid.focus(); return; }

    var data = new FormData(form);
    if (data.get("_honey")) return;
    var name = (data.get("Nom") || "").trim().split(" ")[0];
    data.set("_replyto", data.get("email"));
    data.set("_subject", data.get("Type de demande") + " — " + (data.get("Entreprise") || data.get("Nom")) + " (site AIRO)");

    submit.disabled = true;
    submit.querySelector(".btn__label").textContent = "Envoi en cours…";

    fetch(ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: data })
      .then(function (res) { return res.json().then(function (json) { return { ok: res.ok, json: json }; }); })
      .then(function (r) {
        if (!r.ok || String(r.json.success) !== "true") throw new Error(r.json.message || "Erreur d'envoi");
        showSuccess(name);
      })
      .catch(function () {
        submit.disabled = false;
        submit.querySelector(".btn__label").textContent = "Envoyer la demande";
        status.className = "form__status is-error";
        status.innerHTML = "La demande n'est pas partie : la connexion au service d'envoi a échoué. Réessayez, ou <a href=\"" + mailtoFallback(data) +
          "\">envoyez-la par e-mail</a>.";
      });
  });
})();
