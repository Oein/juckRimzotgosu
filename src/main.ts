import type { Path } from "two.js/src/path";
import "./style.css";
import Two from "two.js";

// 전역 게임 상수 정의
// 시간 관련 상수
const ARROW_SPAWN_RATE = 300; // ms
const ARROW_SPAWN_RATE_VARIATION = 10; // ms
const ARROW_LIFETIME = 8000; // ms
const EIGHT_DIRECTION_ATTACK_MIN_INTERVAL = 3000; // ms
const EIGHT_DIRECTION_ATTACK_MAX_INTERVAL = 3000; // ms

// 화면 흔들림 상수
const SHAKE_DURATION = 500; // 0.5초 동안 흔들림
const SHAKE_INTENSITY = 15; // 흔들림 강도 (픽셀)
const SHAKE_DECREASE_FACTOR = 0.85; // 흔들림 감소 계수

// 크기 관련 상수
const FIXED_BOUNDARY_RADIUS = 300; // px
const PLAYER_RADIUS = 10; // px
const REGULAR_ARROW_SIZE = 14; // px
const EIGHT_DIRECTION_ARROW_SIZE = 12; // px
const BOUNDARY_OUTSIDE_FACTOR = 1.2; // 경계 바깥에서 시작하는 비율
const BOUNDARY_CLEANUP_FACTOR = 1.5; // 경계 바깥으로 나간 화살을 제거하는 비율
const ARROW_COLLISION_PADDING = 10; // 충돌 감지 시 추가 여백

// 방향 관련 상수
const NUMBER_OF_DIRECTIONS = 8; // 8방향 화살 공격에서 사용하는 방향 수

// 이동 관련 상수
const PLAYER_MOVE_SPEED = 4.25; // px per frame
const ARROW_SPEED = 5; // px per frame
const EIGHT_DIRECTION_ARROW_SPEED = 3; // px per frame
const DIAGONAL_MOVEMENT_FACTOR = 0.7071; // √2/2, 대각선 이동 시 속도 조정

// 화면 요소 관련 상수
const SCORE_TEXT_Y_POSITION = 50; // px
const SCORE_TEXT_SIZE = 24; // px
const BIG_SCORE_TEXT_SIZE = 120; // px
const BIG_SCORE_WEIGHT = 700;
const GAMEOVER_TEXT_SIZE = 36; // px
const GAMEOVER_TEXT_Y_OFFSET = 50; // px
const FINAL_SCORE_TEXT_SIZE = 24; // px
const FINAL_SCORE_TEXT_Y_OFFSET = 10; // px
const RESTART_TEXT_SIZE = 18; // px
const RESTART_TEXT_Y_OFFSET = 60; // px
const BOUNDARY_LINE_WIDTH = 3; // px

// 색상 관련 상수
// const BACKGROUND_COLOR = "#f0f0f0";
const BORDER_COLOR = "#333333";
const PLAYER_COLOR = "#2288dd";
const ARROW_COLOR = "#52e82cff";
const EIGHT_DIRECTION_ARROW_COLOR = "#ff0000ff";
const SCORE_TEXT_COLOR = "#333";
const BIG_SCORE_COLOR = "rgba(100, 100, 100, 0.2)";
const GAMEOVER_TEXT_COLOR = "#e82c2c";
const FINAL_SCORE_COLOR = "#333";
const RESTART_TEXT_COLOR = "#333";

// 화살 인터페이스 정의
interface Arrow {
  shape: Path; // Two.js Path 타입 사용
  velocity: { x: number; y: number };
  angle: number;
  createdAt: number;
  isActive: boolean;
}

// 게임 설정 (게임 중 변경되는 값만 보관)
const config = {
  width: window.innerWidth,
  height: window.innerHeight,
  arrowSpawnRate: ARROW_SPAWN_RATE,
};

// Two.js 인스턴스 초기화
const container = document.getElementById("app");
const two = new Two({
  fullscreen: true,
  autostart: true,
}).appendTo(container as HTMLElement);

// 게임 화면 중앙
const centerX = two.width / 2;
const centerY = two.height / 2;

// 경계 원 생성
const boundary = two.makeCircle(centerX, centerY, FIXED_BOUNDARY_RADIUS);
boundary.stroke = BORDER_COLOR;
boundary.linewidth = BOUNDARY_LINE_WIDTH;
boundary.fill = "transparent";

// 플레이어 생성
const player = two.makeCircle(centerX, centerY, PLAYER_RADIUS);
player.fill = PLAYER_COLOR;
player.stroke = "transparent";

// 살아남은 시간 표시 텍스트 (상단)
const timeText = new Two.Text("시간: 0초", centerX, SCORE_TEXT_Y_POSITION);
timeText.size = SCORE_TEXT_SIZE;
timeText.fill = SCORE_TEXT_COLOR;
two.add(timeText);

// 화면 중앙 큰 점수 표시
const bigScoreText = new Two.Text("0", centerX, centerY);
bigScoreText.size = BIG_SCORE_TEXT_SIZE;
bigScoreText.fill = BIG_SCORE_COLOR;
bigScoreText.weight = BIG_SCORE_WEIGHT;
two.add(bigScoreText);

// 게임 오버 텍스트 (초기에는 숨겨둠)
const gameOverText = new Two.Text(
  "게임 오버!",
  centerX,
  centerY - GAMEOVER_TEXT_Y_OFFSET
);
gameOverText.size = GAMEOVER_TEXT_SIZE;
gameOverText.fill = GAMEOVER_TEXT_COLOR;
gameOverText.visible = false;
two.add(gameOverText);

const finalScoreText = new Two.Text(
  "",
  centerX,
  centerY + FINAL_SCORE_TEXT_Y_OFFSET
);
finalScoreText.size = FINAL_SCORE_TEXT_SIZE;
finalScoreText.fill = FINAL_SCORE_COLOR;
finalScoreText.visible = false;
two.add(finalScoreText);

const restartText = new Two.Text(
  "재시작하려면 스페이스바를 누르세요",
  centerX,
  centerY + RESTART_TEXT_Y_OFFSET
);
restartText.size = RESTART_TEXT_SIZE;
restartText.fill = RESTART_TEXT_COLOR;
restartText.visible = false;
two.add(restartText);

const saveText = new Two.Text(
  "점수를 저장하려면 I키를 누르세요",
  centerX,
  centerY + RESTART_TEXT_Y_OFFSET + 30
);
saveText.size = RESTART_TEXT_SIZE;
saveText.fill = RESTART_TEXT_COLOR;
saveText.visible = false;
two.add(saveText);

// 게임 상태
const gameState = {
  isPlaying: true,
  score: ARROW_SPAWN_RATE,
  timeMS: 0,
  scoreSaved: false,
  arrows: [] as Arrow[],
  startTime: Date.now(),
  lastArrowTime: 0,
  lastEightDirectionAttackTime: 0, // 8방위 공격 마지막 시간
  nextEightDirectionAttackDelay: getRandomEightDirectionAttackDelay(), // 다음 8방위 공격까지 딜레이
  keyStates: {
    up: false,
    down: false,
    left: false,
    right: false,
    w: false,
    a: false,
    s: false,
    d: false,
  },
  // 화면 흔들림 관련 상태
  shake: {
    isShaking: false,
    intensity: 0,
    startShakeTime: 0,
    offsetX: 0,
    offsetY: 0,
  },
};

class OnKV {
  skv = "wk2b877b";
  get__(key: string) {
    return fetch(
      `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${this.skv}/${key}`
    )
      .then((res) => res.text())
      .then((res) => JSON.parse(res));
  }
  set__(key: string, value: any) {
    return fetch(
      `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${this.skv}/${key}/${value}`,
      {
        method: "POST",
      }
    );
  }
  async get(
    key: string,
    progressSender?: (now: number, total: number) => void
  ) {
    // it has 60 chars limit
    // so it should be saved as parts
    const parts = await this.get__(key + "_l").then((res) => {
      const length = parseInt(res, 10);
      const parts = [];
      for (let i = 0; i < length; i++) {
        parts.push(
          new Promise<any>((resolve) => {
            this.get__(key + "_" + i).then((res) => {
              resolve(res);
              if (progressSender) progressSender(i + 1, length);
            });
          })
        );
      }
      console.log(res, length, parts);
      return Promise.all(parts);
    });
    console.log(parts.join(""), parts);
    return JSON.parse(decodeURIComponent(atob(parts.join(""))));
  }
  async set(
    key: string,
    value: any,
    progressSender?: (now: number, total: number) => void
  ) {
    const toSave = btoa(encodeURIComponent(JSON.stringify(value)));
    const parts = [];
    const SPILIT_BY = 50;
    for (let i = 0; i < toSave.length; i += SPILIT_BY) {
      parts.push(toSave.substring(i, i + SPILIT_BY));
    }
    console.log("Saving of", key, "in", parts.length, "parts");
    await this.set__(key + "_l", parts.length);
    let sent = 0;
    await Promise.all(
      parts.map((part, i) => {
        this.set__(key + "_" + i, part);
        sent++;
        if (progressSender) progressSender(sent, parts.length);
        console.log("Saved part of", key, i + 1, " / ", parts.length);
      })
    );
  }
}
const kv = new OnKV();
(window as any).kv = kv;

// 랜덤 8방위 공격 딜레이 생성
function getRandomEightDirectionAttackDelay(): number {
  return (
    EIGHT_DIRECTION_ATTACK_MIN_INTERVAL +
    Math.random() *
      (EIGHT_DIRECTION_ATTACK_MAX_INTERVAL -
        EIGHT_DIRECTION_ATTACK_MIN_INTERVAL)
  );
}

// 8방위에서 동시에 화살 생성하기
function createEightDirectionAttack() {
  const currentTime = Date.now();
  const NOD = Math.random() < 0.2 ? 2 : Math.random() < 0.1 ? 1.5 : 1;
  const NODV = NUMBER_OF_DIRECTIONS * NOD;
  // 8개 방향으로 화살 생성 (45도 간격)
  for (let i = 0; i < NODV; i++) {
    const angle = (i * Math.PI) / (NODV / 2); // 0, 45, 90, 135, 180, 225, 270, 315도
    const startDistance = FIXED_BOUNDARY_RADIUS * BOUNDARY_OUTSIDE_FACTOR;

    const startX = centerX + Math.cos(angle) * startDistance;
    const startY = centerY + Math.sin(angle) * startDistance;

    // 플레이어 방향으로 향하는 벡터 계산
    const dirX = player.position.x - startX; // 실제 플레이어 위치를 향해
    const dirY = player.position.y - startY;
    const distance = Math.sqrt(dirX * dirX + dirY * dirY);

    const rnd =
      NOD == 1 ? Math.random() * 0.4 + 0.8 : Math.random() * 0.4 + 0.2; // 속도에 약간의 랜덤성 추가 (0.8 ~ 1.2배)
    const velocityX = (dirX / distance) * EIGHT_DIRECTION_ARROW_SPEED * rnd;
    const velocityY = (dirY / distance) * EIGHT_DIRECTION_ARROW_SPEED * rnd;

    // 화살 모양 만들기 (삼각형)
    const arrowShape = two.makePolygon(
      startX,
      startY,
      EIGHT_DIRECTION_ARROW_SIZE,
      3
    );
    arrowShape.fill = EIGHT_DIRECTION_ARROW_COLOR;
    arrowShape.rotation = Math.atan2(velocityY, velocityX) + Math.PI / 2;

    gameState.arrows.push({
      shape: arrowShape,
      velocity: { x: velocityX, y: velocityY },
      angle: Math.atan2(velocityY, velocityX),
      createdAt: currentTime,
      isActive: true,
    });
  }

  // 다음 공격 시간 설정
  gameState.lastEightDirectionAttackTime = currentTime;
  gameState.nextEightDirectionAttackDelay =
    getRandomEightDirectionAttackDelay();
}

// 화살 생성 함수
function createArrow(): Arrow {
  const currentTime = Date.now();
  // 랜덤한 각도에서 생성 (플레이어를 향해)
  const angle = Math.random() * Math.PI * 2;
  const startDistance = FIXED_BOUNDARY_RADIUS * BOUNDARY_OUTSIDE_FACTOR;

  const startX = centerX + Math.cos(angle) * startDistance;
  const startY = centerY + Math.sin(angle) * startDistance;

  // 플레이어 방향으로 향하는 벡터 계산
  const dirX = centerX - startX;
  const dirY = centerY - startY;
  const distance = Math.sqrt(dirX * dirX + dirY * dirY);

  const rnd = Math.random() * 0.6 + 0.8; // 속도에 약간의 랜덤성 추가 (0.8 ~ 1.4배)
  const velocityX = (dirX / distance) * ARROW_SPEED * rnd;
  const velocityY = (dirY / distance) * ARROW_SPEED * rnd;

  // 화살 모양 만들기 (간단한 삼각형으로)
  const arrowShape = two.makePolygon(startX, startY, REGULAR_ARROW_SIZE, 3);
  arrowShape.fill = ARROW_COLOR;
  arrowShape.rotation = Math.atan2(velocityY, velocityX) + Math.PI / 2;

  return {
    shape: arrowShape,
    velocity: { x: velocityX, y: velocityY },
    angle: Math.atan2(velocityY, velocityX),
    createdAt: currentTime,
    isActive: true,
  };
}

// 충돌 감지 함수
function checkCollision(arrow: Arrow): boolean {
  if (!arrow.isActive) return false;

  const dx = arrow.shape.position.x - player.position.x;
  const dy = arrow.shape.position.y - player.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < PLAYER_RADIUS + ARROW_COLLISION_PADDING;
}

// 게임 오버 처리
function gameOver() {
  gameState.isPlaying = false;

  // 점수 계산 (살아남은 ms / 2 기준)
  const survivalTimeMs = Date.now() - gameState.startTime;
  gameState.timeMS = survivalTimeMs;
  gameState.score = Math.floor(survivalTimeMs / 20);

  // 생존 시간 계산
  const survivalTimeSec = Math.floor(survivalTimeMs / 1000);
  const minutes = Math.floor(survivalTimeSec / 60);
  const seconds = (survivalTimeMs % 60000) / 1000;
  const timeString = `${minutes > 0 ? `${minutes}분 ` : ""}${seconds.toFixed(
    2
  )}초`;

  // 게임 오버 UI 표시
  gameOverText.visible = true;
  finalScoreText.value = `점수: ${gameState.score}점 (생존 시간: ${timeString})`;
  finalScoreText.visible = true;
  restartText.visible = true;
  saveText.visible = true;

  // 중앙 큰 점수 숨기기
  bigScoreText.visible = false;

  // 모든 화살 제거
  gameState.arrows.forEach((arrow) => {
    if (arrow.shape && (arrow.shape as any).parent) {
      (arrow.shape as any).parent.remove(arrow.shape);
    }
  });
  gameState.arrows = [];
}

// 화면 흔들기 함수
function startScreenShake() {
  if (!gameState.isPlaying) return;

  gameState.shake.isShaking = true;
  gameState.shake.intensity = SHAKE_INTENSITY;
  gameState.shake.startShakeTime = Date.now();
}

// 게임 재시작
function restartGame() {
  startScreenShake();
  gameState.scoreSaved = false;
  gameState.isPlaying = true;
  gameState.score = 0;
  gameState.startTime = Date.now();
  gameState.lastArrowTime = 0;
  gameState.lastEightDirectionAttackTime = Date.now() - 1000;
  gameState.nextEightDirectionAttackDelay =
    getRandomEightDirectionAttackDelay();

  // 흔들림 상태 초기화
  gameState.shake.isShaking = false;
  gameState.shake.intensity = 0;
  gameState.shake.startShakeTime = 0;
  gameState.shake.offsetX = 0;
  gameState.shake.offsetY = 0;

  // 플레이어 위치 초기화
  player.position.x = centerX;
  player.position.y = centerY;

  // 게임 오버 UI 숨기기
  gameOverText.visible = false;
  finalScoreText.visible = false;
  restartText.visible = false;
  saveText.visible = false;

  // 시간 초기화
  timeText.value = "시간: 0초";

  // 중앙 큰 점수 초기화 및 표시
  bigScoreText.value = "0";
  bigScoreText.visible = true;
}

// 화면 리사이징 처리 함수
function handleResize() {
  // 화면 크기 업데이트
  config.width = window.innerWidth;
  config.height = window.innerHeight;

  // 중앙 좌표 업데이트
  const newCenterX = two.width / 2;
  const newCenterY = two.height / 2;

  // 경계 원 위치 업데이트
  boundary.position.x = newCenterX;
  boundary.position.y = newCenterY;

  // 플레이어가 경계 안에 있도록 조정
  if (gameState.isPlaying) {
    // 현재 중심으로부터의 상대 위치 계산
    const relativeX = player.position.x - centerX;
    const relativeY = player.position.y - centerY;

    // 새 중심점 기준으로 위치 조정
    player.position.x = newCenterX + relativeX;
    player.position.y = newCenterY + relativeY;

    // 경계를 벗어난 경우 보정
    const distFromCenter = Math.sqrt(
      Math.pow(player.position.x - newCenterX, 2) +
        Math.pow(player.position.y - newCenterY, 2)
    );

    if (distFromCenter > FIXED_BOUNDARY_RADIUS - PLAYER_RADIUS) {
      // 방향은 유지하면서 경계 안으로 이동
      const angle = Math.atan2(
        player.position.y - newCenterY,
        player.position.x - newCenterX
      );
      const maxDist = FIXED_BOUNDARY_RADIUS - PLAYER_RADIUS - 1;
      player.position.x = newCenterX + Math.cos(angle) * maxDist;
      player.position.y = newCenterY + Math.sin(angle) * maxDist;
    }
  } else {
    // 게임 오버 상태라면 플레이어를 중앙으로
    player.position.x = newCenterX;
    player.position.y = newCenterY;
  }

  // UI 텍스트 위치 업데이트
  timeText.position.x = newCenterX;
  timeText.position.y = SCORE_TEXT_Y_POSITION;
  bigScoreText.position.x = newCenterX;
  bigScoreText.position.y = newCenterY;
  gameOverText.position.x = newCenterX;
  gameOverText.position.y = newCenterY - GAMEOVER_TEXT_Y_OFFSET;
  finalScoreText.position.x = newCenterX;
  finalScoreText.position.y = newCenterY + FINAL_SCORE_TEXT_Y_OFFSET;
  restartText.position.x = newCenterX;
  restartText.position.y = newCenterY + RESTART_TEXT_Y_OFFSET;
  saveText.position.x = newCenterX;
  saveText.position.y = newCenterY + RESTART_TEXT_Y_OFFSET + 30;
}

// 화면 리사이징 이벤트 리스너
window.addEventListener("resize", handleResize);

// 키보드 이벤트 리스너// 키보드 이벤트 리스너
window.addEventListener("keydown", (e) => {
  switch (e.key.toLowerCase()) {
    case "w":
    case "arrowup":
      gameState.keyStates.up = true;
      break;
    case "s":
    case "arrowdown":
      gameState.keyStates.down = true;
      break;
    case "a":
    case "arrowleft":
      gameState.keyStates.left = true;
      break;
    case "d":
    case "arrowright":
      gameState.keyStates.right = true;
      break;
    case " ": // 스페이스바
      if (!gameState.isPlaying) {
        restartGame();
      }
      break;
    case "x": // X키: 화면 흔들림 효과 트리거
      startScreenShake();
      break;
  }
});

window.addEventListener("keyup", (e) => {
  switch (e.key.toLowerCase()) {
    case "w":
    case "arrowup":
      gameState.keyStates.up = false;
      break;
    case "s":
    case "arrowdown":
      gameState.keyStates.down = false;
      break;
    case "a":
    case "arrowleft":
      gameState.keyStates.left = false;
      break;
    case "d":
    case "arrowright":
      gameState.keyStates.right = false;
      break;
    case "i": // I키: 점수 저장
      if (!gameState.isPlaying) {
        saveScore();
      }
      break;
  }
});

// 게임 업데이트 함수 (Two.js의 업데이트 루프에 연결)
two.bind("update", function () {
  if (!gameState.isPlaying) return;

  const currentTime = Date.now();

  // 화면 흔들림 처리
  let shakeOffsetX = 0;
  let shakeOffsetY = 0;

  if (gameState.shake.isShaking) {
    const elapsedShakeTime = currentTime - gameState.shake.startShakeTime;

    if (elapsedShakeTime < SHAKE_DURATION) {
      // 흔들림 효과 적용
      gameState.shake.intensity *= SHAKE_DECREASE_FACTOR;

      shakeOffsetX = (Math.random() * 2 - 1) * gameState.shake.intensity;
      shakeOffsetY = (Math.random() * 2 - 1) * gameState.shake.intensity;

      // 모든 요소를 움직여 화면 흔들림 구현
      two.scene.position.x = shakeOffsetX;
      two.scene.position.y = shakeOffsetY;
    } else {
      // 흔들림 종료
      gameState.shake.isShaking = false;
      gameState.shake.intensity = 0;
      two.scene.position.x = 0;
      two.scene.position.y = 0;
    }
  }

  // 플레이어 움직임
  let dx = 0;
  let dy = 0;

  if (gameState.keyStates.up) dy -= PLAYER_MOVE_SPEED;
  if (gameState.keyStates.down) dy += PLAYER_MOVE_SPEED;
  if (gameState.keyStates.left) dx -= PLAYER_MOVE_SPEED;
  if (gameState.keyStates.right) dx += PLAYER_MOVE_SPEED;

  // 대각선 이동 시 속도 정규화
  if (dx !== 0 && dy !== 0) {
    dx *= DIAGONAL_MOVEMENT_FACTOR;
    dy *= DIAGONAL_MOVEMENT_FACTOR;
  }

  // 새 위치 계산
  const newX = player.position.x + dx;
  const newY = player.position.y + dy;

  // 경계 원 내에 있는지 확인
  const distFromCenter = Math.sqrt(
    Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2)
  );

  if (distFromCenter < FIXED_BOUNDARY_RADIUS - PLAYER_RADIUS) {
    player.position.x = newX;
    player.position.y = newY;
  }

  // 화살 생성
  // 일반 화살 생성
  if (
    currentTime - gameState.lastArrowTime >
    config.arrowSpawnRate +
      Math.random() * ARROW_SPAWN_RATE_VARIATION -
      ARROW_SPAWN_RATE_VARIATION / 2
  ) {
    gameState.lastArrowTime = currentTime;
    gameState.arrows.push(createArrow());
  }

  // 8방위 화살 공격 (2~4초 간격으로)
  if (
    currentTime - gameState.lastEightDirectionAttackTime >
    gameState.nextEightDirectionAttackDelay
  ) {
    startScreenShake();
    createEightDirectionAttack();
  }

  // 화살 이동 및 충돌 확인
  gameState.arrows.forEach((arrow, index) => {
    if (!arrow.isActive) return;

    // 화살 이동
    arrow.shape.position.x += arrow.velocity.x;
    arrow.shape.position.y += arrow.velocity.y;

    // 화살 회전 (진행 방향으로)
    arrow.shape.rotation = arrow.angle + Math.PI / 2;

    // 충돌 확인
    if (checkCollision(arrow)) {
      gameOver();
      return;
    }

    // 화살 수명 확인 또는 경계 밖으로 나갔는지 확인
    const arrowAge = currentTime - arrow.createdAt;
    const distFromCenter = Math.sqrt(
      Math.pow(arrow.shape.position.x - centerX, 2) +
        Math.pow(arrow.shape.position.y - centerY, 2)
    );

    if (
      arrowAge > ARROW_LIFETIME ||
      distFromCenter > FIXED_BOUNDARY_RADIUS * BOUNDARY_CLEANUP_FACTOR
    ) {
      arrow.isActive = false;
      if (arrow.shape && (arrow.shape as any).parent) {
        (arrow.shape as any).parent.remove(arrow.shape);
      }
      gameState.arrows.splice(index, 1);
    }
  });

  // 점수 및 시간 업데이트
  if (gameState.isPlaying) {
    const survivalTimeMs = currentTime - gameState.startTime;
    gameState.score = Math.floor(survivalTimeMs / 20);

    // 살아남은 시간 계산 (초 단위)
    const survivalTimeSec = Math.floor(survivalTimeMs / 1000);
    const minutes = Math.floor(survivalTimeSec / 60);
    const seconds = (survivalTimeMs % 60000) / 1000;

    // 상단 시간 텍스트 업데이트
    timeText.value = `시간: ${
      minutes > 0 ? `${minutes}분 ` : ""
    }${seconds.toFixed(2)}초`;

    // 중앙 큰 점수 텍스트 업데이트
    bigScoreText.value = `${gameState.score}`;

    // 난이도 증가 (시간이 지날수록 화살 더 자주 생성)
    config.arrowSpawnRate = Math.max(
      100,
      ARROW_SPAWN_RATE - (survivalTimeMs / 1000) * 15
    );
  }
});

class NotificationManager {
  container: HTMLElement;
  constructor() {
    this.container = document.createElement("div");
    this.container.style.position = "fixed";
    this.container.style.bottom = "20px";
    this.container.style.right = "20px";
    this.container.style.zIndex = "1000";
    document.body.appendChild(this.container);
  }

  show(message: string, duration = 3000) {
    const notification = document.createElement("div");
    notification.innerText = message;
    notification.style.background = "rgba(0, 0, 0, 0.7)";
    notification.style.color = "white";
    notification.style.padding = "10px 20px";
    notification.style.marginTop = "10px";
    notification.style.borderRadius = "5px";
    notification.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    notification.style.opacity = "0";
    notification.style.transform = "translateY(10px)";
    notification.style.minWidth = "200px";
    notification.style.maxHeight = "0px";
    notification.style.transition = "all 0.3s ease";

    this.container.appendChild(notification);

    // Fade in
    setTimeout(() => {
      requestAnimationFrame(() => {
        notification.style.opacity = "1";
        notification.style.transform = "translateY(0)";
        notification.style.maxHeight = "calc(1.2em + 20px)";
      });
    }, 10);

    // Fade out and remove after duration
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(10px)";
      notification.addEventListener("transitionend", () => {
        notification.remove();
      });
    }, duration);
  }
}

const notifier = new NotificationManager();
(window as any).notifier = notifier;

// 리더보드 드로어 초기화 및 제어
function initializeLeaderboard() {
  const drawer = document.getElementById("leaderboard-drawer") as HTMLElement;
  const toggleButton = document.getElementById("drawer-toggle") as HTMLElement;

  // 토글 버튼 클릭 이벤트
  toggleButton.addEventListener("click", () => {
    drawer.classList.toggle("open");
  });

  // ESC 키로 드로어 닫기
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("open")) {
      drawer.classList.remove("open");
    }
  });
}

function showLeaderboard(scores: [string, number][]) {
  const list = document.getElementById("leaderboard-list") as HTMLElement;
  list.innerHTML = ""; // 기존 내용 지우기

  console.log("Showing leaderboard:", scores);
  if (scores.length === 0) {
    const noDataItem = document.createElement("li");
    noDataItem.innerText = "저장된 점수가 없습니다.";
    list.appendChild(noDataItem);
    return;
  }

  scores.forEach(([name, score], index) => {
    const listItem = document.createElement("li");
    listItem.innerText = `${index + 1}. ${name} - ${Math.floor(score / 20)}점`;
    list.appendChild(listItem);
  });
}

async function fetchLeaderboard() {
  notifier.show("리더보드 불러오는중...");
  const lb: [string, number][] = await kv.get("l", (now, total) => {
    notifier.show(`리더보드 불러오는중... ${now} / ${total}`, 500);
  });
  console.log("Fetched leaderboard:", lb);
  showLeaderboard(lb);
  notifier.show("리더보드를 불러왔습니다!");
}

async function saveScore() {
  if (gameState.isPlaying)
    return notifier.show("게임 중에는 점수를 저장할 수 없습니다.");
  if (gameState.score <= 0)
    return notifier.show("점수가 0점 이하일 때는 저장할 수 없습니다.");
  if (gameState.scoreSaved) return notifier.show("이미 점수를 저장했습니다.");
  gameState.scoreSaved = true;
  const score = gameState.timeMS;
  if (score <= 0) return;
  const cf = confirm(`점수 ${Math.floor(score / 20)}점을 저장하시겠습니까?`);
  if (!cf) return;
  const namePrompt = () => {
    // allow only english in lowercase, numbers, _, -
    const name = prompt(
      "이름을 입력하세요 (영어 소문자, 숫자, _, - 만 가능, 최대 10자)"
    );
    if (!name) return null;
    if (name.length > 10) {
      alert("이름이 너무 깁니다. 최대 10자까지 가능합니다.");
      return namePrompt();
    }
    if (!/^[a-z0-9_-]+$/.test(name)) {
      alert("이름에 허용되지 않는 문자가 포함되어 있습니다.");
      return namePrompt();
    }
    return name;
  };
  const name = namePrompt();
  if (!name) return;

  console.log("Saving score:", score, name);
  notifier.show("리더보드 가저오는중...");
  let lb: [string, number][] = await kv.get("l", (now, total) => {
    notifier.show(`리더보드 불러오는중... ${now} / ${total}`, 100);
  });
  if (lb.length < 10) {
    lb.push([name, score]);
    lb = lb.sort((a, b) => b[1] - a[1]);
    notifier.show("리더보드 저장중...");
    showLeaderboard(lb);
    await kv.set("l", lb, (now, total) => {
      notifier.show(`리더보드 저장중... ${now} / ${total}`, 500);
    });
    notifier.show("점수가 저장되었습니다!");
    return;
  }
  if (lb[lb.length - 1][1] >= score) {
    notifier.show("점수가 리더보드에 들지 못했습니다.");
    return;
  }
  lb.push([name, score]);
  lb = lb.sort((a, b) => b[1] - a[1]);
  while (lb.length > 10) lb.pop();
  console.log("New leaderboard:", lb);
  notifier.show("리더보드 저장중...");
  await kv.set("l", lb, (now, total) => {
    notifier.show(`리더보드 저장중... ${now} / ${total}`, 500);
  });
  notifier.show("점수가 저장되었습니다!");
  showLeaderboard(lb);
}

// 리더보드 초기화 및 게임 시작
initializeLeaderboard();
restartGame();
fetchLeaderboard();
