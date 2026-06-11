/* ============================================================
   stuti.design — interactions
   ============================================================ */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   1. Hero flow-diagram canvas
   A static, evenly spaced grid of very faint dots. Near the
   cursor, a sparse subset of dots wakes up and connects into
   user-flow / system-diagram shapes (nodes, connectors,
   arrows). No idle animation — the grid is perfectly still.
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

  const GRID_GAP = 34;          // spacing between grid dots
  const IDLE_ALPHA = 0.14;      // how faint the resting grid is
  const NODE_RATIO = 0.16;      // share of dots that can become flow nodes
  const CONNECT_RADIUS = 240;   // cursor influence radius
  const LINK_DIST = 150;        // max distance between linked nodes
  const MAX_LINKS_PER_NODE = 2;

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

  // deterministic hash so the same grid cell is always the same
  // kind of dot across resizes
  function cellRand(col, row, salt) {
    const n = Math.sin(col * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function spawn() {
    particles = [];
    const cols = Math.ceil(W / GRID_GAP);
    const rows = Math.ceil(H / GRID_GAP);
    const offX = (W - (cols - 1) * GRID_GAP) / 2;
    const offY = (H - (rows - 1) * GRID_GAP) / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isNode = cellRand(col, row, 1) < NODE_RATIO;
        particles.push({
          x: offX + col * GRID_GAP,
          y: offY + row * GRID_GAP,
          isNode,
          shape: SHAPES[Math.floor(cellRand(col, row, 2) * SHAPES.length)],
          energy: 0,            // 0 = idle dot, 1 = active node
        });
      }
    }
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

  function drawIdleGrid() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = `rgba(${WHITE}, ${IDLE_ALPHA})`;
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let resting = false; // grid already drawn static, nothing animating

  function frame() {
    // --- update energy ---
    let totalEnergy = 0;
    for (const p of particles) {
      const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      const target = mouse.active && dist < CONNECT_RADIUS
        ? 1 - dist / CONNECT_RADIUS
        : 0;
      // smooth wake-up / cool-down
      p.energy += (target - p.energy) * (target > p.energy ? 0.1 : 0.05);
      if (p.energy < 0.004) p.energy = 0;
      totalEnergy += p.energy;
    }

    // nothing happening → draw the still grid once and go to sleep
    if (!mouse.active && totalEnergy < 0.01) {
      if (!resting) {
        drawIdleGrid();
        resting = true;
      }
      requestAnimationFrame(frame);
      return;
    }
    resting = false;

    drawIdleGrid();

    // --- flow links between energised node-dots (the "diagram") ---
    const active = particles.filter((p) => p.isNode && p.energy > 0.08);
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
        const alpha = strength * 0.9;
        if (alpha < 0.02) continue;

        ctx.strokeStyle = `rgba(${ORANGE}, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // directional arrow on stronger links → reads as a user flow
        if (strength > 0.3) drawArrow(a.x, a.y, b.x, b.y, alpha * 1.4);
      }
    }

    // --- energised dots bloom into flowchart nodes ---
    for (const p of particles) {
      const e = p.energy;
      if (e < 0.05) continue;

      ctx.fillStyle = `rgba(${ORANGE}, ${Math.min(IDLE_ALPHA + e * 0.75, 0.85)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1 + e * (p.isNode ? 1.4 : 0.5), 0, Math.PI * 2);
      ctx.fill();

      // flowchart node outline blooms as the dot wakes up
      if (p.isNode && e > 0.15) {
        drawNodeShape(p, 4 + e * 5, e * 0.55);
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

  window.addEventListener("resize", () => {
    resize();
    resting = false;
    if (prefersReducedMotion) drawIdleGrid();
  });
  window.addEventListener("mousemove", onMove, { passive: true });
  hero.addEventListener("mouseleave", onLeave);

  resize();
  if (!prefersReducedMotion) {
    requestAnimationFrame(frame);
  } else {
    drawIdleGrid();
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
