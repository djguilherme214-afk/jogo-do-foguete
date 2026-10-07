// Configuração do Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da Interface
const scoreVal = document.getElementById('scoreVal');
const highScoreVal = document.getElementById('highScoreVal');
const livesVal = document.getElementById('livesVal');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySubtitle = document.getElementById('overlaySubtitle');
const startBtn = document.getElementById('startBtn');

// Estado do Jogo
let score = 0;
let highScore = localStorage.getItem('space_shooter_highscore') || 0;
highScoreVal.innerText = highScore;
let lives = 3;
let gameActive = false;
let animationId;
let spawnTimer = 0;

// Efeitos Sonoros Sintetizados (Web Audio API)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
}

function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  if (type === 'laser') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'explosion') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'powerup') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

// Controle de Teclas
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space' && gameActive) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Suporte para Mouse
canvas.addEventListener('mousemove', (e) => {
  if (!gameActive) return;
  const rect = canvas.getBoundingClientRect();
  player.x = (e.clientX - rect.left) - player.width / 2;
});

canvas.addEventListener('mousedown', () => {
  if (gameActive) player.shoot();
});

// Fundo Estrelado
const stars = Array.from({ length: 80 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 2 + 1,
  speed: Math.random() * 2 + 0.5
}));

// Foguete do Jogador
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 80,
  width: 40,
  height: 50,
  speed: 7,
  lastShot: 0,
  shootDelay: 180,
  tripleShot: false,
  tripleShotTimer: 0,

  draw() {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    // Chama do Propulsor
    ctx.fillStyle = Math.random() > 0.5 ? '#ff4500' : '#ffae00';
    ctx.beginPath();
    ctx.moveTo(-8, this.height / 2);
    ctx.lineTo(8, this.height / 2);
    ctx.lineTo(0, this.height / 2 + 15 + Math.random() * 10);
    ctx.closePath();
    ctx.fill();

    // Corpo da Nave
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(this.width / 2, this.height / 2);
    ctx.lineTo(-this.width / 2, this.height / 2);
    ctx.closePath();
    ctx.fill();

    // Asas
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-this.width / 2 - 5, 10, 8, 15);
    ctx.fillRect(this.width / 2 - 3, 10, 8, 15);

    // Cabine
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(0, -5, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  update() {
    if (keys['ArrowLeft'] || keys['KeyA']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed;
    if (keys['ArrowUp'] || keys['KeyW']) this.y -= this.speed;
    if (keys['ArrowDown'] || keys['KeyS']) this.y += this.speed;

    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));

    if (keys['Space']) this.shoot();

    if (this.tripleShot) {
      this.tripleShotTimer--;
      if (this.tripleShotTimer <= 0) this.tripleShot = false;
    }
  },

  shoot() {
    const now = Date.now();
    if (now - this.lastShot > this.shootDelay) {
      playSound('laser');
      if (this.tripleShot) {
        bullets.push(new Bullet(this.x + this.width / 2, this.y, 0, -10));
        bullets.push(new Bullet(this.x + this.width / 2, this.y, -3, -9));
        bullets.push(new Bullet(this.x + this.width / 2, this.y, 3, -9));
      } else {
        bullets.push(new Bullet(this.x + this.width / 2, this.y, 0, -10));
      }
      this.lastShot = now;
    }
  }
};

// Projetéis
class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 4;
  }

  draw() {
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }
}

let bullets = [];

// Meteoros Inimigos
class Enemy {
  constructor() {
    this.radius = Math.random() * 15 + 15;
    this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
    this.y = -this.radius;
    this.speed = Math.random() * 2 + 2 + score / 300;
    this.hp = this.radius > 25 ? 2 : 1;
    this.color = this.radius > 25 ? '#e11d48' : '#f59e0b';
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  update() {
    this.y += this.speed;
  }
}

let enemies = [];

// Power-Up
class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.speed = 2;
  }

  draw() {
    ctx.fillStyle = '#a855f7';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#a855f7';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('3x', this.x, this.y);
    ctx.shadowBlur = 0;
  }

  update() {
    this.y += this.speed;
  }
}

let powerUps = [];

// Partículas
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6;
    this.radius = Math.random() * 3 + 1;
    this.alpha = 1;
    this.color = color;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 0.02;
  }
}

let particles = [];

function createExplosion(x, y, color, count = 15) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function update() {
  stars.forEach(star => {
    star.y += star.speed;
    if (star.y > canvas.height) star.y = 0;
  });

  player.update();

  bullets.forEach((b, index) => {
    b.update();
    if (b.y < -10) bullets.splice(index, 1);
  });

  spawnTimer++;
  if (spawnTimer % Math.max(20, 60 - Math.floor(score / 100)) === 0) {
    enemies.push(new Enemy());
  }

  enemies.forEach((enemy, eIndex) => {
    enemy.update();

    const distToPlayer = Math.hypot(
      enemy.x - (player.x + player.width / 2),
      enemy.y - (player.y + player.height / 2)
    );

    if (distToPlayer < enemy.radius + player.width / 3) {
      createExplosion(enemy.x, enemy.y, enemy.color, 25);
      playSound('explosion');
      enemies.splice(eIndex, 1);
      lives--;
      updateLivesHUD();

      if (lives <= 0) gameOver();
    }

    if (enemy.y > canvas.height + enemy.radius) {
      enemies.splice(eIndex, 1);
    }

    bullets.forEach((bullet, bIndex) => {
      const dist = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
      if (dist < enemy.radius + bullet.radius) {
        bullets.splice(bIndex, 1);
        enemy.hp--;

        if (enemy.hp <= 0) {
          createExplosion(enemy.x, enemy.y, enemy.color, 20);
          playSound('explosion');

          if (Math.random() < 0.12) {
            powerUps.push(new PowerUp(enemy.x, enemy.y));
          }

          score += Math.round(enemy.radius);
          scoreVal.innerText = score;
          enemies.splice(eIndex, 1);
        }
      }
    });
  });

  powerUps.forEach((p, pIndex) => {
    p.update();

    const distToPlayer = Math.hypot(
      p.x - (player.x + player.width / 2),
      p.y - (player.y + player.height / 2)
    );

    if (distToPlayer < p.radius + player.width / 2) {
      playSound('powerup');
      player.tripleShot = true;
      player.tripleShotTimer = 400;
      powerUps.splice(pIndex, 1);
    }

    if (p.y > canvas.height + 20) powerUps.splice(pIndex, 1);
  });

  particles.forEach((p, index) => {
    p.update();
    if (p.alpha <= 0) particles.splice(index, 1);
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  stars.forEach(star => {
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });

  bullets.forEach(b => b.draw());
  enemies.forEach(e => e.draw());
  powerUps.forEach(p => p.draw());
  particles.forEach(p => p.draw());
  player.draw();
}

function loop() {
  if (!gameActive) return;
  update();
  draw();
  animationId = requestAnimationFrame(loop);
}

function updateLivesHUD() {
  livesVal.innerText = '❤️'.repeat(Math.max(0, lives));
}

function startGame() {
  initAudio();
  score = 0;
  lives = 3;
  enemies = [];
  bullets = [];
  particles = [];
  powerUps = [];
  player.x = canvas.width / 2 - 20;
  player.y = canvas.height - 80;
  player.tripleShot = false;

  scoreVal.innerText = '0';
  updateLivesHUD();

  overlay.style.display = 'none';
  gameActive = true;
  loop();
}

function gameOver() {
  gameActive = false;
  cancelAnimationFrame(animationId);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('space_shooter_highscore', highScore);
    highScoreVal.innerText = highScore;
  }

  overlayTitle.innerText = 'GAME OVER';
  overlaySubtitle.innerHTML = `Sua pontuação final foi: <b>${score}</b>`;
  startBtn.innerText = 'JOGAR NOVAMENTE';
  overlay.style.display = 'flex';
}

startBtn.addEventListener('click', startGame);