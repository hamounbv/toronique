/**
 * File: js/toronique.js
 * All site custom JS for toronique.ca — single source of truth,
 * served via jsDelivr (request toronique.min.js for the minified build).
 *
 * Sections:
 * 1) Console Start Message
 * 2) Utilities (minimal)
 * 3) Modules
 * 4) Init
 * 5) Console End Message
 * 6) Lenis Smooth Scrolling (moved from the footer inline script)
 * 7) Count-Up Counters (moved from the footer inline script)
 */

(() => {
  "use strict";

  //=============================================================================
  // 1) CONSOLE START MESSAGE
  //-----------------------------------------------------------------------------
  const START_BADGE =
    "color:#fff;background:#111;padding:4px 8px;border-radius:6px;font-weight:700;";
  const START_BADGE_2 =
    "color:#111;background:#badeca;padding:4px 8px;border-radius:6px;font-weight:700;";
  try {
    // eslint-disable-next-line no-console
    console.log("%cSite Modules%c boot", START_BADGE, START_BADGE_2);
  } catch (_) {}

  //=============================================================================
  // 2) UTILITIES (minimal)
  //-----------------------------------------------------------------------------
  const Utils = (() => {
    const qs = (sel, root = document) => root.querySelector(sel);
    const qsa = (sel, root = document) =>
      Array.from(root.querySelectorAll(sel));

    const isFn = (v) => typeof v === "function";

    const safeConsole = {
      log: (...args) => {
        try {
          // eslint-disable-next-line no-console
          console.log(...args);
        } catch (_) {}
      },
      warn: (...args) => {
        try {
          // eslint-disable-next-line no-console
          console.warn(...args);
        } catch (_) {}
      },
      error: (...args) => {
        try {
          // eslint-disable-next-line no-console
          console.error(...args);
        } catch (_) {}
      },
    };

    // Safe module runner: one module error won't stop the rest
    const run = (name, fn) => {
      try {
        fn();
        safeConsole.log(`[ok] ${name}`);
      } catch (err) {
        safeConsole.error(`[fail] ${name}`, err);
      }
    };

    // Optional: wait for DOM ready
    const onReady = (fn) => {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fn, { once: true });
      } else {
        fn();
      }
    };

    return Object.freeze({ qs, qsa, isFn, run, onReady, safeConsole });
  })();

  //=============================================================================
  // 3) MODULES
  //-----------------------------------------------------------------------------

  //-----------------------------------------------------------------------------
  // KEYBOARD -> WEBFLOW IX3 CUSTOM EVENTS (TOGGLE)
  // Shift + G toggles:
  // - if CLOSED: emit("Shift G") and mark OPEN
  // - if OPEN:   emit("Reverse Shift G") and mark CLOSED
  //-----------------------------------------------------------------------------
  const KeyboardIx3ShiftGToggle = (() => {
    const DEFAULTS = Object.freeze({
      key: "g",
      forwardEvent: "Shift G",
      reverseEvent: "Reverse Shift G",
      openClass: "is-shift-g-open", // state stored on <body>
      allowRepeat: false,
      ignoreWhenTyping: true,
    });

    const isTypingField = (el) => {
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };

    const emit = (eventName) => {
      try {
        const ix3 = window.Webflow?.require?.("ix3");
        if (ix3 && typeof ix3.emit === "function") ix3.emit(eventName);
      } catch (_) {}
    };

    const init = (options = {}) => {
      const cfg = Object.assign({}, DEFAULTS, options);

      const onKeyDown = (e) => {
        if (!cfg.allowRepeat && e.repeat) return;
        if (cfg.ignoreWhenTyping && isTypingField(document.activeElement))
          return;

        // Only Shift + G (no Ctrl/Cmd/Alt)
        if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

        const k = String(e.key || "").toLowerCase();
        if (k !== cfg.key) return;

        e.preventDefault();

        const isOpen = document.body.classList.contains(cfg.openClass);

        if (!isOpen) {
          emit(cfg.forwardEvent);
          document.body.classList.add(cfg.openClass);
        } else {
          emit(cfg.reverseEvent);
          document.body.classList.remove(cfg.openClass);
        }
      };

      window.Webflow = window.Webflow || [];
      window.Webflow.push(() => {
        window.addEventListener("keydown", onKeyDown);
      });
    };

    return Object.freeze({ init });
  })();

  //-----------------------------------------------------------------------------
  // GO TO TOP (Lenis-first, native fallback)
  // Finds: [data-function="go-to-top"]
  //-----------------------------------------------------------------------------
  const GoToTop = (() => {
    const DEFAULTS = Object.freeze({
      selector: '[data-function="go-to-top"]',
      // Change this if your Lenis instance lives elsewhere
      getLenis: () => window.lenis || null,
      // Lenis scroll options (modern Lenis expects (target, options))
      lenisOptions: {
        duration: 1.1, // seconds
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        immediate: false,
        force: true,
        lock: false,
      },
    });

    const scrollToTop = (cfg) => {
      const lenis = cfg.getLenis?.();
      if (lenis && Utils.isFn(lenis.scrollTo)) {
        lenis.scrollTo(0, cfg.lenisOptions);
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    };

    const bind = (el, cfg) => {
      el.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          scrollToTop(cfg);
        },
        { passive: false }
      );
    };

    const init = (options = {}) => {
      const cfg = Object.assign({}, DEFAULTS, options);
      const els = Utils.qsa(cfg.selector);
      if (!els.length) return;
      els.forEach((el) => bind(el, cfg));
    };

    return Object.freeze({ init });
  })();

  // -----------------------------------------------------------------------------
  // SMART SWIPER
  // - Auto loads Swiper CSS/JS (v11)
  // - Lazy init via IntersectionObserver
  // - Repairs on tab clicks + resize
  // - Supports optional thumbs slider per config
  // - Properly scopes nav + thumbs within each wrapper
  // -----------------------------------------------------------------------------
  const SmartSwiper = (() => {
    const hasIO = "IntersectionObserver" in window;
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------------------------------------------------------------------------
    // CONFIGS
    // ---------------------------------------------------------------------------
    const CONFIGS = [
      {
        selector: ".default-slider-w .swiper",
        wrapper: ".default-slider-w",
        opts: {
          slidesPerView: 3,
          spaceBetween: 20,
          loop: false,
          speed: 735,
          autoplay: false,
          watchOverflow: true,
          touchReleaseOnEdges: true,
          simulateTouch: true,
          breakpoints: {
            0: { spaceBetween: 14, slidesPerView: 1 },
            768: { spaceBetween: 16, slidesPerView: 2 },
            1024: { spaceBetween: 20, slidesPerView: 3 },
          },
        },
        navPrev: ".swiper-prev",
        navNext: ".swiper-next",
      },
      {
        selector: ".sw-testimonials .swiper",
        wrapper: ".sw-testimonials",
        opts: {
          slidesPerView: 3,
          spaceBetween: 20,
          loop: true,
          loopAdditionalSlides: 4, // required for a seamless loop
          speed: 735,
          autoplay: {
            delay: 4000,
            speed: 400,
          },
          watchOverflow: true,
          watchSlidesProgress: true, // required for a seamless loop
          touchReleaseOnEdges: true,
          simulateTouch: true,
          breakpoints: {
            0: { spaceBetween: 14, slidesPerView: 1.15 },
            768: { spaceBetween: 16, slidesPerView: 2.2 },
            1024: { spaceBetween: 20, slidesPerView: 3 },
          },
        },
        navPrev: ".swiper-prev",
        navNext: ".swiper-next",
      },
    ];

    // ---------------------------------------------------------------------------
    // Utils
    // ---------------------------------------------------------------------------
    const idle = (fn) =>
      "requestIdleCallback" in window
        ? window.requestIdleCallback(fn)
        : setTimeout(fn, 0);

    const isDisplayed = (el) => {
      if (!el) return false;
      if (!el.getClientRects || !el.getClientRects().length) return false;
      return true;
    };

    function ensureCSS() {
      if (document.querySelector('link[href*="swiper-bundle.min.css"]')) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css";
      document.head.appendChild(link);
    }

    function ensureJS(cb) {
      if (window.Swiper) return cb();

      const existing = document.querySelector(
        'script[src*="swiper-bundle.min.js"]'
      );
      if (existing) {
        const wait = () => (window.Swiper ? cb() : setTimeout(wait, 40));
        return wait();
      }

      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js";
      s.defer = true;
      s.onload = cb;
      s.onerror = () => {};
      document.body.appendChild(s);
    }

    function normalizeOpts(base) {
      const o = Object.assign(
        {
          touchReleaseOnEdges: true,
          simulateTouch: true,
          observer: true,
          observeParents: true,
          observeSlideChildren: true,
        },
        base || {}
      );

      if (reduceMotion) {
        if (o.autoplay) o.autoplay = false;
        o.speed = Math.min(o.speed || 400, 300);
      }

      return o;
    }

    function getInstance(el) {
      return el ? el._smartSwiperInstance || el.swiper || null : null;
    }

    function getRoot(mainEl, cfg) {
      return (
        (cfg.wrapper && mainEl.closest(cfg.wrapper)) ||
        mainEl.parentElement ||
        document
      );
    }

    function resolveNav(el, cfg) {
      const scope = getRoot(el, cfg);

      const prev = cfg.navPrev
        ? scope.querySelector(cfg.navPrev)
        : scope.querySelector(".swiper-prev");

      const next = cfg.navNext
        ? scope.querySelector(cfg.navNext)
        : scope.querySelector(".swiper-next");

      return { scope, prev, next };
    }

    function withNav(el, cfg, opts) {
      const { prev, next } = resolveNav(el, cfg);
      if (prev || next) {
        opts.navigation = {
          prevEl: prev || null,
          nextEl: next || null,
        };
      }
      return opts;
    }

    function readDataOverrides(el, opts) {
      const over = Object.assign({}, opts);
      const { dataset } = el;

      if ("swiperLoop" in dataset) {
        over.loop = dataset.swiperLoop === "true";
      }

      if ("swiperSpeed" in dataset) {
        over.speed = Math.max(
          0,
          parseInt(dataset.swiperSpeed, 10) || over.speed || 400
        );
      }

      if ("swiperAutoplay" in dataset) {
        if (dataset.swiperAutoplay === "false") {
          over.autoplay = false;
        } else {
          const delay = Math.max(0, parseInt(dataset.swiperAutoplay, 10) || 0);
          over.autoplay = delay ? { delay, disableOnInteraction: true } : false;
        }
      }

      return over;
    }

    function bindEdgeNavHiding(el, swiper, prevEl, nextEl) {
      if (!swiper || el.dataset.edgeNavBound) return;
      el.dataset.edgeNavBound = "1";

      const setHidden = (btn, hidden) => {
        if (!btn) return;
        // btn.style.opacity = hidden ? "0.2" : "";
      };

      const update = () => {
        const locked = !!swiper.isLocked;
        setHidden(prevEl, locked || !!swiper.isBeginning);
        setHidden(nextEl, locked || !!swiper.isEnd);
      };

      update();

      [
        "slideChange",
        "reachBeginning",
        "reachEnd",
        "fromEdge",
        "resize",
        "update",
        "lock",
        "unlock",
      ].forEach((evt) => {
        try {
          swiper.on(evt, update);
        } catch (_) {}
      });
    }

    function resolveScopedEl(mainEl, cfg, selector) {
      const scope = getRoot(mainEl, cfg);
      return scope.querySelector(selector);
    }

    function resolveThumbsEl(mainEl, cfg) {
      if (!cfg.thumbs || !cfg.thumbs.selector) return null;
      return resolveScopedEl(mainEl, cfg, cfg.thumbs.selector);
    }

    function ensureThumbsInit(mainEl, cfg) {
      const thumbsEl = resolveThumbsEl(mainEl, cfg);
      if (!thumbsEl) return null;

      let thumbsSwiper = getInstance(thumbsEl);
      if (thumbsSwiper) return thumbsSwiper;

      const thumbsOpts = normalizeOpts(
        readDataOverrides(thumbsEl, (cfg.thumbs && cfg.thumbs.opts) || {})
      );

      try {
        thumbsSwiper = new Swiper(thumbsEl, thumbsOpts);
        thumbsEl._smartSwiperInstance = thumbsSwiper;
        try {
          thumbsSwiper.update();
          thumbsSwiper.slideTo(0, 0);
        } catch (_) {}
        return thumbsSwiper;
      } catch (_) {
        return null;
      }
    }

    function syncThumbs(mainSwiper, thumbsSwiper) {
      if (!mainSwiper || !thumbsSwiper) return;

      try {
        if (!mainSwiper.thumbs) mainSwiper.thumbs = {};
        mainSwiper.thumbs.swiper = thumbsSwiper;

        if (typeof mainSwiper.thumbs.init === "function") {
          mainSwiper.thumbs.init();
        }
        if (typeof mainSwiper.thumbs.update === "function") {
          mainSwiper.thumbs.update();
        }

        mainSwiper.update();
        thumbsSwiper.update();
      } catch (_) {}
    }

    function repairIfNeeded(el) {
      const cfg = CONFIGS.find((c) => el.matches(c.selector));
      if (!cfg) return;

      const inst = getInstance(el);
      if (!inst) return;

      const { prev, next } = resolveNav(el, cfg);

      try {
        if (cfg.thumbs) {
          const thumbsEl = resolveThumbsEl(el, cfg);
          const thumbsInst =
            (thumbsEl && getInstance(thumbsEl)) || ensureThumbsInit(el, cfg);

          if (thumbsInst) {
            syncThumbs(inst, thumbsInst);
          }
        }
      } catch (_) {}

      if (isDisplayed(el)) {
        try {
          inst.update();
          if (inst.navigation && typeof inst.navigation.update === "function") {
            inst.navigation.update();
          }
        } catch (_) {}
      }

      bindEdgeNavHiding(el, inst, prev, next);
    }

    function initOne(el) {
      if (!el) return;

      const cfg = CONFIGS.find((c) => el.matches(c.selector));
      if (!cfg) return;

      const existing = getInstance(el);
      if (existing) {
        repairIfNeeded(el);
        return;
      }

      if (!isDisplayed(el)) return;

      const opts = withNav(
        el,
        cfg,
        normalizeOpts(readDataOverrides(el, cfg.opts))
      );

      const { prev, next } = resolveNav(el, cfg);

      let thumbsSwiper = null;
      if (cfg.thumbs) {
        thumbsSwiper = ensureThumbsInit(el, cfg);
        if (thumbsSwiper) {
          opts.thumbs = { swiper: thumbsSwiper };
        }
      }

      el.dataset.swiperInited = "1";

      try {
        const swiper = new Swiper(el, opts);
        el._smartSwiperInstance = swiper;

        bindEdgeNavHiding(el, swiper, prev, next);

        if (thumbsSwiper) {
          syncThumbs(swiper, thumbsSwiper);
        }

        try {
          swiper.update();
          if (thumbsSwiper) thumbsSwiper.update();
        } catch (_) {}
      } catch (err) {
        delete el.dataset.swiperInited;
        throw err;
      }
    }

    function scan() {
      const sels = CONFIGS.map((c) => c.selector).join(", ");
      if (!sels) return [];
      return Array.from(document.querySelectorAll(sels));
    }

    function observeAndInit(els) {
      if (!els.length) return;

      els.forEach(initOne);

      if (!hasIO) return;

      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              initOne(e.target);
              obs.unobserve(e.target);
            }
          });
        },
        { rootMargin: "200px 0px" }
      );

      els.forEach((el) => io.observe(el));
    }

    function boot() {
      const els = scan();
      if (!els.length) return;

      ensureCSS();
      ensureJS(() => observeAndInit(els));
    }

    let debounceT;
    function refresh() {
      clearTimeout(debounceT);
      debounceT = setTimeout(() => {
        boot();

        scan().forEach((el) => {
          try {
            repairIfNeeded(el);
          } catch (_) {}
        });
      }, 100);
    }

    function init() {
      const start = () => {
        boot();

        document.addEventListener(
          "click",
          (e) => {
            const link =
              e.target && e.target.closest
                ? e.target.closest(".w-tab-link")
                : null;

            if (!link) return;

            setTimeout(refresh, 60);
            setTimeout(refresh, 180);
            setTimeout(refresh, 320);
          },
          true
        );

        window.addEventListener("resize", refresh, { passive: true });

        Object.defineProperty(window, "athleticSlider", {
          value: Object.freeze({ refresh }),
          writable: false,
          configurable: false,
        });
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
      } else {
        start();
      }
    }

    return Object.freeze({ init, refresh });
  })();

  //-----------------------------------------------------------------------------
  // CLICK ON LOAD (module)
  //-----------------------------------------------------------------------------
  const ClickOnLoad = (() => {
    const DEFAULTS = Object.freeze({
      selector: "[data-click-on-load]",
      clickedAttr: "data-clicked-on-load",
      retryDelays: [0, 50, 200, 800, 2000],
      observeMutations: true,
      mutationDebounce: 120,
      alsoRunOnWindowLoad: true,
      skipAnchorsWithHref: false,
      domReadyDelay: 320,
    });

    const safeDispatchClick = (el) => {
      try {
        el.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          })
        );
      } catch (_) {}
      try {
        if (typeof el.click === "function") el.click();
      } catch (_) {}
    };

    const shouldSkip = (el, cfg) => {
      if (!el || el.nodeType !== 1) return true;
      if (el.hasAttribute(cfg.clickedAttr)) return true;
      if (cfg.skipAnchorsWithHref && el.matches("a[href]")) return true;
      return false;
    };

    const clickOne = (el, cfg) => {
      if (shouldSkip(el, cfg)) return false;
      el.setAttribute(cfg.clickedAttr, "1");
      safeDispatchClick(el);
      return true;
    };

    const clickAll = (cfg, root = document) => {
      const nodes = root.querySelectorAll(
        `${cfg.selector}:not([${cfg.clickedAttr}])`
      );
      nodes.forEach((el) => clickOne(el, cfg));
      return nodes.length;
    };

    const scheduleRetries = (cfg) => {
      cfg.retryDelays.forEach((ms) => setTimeout(() => clickAll(cfg), ms));
    };

    const debounce = (fn, wait) => {
      let t;
      return () => {
        clearTimeout(t);
        t = setTimeout(fn, wait);
      };
    };

    const onWebflowReady = (fn) => {
      if (window.Webflow && Array.isArray(window.Webflow))
        window.Webflow.push(fn);
      else fn();
    };

    const init = (options = {}) => {
      const cfg = Object.assign({}, DEFAULTS, options);

      const start = () => {
        scheduleRetries(cfg);

        if (cfg.observeMutations && "MutationObserver" in window) {
          const recheck = debounce(
            () => scheduleRetries(cfg),
            cfg.mutationDebounce
          );
          const mo = new MutationObserver(recheck);
          mo.observe(document.documentElement, {
            childList: true,
            subtree: true,
          });
          window.__clickOnLoadMO = mo;
        }

        if (cfg.alsoRunOnWindowLoad) {
          window.addEventListener("load", () => scheduleRetries(cfg), {
            once: true,
          });
        }
      };

      const boot = () => {
        setTimeout(() => onWebflowReady(start), cfg.domReadyDelay);
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
      } else {
        boot();
      }
    };

    return Object.freeze({ init });
  })();

  //-----------------------------------------------------------------------------
  // NAV SHRINK ON SCROLL (toggles .is-shrunk on multiple nav wrappers at 5vh)
  //-----------------------------------------------------------------------------
  const NavShrink = (() => {
    function init() {
      const targets = document.querySelectorAll(
        ".g-navigation-w, .s-g-navigation, .sw-g-nav"
      );
      if (!targets.length) return;

      const getThresholdPx = () => window.innerHeight * 0.05; // 5vh
      let thresholdPx = getThresholdPx();

      const update = () => {
        const shouldShrink = window.scrollY >= thresholdPx;
        targets.forEach((el) => el.classList.toggle("is-shrunk", shouldShrink));
      };

      const onResize = () => {
        thresholdPx = getThresholdPx();
        update();
      };

      update();
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
    }

    return { init };
  })();

  //=============================================================================
  // 4) INIT
  //-----------------------------------------------------------------------------
  Utils.onReady(() => {
    const modules = [
      {
        name: "KeyboardIx3ShiftGToggle",
        init: () => KeyboardIx3ShiftGToggle.init(),
      },
      { name: "GoToTop", init: () => GoToTop.init() },
      { name: "SmartSwiper", init: () => SmartSwiper.init() },
      { name: "ClickOnLoad", init: () => ClickOnLoad.init() },
      { name: "NavShrink", init: () => NavShrink.init() },
    ];

    modules.forEach((m) => Utils.run(m.name, m.init));
  });

  //=============================================================================
  // 5) CONSOLE END MESSAGE
  //-----------------------------------------------------------------------------
  try {
    // eslint-disable-next-line no-console
    console.log("%cSite Modules%c ready", START_BADGE, START_BADGE_2);
  } catch (_) {}
})();

//=============================================================================
// 6) LENIS SMOOTH SCROLLING (moved from the footer inline script)
//    Runs at execute time, exactly like the old footer block. Load order is
//    guaranteed by defer: lenis.min.js comes before this file in the footer.
//    `lenis` stays scoped here on purpose — the old footer used a top-level
//    `let`, so window.lenis was never set and GoToTop keeps its native path.
//-----------------------------------------------------------------------------
(() => {
  if (typeof Lenis === "undefined") return; // library missing — fail quiet
  if (window.Webflow?.env?.("editor")) return; // never run inside the Editor

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: "vertical",
    gestureDirection: "vertical",
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });
  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
})();

//=============================================================================
// 7) COUNT-UP COUNTERS (moved from the footer inline script)
//    Animates [data-count-end] elements when they enter the viewport.
//-----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const easings = {
    quad: (t) => 1 - (1 - t) * (1 - t),
    cubic: (t) => 1 - Math.pow(1 - t, 3),
    quart: (t) => 1 - Math.pow(1 - t, 4),
    expo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  };

  function animateCounter(el) {
    if (el.dataset.counted === "true") return;
    el.dataset.counted = "true";

    const target = parseFloat(el.dataset.countEnd ?? el.dataset.countTarget) || 0;
    const start = parseFloat(el.dataset.countStart) || 0;
    const duration = parseInt(el.dataset.countDuration) || 2000;
    const decimals = parseInt(el.dataset.countDecimals) || 0;
    const separator = el.dataset.countSeparator ?? ",";
    const prefix = el.dataset.countPrefix || "";
    const suffix = el.dataset.countSuffix || "";
    const easeFn = easings[el.dataset.countEase] || easings.cubic;

    const startTime = performance.now();

    function format(n) {
      const fixed = n.toFixed(decimals);
      const [int, dec] = fixed.split(".");
      const withSep = separator ? int.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : int;
      return prefix + (dec ? `${withSep}.${dec}` : withSep) + suffix;
    }

    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const value = start + (target - start) * easeFn(t);
      el.textContent = format(value);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCounters() {
    const counters = document.querySelectorAll("[data-count-end]");
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );

    counters.forEach((el) => {
      el.dataset.counted = "false";
      observer.observe(el);
    });
  }

  initCounters();
  window.addEventListener("load", initCounters);
});
