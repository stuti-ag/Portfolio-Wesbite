/* ============================================================
   stuti.design — interactions
   ============================================================ */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   1. Hero flow-diagram canvas
   Small drifting dots; near the cursor they wake up and
   connect into user-flow / system-diagram shapes (nodes,
   connectors, arrows, labels).
   ============================================================ */
(function heroCanvas() {
  const canvas = document.getElementById("flow-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const hero = document.getElementById("hero");

  let W = 0, H = 0, dpr = 1;
  let particles = [];
  const mouse = { x: -9999, y: -9999, active: false };

  const ORANGE = "255, 106, 43";
  const WHITE = "237, 237, 238";

  const CONNECT_RADIUS = 260;   // cursor influence radius
  const LINK_DIST = 190;        // max distance between linked nodes
  const MAX_LINKS_PER_NODE = 3;

  // Node archetypes — evoke flowchart vocabulary
  const SHAPES = ["circle", "circle", "circle", "square", "diamond"];

  function resize() {
    const rect = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spawn();
  }

  function spawn() {
    const count = Math.max(34, Math.min(72, Math.floor((W * H) / 26000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: 1.1 + Math.random() * 1.5,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      phase: Math.random() * Math.PI * 2,     // twinkle offset
      energy: 0,                              // 0 = idle dot, 1 = active node
    }));
  }

  function drawNodeShape(p, size, alpha) {
    ctx.strokeStyle = `rgba(${ORANGE}, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (p.shape === "square") {
      ctx.rect(p.x - size, p.y - size, size * 2, size * 2);
    } else if (p.shape === "diamond") {
      ctx.moveTo(p.x, p.y - size * 1.25);
      ctx.lineTo(p.x + size * 1.25, p.y);
      ctx.lineTo(p.x, p.y + size * 1.25);
      ctx.lineTo(p.x - size * 1.25, p.y);
      ctx.closePath();
    } else {
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  function drawArrow(ax, ay, bx, by, alpha) {
    const mx = ax + (bx - ax) * 0.56;
    const my = ay + (by - ay) * 0.56;
    const angle = Math.atan2(by - ay, bx - ax);
    const s = 4;
    ctx.fillStyle = `rgba(${ORANGE}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(mx + Math.cos(angle) * s, my + Math.sin(angle) * s);
    ctx.lineTo(mx + Math.cos(angle + 2.5) * s, my + Math.sin(angle + 2.5) * s);
    ctx.lineTo(mx + Math.cos(angle - 2.5) * s, my + Math.sin(angle - 2.5) * s);
    ctx.closePath();
    ctx.fill();
  }

  let t = 0;

  function frame() {
    t += 0.016;
    ctx.clearRect(0, 0, W, H);

    // --- update particles ---
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;

      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      const target = mouse.active && dist < CONNECT_RADIUS
        ? 1 - dist / CONNECT_RADIUS
        : 0;
      // smooth wake-up / cool-down
      p.energy += (target - p.energy) * (target > p.energy ? 0.08 : 0.035);
    }

    // --- links between energised nodes (the "diagram") ---
    const active = particles.filter((p) => p.energy > 0.06);
    const linkCount = new Map();

    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      // collect candidate neighbours, nearest first
      const neighbours = [];
      for (let j = i + 1; j < active.length; j++) {
        const b = active[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK_DIST && d > 18) neighbours.push([d, b]);
      }
      neighbours.sort((m, n) => m[0] - n[0]);

      for (const [d, b] of neighbours) {
        const la = linkCount.get(a) || 0;
        const lb = linkCount.get(b) || 0;
        if (la >= MAX_LINKS_PER_NODE || lb >= MAX_LINKS_PER_NODE) continue;
        linkCount.set(a, la + 1);
        linkCount.set(b, lb + 1);

        const strength = Math.min(a.energy, b.energy) * (1 - d / LINK_DIST);
        const alpha = strength * 0.8;
        if (alpha < 0.02) continue;

        ctx.strokeStyle = `rgba(${ORANGE}, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // directional arrow on stronger links → reads as a user flow
        if (strength > 0.32) drawArrow(a.x, a.y, b.x, b.y, alpha * 1.4);
      }
    }

    // --- dots / nodes ---
    for (const p of particles) {
      const twinkle = 0.55 + 0.45 * Math.sin(t * 0.8 + p.phase);
      const idleAlpha = 0.16 + twinkle * 0.14;
      const e = p.energy;

      // base dot
      const dotAlpha = idleAlpha + e * 0.7;
      ctx.fillStyle = e > 0.25
        ? `rgba(${ORANGE}, ${dotAlpha})`
        : `rgba(${WHITE}, ${dotAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + e * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // flowchart node outline blooms as the dot wakes up
      if (e > 0.18) {
        const ring = (p.r + 3) + e * 6;
        drawNodeShape(p, ring, e * 0.5);
      }
    }

    requestAnimationFrame(frame);
  }

  function onMove(e) {
    const rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = mouse.y >= 0 && mouse.y <= rect.height;
  }

  function onLeave() {
    mouse.active = false;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", onMove, { passive: true });
  hero.addEventListener("mouseleave", onLeave);

  resize();
  if (!prefersReducedMotion) {
    requestAnimationFrame(frame);
  } else {
    // static dots only
    for (const p of particles) {
      ctx.fillStyle = `rgba(${WHITE}, 0.22)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
})();

/* ============================================================
   2. Scroll reveal
   ============================================================ */
(function scrollReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // tiny stagger for siblings revealed in the same batch
          entry.target.style.transitionDelay = `${Math.min(i * 70, 280)}ms`;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  els.forEach((el) => io.observe(el));
})();

/* ============================================================
   3. Nav background on scroll
   ============================================================ */
(function navScroll() {
  const nav = document.getElementById("nav");
  const update = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
  window.addEventListener("scroll", update, { passive: true });
  update();
})();

/* ============================================================
   4. Count-up stats
   ============================================================ */
(function countUp() {
  const nums = document.querySelectorAll("[data-count]");
  if (!nums.length) return;

  const animate = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (prefersReducedMotion) { el.textContent = target; return; }
    const dur = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  nums.forEach((el) => io.observe(el));
})();

/* ============================================================
   5. Magnetic buttons
   ============================================================ */
(function magnetic() {
  if (prefersReducedMotion || !window.matchMedia("(pointer: fine)").matches) return;
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const strength = 0.22;
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  });
})();

/* ============================================================
   6. Cursor glow follows pointer
   ============================================================ */
(function cursorGlow() {
  const glow = document.querySelector(".cursor-glow");
  if (!glow || prefersReducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

  let gx = -9999, gy = -9999, tx = -9999, ty = -9999;
  let shown = false;

  window.addEventListener("mousemove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!shown) {
      gx = tx; gy = ty;
      glow.style.opacity = "1";
      shown = true;
    }
  }, { passive: true });

  (function follow() {
    gx += (tx - gx) * 0.08;
    gy += (ty - gy) * 0.08;
    glow.style.left = gx + "px";
    glow.style.top = gy + "px";
    requestAnimationFrame(follow);
  })();
})();
