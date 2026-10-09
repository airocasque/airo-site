(function () {
  "use strict";

  var EMAIL = "airo.casque@gmail.com";
  var ENDPOINT = "https://formsubmit.co/ajax/" + EMAIL;

  document.documentElement.classList.add("js");
  document.getElementById("year").textContent = new Date().getFullYear();

  /* Écran d'introduction (ordinateur) : disparaît quand la scène 3D est prête, au plus tard après 2 s.
     Sur téléphone il est supprimé : le titre doit s'afficher tout de suite. */
  var intro = document.getElementById("intro");
  if (intro) {
    var seen = false;
    try { seen = sessionStorage.getItem("airo-intro") === "1"; sessionStorage.setItem("airo-intro", "1"); } catch (e) { /* stockage indisponible */ }
    var minDelay = seen ? 300 : 1200, start = Date.now(), closed = false;
    var close = function () {
      if (closed) return;
      closed = true;
      setTimeout(function () { intro.classList.add("is-done"); }, Math.max(0, minDelay - (Date.now() - start)));
    };
    if (window.matchMedia("(max-width: 900px)").matches) { minDelay = 0; close(); }
    window.addEventListener("airo:ready", close);
    setTimeout(close, 2000);   // le texte ne doit jamais attendre la 3D trop longtemps
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
      "<p>Nous l’avons bien reçue et vous répondons par e-mail ou par téléphone.</p>" +
      '<a class="btn btn--ghost" href="#xp">Retour en haut</a></div>';
  }

  // Prévient avant de quitter la page si une demande est en cours de saisie
  var dirty = false;
  form.addEventListener("input", function () { dirty = true; });
  window.addEventListener("beforeunload", function (e) {
    if (dirty && !form.classList.contains("is-sent")) { e.preventDefault(); e.returnValue = ""; }
  });

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
        status.innerHTML = "La demande n’est pas partie : la connexion au service d’envoi a échoué. Réessayez, ou <a href=\"" + mailtoFallback(data) +
          "\">envoyez-la par e-mail</a>.";
      });
  });
})();

/* Simulateur de revenus : aucun prix de machine, seulement le chiffre d'affaires de la borne. */
(function () {
  var form = document.getElementById("calc");
  if (!form) return;
  var day = document.getElementById("c-day"), price = document.getElementById("c-price"), open = document.getElementById("c-open");
  var fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  var paint = function (input) {   // remplissage de la piste jusqu'au curseur
    var pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty("--fill", pct + "%");
  };
  var update = function () {
    var perWeek = +day.value * +price.value * +open.value;
    var month = perWeek * 52 / 12;
    document.getElementById("c-day-out").textContent = day.value;
    document.getElementById("c-price-out").textContent = price.value + " €";
    document.getElementById("c-open-out").textContent = open.value;
    document.getElementById("c-month").textContent = fmt.format(month) + " €";
    document.getElementById("c-year").textContent = fmt.format(perWeek * 52) + " €";
    [day, price, open].forEach(paint);
  };
  form.addEventListener("input", update);
  update();
})();

/* Barre de contact mobile : masquée en haut de page et quand le formulaire est à l'écran. */
(function () {
  var bar = document.getElementById("mbar"), quote = document.getElementById("devis");
  if (!bar || !quote || !("IntersectionObserver" in window)) return;
  var inQuote = false, scrolled = false;
  var sync = function () { bar.classList.toggle("is-on", scrolled && !inQuote); };
  new IntersectionObserver(function (e) { inQuote = e[0].isIntersecting; sync(); }, { threshold: 0.05 }).observe(quote);
  var onScroll = function () { var s = window.scrollY > window.innerHeight * 0.6; if (s !== scrolled) { scrolled = s; sync(); } };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
})();
