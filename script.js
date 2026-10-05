(() => {
  "use strict";

  /* ============ Année du footer ============ */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============ Halo qui suit le curseur ============ */
  const glow = document.getElementById("cursorGlow");
  if (glow) {
    let raf = null;
    window.addEventListener("pointermove", (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        glow.style.setProperty("--x", `${e.clientX}px`);
        glow.style.setProperty("--y", `${e.clientY}px`);
        raf = null;
      });
    });
  }

  /* ============ Header : fond au scroll ============ */
  const header = document.getElementById("siteHeader");
  const onScrollHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ============ Menu mobile ============ */
  const burger = document.getElementById("burgerBtn");
  const mobileNav = document.getElementById("mobileNav");
  if (burger && mobileNav) {
    burger.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ============ Reveal au scroll ============ */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ============ Boutons magnétiques ============ */
  const magneticButtons = document.querySelectorAll(".btn--primary, .btn--outline");
  magneticButtons.forEach((btn) => {
    const icon = btn.querySelector(".btn__icon");
    btn.addEventListener("pointermove", (e) => {
      const rect = btn.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      btn.style.transform = `translate(${relX * 6}px, ${relY * 6}px)`;
      if (icon) icon.style.transform = `translate(${relX * 10}px, ${relY * 10}px)`;
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "";
      if (icon) icon.style.transform = "";
    });
  });

  /* ============ Borne du hero : porte au clic ============ */
  const kioskHero = document.getElementById("kioskHero");
  if (kioskHero) {
    const screenText = kioskHero.querySelector(".kiosk__screen-text");
    kioskHero.addEventListener("click", () => {
      const isOpen = kioskHero.classList.toggle("is-open");
      kioskHero.setAttribute("aria-pressed", String(isOpen));
      if (screenText) {
        screenText.textContent = isOpen ? "CASQUE PRÊT · UV-C OK" : "TOUCHEZ POUR OUVRIR";
      }
    });
  }

  /* ============ Section "Fonctionnement" : porte pilotée par le scroll ============ */
  const howScroller = document.getElementById("howScroller");
  const kioskHow = document.getElementById("kioskHow");
  const kioskHowDoor = document.getElementById("kioskHowDoor");
  const howProgressBar = document.getElementById("howProgressBar");
  const howSteps = Array.from(document.querySelectorAll(".how__step"));
  const howScreenText = document.getElementById("howScreenText");

  const STEP_MESSAGES = [
    "SCAN EN COURS…",
    "DÉVERROUILLAGE…",
    "PORTE OUVERTE",
    "CYCLE UV-C…",
  ];

  if (howScroller && kioskHow && kioskHowDoor) {
    let ticking = false;
    let lastStepIndex = -1;

    const updateHow = () => {
      ticking = false;
      const rect = howScroller.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const scrollable = rect.height - viewportH;
      let progress = scrollable > 0 ? -rect.top / scrollable : 0;
      progress = Math.min(1, Math.max(0, progress));

      const doorAngle = progress * 108; // aligné avec .kiosk.is-open (rotateY -108deg)
      kioskHowDoor.style.transform = `rotateY(-${doorAngle}deg)`;

      kioskHow.classList.toggle("is-opening", progress > 0.08);

      if (howProgressBar) howProgressBar.style.width = `${progress * 100}%`;

      const stepIndex = Math.min(howSteps.length - 1, Math.floor(progress * howSteps.length));
      if (stepIndex !== lastStepIndex) {
        lastStepIndex = stepIndex;
        howSteps.forEach((step, i) => step.classList.toggle("is-active", i === stepIndex));
        if (howScreenText) howScreenText.textContent = STEP_MESSAGES[stepIndex];
      }
    };

    const onScrollHow = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateHow);
      }
    };

    updateHow();
    window.addEventListener("scroll", onScrollHow, { passive: true });
    window.addEventListener("resize", onScrollHow);
  }

  /* ============ Diagramme technique : anime quand visible ============ */
  const diagramWrap = document.getElementById("techDiagramWrap");
  const cutawayWrap = document.querySelector(".tech__cutaway-wrap");
  if ("IntersectionObserver" in window) {
    const techObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("in-view", entry.isIntersecting);
        });
      },
      { threshold: 0.3 }
    );
    if (diagramWrap) techObserver.observe(diagramWrap);
    if (cutawayWrap) techObserver.observe(cutawayWrap);
  } else {
    if (diagramWrap) diagramWrap.classList.add("in-view");
    if (cutawayWrap) cutawayWrap.classList.add("in-view");
  }

  /* ============ Formulaire de contact (mailto) ============ */
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = contactForm.name.value.trim();
      const email = contactForm.email.value.trim();
      const company = contactForm.company.value.trim();
      const message = contactForm.message.value.trim();

      if (!name || !email || !message) {
        contactForm.reportValidity();
        return;
      }

      const subject = `Demande de démo AIRO — ${name}`;
      const bodyLines = [
        `Nom : ${name}`,
        `Email : ${email}`,
        company ? `Société / Site : ${company}` : null,
        "",
        message,
      ].filter((line) => line !== null);

      const mailto =
        `mailto:contact@airo-machine.com` +
        `?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(bodyLines.join("\n"))}`;

      window.location.href = mailto;
    });
  }
})();
