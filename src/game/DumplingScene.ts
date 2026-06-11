import Phaser from "phaser";
import type { RunStats } from "../types";
import { sfx, startMusic, stopMusic } from "./sounds";

export type SceneConfig = {
  playerName: string;
  skin: string;
  trail: string;
  background: string;
  onGameOver: (stats: RunStats) => void;
};

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 640;

const SKIN_COLORS: Record<string, { body: number; blush: number; ears: boolean; horn: boolean }> = {
  classic: { body: 0xfff4e6, blush: 0xffb7c5, ears: false, horn: false },
  pink: { body: 0xffd6e7, blush: 0xff8fb3, ears: false, horn: false },
  cat: { body: 0xffe9c7, blush: 0xffb7c5, ears: true, horn: false },
  rainbow: { body: 0xe7d6ff, blush: 0xff9ad5, ears: false, horn: false },
  golden: { body: 0xffe27a, blush: 0xffb347, ears: false, horn: false },
  unicorn: { body: 0xf6ecff, blush: 0xd9b8ff, ears: false, horn: true },
};

const TRAIL_COLORS: Record<string, number[]> = {
  sparkle: [0xfff3a0, 0xffffff],
  heart: [0xff9ad5, 0xff6fa5],
  boba: [0x9a6a4f, 0xc89b7b],
  rainbow: [0xff9aa2, 0xffd3a0, 0xfff3a0, 0xa0e7a0, 0xa0c8ff, 0xd2a0ff],
  steam: [0xffffff, 0xe6f7ff],
};

const BG_COLORS: Record<string, { top: number; bottom: number; dark: boolean }> = {
  cloud: { top: 0xffe6f0, bottom: 0xe6f7ff, dark: false },
  bamboo: { top: 0xe2f7e0, bottom: 0xc9eec0, dark: false },
  candy: { top: 0xffe0ef, bottom: 0xfff0d8, dark: false },
  teahouse: { top: 0xe8e0ff, bottom: 0xffe0f5, dark: false },
  moonlight: { top: 0x35306b, bottom: 0x6a5acd, dark: true },
};

type Collectible = Phaser.Physics.Arcade.Image & {
  kind?: "star" | "heart" | "boba" | "golden";
};

export class DumplingScene extends Phaser.Scene {
  private cfg!: SceneConfig;
  private bao!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private startText!: Phaser.GameObjects.Text;
  private trailTimer = 0;

  private mode: "flappy" | "invaders" = "flappy";
  private bullets!: Phaser.Physics.Arcade.Group;
  private invaders!: Phaser.Physics.Arcade.Group;
  private fireTimer?: Phaser.Time.TimerEvent;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private aimAngle = -Math.PI / 2; // space mode aim, starts pointing up

  private started = false;
  private over = false;
  private runScore = 0;
  private collected = 0;
  private combo = 0;
  private maxCombo = 0;
  private golden = false;
  private startTime = 0;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private speed = 140;
  private gap = 230;

  constructor() {
    super("dumpling");
  }

  init(cfg: SceneConfig) {
    this.cfg = cfg;
    this.mode = "flappy";
    this.aimAngle = -Math.PI / 2;
    this.started = false;
    this.over = false;
    this.runScore = 0;
    this.collected = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.golden = false;
    this.speed = 140;
    this.gap = 230;
  }

  create() {
    this.makeTextures();
    this.drawBackground();

    this.bao = this.physics.add.sprite(110, GAME_HEIGHT / 2, "bao");
    this.bao.setCircle(26, 6, 8);
    this.bao.setDepth(10);
    (this.bao.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // idle float
    this.tweens.add({
      targets: this.bao,
      y: this.bao.y - 14,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.collectibles = this.physics.add.group({ allowGravity: false });
    this.bullets = this.physics.add.group({ allowGravity: false });
    this.invaders = this.physics.add.group({ allowGravity: false });

    const dark = BG_COLORS[this.cfg.background]?.dark;
    const textColor = dark ? "#ffffff" : "#7a5c6e";

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 56, "0", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "52px",
        fontStyle: "bold",
        color: textColor,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setShadow(0, 2, "rgba(0,0,0,0.15)", 4);

    this.infoText = this.add
      .text(GAME_WIDTH / 2, 96, `${this.cfg.playerName}  ·  ✨ 0  ·  combo x0`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: textColor,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, "Byrdman's Squishy Dumpling Dash", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: textColor,
      })
      .setOrigin(0.5)
      .setAlpha(0.55)
      .setDepth(20);

    this.startText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, "tap to bounce!", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "26px",
        fontStyle: "bold",
        color: textColor,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: this.startText,
      alpha: 0.4,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.physics.add.overlap(this.bao, this.obstacles, () => this.endRun());
    this.physics.add.overlap(this.bao, this.collectibles, (_b, c) =>
      this.collect(c as Collectible)
    );
    this.physics.add.overlap(this.bullets, this.invaders, (b, inv) =>
      this.killInvader(
        b as Phaser.Physics.Arcade.Image,
        inv as Phaser.Physics.Arcade.Image
      )
    );
    this.physics.add.overlap(this.bao, this.invaders, () => this.endRun());

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.mode === "invaders" && !this.over) {
        this.aimAt(p.x, p.y);
      }
      this.flap();
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.mode === "invaders" && !this.over) {
        this.aimAt(p.x, p.y);
      }
    });
    this.input.keyboard?.on("keydown-SPACE", () => this.flap());
    this.cursors = this.input.keyboard?.createCursorKeys();
  }

  private makeTextures() {
    const skin = SKIN_COLORS[this.cfg.skin] ?? SKIN_COLORS.classic;

    // bao
    if (this.textures.exists("bao")) this.textures.remove("bao");
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // bold dark outline so the bao reads clearly on pastel backgrounds
    const outline = 0x6e4a3f;
    g.fillStyle(skin.body, 1);
    g.lineStyle(3, outline, 1);
    if (skin.ears) {
      g.fillTriangle(12, 20, 22, 4, 28, 20);
      g.strokeTriangle(12, 20, 22, 4, 28, 20);
      g.fillTriangle(36, 20, 42, 4, 52, 20);
      g.strokeTriangle(36, 20, 42, 4, 52, 20);
    }
    if (skin.horn) {
      g.fillStyle(0xffd86b, 1);
      g.fillTriangle(26, 12, 32, 2, 38, 12);
      g.strokeTriangle(26, 12, 32, 2, 38, 12);
      g.fillStyle(skin.body, 1);
    }
    g.fillEllipse(32, 38, 56, 46);
    g.strokeEllipse(32, 38, 56, 46);
    // bao pleat bump on top
    g.fillEllipse(32, 18, 22, 14);
    g.strokeEllipse(32, 18, 22, 14);
    // blush
    g.fillStyle(skin.blush, 1);
    g.fillEllipse(14, 44, 11, 7);
    g.fillEllipse(50, 44, 11, 7);
    // eyes + mouth
    g.fillStyle(0x4a3640, 1);
    g.fillCircle(22, 36, 3.4);
    g.fillCircle(42, 36, 3.4);
    g.lineStyle(2.5, 0x4a3640, 1);
    g.beginPath();
    g.arc(32, 42, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    g.strokePath();
    g.generateTexture("bao", 64, 64);
    g.destroy();

    // bamboo steamer (obstacle segment)
    if (!this.textures.exists("steamer")) {
      const s = this.make.graphics({ x: 0, y: 0 }, false);
      s.fillStyle(0xd9b98c, 1);
      s.fillRoundedRect(0, 0, 72, 400, 14);
      s.fillStyle(0xc6a172, 1);
      for (let y = 18; y < 400; y += 36) {
        s.fillRoundedRect(6, y, 60, 10, 5);
      }
      s.lineStyle(4, 0xb78f5e, 1);
      s.strokeRoundedRect(2, 2, 68, 396, 12);
      s.generateTexture("steamer", 72, 400);
      s.destroy();
    }

    // collectibles
    const make = (key: string, draw: (gg: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const gg = this.make.graphics({ x: 0, y: 0 }, false);
      draw(gg);
      gg.generateTexture(key, 36, 36);
      gg.destroy();
    };
    make("star", (gg) => {
      gg.fillStyle(0xffd86b, 1);
      const cx = 18, cy = 18, spikes = 5, outer = 16, inner = 7;
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / spikes) * i - Math.PI / 2;
        pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      gg.fillPoints(pts, true);
    });
    make("heart", (gg) => {
      gg.fillStyle(0xff8fb3, 1);
      gg.fillCircle(12, 13, 9);
      gg.fillCircle(24, 13, 9);
      gg.fillTriangle(4, 17, 32, 17, 18, 33);
    });
    make("boba", (gg) => {
      gg.fillStyle(0xfbe3c9, 0.9);
      gg.fillRoundedRect(8, 4, 20, 28, 8);
      gg.fillStyle(0x6b4a38, 1);
      gg.fillCircle(14, 26, 3.5);
      gg.fillCircle(22, 27, 3.5);
      gg.fillCircle(18, 20, 3.5);
      gg.lineStyle(3, 0xff8fb3, 1);
      gg.lineBetween(18, 6, 24, -2);
    });
    make("golden", (gg) => {
      gg.fillStyle(0xffc83d, 1);
      gg.fillEllipse(18, 21, 30, 24);
      gg.fillEllipse(18, 11, 12, 8);
      gg.lineStyle(2, 0xe8a200, 1);
      gg.strokeEllipse(18, 21, 30, 24);
    });
    make("puff", (gg) => {
      gg.fillStyle(0xffffff, 1);
      gg.fillCircle(18, 18, 10);
    });
    // space mode: heart bullet
    make("bullet", (gg) => {
      gg.fillStyle(0xff6fa5, 1);
      gg.fillCircle(14, 13, 5);
      gg.fillCircle(22, 13, 5);
      gg.fillTriangle(9, 16, 27, 16, 18, 27);
    });
    // space mode: grumpy little steamer invader
    make("invader", (gg) => {
      gg.fillStyle(0xd9b98c, 1);
      gg.fillRoundedRect(2, 6, 32, 10, 5);
      gg.fillStyle(0xc9a172, 1);
      gg.fillRoundedRect(0, 14, 36, 16, 7);
      gg.lineStyle(2, 0xb78f5e, 1);
      gg.strokeRoundedRect(1, 15, 34, 14, 6);
      gg.fillStyle(0x4a3640, 1);
      gg.fillCircle(12, 21, 2.6);
      gg.fillCircle(24, 21, 2.6);
      gg.lineStyle(2, 0x4a3640, 1);
      gg.lineBetween(8, 17, 15, 19);
      gg.lineBetween(28, 17, 21, 19);
    });
  }

  private drawBackground() {
    const bg = BG_COLORS[this.cfg.background] ?? BG_COLORS.cloud;
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(bg.top, bg.top, bg.bottom, bg.bottom, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // soft floating clouds / sparkles
    const deco = bg.dark ? 0xffffff : 0xffffff;
    const alpha = bg.dark ? 0.25 : 0.5;
    for (let i = 0; i < 7; i++) {
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(40, GAME_HEIGHT - 40);
      const c = this.add.circle(x, y, Phaser.Math.Between(14, 34), deco, alpha).setDepth(1);
      this.tweens.add({
        targets: c,
        x: c.x + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private flap() {
    if (this.over) return;
    if (this.mode === "invaders") {
      this.shootBullet();
      return;
    }
    if (!this.started) this.startRun();
    sfx.flap();
    this.bao.setVelocityY(-380);
    this.tweens.add({
      targets: this.bao,
      angle: -14,
      duration: 120,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  private startRun() {
    this.started = true;
    startMusic();
    this.startTime = this.time.now;
    this.tweens.killTweensOf(this.bao);
    this.bao.setAngle(0);
    (this.bao.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
    this.startText.destroy();
    this.spawnTimer = this.time.addEvent({
      delay: 1700,
      loop: true,
      callback: () => this.spawnObstacle(),
    });
    this.spawnObstacle();
  }

  private spawnObstacle() {
    // difficulty scales with run score: faster scroll, narrower gaps
    this.speed = Math.min(300, 140 + this.runScore * 1.6);
    this.gap = Math.max(150, 230 - this.runScore * 0.8);

    const margin = 90;
    const gapCenter = Phaser.Math.Between(
      margin + this.gap / 2,
      GAME_HEIGHT - margin - this.gap / 2
    );
    const x = GAME_WIDTH + 50;

    const top = this.obstacles.create(x, gapCenter - this.gap / 2 - 200, "steamer") as Phaser.Physics.Arcade.Image;
    const bottom = this.obstacles.create(x, gapCenter + this.gap / 2 + 200, "steamer") as Phaser.Physics.Arcade.Image;
    for (const o of [top, bottom]) {
      o.setVelocityX(-this.speed);
      o.setDepth(5);
      (o.body as Phaser.Physics.Arcade.Body).setSize(60, 388);
      o.setData("scored", false);
    }
    bottom.setData("scoring", true);

    // collectible in the gap (70% chance)
    const roll = Math.random();
    if (roll < 0.7) {
      const golden = Math.random() < 0.05;
      const kind = golden
        ? "golden"
        : (["star", "heart", "boba"] as const)[Phaser.Math.Between(0, 2)];
      const c = this.collectibles.create(
        x + Phaser.Math.Between(60, 120),
        gapCenter + Phaser.Math.Between(-40, 40),
        kind
      ) as Collectible;
      c.kind = kind;
      c.setVelocityX(-this.speed);
      c.setDepth(6);
      c.setCircle(16, 2, 2);
      this.tweens.add({
        targets: c,
        scale: golden ? 1.25 : 1.12,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private collect(c: Collectible) {
    if (this.over || !c.active) return;
    const kind = c.kind ?? "star";
    c.disableBody(true, true);
    this.collected++;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (kind === "golden") {
      this.runScore += 10;
      this.golden = true;
      sfx.golden();
    } else {
      this.runScore += 3;
      sfx.collect();
    }
    this.burst(this.bao.x, this.bao.y, kind === "golden" ? 0xffc83d : 0xfff3a0, 10);
    this.updateHud();
    this.maybeEnterSpaceMode();
  }

  private maybeEnterSpaceMode() {
    if (this.mode === "flappy" && !this.over && this.runScore >= 100) {
      this.enterSpaceMode();
    }
  }

  private enterSpaceMode() {
    this.mode = "invaders";
    this.spawnTimer?.remove();
    this.obstacles.clear(true, true);
    this.collectibles.clear(true, true);

    (this.bao.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.bao.setVelocity(0, 0);
    this.bao.setAngle(0);
    this.tweens.add({
      targets: this.bao,
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2 + 40,
      duration: 600,
      ease: "Sine.easeInOut",
    });

    sfx.levelup();
    const dark = BG_COLORS[this.cfg.background]?.dark;
    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, "🚀 SPACE MODE! 🚀", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "34px",
        fontStyle: "bold",
        color: dark ? "#ffffff" : "#b35a8a",
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setScale(0);
    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          delay: 1100,
          duration: 400,
          onComplete: () => banner.destroy(),
        });
      },
    });

    this.fireTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => this.shootBullet(),
    });
    this.time.delayedCall(900, () => {
      this.spawnEnemies();
      this.scheduleEnemySpawn();
    });
    this.updateHud();
  }

  private aimAt(x: number, y: number) {
    this.aimAngle = Phaser.Math.Angle.Between(this.bao.x, this.bao.y, x, y);
  }

  private shootBullet() {
    if (this.over || this.mode !== "invaders") return;
    const a = this.aimAngle;
    const b = this.bullets.create(
      this.bao.x + Math.cos(a) * 34,
      this.bao.y + Math.sin(a) * 34,
      "bullet"
    ) as Phaser.Physics.Arcade.Image;
    b.setVelocity(Math.cos(a) * 440, Math.sin(a) * 440);
    b.setRotation(a + Math.PI / 2);
    b.setDepth(8);
    b.setCircle(9, 9, 9);
    sfx.shoot();
  }

  // difficulty scales with score: shorter spawn delays, more and
  // faster enemies converging from every edge
  private spaceProgress(): number {
    return Math.max(0, this.runScore - 100);
  }

  private scheduleEnemySpawn() {
    if (this.over || this.mode !== "invaders") return;
    const delay = Math.max(420, 1300 - this.spaceProgress() * 6);
    this.spawnTimer = this.time.delayedCall(delay, () => {
      this.spawnEnemies();
      this.scheduleEnemySpawn();
    });
  }

  private spawnEnemies() {
    if (this.over || this.mode !== "invaders") return;
    const progress = this.spaceProgress();
    const count = Math.min(4, 1 + Math.floor(progress / 30));
    const speed = Math.min(170, 55 + progress * 0.8);
    for (let i = 0; i < count; i++) {
      // random point on a random screen edge
      const side = Phaser.Math.Between(0, 3);
      const x =
        side === 0 ? -30 : side === 1 ? GAME_WIDTH + 30 : Phaser.Math.Between(0, GAME_WIDTH);
      const y =
        side === 2 ? -30 : side === 3 ? GAME_HEIGHT + 30 : Phaser.Math.Between(60, GAME_HEIGHT);
      const inv = this.invaders.create(x, y, "invader") as Phaser.Physics.Arcade.Image;
      inv.setDepth(7);
      (inv.body as Phaser.Physics.Arcade.Body).setSize(34, 22);
      // head for the bao, with a little scatter so they don't stack
      const target = new Phaser.Math.Vector2(
        this.bao.x + Phaser.Math.Between(-40, 40),
        this.bao.y + Phaser.Math.Between(-40, 40)
      );
      const dir = target.subtract(new Phaser.Math.Vector2(x, y)).normalize();
      inv.setVelocity(dir.x * speed, dir.y * speed);
      inv.setRotation(Math.atan2(dir.y, dir.x) + Math.PI / 2);
    }
  }

  private killInvader(
    bullet: Phaser.Physics.Arcade.Image,
    inv: Phaser.Physics.Arcade.Image
  ) {
    if (this.over || !bullet.active || !inv.active) return;
    const x = inv.x;
    const y = inv.y;
    bullet.destroy();
    inv.destroy();
    this.runScore += 2;
    sfx.zap();
    this.burst(x, y, 0xd9b98c, 10);
    // sometimes the steamer drops a star that drifts to the bao
    if (Math.random() < 0.22) {
      const c = this.collectibles.create(x, y, "star") as Collectible;
      c.kind = "star";
      const dir = new Phaser.Math.Vector2(this.bao.x - x, this.bao.y - y).normalize();
      c.setVelocity(dir.x * 90, dir.y * 90);
      c.setDepth(6);
      c.setCircle(16, 2, 2);
    }
    this.updateHud();
  }

  private burst(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 5), color).setDepth(15);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-50, 50),
        y: y + Phaser.Math.Between(-50, 50),
        alpha: 0,
        duration: 450,
        onComplete: () => p.destroy(),
      });
    }
  }

  private updateHud() {
    this.scoreText.setText(String(this.runScore));
    const rocket = this.mode === "invaders" ? "🚀  " : "";
    this.infoText.setText(
      `${rocket}${this.cfg.playerName}  ·  ✨ ${this.collected}  ·  combo x${this.combo}`
    );
  }

  update() {
    if (!this.started || this.over) return;

    // trail particles
    this.trailTimer += this.game.loop.delta;
    if (this.trailTimer > 90) {
      this.trailTimer = 0;
      const colors = TRAIL_COLORS[this.cfg.trail] ?? TRAIL_COLORS.sparkle;
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];
      const p = this.add
        .circle(this.bao.x - 22, this.bao.y + 8, Phaser.Math.Between(3, 6), color, 0.9)
        .setDepth(9);
      this.tweens.add({
        targets: p,
        x: p.x - 40,
        alpha: 0,
        scale: 0.3,
        duration: 500,
        onComplete: () => p.destroy(),
      });
    }

    if (this.mode === "invaders") {
      this.updateInvaders();
      return;
    }

    // scoring + cleanup
    for (const o of this.obstacles.getChildren() as Phaser.Physics.Arcade.Image[]) {
      if (
        o.getData("scoring") &&
        !o.getData("scored") &&
        o.x + 36 < this.bao.x
      ) {
        o.setData("scored", true);
        this.runScore += 1;
        sfx.pass();
        this.updateHud();
        this.maybeEnterSpaceMode();
        if (this.mode !== "flappy") return;
      }
      if (o.x < -80) o.destroy();
    }
    for (const c of this.collectibles.getChildren() as Collectible[]) {
      if (c.active && c.x < -30) {
        c.destroy();
        this.combo = 0;
        this.updateHud();
      }
    }

    // floor / ceiling ends the run
    if (this.bao.y > GAME_HEIGHT - 16 || this.bao.y < -10) {
      this.endRun();
    }
  }

  private updateInvaders() {
    // arrow keys spin the bao; pointer aiming is handled by events
    if (this.cursors?.left.isDown) this.aimAngle -= 0.075;
    if (this.cursors?.right.isDown) this.aimAngle += 0.075;
    this.bao.setRotation(this.aimAngle + Math.PI / 2);

    const offscreen = (o: { x: number; y: number }) =>
      o.x < -60 || o.x > GAME_WIDTH + 60 || o.y < -60 || o.y > GAME_HEIGHT + 60;
    const onscreen = (o: { x: number; y: number }) =>
      o.x > 0 && o.x < GAME_WIDTH && o.y > 0 && o.y < GAME_HEIGHT;

    // enemies spawn off-screen, so only cull ones that flew in and out
    for (const inv of this.invaders.getChildren() as Phaser.Physics.Arcade.Image[]) {
      if (!inv.active) continue;
      if (onscreen(inv)) inv.setData("entered", true);
      else if (inv.getData("entered") && offscreen(inv)) inv.destroy();
    }
    for (const b of this.bullets.getChildren() as Phaser.Physics.Arcade.Image[]) {
      if (b.active && offscreen(b)) b.destroy();
    }
    for (const c of this.collectibles.getChildren() as Collectible[]) {
      if (c.active && offscreen(c)) c.destroy();
    }
  }

  private endRun() {
    if (this.over) return;
    this.over = true;
    stopMusic();
    sfx.gameover();
    this.spawnTimer?.remove();
    this.fireTimer?.remove();
    this.physics.pause();
    this.bao.setTint(0xffb7c5);
    this.burst(this.bao.x, this.bao.y, 0xffb7c5, 16);
    this.cameras.main.shake(150, 0.01);

    const secondsPlayed = Math.round((this.time.now - this.startTime) / 1000);
    const stats: RunStats = {
      runScore: this.runScore,
      secondsPlayed,
      collectibles: this.collected,
      maxCombo: this.maxCombo,
      goldenCollected: this.golden,
    };
    this.time.delayedCall(700, () => this.cfg.onGameOver(stats));
  }
}
