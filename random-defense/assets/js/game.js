const canvas = document.getElementById("field");
    const ctx = canvas.getContext("2d");
    const waveEl = document.getElementById("wave");
    const lifeEl = document.getElementById("life");
    const goldEl = document.getElementById("gold");
    const scoreEl = document.getElementById("score");
    const statusMessageEl = document.getElementById("statusMessage");
    const towerMessageEl = document.getElementById("towerMessage");
    const drawNameEl = document.getElementById("drawName");
    const drawDescEl = document.getElementById("drawDesc");
    const drawBtn = document.getElementById("drawBtn");
    const upgradeBtn = document.getElementById("upgradeBtn");
    const sellBtn = document.getElementById("sellBtn");
    const startBtn = document.getElementById("startBtn");
    const speedBtns = Array.from(document.querySelectorAll(".speed-btn"));
    const waveModeInputs = Array.from(document.querySelectorAll("input[name='waveMode']"));

    const CELL = 60;
    const DRAW_COST = 30;
    const MAX_TOWER_LEVEL = 10;
    const SELL_REFUND_RATE = 0.6;
    const MONSTER_HP_MULTIPLIER = 1.1;
    const BOSS_WAVE_INTERVAL = 10;
    const AUTO_WAVE_DELAY = 10;
    const path = [
      { x: 0, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 1 }, { x: 5, y: 1 },
      { x: 5, y: 7 }, { x: 9, y: 7 }, { x: 9, y: 3 }, { x: 13, y: 3 },
      { x: 13, y: 8 }, { x: 16, y: 8 }
    ].map((point) => ({
      x: point.x * CELL + CELL / 2,
      y: point.y * CELL + CELL / 2
    }));

    const towerTypes = [
      { key: "gun", name: "포탑", color: "#1476a8", range: 150, damage: 18, rate: 0.62, splash: 0, slow: 0, desc: "균형 잡힌 단일 공격 타워입니다." },
      { key: "ice", name: "빙결탑", color: "#3a8d8a", range: 135, damage: 9, rate: 0.8, splash: 0, slow: 0.45, desc: "적에게 피해를 주고 잠시 느리게 만듭니다." },
      { key: "bolt", name: "전격탑", color: "#7b5bb7", range: 120, damage: 12, rate: 0.28, splash: 0, slow: 0, desc: "사거리는 짧지만 빠르게 공격합니다." },
      { key: "cannon", name: "대포", color: "#b75f34", range: 165, damage: 28, rate: 1.08, splash: 58, slow: 0, desc: "공격 속도는 느리지만 주변 적에게 범위 피해를 줍니다." }
    ];

    const state = {
      wave: 1,
      life: 20,
      gold: 100,
      score: 0,
      towers: [],
      enemies: [],
      shots: [],
      selectedTower: null,
      pendingTower: null,
      running: false,
      spawning: false,
      spawnLeft: 0,
      spawnTimer: 0,
      lastTime: 0,
      speed: 1,
      autoWave: false,
      autoTimer: 0,
      autoCountdownShown: 0,
      gameOver: false
    };

    function setStatus(text) {
      statusMessageEl.textContent = text;
    }

    function setTowerInfo(text) {
      towerMessageEl.textContent = text;
    }

    function randItem(items) {
      return items[Math.floor(Math.random() * items.length)];
    }

    function distance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function isBossWave(wave) {
      return wave > 0 && wave % BOSS_WAVE_INTERVAL === 0;
    }

    function upgradeCost(tower) {
      if (!tower || tower.level >= MAX_TOWER_LEVEL) return 0;
      return 35 + tower.level * 18 + tower.level * tower.level * 4;
    }

    function upgradeChance(tower) {
      if (!tower || tower.level >= MAX_TOWER_LEVEL) return 0;
      return Math.max(25, 95 - tower.level * 7);
    }

    function sellValue(tower) {
      if (!tower) return 0;
      return Math.floor(tower.investedGold * SELL_REFUND_RATE);
    }

    function selectedTowerText(tower) {
      if (!tower) return "";
      if (tower.level >= MAX_TOWER_LEVEL) {
        return `${tower.type.name} Lv.${tower.level} 선택됨. 최대 강화입니다. 판매 시 ${sellValue(tower)}골드를 돌려받습니다.`;
      }
      return `${tower.type.name} Lv.${tower.level} 선택됨. 강화 비용 ${upgradeCost(tower)}골드, 성공 확률 ${upgradeChance(tower)}%, 판매 환급 ${sellValue(tower)}골드.`;
    }

    function gridPoint(event) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      return {
        x,
        y,
        col: Math.floor(x / CELL),
        row: Math.floor(y / CELL)
      };
    }

    function isOnPath(col, row) {
      const center = { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
      for (let i = 0; i < path.length - 1; i += 1) {
        const a = path[i];
        const b = path[i + 1];
        const minX = Math.min(a.x, b.x) - CELL / 2;
        const maxX = Math.max(a.x, b.x) + CELL / 2;
        const minY = Math.min(a.y, b.y) - CELL / 2;
        const maxY = Math.max(a.y, b.y) + CELL / 2;
        if (center.x >= minX && center.x <= maxX && center.y >= minY && center.y <= maxY) {
          return true;
        }
      }
      return false;
    }

    function towerAt(col, row) {
      return state.towers.find((tower) => tower.col === col && tower.row === row);
    }

    function updateHud() {
      const cost = upgradeCost(state.selectedTower);
      waveEl.textContent = state.wave;
      lifeEl.textContent = state.life;
      goldEl.textContent = state.gold;
      scoreEl.textContent = state.score;
      drawBtn.disabled = state.gameOver || state.gold < DRAW_COST || Boolean(state.pendingTower);
      upgradeBtn.disabled = state.gameOver || !state.selectedTower || state.selectedTower.level >= MAX_TOWER_LEVEL || state.gold < cost;
      sellBtn.disabled = state.gameOver || !state.selectedTower;
      startBtn.disabled = state.gameOver || state.spawning || state.enemies.length > 0 || state.autoTimer > 0;
      speedBtns.forEach((button) => {
        button.classList.toggle("primary", Number(button.dataset.speed) === state.speed);
      });
      waveModeInputs.forEach((input) => {
        input.checked = input.value === (state.autoWave ? "auto" : "manual");
      });
      drawNameEl.textContent = state.pendingTower ? state.pendingTower.name : "대기 중";
      drawDescEl.textContent = state.pendingTower ? state.pendingTower.desc : `골드 ${DRAW_COST}를 사용해 랜덤 타워를 뽑습니다.`;
    }

    function drawTower() {
      if (state.gameOver || state.pendingTower || state.gold < DRAW_COST) return;
      state.gold -= DRAW_COST;
      state.pendingTower = randItem(towerTypes);
      setStatus(`${state.pendingTower.name}을 뽑았습니다. 길이 아닌 빈 칸을 클릭해 배치하세요.`);
      updateHud();
    }

    function placeOrSelect(event) {
      if (state.gameOver) return;
      const point = gridPoint(event);
      if (point.col < 0 || point.col > 15 || point.row < 0 || point.row > 9) return;

      const existing = towerAt(point.col, point.row);
      if (existing) {
        state.selectedTower = existing;
        setTowerInfo(selectedTowerText(existing));
        updateHud();
        return;
      }

      if (!state.pendingTower) {
        state.selectedTower = null;
        setStatus("타워 뽑기를 먼저 누르거나 기존 타워를 선택하세요.");
        setTowerInfo("선택된 타워가 없습니다.");
        updateHud();
        return;
      }

      if (isOnPath(point.col, point.row)) {
        setStatus("적이 이동하는 길 위에는 타워를 배치할 수 없습니다.");
        return;
      }

      const tower = {
        type: state.pendingTower,
        col: point.col,
        row: point.row,
        x: point.col * CELL + CELL / 2,
        y: point.row * CELL + CELL / 2,
        cooldown: 0,
        level: 1,
        investedGold: DRAW_COST
      };
      state.towers.push(tower);
      state.selectedTower = tower;
      state.pendingTower = null;
      setStatus(`${tower.type.name}을 배치했습니다. 웨이브를 시작하세요.`);
      setTowerInfo(selectedTowerText(tower));
      updateHud();
    }

    function upgradeSelected() {
      const tower = state.selectedTower;
      if (state.gameOver || !tower || tower.level >= MAX_TOWER_LEVEL) return;

      const cost = upgradeCost(tower);
      if (state.gold < cost) return;

      state.gold -= cost;
      const chance = upgradeChance(tower);
      const succeeded = Math.random() * 100 < chance;

      if (succeeded) {
        tower.level += 1;
        tower.investedGold += cost;
        setStatus(`${tower.type.name} 강화 성공. Lv.${tower.level}이 되었습니다.`);
      } else {
        setStatus(`${tower.type.name} 강화 실패. ${cost}골드를 사용했습니다. 현재 Lv.${tower.level}입니다.`);
      }
      setTowerInfo(selectedTowerText(tower));
      updateHud();
    }

    function sellSelected() {
      const tower = state.selectedTower;
      if (state.gameOver || !tower) return;

      const refund = sellValue(tower);
      state.gold += refund;
      state.towers = state.towers.filter((item) => item !== tower);
      state.selectedTower = null;
      setStatus(`${tower.type.name}을 판매하고 ${refund}골드를 돌려받았습니다.`);
      setTowerInfo("선택된 타워가 없습니다.");
      updateHud();
    }

    function startWave() {
      if (state.gameOver || state.spawning || state.enemies.length > 0) return;
      state.autoTimer = 0;
      state.autoCountdownShown = 0;
      state.spawning = true;
      state.running = true;
      state.spawnLeft = 8 + state.wave * 2 + (isBossWave(state.wave) ? 1 : 0);
      state.spawnTimer = 0;
      setStatus(isBossWave(state.wave)
        ? `웨이브 ${state.wave} 시작. 보스가 마지막에 출현합니다.`
        : `웨이브 ${state.wave} 시작. 적 ${state.spawnLeft}기가 진입합니다.`);
      updateHud();
    }

    function spawnEnemy(isBoss = false) {
      const hpScale = Math.pow(1.16, state.wave - 1);
      const baseHp = (62 + state.wave * 18) * hpScale * MONSTER_HP_MULTIPLIER;
      const maxHp = Math.round(baseHp * (isBoss ? 8.5 : 1));
      const speed = (48 + Math.min(48, state.wave * 3.4)) * (isBoss ? 0.68 : 1);
      state.enemies.push({
        x: path[0].x,
        y: path[0].y,
        target: 1,
        hp: maxHp,
        maxHp,
        speed,
        slowTime: 0,
        isBoss
      });
    }

    function damageEnemy(enemy, amount) {
      enemy.hp -= amount;
      if (enemy.hp > 0) return;
      state.gold += enemy.isBoss ? 80 + state.wave * 4 : 10 + state.wave;
      state.score += enemy.isBoss ? 250 + state.wave * 20 : 20 + state.wave * 5;
      enemy.dead = true;
    }

    function updateEnemies(dt) {
      state.enemies.forEach((enemy) => {
        if (enemy.slowTime > 0) enemy.slowTime -= dt;
        const target = path[enemy.target];
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const speed = enemy.speed * (enemy.slowTime > 0 ? 0.52 : 1);
        const step = speed * dt;

        if (dist <= step) {
          enemy.x = target.x;
          enemy.y = target.y;
          enemy.target += 1;
          if (enemy.target >= path.length) {
            enemy.escaped = true;
            state.life -= enemy.isBoss ? 5 : 1;
          }
        } else {
          enemy.x += (dx / dist) * step;
          enemy.y += (dy / dist) * step;
        }
      });

      state.enemies = state.enemies.filter((enemy) => !enemy.dead && !enemy.escaped);
      if (state.life <= 0) {
        state.life = 0;
        state.gameOver = true;
        state.running = false;
        state.spawning = false;
        setStatus(`게임 종료. 최종 점수는 ${state.score}점입니다.`);
      }
    }

    function updateTowers(dt) {
      state.towers.forEach((tower) => {
        tower.cooldown -= dt;
        if (tower.cooldown > 0) return;

        const range = tower.type.range + (tower.level - 1) * 10;
        const target = state.enemies
          .filter((enemy) => distance(tower, enemy) <= range)
          .sort((a, b) => b.target - a.target || distance(b, path[b.target] || b) - distance(a, path[a.target] || a))[0];

        if (!target) return;

        const damage = tower.type.damage * (1 + (tower.level - 1) * 0.42);
        if (tower.type.splash) {
          state.enemies.forEach((enemy) => {
            if (distance(target, enemy) <= tower.type.splash) damageEnemy(enemy, damage);
          });
        } else {
          damageEnemy(target, damage);
        }
        if (tower.type.slow) target.slowTime = 1.2 + tower.level * 0.12;
        state.shots.push({
          x: tower.x,
          y: tower.y,
          tx: target.x,
          ty: target.y,
          life: 0.22,
          maxLife: 0.22,
          color: tower.type.color,
          type: tower.type.key,
          splash: tower.type.splash
        });
        tower.cooldown = Math.max(0.12, tower.type.rate - (tower.level - 1) * 0.05);
      });
      state.enemies = state.enemies.filter((enemy) => !enemy.dead && !enemy.escaped);
    }

    function updateSpawning(dt) {
      if (!state.spawning) return;
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0 && state.spawnLeft > 0) {
        spawnEnemy(isBossWave(state.wave) && state.spawnLeft === 1);
        state.spawnLeft -= 1;
        state.spawnTimer = Math.max(0.32, 0.78 - state.wave * 0.018);
      }
      if (state.spawnLeft <= 0) state.spawning = false;
    }

    function checkWaveClear() {
      if (state.gameOver || state.spawning || state.enemies.length > 0 || !state.running) return;
      state.running = false;
      state.wave += 1;
      state.gold += 25 + state.wave * 3;
      if (state.autoWave) {
        state.autoTimer = AUTO_WAVE_DELAY;
        state.autoCountdownShown = AUTO_WAVE_DELAY;
      }
      setStatus(state.autoWave
        ? `웨이브 방어 성공. ${AUTO_WAVE_DELAY}초 뒤 다음 웨이브가 자동 시작됩니다.`
        : "웨이브 방어 성공. 보너스 골드를 받았습니다.");
    }

    function updateShots(dt) {
      state.shots.forEach((shot) => {
        shot.life -= dt;
      });
      state.shots = state.shots.filter((shot) => shot.life > 0);
    }

    function updateAutoWave(dt) {
      if (!state.autoWave || state.gameOver || state.running || state.spawning || state.enemies.length > 0) return;
      if (state.autoTimer <= 0) return;

      state.autoTimer = Math.max(0, state.autoTimer - dt);
      const secondsLeft = Math.ceil(state.autoTimer);
      if (secondsLeft !== state.autoCountdownShown) {
        state.autoCountdownShown = secondsLeft;
        setStatus(secondsLeft > 0
          ? `다음 웨이브가 ${secondsLeft}초 뒤 자동 시작됩니다.`
          : "다음 웨이브를 자동으로 시작합니다.");
      }
      if (state.autoTimer <= 0) startWave();
    }

    function drawGrid() {
      ctx.fillStyle = "#dce8ef";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#c5d2de";
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += CELL) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += CELL) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    function drawPath() {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#9b8062";
      ctx.lineWidth = 48;
      ctx.beginPath();
      path.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      ctx.strokeStyle = "#e0c79a";
      ctx.lineWidth = 34;
      ctx.beginPath();
      path.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.lineCap = "butt";
    }

    function render() {
      drawGrid();
      drawPath();

      state.towers.forEach((tower) => {
        const range = tower.type.range + (tower.level - 1) * 10;
        if (tower === state.selectedTower) {
          ctx.fillStyle = "rgba(20, 118, 168, 0.12)";
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, range, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = tower.type.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 21, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = tower.type.color;
        ctx.font = "800 13px Segoe UI, Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tower.level, tower.x, tower.y);
      });

      state.enemies.forEach((enemy) => {
        if (enemy.isBoss) {
          ctx.fillStyle = enemy.slowTime > 0 ? "#2f6f77" : "#5b2434";
          ctx.strokeStyle = "#f4c542";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y - 28);
          ctx.lineTo(enemy.x + 26, enemy.y);
          ctx.lineTo(enemy.x, enemy.y + 28);
          ctx.lineTo(enemy.x - 26, enemy.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#f4c542";
          ctx.font = "900 14px Segoe UI, Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("B", enemy.x, enemy.y);
        } else {
          ctx.fillStyle = enemy.slowTime > 0 ? "#357f85" : "#9f2f45";
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 16, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(enemy.x - (enemy.isBoss ? 28 : 18), enemy.y - (enemy.isBoss ? 38 : 26), enemy.isBoss ? 56 : 36, 5);
        ctx.fillStyle = "#62b06b";
        ctx.fillRect(
          enemy.x - (enemy.isBoss ? 28 : 18),
          enemy.y - (enemy.isBoss ? 38 : 26),
          Math.max(0, (enemy.isBoss ? 56 : 36) * enemy.hp / enemy.maxHp),
          5
        );
      });

      state.shots.forEach((shot) => {
        const progress = 1 - shot.life / shot.maxLife;
        const alpha = Math.max(0, shot.life / shot.maxLife);

        if (shot.type === "gun") {
          const px = shot.x + (shot.tx - shot.x) * progress;
          const py = shot.y + (shot.ty - shot.y) * progress;
          ctx.fillStyle = `rgba(20, 118, 168, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
          return;
        }

        if (shot.type === "ice") {
          ctx.strokeStyle = `rgba(58, 141, 138, ${alpha})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(shot.tx, shot.ty, 16 + progress * 24, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(183, 232, 228, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(shot.x, shot.y);
          ctx.lineTo(shot.tx, shot.ty);
          ctx.stroke();
          return;
        }

        if (shot.type === "bolt") {
          const segments = 5;
          ctx.strokeStyle = `rgba(123, 91, 183, ${alpha})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(shot.x, shot.y);
          for (let i = 1; i < segments; i += 1) {
            const t = i / segments;
            const offset = (i % 2 === 0 ? 1 : -1) * 10;
            const px = shot.x + (shot.tx - shot.x) * t;
            const py = shot.y + (shot.ty - shot.y) * t + offset;
            ctx.lineTo(px, py);
          }
          ctx.lineTo(shot.tx, shot.ty);
          ctx.stroke();
          return;
        }

        if (shot.type === "cannon") {
          const radius = Math.max(18, shot.splash || 48) * progress;
          ctx.fillStyle = `rgba(183, 95, 52, ${alpha * 0.22})`;
          ctx.strokeStyle = `rgba(183, 95, 52, ${alpha})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(shot.tx, shot.ty, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          return;
        }

        ctx.strokeStyle = shot.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(shot.x, shot.y);
        ctx.lineTo(shot.tx, shot.ty);
        ctx.stroke();
      });

      if (state.gameOver) {
        ctx.fillStyle = "rgba(20, 31, 45, 0.78)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 42px Segoe UI, Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = "800 20px Segoe UI, Arial";
        ctx.fillText(`Score ${state.score}`, canvas.width / 2, canvas.height / 2 + 30);
      }
    }

    function tick(time) {
      const rawDt = Math.min(0.04, (time - state.lastTime) / 1000 || 0);
      const dt = rawDt * state.speed;
      state.lastTime = time;
      if (!state.gameOver) {
        updateSpawning(dt);
        updateEnemies(dt);
        updateTowers(dt);
        updateShots(dt);
        checkWaveClear();
        updateAutoWave(rawDt);
      }
      updateHud();
      render();
      requestAnimationFrame(tick);
    }

    function setSpeed(speed) {
      state.speed = speed;
      setStatus(`게임 속도를 x${speed}로 변경했습니다.`);
      updateHud();
    }

    function setWaveMode(mode) {
      state.autoWave = mode === "auto";
      state.autoTimer = 0;
      state.autoCountdownShown = 0;
      setStatus(state.autoWave
        ? `자동 진행을 켰습니다. 웨이브 종료 후 ${AUTO_WAVE_DELAY}초 뒤 다음 웨이브가 시작됩니다.`
        : "수동 진행으로 변경했습니다.");
      updateHud();
    }

    function restart() {
      state.wave = 1;
      state.life = 20;
      state.gold = 100;
      state.score = 0;
      state.towers = [];
      state.enemies = [];
      state.shots = [];
      state.selectedTower = null;
      state.pendingTower = null;
      state.running = false;
      state.spawning = false;
      state.spawnLeft = 0;
      state.spawnTimer = 0;
      state.speed = 1;
      state.autoWave = false;
      state.autoTimer = 0;
      state.autoCountdownShown = 0;
      state.gameOver = false;
      setStatus("타워 뽑기를 누른 뒤 길이 아닌 칸을 클릭해 배치하세요.");
      setTowerInfo("선택된 타워가 없습니다.");
      updateHud();
    }

    drawBtn.addEventListener("click", drawTower);
    upgradeBtn.addEventListener("click", upgradeSelected);
    sellBtn.addEventListener("click", sellSelected);
    startBtn.addEventListener("click", startWave);
    speedBtns.forEach((button) => {
      button.addEventListener("click", () => setSpeed(Number(button.dataset.speed)));
    });
    waveModeInputs.forEach((input) => {
      input.addEventListener("change", () => setWaveMode(input.value));
    });
    document.getElementById("restartBtn").addEventListener("click", restart);
    canvas.addEventListener("click", placeOrSelect);

    updateHud();
    requestAnimationFrame(tick);
