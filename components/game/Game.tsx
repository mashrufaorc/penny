"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clamp, fmtMoney, uid } from "@/lib/utils";
import { useGameStore, MONTH_LENGTH_MS } from "@/lib/store";
import type { Task, TaskCategory } from "@/lib/types";
import { Modal } from "@/components/Modal";
import { narrate } from "@/lib/narration";
import { speak } from "@/lib/voice"; // ✅ ElevenLabs TTS

type Vec = { x: number; y: number };

type WorldCoin = { id: string; x: number; y: number; valueCents: number };
type LandmarkType = "bank" | "snack" | "shop" | "play" | "home";

type Landmark = {
  id: string;
  type: LandmarkType;
  x: number;
  y: number;
  radius: number;
  sprite: string;
  label: string;
};

type TaskPickup = {
  id: string;
  x: number;
  y: number;
  taskId: string;
  category: TaskCategory;
  sprite: string;
};

const CANVAS_H = 720;
const CANVAS_W = 1100;

const WORLD_W = 3200;
const WORLD_H = 2200;

const PLAYER_BASE_RADIUS = 18;
const COIN_VALUES = [25, 50, 100, 200];

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dist(a: Vec, b: Vec) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function msToClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function radiusFromTotalCents(total: number) {
  const dollars = total / 100;
  return clamp(
    PLAYER_BASE_RADIUS + Math.sqrt(Math.max(0, dollars)) * 2.6,
    14,
    70
  );
}

function speedFromRadius(r: number) {
  return clamp(260 - (r - 18) * 2.4, 120, 260);
}

function spriteForTask(category: TaskCategory) {
  switch (category) {
    case "rent":
      return "/assets/sprites/landmarks/home.png";
    case "food":
      return "/assets/sprites/landmarks/snack.png";
    case "home":
      return "/assets/sprites/landmarks/shop.png";
    case "furniture":
      return "/assets/sprites/landmarks/shop.png";
    case "transport":
      return "/assets/sprites/landmarks/shop.png";
    case "fun":
      return "/assets/sprites/landmarks/play.png";
    case "bills":
      return "/assets/sprites/landmarks/bank.png";
    default:
      return "/assets/sprites/landmarks/shop.png";
  }
}

const FALLBACK_TASKS: Omit<Task, "id" | "dueAt" | "createdAt" | "status">[] = [
  {
    title: "Pay Rent",
    category: "rent",
    costCents: 2200,
    prompt:
      "It’s rent day! Pay your rent to keep your home happy and your budget steady.",
    hint: "Put money in chequing before paying.",
  },
  {
    title: "Grocery Run",
    category: "food",
    costCents: 650,
    prompt: "You need groceries for the week. Can you stay within your budget?",
    hint: "Needs first, wants later.",
  },
  {
    title: "Bus Pass",
    category: "transport",
    costCents: 500,
    prompt: "Get a bus pass so you can travel around town.",
    hint: "Transportation is a monthly expense.",
  },
  {
    title: "Phone Bill",
    category: "bills",
    costCents: 750,
    prompt: "Your phone bill is due. Missing it can add a fee.",
    hint: "Bills have deadlines — check due dates.",
  },
  {
    title: "Snack Treat",
    category: "fun",
    costCents: 300,
    prompt: "A fun snack treat! It’s optional, but it costs money.",
    hint: "Wants are okay — just plan for them.",
  },
];

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTsRef = useRef<number>(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const pointerRef = useRef<Vec | null>(null);
  const rafRef = useRef<number | null>(null);

  const {
    chequingCents,
    savingsCents,
    deposit,
    withdraw,
    tasks,
    upsertTasks,
    markTask,
    closeMonth,
    monthStartTs,
    monthIndex,
  } = useGameStore();

  // --- keep refs to avoid restarting RAF on state changes ---
  const coinsRef = useRef<WorldCoin[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const taskPickupsRef = useRef<TaskPickup[]>([]);
  const cheqRef = useRef<number>(chequingCents);
  const savRef = useRef<number>(savingsCents);
  const monthStartRef = useRef<number>(monthStartTs);
  const monthIndexRef = useRef<number>(monthIndex);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    cheqRef.current = chequingCents;
    savRef.current = savingsCents;
  }, [chequingCents, savingsCents]);

  useEffect(() => {
    monthStartRef.current = monthStartTs;
    monthIndexRef.current = monthIndex;
  }, [monthStartTs, monthIndex]);

  const [coins, setCoins] = useState<WorldCoin[]>([]);
  const [taskPickups, setTaskPickups] = useState<TaskPickup[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [coachModalOpen, setCoachModalOpen] = useState(false);
  const [coachText, setCoachText] = useState<string>("");
  const [coachLoading, setCoachLoading] = useState(false);

  const [monthEndsIn, setMonthEndsIn] = useState<number>(() => {
    return Math.max(0, monthStartTs + MONTH_LENGTH_MS - Date.now());
  });
  const monthClosedRef = useRef(false);

  const [landmarks] = useState<Landmark[]>(() => [
    {
      id: "lm_bank",
      type: "bank",
      x: 520,
      y: 420,
      radius: 70,
      sprite: "/assets/sprites/landmarks/bank.png",
      label: "Bank",
    },
    {
      id: "lm_snack",
      type: "snack",
      x: 2400,
      y: 500,
      radius: 70,
      sprite: "/assets/sprites/landmarks/snack.png",
      label: "Snack",
    },
    {
      id: "lm_shop",
      type: "shop",
      x: 650,
      y: 1750,
      radius: 70,
      sprite: "/assets/sprites/landmarks/shop.png",
      label: "Shop",
    },
    {
      id: "lm_play",
      type: "play",
      x: 2500,
      y: 1750,
      radius: 70,
      sprite: "/assets/sprites/landmarks/play.png",
      label: "Play",
    },
    {
      id: "lm_home",
      type: "home",
      x: 1550,
      y: 1150,
      radius: 80,
      sprite: "/assets/sprites/landmarks/home.png",
      label: "Home",
    },
  ]);

  const playerRef = useRef({
    x: WORLD_W * 0.45,
    y: WORLD_H * 0.55,
    vx: 0,
    vy: 0,
    radius: PLAYER_BASE_RADIUS,
    growthCents: 0,
  });

  const camRef = useRef({ x: 0, y: 0 });
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});

  // --- Init coins ONCE ---
  useEffect(() => {
    const initial: WorldCoin[] = [];
    for (let i = 0; i < 220; i++) {
      initial.push({
        id: uid("coin"),
        x: Math.random() * WORLD_W,
        y: Math.random() * WORLD_H,
        valueCents: pick(COIN_VALUES),
      });
    }
    coinsRef.current = initial;
    setCoins(initial);
  }, []);

  // --- Load sprites ---
  useEffect(() => {
    const paths = [
      "/assets/sprites/player/coin_idle.png",
      "/assets/sprites/coins/coin_1.png",
      "/assets/sprites/coins/coin_2.png",
      "/assets/sprites/coins/coin_3.png",
      "/assets/sprites/landmarks/bank.png",
      "/assets/sprites/landmarks/snack.png",
      "/assets/sprites/landmarks/shop.png",
      "/assets/sprites/landmarks/play.png",
      "/assets/sprites/landmarks/home.png",
    ];

    const map: Record<string, HTMLImageElement> = {};
    let cancelled = false;

    (async () => {
      await Promise.all(
        paths.map(
          (src) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.src = src;
              img.onload = () => resolve();
              img.onerror = () => resolve();
              map[src] = img;
            })
        )
      );
      if (!cancelled) spritesRef.current = map;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- Controls ---
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      keysRef.current[e.key.toLowerCase()] = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      keysRef.current[e.key.toLowerCase()] = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onMove(e: PointerEvent) {
      const c = canvasRef.current;
      if (!c) {
        pointerRef.current = null;
        return;
      }
      const rect = c.getBoundingClientRect();
      pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onLeave() {
      pointerRef.current = null;
    }

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // --- Live month countdown + auto close month ---
  useEffect(() => {
    monthClosedRef.current = false;

    const id = setInterval(() => {
      const ms = Math.max(
        0,
        monthStartRef.current + MONTH_LENGTH_MS - Date.now()
      );
      setMonthEndsIn(ms);

      if (ms <= 0 && !monthClosedRef.current) {
        monthClosedRef.current = true;
        narrate("Month ended! Let's look at your results.");
        closeMonth();
      }
    }, 250);

    return () => clearInterval(id);
  }, [closeMonth, monthStartTs, monthIndex]);

  // --- Spawn tasks at the START of EACH month ---
  useEffect(() => {
    setSelectedTaskId(null);
    setTaskModalOpen(false);
    setCoachModalOpen(false);
    setCoachText("");

    async function spawnMonthlyTasks() {
      try {
        const res = await fetch("/api/gemini/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthIndex: monthIndexRef.current,
            difficulty: "easy",
          }),
        });

        if (!res.ok) throw new Error("No AI tasks");
        const j = await res.json();

        const now = Date.now();
        const monthEnd = monthStartRef.current + MONTH_LENGTH_MS;

        const normalized: Task[] = (j?.tasks || [])
          .slice(0, 8)
          .map((t: any, idx: number) => {
            const createdAt = now;
            const spread = Math.floor((idx + 1) * (MONTH_LENGTH_MS / 7));
            const dueAt = clamp(
              monthStartRef.current + spread,
              now + 30_000,
              monthEnd
            );

            return {
              id: String(t.id || uid("task")),
              title: String(t.title || "Task"),
              category: (t.category || "bills") as TaskCategory,
              costCents: Number(t.costCents || 300),
              prompt: String(t.prompt || "Complete this task."),
              hint: String(t.hint || "Think before you spend."),
              status: "open",
              createdAt,
              dueAt,
            } as Task;
          });

        upsertTasks(normalized);
        narrate("New month tasks are ready. Walk around to find them!");
      } catch {
        const now = Date.now();
        const monthEnd = monthStartRef.current + MONTH_LENGTH_MS;

        const fallback = FALLBACK_TASKS.map((t, idx) => {
          const spread = Math.floor((idx + 1) * (MONTH_LENGTH_MS / 7));
          const dueAt = clamp(
            monthStartRef.current + spread,
            now + 30_000,
            monthEnd
          );

          return {
            id: uid("task"),
            title: t.title,
            category: t.category,
            costCents: t.costCents,
            dueAt,
            prompt: t.prompt,
            hint: t.hint,
            status: "open" as const,
            createdAt: now,
          };
        });

        upsertTasks(fallback);
        narrate("Tasks loaded. Walk around to find them!");
      }
    }

    spawnMonthlyTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStartTs, monthIndex]);

  // --- Build pickups whenever tasks change (open tasks only) ---
  useEffect(() => {
    const openTasks = tasks.filter((t) => t.status === "open");

    const pickups: TaskPickup[] = openTasks.map((t) => ({
      id: uid("pickup"),
      x: 350 + Math.random() * (WORLD_W - 700),
      y: 350 + Math.random() * (WORLD_H - 700),
      taskId: t.id,
      category: t.category,
      sprite: spriteForTask(t.category),
    }));

    taskPickupsRef.current = pickups;
    setTaskPickups(pickups);
  }, [tasks]);

  // --- Animation loop (ONE TIME) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function tick(ts: number) {
      const last = lastTsRef.current || ts;
      lastTsRef.current = ts;
      const dt = Math.min(0.033, (ts - last) / 1000);

      step(dt);
      render(ctx);

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function step(dt: number) {
    const p = playerRef.current;

    const total = cheqRef.current + savRef.current;
    const targetRadius = radiusFromTotalCents(total + p.growthCents);
    p.radius = lerp(p.radius, targetRadius, clamp(dt * 4, 0, 1));

    const speed = speedFromRadius(p.radius);

    let ax = 0,
      ay = 0;

    const k = keysRef.current;
    if (k["w"] || k["arrowup"]) ay -= 1;
    if (k["s"] || k["arrowdown"]) ay += 1;
    if (k["a"] || k["arrowleft"]) ax -= 1;
    if (k["d"] || k["arrowright"]) ax += 1;

    if (pointerRef.current) {
      const cx = CANVAS_W / 2;
      const cy = CANVAS_H / 2;
      const dx = pointerRef.current.x - cx;
      const dy = pointerRef.current.y - cy;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;
      const dead = 12;
      const m2 = Math.max(0, mag - dead);
      ax = (dx / mag) * (m2 / mag);
      ay = (dy / mag) * (m2 / mag);
    } else {
      const mag = Math.sqrt(ax * ax + ay * ay) || 1;
      ax /= mag;
      ay /= mag;
    }

    const desiredVx = ax * speed;
    const desiredVy = ay * speed;
    p.vx = lerp(p.vx, desiredVx, clamp(dt * 6, 0, 1));
    p.vy = lerp(p.vy, desiredVy, clamp(dt * 6, 0, 1));
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.x = clamp(p.x, p.radius, WORLD_W - p.radius);
    p.y = clamp(p.y, p.radius, WORLD_H - p.radius);

    const cam = camRef.current;
    cam.x = lerp(cam.x, p.x - CANVAS_W / 2, clamp(dt * 5, 0, 1));
    cam.y = lerp(cam.y, p.y - CANVAS_H / 2, clamp(dt * 5, 0, 1));
    cam.x = clamp(cam.x, 0, WORLD_W - CANVAS_W);
    cam.y = clamp(cam.y, 0, WORLD_H - CANVAS_H);

    const pPos = { x: p.x, y: p.y };

    // Collect coins
    const collected: string[] = [];
    for (const c of coinsRef.current) {
      if (dist(pPos, c) < p.radius + 12) collected.push(c.id);
    }
    if (collected.length) {
      const earned = coinsRef.current
        .filter((c) => collected.includes(c.id))
        .reduce((acc, c) => acc + c.valueCents, 0);

      deposit("chequing", earned, "Collected coins", "income");
      p.growthCents += Math.round(earned * 0.35);

      const kept = coinsRef.current.filter((c) => !collected.includes(c.id));
      for (let i = 0; i < collected.length; i++) {
        kept.push({
          id: uid("coin"),
          x: Math.random() * WORLD_W,
          y: Math.random() * WORLD_H,
          valueCents: pick(COIN_VALUES),
        });
      }
      coinsRef.current = kept;
      setCoins(kept);
    }

    // Touch a task pickup
    const hitPickup = taskPickupsRef.current.find(
      (tp) => dist(pPos, tp) < p.radius + 26
    );
    if (hitPickup) {
      setSelectedTaskId(hitPickup.taskId);
      setTaskModalOpen(true);

      const next = taskPickupsRef.current.filter((x) => x.id !== hitPickup.id);
      taskPickupsRef.current = next;
      setTaskPickups(next);
    }

    // Expire tasks
    const now = Date.now();
    for (const t of tasksRef.current) {
      if (t.status === "open" && now > t.dueAt) {
        markTask(t.id, "failed");
        p.growthCents -= Math.round(t.costCents * 0.2);
      }
    }
  }

  function drawSpriteCentered(
    ctx: CanvasRenderingContext2D,
    src: string,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const img = spritesRef.current[src];
    if (img && img.complete) {
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    } else {
      ctx.fillStyle = "rgba(242,181,68,0.9)";
      ctx.beginPath();
      ctx.arc(x, y, Math.min(w, h) / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string
  ) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  function drawHud(ctx: CanvasRenderingContext2D) {
    const pad = 16;
    const w = 360;
    const h = 160;

    ctx.save();
    ctx.globalAlpha = 0.92;
    roundRect(ctx, pad, pad, w, h, 18, "#ffffff");
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#4A2A1B";
    ctx.font = "900 18px ui-sans-serif";
    ctx.fillText(`Month #${monthIndexRef.current}`, pad + 18, pad + 30);

    ctx.font = "700 14px ui-sans-serif";
    ctx.fillStyle = "rgba(74,42,27,0.75)";
    ctx.fillText(`Ends in: ${msToClock(monthEndsIn)}`, pad + 18, pad + 55);

    ctx.font = "900 16px ui-sans-serif";
    ctx.fillStyle = "#4A2A1B";
    ctx.fillText(`Chequing: ${fmtMoney(cheqRef.current)}`, pad + 18, pad + 84);
    ctx.fillText(`Savings: ${fmtMoney(savRef.current)}`, pad + 18, pad + 110);

    const open = tasksRef.current.filter((t) => t.status === "open").length;
    const paid = tasksRef.current.filter((t) => t.status === "paid").length;
    const failed = tasksRef.current.filter((t) => t.status === "failed").length;

    ctx.font = "700 13px ui-sans-serif";
    ctx.fillStyle = "rgba(74,42,27,0.75)";
    ctx.fillText(
      `Tasks — open ${open} • paid ${paid} • missed ${failed}`,
      pad + 18,
      pad + 136
    );

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.94;
    roundRect(ctx, 16, CANVAS_H - 64, CANVAS_W - 32, 48, 16, "#ffffff");
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(74,42,27,0.85)";
    ctx.font = "800 14px ui-sans-serif";
    ctx.fillText(
      "Move: mouse (Agar-style) or WASD • Collect coins • Touch icons to open tasks",
      32,
      CANVAS_H - 34
    );
    ctx.restore();
  }

  function render(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    g.addColorStop(0, "#BFF2F2");
    g.addColorStop(1, "#FFF3D6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const cam = camRef.current;

    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#4A2A1B";
    for (let i = 0; i < 700; i++) {
      const x = (i * 137) % WORLD_W;
      const y = (i * 251) % WORLD_H;
      ctx.beginPath();
      ctx.arc(x, y, (i % 3) + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    ctx.strokeStyle = "rgba(74,42,27,0.25)";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, WORLD_W - 24, WORLD_H - 24);

    for (const lm of landmarks) {
      drawSpriteCentered(
        ctx,
        lm.sprite,
        lm.x,
        lm.y,
        lm.radius * 2,
        lm.radius * 2
      );
      ctx.fillStyle = "rgba(74,42,27,0.85)";
      ctx.font = "900 20px ui-sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(lm.label, lm.x, lm.y + lm.radius + 26);
    }

    for (const c of coinsRef.current) {
      const sprite =
        c.valueCents >= 200
          ? "/assets/sprites/coins/coin_3.png"
          : c.valueCents >= 100
          ? "/assets/sprites/coins/coin_2.png"
          : "/assets/sprites/coins/coin_1.png";
      drawSpriteCentered(ctx, sprite, c.x, c.y, 28, 28);
    }

    for (const tp of taskPickupsRef.current) {
      drawSpriteCentered(ctx, tp.sprite, tp.x, tp.y, 64, 64);
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 42, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(242,181,68,0.35)";
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    const p = playerRef.current;
    const size = p.radius * 2.2;
    drawSpriteCentered(
      ctx,
      "/assets/sprites/player/coin_idle.png",
      p.x,
      p.y,
      size,
      size
    );

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(74,42,27,0.18)";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.restore();

    drawHud(ctx);
  }

  async function paySelectedTask() {
    if (!selectedTask) return;

    const ok = withdraw(
      "chequing",
      selectedTask.costCents,
      selectedTask.title,
      selectedTask.category === "rent"
        ? "rent"
        : selectedTask.category === "food"
        ? "food"
        : "other"
    );

    if (!ok) {
      narrate("Not enough money in chequing. Try transferring from savings.");
      return;
    }

    markTask(selectedTask.id, "paid");
    playerRef.current.growthCents += Math.round(selectedTask.costCents * 0.25);

    narrate(`Nice! You paid: ${selectedTask.title}.`);

    setTaskModalOpen(false);
    setSelectedTaskId(null);
  }

  async function askCoach() {
    if (!selectedTask) return;

    setCoachLoading(true);
    setCoachModalOpen(true);
    setCoachText("");

    try {
      const context = `
Task: ${selectedTask.title}
Category: ${selectedTask.category}
Cost: $${(selectedTask.costCents / 100).toFixed(2)}
Hint: ${selectedTask.hint}

Balances:
Chequing: $${(chequingCents / 100).toFixed(2)}
Savings: $${(savingsCents / 100).toFixed(2)}

What should I do next to pay this on time? Teach 1-2 terms.
`.trim();

      const res = await fetch("/api/gemini/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });

      const text = await res.text();

      let j: any;
      try {
        j = JSON.parse(text);
      } catch {
        throw new Error(text || "Server returned an invalid response.");
      }

      if (!res.ok) throw new Error(j?.error || "AI coach unavailable.");

      const advice = String(j.advice || "No advice returned.");
      setCoachText(advice);
      narrate("Here's a tip from your money coach.");

      // ✅ ElevenLabs reads it out loud
      speak(advice);
    } catch (e: any) {
      setCoachText(e?.message ?? "Coach unavailable.");
    } finally {
      setCoachLoading(false);
    }
  }

  const openTasks = tasks
    .filter((t) => t.status === "open")
    .sort((a, b) => a.dueAt - b.dueAt);

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <div className="penny-card p-3">
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-2">
            <img
              src="/assets/sprites/player/coin_idle.png"
              className="h-10 w-10"
              alt="Penny"
            />
            <div>
              <div className="font-extrabold">Penny World</div>
              <div className="text-xs text-penny-brown/70">
                Agar-style movement • collect & pay tasks
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="penny-btn bg-white"
              onClick={() => {
                closeMonth();
                narrate("Month closed. Check your bank statement!");
              }}
            >
              End Month
            </button>
          </div>
        </div>

        <div className="rounded-xl2 overflow-hidden border border-black/5 bg-white">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block w-full h-auto"
          />
        </div>
      </div>

      <div className="penny-card p-4">
        <div className="text-lg font-extrabold">Tasks</div>
        <div className="text-sm text-penny-brown/70">
          Touch icons in the world to open them.
        </div>

        <div className="mt-3 space-y-3 max-h-[670px] overflow-auto pr-1">
          {openTasks.map((t) => {
            const msLeft = t.dueAt - Date.now();
            const urgent = msLeft < 45_000;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTaskId(t.id);
                  setTaskModalOpen(true);
                }}
                className="w-full text-left p-3 rounded-xl2 bg-white border border-black/5 hover:brightness-105"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-extrabold">{t.title}</div>
                    <div className="text-xs text-penny-brown/70 capitalize">
                      {t.category}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black">{fmtMoney(t.costCents)}</div>
                    <div
                      className={
                        "text-xs font-semibold " +
                        (urgent ? "text-red-600" : "text-penny-brown/70")
                      }
                    >
                      {msLeft > 0 ? `Due: ${msToClock(msLeft)}` : "OVERDUE"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-penny-brown/70">{t.hint}</div>
              </button>
            );
          })}

          {openTasks.length === 0 ? (
            <div className="p-3 rounded-xl2 bg-white border border-black/5 text-sm text-penny-brown/70">
              No open tasks right now. Wait for next month or end the month
              early.
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={taskModalOpen && !!selectedTask}
        title={
          selectedTask
            ? `${selectedTask.title} — ${fmtMoney(selectedTask.costCents)}`
            : "Task"
        }
        onClose={() => {
          setTaskModalOpen(false);
          setSelectedTaskId(null);
        }}
        footer={
          selectedTask ? (
            <>
              <button className="penny-btn bg-white" onClick={askCoach}>
                Ask Coach (Gemini)
              </button>
              <button className="penny-btn" onClick={paySelectedTask}>
                Pay from Chequing
              </button>
            </>
          ) : null
        }
      >
        {selectedTask ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl2 bg-penny-tan/30 border border-black/5">
              <div className="font-bold">Scenario</div>
              <div className="text-sm text-penny-brown/80 mt-1">
                {selectedTask.prompt}
              </div>
            </div>

            <div className="text-sm text-penny-brown/80">
              <span className="font-extrabold">Hint:</span> {selectedTask.hint}
            </div>

            <div className="text-sm text-penny-brown/80">
              <span className="font-extrabold">Tip:</span> If you can’t pay,
              transfer from Savings on the Bank Home page.
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={coachModalOpen}
        title={"Money Coach"}
        onClose={() => setCoachModalOpen(false)}
        footer={
          coachText && !coachLoading ? (
            <button className="penny-btn bg-white" onClick={() => speak(coachText)}>
              🔊 Hear again
            </button>
          ) : null
        }
      >
        {coachLoading ? (
          <div className="text-sm text-penny-brown/70">Thinking…</div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-penny-brown/80 bg-white rounded-xl2 border border-black/5 p-4">
            {coachText}
          </pre>
        )}
      </Modal>
    </div>
  );
}
