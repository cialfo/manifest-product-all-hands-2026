// Shared slide/carousel/scale logic — works on index.html and story-*.html
(function () {
  // Asset version this page loaded (the ?v= on app.js). version.txt holds the
  // latest published one; open tabs poll it and offer a refresh when it changes.
  const LOADED_VERSION = ((document.currentScript && document.currentScript.src) || "").split("v=")[1] || "";
  const slides = document.querySelectorAll(".slide");
  const TOTAL = slides.length;
  let current = 0;

  // Find the initially-active slide (set in HTML) so progress/count start correct
  for (let i = 0; i < slides.length; i++) {
    if (slides[i].classList.contains("active")) {
      current = i;
      break;
    }
  }

  const carState = {};
  const COURSE_IMG_LABELS = [
    "Old Design and Sort Order",
    "New Design — Course Overview",
    "Tune Preferences",
    "Destination",
    "New Design — Activity",
  ];
  function carSyncMeta(id) {
    if (id === "car-plc") {
      const label = document.getElementById("car-plc-phase");
      if (!label || !carState[id]) return;
      label.textContent = carState[id].idx % 2 === 0 ? "Before" : "After";
    }
    if (id === "car-course") {
      const lbl = document.getElementById("car-course-lbl");
      if (!lbl || !carState[id]) return;
      lbl.textContent = COURSE_IMG_LABELS[carState[id].idx] ?? "";
    }
  }
  function carInit(id) {
    const host = document.getElementById(id);
    if (!host) return;
    const imgs = host.querySelectorAll(".car-img");
    carState[id] = { idx: 0, total: imgs.length };
    carSyncMeta(id);
  }
  function carGo(id, n) {
    if (!carState[id]) return;
    const host = document.getElementById(id);
    if (!host) return;
    const imgs = host.querySelectorAll(".car-img");
    imgs[carState[id].idx].classList.remove("active");
    carState[id].idx = (n + carState[id].total) % carState[id].total;
    imgs[carState[id].idx].classList.add("active");
    const cnt = document.getElementById(id + "-cnt");
    if (cnt) cnt.textContent = carState[id].idx + 1 + " / " + carState[id].total;
    carSyncMeta(id);
  }
  function carPrev(id) {
    if (carState[id]) carGo(id, carState[id].idx - 1);
  }
  function carNext(id) {
    if (carState[id]) carGo(id, carState[id].idx + 1);
  }
  window.carPrev = carPrev;
  window.carNext = carNext;

  function goTo(n) {
    if (!TOTAL) return;
    slides[current].classList.remove("active");
    current = (n + TOTAL) % TOTAL;
    slides[current].classList.add("active");
    updateChrome();
    restartAnimations();
    if (slides[current].querySelector(".people-slide")) launchConfetti();
    document
      .querySelectorAll(".is-spot, .is-dim")
      .forEach((c) => c.classList.remove("is-spot", "is-dim"));
    runCountUps(slides[current]);
  }
  window.goTo = goTo;

  // ── Outcome slides: mini bars + count-up numbers ──
  // .oc-bars[data-before][data-after][data-max?] → last-period vs now bars.
  // .oc-split[data-a][data-b] → one stacked split bar with a legend.
  // Widths go in a --w custom property so the CSS ah-bar animation grows them.
  const fmtShare = (n, total) => Math.round((100 * n) / total) + "%";
  document.querySelectorAll(".oc-bars").forEach((el) => {
    const before = parseFloat(el.dataset.before);
    const after = parseFloat(el.dataset.after);
    const max = parseFloat(el.dataset.max) || Math.max(before, after);
    [
      [el.dataset.beforeLabel, before, ""],
      [el.dataset.afterLabel, after, " is-after"],
    ].forEach(([label, value, mod]) => {
      const row = document.createElement("div");
      row.className = "oc-bar-row";
      row.innerHTML =
        '<span class="oc-bar-label"></span><span class="oc-bar-track"><span class="oc-bar' +
        mod +
        '"></span></span>';
      row.querySelector(".oc-bar-label").textContent = label || "";
      row.querySelector(".oc-bar").style.setProperty("--w", (100 * value) / max + "%");
      el.appendChild(row);
    });
  });
  document.querySelectorAll(".oc-split").forEach((el) => {
    const a = parseFloat(el.dataset.a);
    const b = parseFloat(el.dataset.b);
    const total = a + b;
    el.innerHTML =
      '<div class="oc-split-track"><span class="oc-split-a"></span><span class="oc-split-b"></span></div>' +
      '<div class="oc-split-legend"><span></span><span></span></div>';
    el.querySelector(".oc-split-a").style.setProperty("--w", (100 * a) / total + "%");
    el.querySelector(".oc-split-b").style.setProperty("--w", (100 * b) / total + "%");
    const legend = el.querySelectorAll(".oc-split-legend span");
    legend[0].textContent = el.dataset.aLabel + " " + fmtShare(a, total);
    legend[1].textContent = el.dataset.bLabel + " " + fmtShare(b, total);
  });

  // Count every number inside an outcome tile's headline up from zero, keeping
  // its decimals, thousands commas and any K / % / × around it.
  function runCountUps(slide) {
    if (!slide) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    slide.querySelectorAll(".oc-wrap .stat-after, .oc-wrap .stat-before").forEach((el) => {
      if (!el.dataset.final) el.dataset.final = el.textContent;
      const final = el.dataset.final;
      const tokens = final.match(/\d[\d,]*(?:\.\d+)?/g);
      if (!tokens) return;
      // Timer-driven (not requestAnimationFrame) so it always finishes, even in
      // a background tab or a headless capture.
      clearTimeout(el._countTimer);
      const start = Date.now() + 700;
      const dur = 1300;
      const tick = () => {
        const t = Math.min(1, Math.max(0, (Date.now() - start) / dur));
        const k = 1 - Math.pow(1 - t, 3);
        el.textContent = final.replace(/\d[\d,]*(?:\.\d+)?/g, (tok) => {
          const dec = (tok.split(".")[1] || "").length;
          const v = parseFloat(tok.replace(/,/g, "")) * k;
          return tok.includes(",")
            ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })
            : v.toFixed(dec);
        });
        if (t < 1) el._countTimer = setTimeout(tick, 16);
      };
      tick();
    });
  }
  runCountUps(slides[current]);

  // Agenda: number keys 1–9 open that story while the agenda slide is showing.
  document.addEventListener("keydown", (e) => {
    if (!slides[current] || slides[current].id !== "agenda") return;
    if (!/^[1-9]$/.test(e.key)) return;
    const link = slides[current].querySelectorAll(".ag-link")[Number(e.key) - 1];
    if (link) link.click();
  });

  // ── Interactive people sections (index.html) ──
  // [data-goto="<slide id>"] jumps to that slide (guest wall + guest name switcher).
  // Clicking a card in a .stu-spotlight grid spotlights it; click again to reset.
  document.addEventListener("click", (e) => {
    const jump = e.target.closest("[data-goto]");
    if (jump) {
      for (let i = 0; i < slides.length; i++) {
        if (slides[i].id === jump.dataset.goto) return goTo(i);
      }
      return;
    }
    const card = e.target.closest(".stu-spotlight .stu-card, .oc-spotlight .stat-card");
    if (!card) return;
    const on = !card.classList.contains("is-spot");
    card.parentElement.querySelectorAll(":scope > *").forEach((c) => {
      c.classList.toggle("is-spot", on && c === card);
      c.classList.toggle("is-dim", on && c !== card);
    });
  });

  // ── Confetti for the "Celebrating our people" slides ──
  // One pop all over the screen when a people slide opens: bursts from points
  // spread across the viewport, fading out to nothing at exactly 2 seconds.
  // Plain canvas, no dependency. Skipped when the viewer prefers reduced motion.
  const CONFETTI_COLORS = ["#d0021b", "#e8524a", "#f5a623", "#f8e71c", "#7ed321", "#4a90e2", "#bd10e0"];
  const CONFETTI_MS = 2000;
  const confetti = { pieces: [], frame: null, canvas: null, ctx: null, W: 0, H: 0, start: 0 };

  function onPeopleSlide() {
    return !!(slides[current] && slides[current].querySelector(".people-slide"));
  }
  function confettiResize() {
    const dpr = window.devicePixelRatio || 1;
    confetti.W = window.innerWidth;
    confetti.H = window.innerHeight;
    confetti.canvas.width = confetti.W * dpr;
    confetti.canvas.height = confetti.H * dpr;
    confetti.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function launchConfetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!confetti.canvas) {
      confetti.canvas = document.createElement("canvas");
      confetti.canvas.id = "confetti-canvas";
      document.body.appendChild(confetti.canvas);
      confetti.ctx = confetti.canvas.getContext("2d");
      window.addEventListener("resize", () => confetti.canvas && confettiResize());
    }
    confettiResize();
    const { W, H } = confetti;

    // ~14 pop points on a loose grid so the whole screen is covered.
    confetti.pieces = [];
    const cols = 5;
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ox = ((c + 0.5 + (Math.random() - 0.5) * 0.6) / cols) * W;
        const oy = ((r + 0.5 + (Math.random() - 0.5) * 0.6) / rows) * H;
        for (let i = 0; i < 38; i++) {
          const ang = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 7;
          confetti.pieces.push({
            x: ox,
            y: oy,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed - 2,
            w: 6 + Math.random() * 6,
            h: 8 + Math.random() * 8,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 0.3,
            color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
          });
        }
      }
    }
    confetti.start = performance.now();
    if (!confetti.frame) confetti.frame = requestAnimationFrame(confettiFrame);
  }

  function confettiFrame(now) {
    const { ctx, W, H } = confetti;
    const elapsed = now - confetti.start;
    ctx.clearRect(0, 0, W, H);
    // Done after 2 s, or straight away if we left the people slide.
    if (elapsed >= CONFETTI_MS || !onPeopleSlide()) {
      confetti.pieces = [];
      confetti.frame = null;
      return;
    }
    // Full strength for the first 1.3 s, then fade to nothing by 2 s.
    ctx.globalAlpha = Math.min(1, Math.max(0, (CONFETTI_MS - elapsed) / 700));
    for (const p of confetti.pieces) {
      p.vy += 0.22;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
      ctx.restore();
    }
    confetti.frame = requestAnimationFrame(confettiFrame);
  }
  window.launchConfetti = launchConfetti;

  function updateChrome() {
    const countEl = document.getElementById("slide-count");
    if (countEl) countEl.textContent = current + 1 + " / " + TOTAL;
    const prog = document.getElementById("progress");
    if (prog) prog.style.width = ((current + 1) / TOTAL) * 100 + "%";
    // The home button jumps to the agenda. On index.html it is offered only on
    // the title slide, as a way to skip straight to the topic list; showing it
    // on later slides would also stack it beside the config gear.
    const home = document.getElementById("home-link");
    const onIndex = !!document.getElementById("agenda");
    if (home) {
      const show = onIndex ? current === 0 : current >= 2;
      home.style.display = show ? "flex" : "none";
    }
  }

  function restartAnimations() {
    const el = slides[current];
    if (!el) return;
    const animated = el.querySelectorAll(
      ".word, .word08, .bottom-text, .play-zone, .orbit, .people, .people-grid, .people-slide, .bottom, .vision-header, .envelope-wrap, .words, .words08"
    );
    animated.forEach((a) => {
      a.style.animation = "none";
      void a.offsetHeight;
      a.style.animation = "";
    });
  }

  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      goTo(current + 1);
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      goTo(current - 1);
      e.preventDefault();
    }
  });

  // Index of the agenda slide, resolved from #agenda rather than hard-coded, so
  // slides can be inserted ahead of it without breaking Home / the #agenda link.
  function agendaIndex() {
    const el = document.getElementById("agenda");
    if (el) {
      for (let i = 0; i < slides.length; i++) if (slides[i] === el) return i;
    }
    return 1;
  }
  window.agendaIndex = agendaIndex;

  const homeLink = document.getElementById("home-link");
  if (homeLink) homeLink.addEventListener("click", () => goTo(agendaIndex()));

  // No top bar — stage uses full viewport height
  document.body.style.paddingTop = "0px";

  // CSS overrides: hide in-slide logos, reposition slide count, hide hint, carousel controls
  const hideLogoStyle = document.createElement("style");
  hideLogoStyle.textContent =
    '.hbar .mgb,.cl-mgb{display:none !important}.hbar{background:transparent !important;border-bottom:0 !important;justify-content:center !important;padding:1rem 2rem !important}.hbar .hbar-title{display:none !important}.slide > div[style*="background:#0c0c0c"],.slide > div[style*="background: #0c0c0c"]{background:transparent !important}.slide .dots{display:none !important}#slide-count{position:fixed !important;bottom:18px !important;left:50% !important;top:auto !important;right:auto !important;transform:translateX(-50%) !important;font-size:11px;color:var(--text-faint);letter-spacing:.12em;text-align:center}#hint{display:none !important}.play-zone{position:relative;padding-bottom:64px !important}.play-zone .car-stage{flex:1 1 auto;min-height:0}.car-controls{position:absolute;left:0;right:0;bottom:14px;display:flex;align-items:center;justify-content:center;gap:14px;pointer-events:none}.car-controls > *{pointer-events:auto}.car-controls .car-side-btn{position:static !important;transform:none !important;width:32px !important;height:32px !important;background:transparent !important;border:0 !important;font-size:16px !important;color:var(--text-muted) !important}.car-controls .car-side-btn:hover{background:rgba(var(--accent-rgb),.24) !important;color:var(--text-primary) !important}.car-controls .car-count{position:static !important;transform:none !important;background:transparent !important;border:0 !important;padding:0 !important;white-space:nowrap}';
  document.head.appendChild(hideLogoStyle);

  function scaleStage() {
    const stage = document.getElementById("stage");
    if (!stage) return;
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.transform = "scale(" + scale + ")";
  }
  scaleStage();
  window.addEventListener("resize", scaleStage);

  // Top-right logo + bottom nav buttons
  (function buildChrome() {
    // Determine back + next based on stories-index.js + localStorage config.
    // On story pages: back → index.html#agenda, next → next enabled story (or
    // "Back to Start" if this is the last enabled story). On index.html: no
    // back/next buttons (handled by its own agenda cards).
    let backHref = null,
      nextHref = null;
    const ah26 = window.AH26;
    const storyId = ah26 && ah26.currentStoryId ? ah26.currentStoryId() : null;
    if (storyId) {
      backHref = "index.html#agenda";
      const config = ah26.loadConfig();
      const enabled = ah26.enabledInOrder(config);
      const idx = enabled.indexOf(storyId);
      if (idx === -1) {
        // Current story is disabled in config — still let the user return.
        nextHref = "index.html#agenda";
      } else if (idx + 1 < enabled.length) {
        const nextStory = ah26.findStory(enabled[idx + 1]);
        nextHref = nextStory ? nextStory.file : "index.html";
      } else {
        nextHref = "index.html";
      }
    }

    // ── Top-right logo block ──
    const logoWrap = document.createElement("div");

    logoWrap.style.cssText =
      "position:fixed;top:16px;left:20px;z-index:200;display:flex;flex-direction:column;align-items:center;gap:7px;pointer-events:none";
    /*
      logoWrap.innerHTML =
      '<div style="background:#CC0000;border-radius:4px;width:72px;height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 10px 10px">' +
      "<span style=\"font-family:Georgia,'Times New Roman',serif;font-size:50px;font-weight:700;color:#fff;line-height:1;display:block;margin-bottom:4px\">M</span>" +
      '<div style="width:52px;height:7px;background:#111;border-radius:0"></div>' +
      "</div>" +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;margin-top:1px">' +
      "<span style=\"font-family:'Montserrat',sans-serif;font-size:15px;font-weight:700;color:#fff;letter-spacing:.02em;line-height:1\">Manifest</span>" +
      "<span style=\"font-family:'Montserrat',sans-serif;font-size:11px;font-weight:400;color:rgba(255,255,255,.82);letter-spacing:.07em;line-height:1.4\">Global</span>" +
      "</div>";
    document.body.appendChild(logoWrap);
    */

    // ── Top-right section logo (mirrors Manifest logo on left) ──
    // Logo is picked from the current story's `section` field in stories-index.js.
    // Dark theme uses white-knockout logos; light theme uses full-color logos.
    const DARK_LOGOS = {
      Cialfo: "Cialfo White Identity PNG.png",
      FlowAI: "Assets/Flow AI (White BG)- Logo PNG.png",
      BridgeU: "bridgeU--New-Logo--White-PNG.png",
      Explore: "Explore-Logo-Horizontal-White-PNG.png",
      Manifest: "Assets/Manifest-rect-logo1.png",
    };
    const LIGHT_LOGOS = {
      Cialfo: "Assets/logo-cialfo.webp",
      FlowAI: "Assets/Flow AI (White BG)- Logo PNG.png",
      BridgeU: "Assets/logo-bridgeu.svg",
      Explore: "Assets/logo-explore.png",
      Manifest: "Assets/Manifest-rect-logo1.png",
    };
    const currentStoryId = window.AH26 && window.AH26.currentStoryId();
    const currentStory = currentStoryId && window.AH26.findStory(currentStoryId);
    const currentSection = currentStory ? currentStory.section : undefined;
    // Per-section: topAnchor = vertical center from top (px), maxH/maxW = size cap
    // noShadow: skip drop-shadow filter for logos that already have clean edges
    const LOGO_CFG = {
      Cialfo: { top: 56, maxH: 72, maxW: 160, noShadow: true },
      BridgeU: { top: 50, maxH: 58, maxW: 160, noShadow: true },
      FlowAI: { top: 32, maxH: 47, maxW: 117, noShadow: true },
      Explore: { top: 36, maxH: 46, maxW: 160, noShadow: true },
      Manifest: { top: 60, maxH: 88, maxW: 200, noShadow: true },
    };
    if (currentSection && DARK_LOGOS[currentSection]) {
      const cfg = LOGO_CFG[currentSection] || { top: 71, maxH: 96, maxW: 180 };
      const rightWrap = document.createElement("div");
      rightWrap.style.cssText =
        "position:fixed;top:" +
        cfg.top +
        "px;left:50%;z-index:200;display:flex;align-items:center;justify-content:center;gap:14px;pointer-events:none;transform:translate(-50%,-50%)";

      if (currentStoryId === "salesintel" || currentStoryId === "accountintel") {
        // Show Manifest Global horizontal logo
        const img = document.createElement("img");
        img.src = "Assets/Manifest-Global--Horizontal-Logo-SVG.png";
        img.alt = "Manifest Global";
        img.style.cssText =
          "max-height:52px;max-width:260px;width:auto;height:auto;object-fit:contain;";
        rightWrap.appendChild(img);
      } else if (currentStoryId === "studylink") {
        // Show Kaaiser + FlowAI logos side by side
        const imgK = document.createElement("img");
        imgK.src = "Assets/KAAISER---New-Logo.png";
        imgK.alt = "Kaaiser";
        imgK.style.cssText =
          "max-height:56px;max-width:150px;width:auto;height:auto;object-fit:contain;";
        const sep = document.createElement("span");
        sep.textContent = "×";
        sep.style.cssText =
          "font-family:'Cormorant Garamond',Georgia,serif;font-size:1.5rem;color:rgba(255,255,255,0.45);line-height:1";
        const imgF = document.createElement("img");
        imgF.src = "Assets/Flow AI (White BG)- Logo PNG.png";
        imgF.alt = "FlowAI";
        imgF.style.cssText =
          "max-height:44px;max-width:120px;width:auto;height:auto;object-fit:contain;border-radius:5px;";
        rightWrap.appendChild(imgK);
        rightWrap.appendChild(sep);
        rightWrap.appendChild(imgF);
      } else {
        const img = document.createElement("img");
        const isLight = document.documentElement.classList.contains("theme-light");
        img.src = (isLight ? LIGHT_LOGOS : DARK_LOGOS)[currentSection];
        img.alt = "";
        const shadowFilter = cfg.noShadow ? "none" : "drop-shadow(0 1px 6px rgba(0,0,0,.5))";
        img.style.cssText =
          "max-height:" +
          cfg.maxH +
          "px;max-width:" +
          cfg.maxW +
          "px;width:auto;height:auto;object-fit:contain;filter:" +
          shadowFilter;
        rightWrap.appendChild(img);
        window.__ah26_updateSectionLogo = () => {
          const light = document.documentElement.classList.contains("theme-light");
          img.src = (light ? LIGHT_LOGOS : DARK_LOGOS)[currentSection];
          img.style.filter = shadowFilter;
        };
        window.__ah26_updateSectionLogo();
      }
      document.body.appendChild(rightWrap);
    }

    // ── Top nav buttons ──
    const btnBase =
      "position:fixed;top:15px;z-index:200;display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:var(--text-muted);font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;padding:10px 16px;border:1px solid var(--neutral-panel-hi);border-radius:8px;background:var(--nav-surface);backdrop-filter:blur(8px);transition:all .2s;font-family:'Montserrat',sans-serif";

    // Mark in-deck returns to the agenda, so index.html only honours #agenda
    // when it comes from a story button (a shared #agenda link opens on the title).
    const markAgendaReturn = (a) =>
      a.addEventListener("click", () => {
        try { sessionStorage.setItem("ah26_agenda_return", "1"); } catch (e) {}
      });

    if (backHref) {
      const back = document.createElement("a");
      back.href = backHref;
      back.style.cssText = btnBase + ";left:20px";
      back.innerHTML = "&larr;&nbsp;&nbsp;What We&rsquo;re Building";
      back.addEventListener("mouseenter", () => {
        back.style.borderColor = "rgba(var(--accent-rgb),.6)";
        back.style.color = "var(--text-primary)";
        back.style.background = "rgba(var(--accent-rgb),.12)";
      });
      back.addEventListener("mouseleave", () => {
        back.style.borderColor = "var(--neutral-panel-hi)";
        back.style.color = "var(--text-muted)";
        back.style.background = "var(--nav-surface)";
      });
      markAgendaReturn(back);
      document.body.appendChild(back);
    }
    if (nextHref) {
      const next = document.createElement("a");
      next.href = nextHref;
      if (/#agenda$/.test(nextHref)) markAgendaReturn(next);
      next.style.cssText = btnBase + ";right:20px";
      const label =
        /index\.html$/.test(nextHref) && !/#/.test(nextHref) ? "Back to Start" : "Next Story";
      next.innerHTML = label + "&nbsp;&nbsp;&rarr;";
      next.addEventListener("mouseenter", () => {
        next.style.borderColor = "rgba(var(--accent-rgb),.6)";
        next.style.color = "var(--text-primary)";
        next.style.background = "rgba(var(--accent-rgb),.12)";
      });
      next.addEventListener("mouseleave", () => {
        next.style.borderColor = "var(--neutral-panel-hi)";
        next.style.color = "var(--text-muted)";
        next.style.background = "var(--nav-surface)";
      });
      document.body.appendChild(next);
    }
  })();

  // Left/right nav arrows (slide-to-slide, injected on every page)
  if (TOTAL > 1) {
    const navCSS =
      "position:fixed;top:50%;transform:translateY(-50%);z-index:60;width:48px;height:48px;border-radius:50%;background:var(--nav-surface);border:1px solid var(--neutral-panel-hi);color:var(--text-body);font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);transition:background .2s,border-color .2s,color .2s;user-select:none;font-family:system-ui,sans-serif";
    const mkBtn = (dir) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", dir === -1 ? "Previous slide" : "Next slide");
      b.style.cssText = navCSS + (dir === -1 ? ";left:20px" : ";right:20px");
      b.innerHTML = dir === -1 ? "&#8592;" : "&#8594;";
      b.addEventListener("mouseenter", () => {
        b.style.background = "rgba(var(--accent-rgb),.25)";
        b.style.borderColor = "rgba(var(--accent-rgb),.6)";
        b.style.color = "var(--text-primary)";
      });
      b.addEventListener("mouseleave", () => {
        b.style.background = "var(--nav-surface)";
        b.style.borderColor = "var(--neutral-panel-hi)";
        b.style.color = "var(--text-body)";
      });
      b.addEventListener("click", () => goTo(current + dir));
      return b;
    };
    document.body.appendChild(mkBtn(-1));
    document.body.appendChild(mkBtn(1));
  }

  // Theme is fixed to light mode — toggle button disabled
  (function buildThemeToggle() {
    document.documentElement.classList.add("theme-light");
    try { localStorage.setItem("ah26_theme", "light"); } catch (e) {}
    if (typeof window.__ah26_updateSectionLogo === "function") {
      window.__ah26_updateSectionLogo();
    }
  })();

  // Initialize any carousels present on this page
  [
    "car-alumni",
    "car-flowai",
    "car-studylink",
    "car-checker",
    "car-plc",
    "car-course",
    "car-salesintel",
    "car-migration",
  ].forEach(carInit);

  // Group carousel controls (prev / count / next) into a single centered flex wrapper
  document.querySelectorAll(".play-zone").forEach((zone) => {
    const prev = zone.querySelector(".car-side-btn.prev");
    const next = zone.querySelector(".car-side-btn.next");
    const count = zone.querySelector(".car-count");
    if (!prev || !next) return;
    const wrap = document.createElement("div");
    wrap.className = "car-controls";
    wrap.appendChild(prev);
    if (count) wrap.appendChild(count);
    wrap.appendChild(next);
    zone.appendChild(wrap);
  });

  updateChrome();

  // ── Polaroid people wall (slide 6) ──
  (function buildPeopleWall() {
    const grid = document.querySelector(".people-grid");
    if (!grid) return;

    const PEOPLE_PHOTOS = {
      Ahmad: "ahmad-shafiq.webp",
      Alessandro: "alessandro-iacovacci.webp",
      Ann: "ann-gracious.webp",
      Anushka: "anushka-kashyap.webp",
      "Anushka Kashyap": "anushka-kashyap.webp",
      Ather: "ather-mohiuddin.webp",
      Ayush: "ayush-shukla.webp",
      Benji: "benji-evans.webp",
      Bilal: "Bilal-Ibrahim.webp",
      "Bilal Ibrahim": "Bilal-Ibrahim.webp",
      Cassandra: "cassandra-ye.webp",
      "Charles Carrier": "charles-carrier.webp",
      "Charles David": "charles-david.webp",
      "Deba Priya": "debapriya-chatterjee.webp",
      Debapriya: "debapriya-chatterjee.webp",
      Diana: "diana-gravett.webp",
      Dorothy: "dorothy.webp",
      Ejona: "ejona-gjata.webp",
      Federico: "federico-stamatti.webp",
      "Fraz Ahsan": "fraz-ahsan.webp",
      Haseeb: "haseeb-elahi.webp",
      Himanshu: "himanshu-jain.webp",
      Hitendra: "hitendra-singh.webp",
      Ishika: "ishika-singh.webp",
      Joshua: "joshua-adela.webp",
      Kamal: "kamal-kant.webp",
      "Khushboo S.": "khushboo-singh.webp",
      Khushnuma: "khushnuma.webp",
      "Mohit Mmangal": "mohit-mmangal.webp",
      Narender: "narender-yadav.webp",
      Nasreen: "nasreen-gani.webp",
      "Nimisha Ojha": "nimisha-ojha.webp",
      Nitin: "nitin-kumar.webp",
      "Nitish Suryakant": "nitish-suryakant-itagikar.webp",
      Pooja: "pooja-gupta.webp",
      Prashant: "prashant-manda.webp",
      Prial: "prial-gupta.webp",
      "Prial Gupta": "prial-gupta.webp",
      Rachel: "rachel-zhang.webp",
      Rajat: "rajat-khanna.webp",
      Rashash: "rashash.webp",
      Riya: "riya-goyal.webp",
      "Riya Goyal": "riya-goyal.webp",
      Sachin: "sachin-singh.webp",
      Sanya: "sanya-mandloi.webp",
      Saransh: "saransh-mishra.webp",
      "Shan Wang": "shan-wang.webp",
      "Shaikh Faizan Ahmed": "shaikh-faizan-ahmed-2026.webp",
      Lakshya: "lakshya-2026.webp",
      Evalyn: "evalyn.webp",
      Siddharth: "siddharth-kansal.webp",
      "Simran Singh": "simran-singh.webp",
      Stanley: "stanley-chia.webp",
      Sudhanshu: "sudhanshu-sundriyal.webp",
      Swati: "swathi-seth.webp",
      "Talha Javed": "talha-javed.webp",
      Tayyab: "tayyab-javed.webp",
      Tej: "tejswari.webp",
      Teresa: "teresa-li.webp",
      Vaibhav: "vaibhav-shrivastava.webp",
      "Aayushi Rawat": "Aayushi-Rawat.webp",
      "Shivam Sharma": "Shivam-Sharma.webp",
      Vidhu: "vidhu-raj-singh.webp",
      "Vidhu Raj Singh": "vidhu-raj-singh.webp",
      Nistha: "Nistha-Kaushal.webp",
      Aditya: "Aditya-semwal.webp",
      "Aditya Semwal": "Aditya-semwal.webp",
      "Aditya Yadav": "aditya-yadav.webp",
      Gaurab: "gaurab.webp",
      Rageshree: "rageshree.webp",
      "Aditya Ruhela": "Aditya-R.webp",
      "Tarun Negi": "Tarun-Negi.webp",
      Mobin: "Mobin-V.webp",
      Vishal: "vishal-gosain.webp",
      Waqas: "waqas-akhtar-2026.webp",
      William: "william-hund.webp",
      Prabal: "Prabal-M.webp",
      "Mool Chand": "Mool-Chand.webp",
      Anjali: "Anjali.webp",
      Payal: "Payal.webp",
      Vivek: "Vivek-Thakur.webp",
      Maitreyi: "Maitreyi.webp",
      Megha: "Megha.webp",
      Palak: "Palak.webp",
      Sanchita: "Sanchita.webp",
      Tanzeem: "Tanzeem.webp",
      Trisha: "Trisha.webp",
      Vanessa: "Vanessa.webp",
      "Jyoti Ram": "Jyoti Ram.webp",
      Akanksha: "akanksha-gupta.webp",
      "Akanksha Gupta": "akanksha-gupta.webp",
      "Yash Jain": "Yash Jain.webp",
      Yashank: "Yashank.webp",
      "Yashank Srivastava": "Yashank.webp",
      Ashish: "Ashish.webp",
      "Ashish Kumar": "Ashish.webp",
      Nandini: "Nandini.webp",
      Carlo: "Carlo.webp",
      Somraj: "Somraj.webp",
    };

    const HOVER_FLAVORS = ["hover-zoom"];
    const MODES = ["slide-left", "shuffle-right", "dance", "explode", "hide-from-mouse"];

    const names = JSON.parse(grid.getAttribute("data-people") || "[]");
    // Size the cards to the team: fewer people, bigger photos (see styles.css).
    const n = names.length;
    grid.classList.add(
      n <= 3 ? "people-xl" : n === 4 ? "people-lg" : n === 5 ? "people-md" : "people-many"
    );
    names.forEach((name, i) => {
      const card = document.createElement("div");
      const flavor = HOVER_FLAVORS[(Math.random() * HOVER_FLAVORS.length) | 0];
      card.className = "polaroid " + flavor;
      card.style.setProperty("--tilt", "0deg");
      card.style.setProperty("--i", i);

      const photoFile = PEOPLE_PHOTOS[name];
      if (photoFile) {
        const img = document.createElement("img");
        img.className = "polaroid-photo";
        img.src = "Assets/people/" + photoFile;
        img.alt = name;
        card.appendChild(img);
      } else {
        const ph = document.createElement("div");
        ph.className = "polaroid-photo placeholder";
        const initials =
          name
            .split(/\s+/)
            .map((s) => s[0] || "")
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?";
        ph.textContent = initials;
        card.appendChild(ph);
      }
      const label = document.createElement("div");
      label.className = "polaroid-name";
      label.textContent = name;
      card.appendChild(label);
      grid.appendChild(card);
    });

    const btn = document.querySelector(".people-shuffle-btn");
    let mouseHandler = null;
    const clearMode = () => {
      MODES.forEach((m) => grid.classList.remove("mode-" + m));
      if (mouseHandler) {
        grid.removeEventListener("mousemove", mouseHandler);
        mouseHandler = null;
      }
      grid.querySelectorAll(".polaroid").forEach((c) => {
        c.style.removeProperty("transform");
      });
    };

    if (btn) {
      btn.addEventListener("click", () => {
        clearMode();
        const mode = MODES[(Math.random() * MODES.length) | 0];
        if (mode === "explode") {
          grid.querySelectorAll(".polaroid").forEach((c) => {
            c.style.setProperty("--ex", ((Math.random() * 2 - 1) * 1200).toFixed(0));
            c.style.setProperty("--ey", ((Math.random() * 2 - 1) * 900).toFixed(0));
            c.style.setProperty("--er", ((Math.random() * 2 - 1) * 90).toFixed(0));
          });
        }
        if (mode === "hide-from-mouse") {
          mouseHandler = (e) => {
            grid.querySelectorAll(".polaroid").forEach((c) => {
              const r = c.getBoundingClientRect();
              const dx = r.left + r.width / 2 - e.clientX;
              const dy = r.top + r.height / 2 - e.clientY;
              const dist = Math.hypot(dx, dy);
              const push = Math.max(0, 1 - dist / 260) * 80;
              if (push === 0) {
                c.style.transform = "";
                return;
              }
              const ang = Math.atan2(dy, dx);
              c.style.transform =
                "translate(" +
                (Math.cos(ang) * push).toFixed(1) +
                "px, " +
                (Math.sin(ang) * push).toFixed(1) +
                "px) rotate(var(--tilt, 0deg))";
            });
          };
          grid.addEventListener("mousemove", mouseHandler);
        }
        grid.classList.add("mode-" + mode);
        launchConfetti();
        if (mode === "slide-left" || mode === "shuffle-right" || mode === "explode") {
          setTimeout(() => {
            if (grid.classList.contains("mode-" + mode)) clearMode();
          }, 1800);
        }
      });
    }

    // Reset mode when leaving slide 6
    const slide = grid.closest(".slide");
    if (slide) {
      const obs = new MutationObserver(() => {
        if (!slide.classList.contains("active")) clearMode();
      });
      obs.observe(slide, { attributes: true, attributeFilter: ["class"] });
    }
  })();

  // ── "Deck updated" prompt ──
  // Never reloads by itself (that would jump a presenter back to the title slide);
  // it shows a small Refresh button instead. Skipped when opened from disk.
  (function watchForUpdates() {
    if (!LOADED_VERSION || location.protocol === "file:" || !window.fetch) return;
    let shown = false;
    const check = () => {
      if (shown || document.hidden) return;
      fetch("version.txt?t=" + Date.now(), { cache: "no-store" })
        .then((r) => (r.ok ? r.text() : ""))
        .then((latest) => {
          latest = latest.trim();
          if (!latest || latest === LOADED_VERSION || shown) return;
          shown = true;
          const bar = document.createElement("div");
          bar.id = "ah-update";
          bar.innerHTML =
            "<span>The deck has been updated</span>" +
            '<button type="button" class="ah-update-go">Refresh</button>' +
            '<button type="button" class="ah-update-close" aria-label="Dismiss">&times;</button>';
          bar.querySelector(".ah-update-go").addEventListener("click", () => location.reload());
          bar.querySelector(".ah-update-close").addEventListener("click", () => bar.remove());
          document.body.appendChild(bar);
        })
        .catch(() => {});
    };
    setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    setTimeout(check, 5000);
  })();
})();
