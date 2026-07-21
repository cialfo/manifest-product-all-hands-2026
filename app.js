// Shared slide/carousel/scale logic — works on index.html and story-*.html
(function () {
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
  }
  window.goTo = goTo;

  function updateChrome() {
    const countEl = document.getElementById("slide-count");
    if (countEl) countEl.textContent = current + 1 + " / " + TOTAL;
    const prog = document.getElementById("progress");
    if (prog) prog.style.width = ((current + 1) / TOTAL) * 100 + "%";
    const home = document.getElementById("home-link");
    if (home) home.style.display = current >= 2 ? "flex" : "none";
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

  const homeLink = document.getElementById("home-link");
  if (homeLink) homeLink.addEventListener("click", () => goTo(1));

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
      document.body.appendChild(back);
    }
    if (nextHref) {
      const next = document.createElement("a");
      next.href = nextHref;
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
      Ahmad: "ahmad-shafiq.png",
      Alessandro: "alessandro-iacovacci.png",
      Ann: "ann-gracious.png",
      Anushka: "anushka-kashyap.png",
      "Anushka Kashyap": "anushka-kashyap.png",
      Ather: "ather-mohiuddin.png",
      Ayush: "ayush-shukla.png",
      Benji: "benji-evans.png",
      Bilal: "Bilal-Ibrahim.png",
      "Bilal Ibrahim": "Bilal-Ibrahim.png",
      Cassandra: "cassandra-ye.png",
      "Charles Carrier": "charles-carrier.png",
      "Charles David": "charles-david.png",
      "Deba Priya": "debapriya-chatterjee.png",
      Debapriya: "debapriya-chatterjee.png",
      Diana: "diana-gravett.png",
      Dorothy: "dorothy.png",
      Ejona: "ejona-gjata.png",
      Federico: "federico-stamatti.png",
      "Fraz Ahsan": "fraz-ahsan.png",
      Haseeb: "haseeb-elahi.png",
      Himanshu: "himanshu-jain.png",
      Hitendra: "hitendra-singh.png",
      Ishika: "ishika-singh.png",
      Joshua: "joshua-adela.png",
      Kamal: "kamal-kant.png",
      "Khushboo S.": "khushboo-singh.png",
      Khushnuma: "khushnuma.png",
      "Mohit Mmangal": "mohit-mmangal.png",
      Narender: "narender-yadav.png",
      Nasreen: "nasreen-gani.png",
      "Nimisha Ojha": "nimisha-ojha.png",
      Nitin: "nitin-kumar.png",
      "Nitish Suryakant": "nitish-suryakant-itagikar.png",
      Pooja: "pooja-gupta.png",
      Prashant: "prashant-manda.png",
      Prial: "prial-gupta.png",
      "Prial Gupta": "prial-gupta.png",
      Rachel: "rachel-zhang.png",
      Rajat: "rajat-khanna.png",
      Rashash: "rashash.png",
      Riya: "riya-goyal.png",
      "Riya Goyal": "riya-goyal.png",
      Sachin: "sachin-kumar-singh.png",
      Sanya: "sanya-mandloi.png",
      Saransh: "saransh-mishra.png",
      "Shan Wang": "shan-wang.png",
      Siddharth: "siddharth-kansal.png",
      "Simran Singh": "simran-singh.png",
      Stanley: "stanley-chia.png",
      Sudhanshu: "sudhanshu-sundriyal.png",
      Swati: "swathi-seth.png",
      "Talha Javed": "talha-javed.png",
      Tayyab: "tayyab-javed.png",
      Tej: "tejswari.png",
      Teresa: "teresa-li.png",
      Vaibhav: "vaibhav-shrivastava.png",
      "Aayushi Rawat": "Aayushi-Rawat.png",
      "Shivam Sharma": "Shivam-Sharma.png",
      Vidhu: "vidhu-raj-singh.png",
      "Vidhu Raj Singh": "vidhu-raj-singh.png",
      Nistha: "Nistha-Kaushal.png",
      Aditya: "Aditya-semwal.png",
      "Aditya Ruhela": "Aditya-R.png",
      "Tarun Negi": "Tarun-Negi.png",
      Mobin: "Mobin-V.png",
      Vishal: "vishal-gosain.png",
      Waqas: "waqas-akhtar.png",
      William: "william-hund.png",
      Prabal: "Prabal-M.png",
      "Mool Chand": "Mool-Chand.png",
      Anjali: "Anjali.png",
      Payal: "Payal.png",
      Vivek: "Vivek-Thakur.png",
      Maitreyi: "Maitreyi.png",
      Palak: "Palak.png",
      Sanchita: "Sanchita.png",
      Tanzeem: "Tanzeem.png",
      Trisha: "Trisha.png",
      Vanessa: "Vanessa.png",
      "Jyoti Ram": "Jyoti Ram.png",
      Akanksha: "akanksha-gupta.png",
      "Akanksha Gupta": "akanksha-gupta.png",
      Yashank: "Yashank.png",
      "Yashank Srivastava": "Yashank.png",
      Ashish: "Ashish.png",
      "Ashish Kumar": "Ashish.png",
    };

    const HOVER_FLAVORS = ["hover-zoom"];
    const MODES = ["slide-left", "shuffle-right", "dance", "explode", "hide-from-mouse"];

    const names = JSON.parse(grid.getAttribute("data-people") || "[]");
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
})();
