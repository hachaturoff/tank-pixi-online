<template>
    <div ref="gameContainer" class="game-container" tabindex="0"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Application, Sprite, Texture, RenderTexture, Graphics } from 'pixi.js';
import { tankGraphics } from "@/utilites/tank.js"
import { wallGraphics } from "@/utilites/wall.js"
import { MAP_GRID } from "@/utilites/map.js"

const props = defineProps({
    socket: Object,
    matchId: String
});

const gameContainer = ref(null);
const keys = {};
let app = null;
let player = null;
let otherPlayers = {};
let speed = 2;
let bullets = [];
let lastShotTime = 0;
const shotDelay = 400;
let handleKeyDown, handleKeyUp;
let pendingInitData = null; // Хранит данные init если они пришли до создания player
let isInitialized = false; // Флаг готовности PIXI приложения

const TILE_SIZE = 25;

// Линейная интерполяция для плавного движения
const lerp = (start, end, amt) => {
  return (1 - amt) * start + amt * end;
}

// Проверка, является ли клетка стеной
const isWall = (x, y) => {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    
    // Проверка границ массива
    if (row < 0 || row >= MAP_GRID.length || col < 0 || col >= MAP_GRID[0].length) {
        return true; // За границами = стена
    }
    
    return MAP_GRID[row][col] === 1;
}

// Проверка коллизии игрока со стенами (учитывая размер танка)
const checkPlayerCollision = (x, y, halfSize = 24) => {
    // Проверяем все 4 угла танка
    return isWall(x - halfSize, y - halfSize) ||
           isWall(x + halfSize, y - halfSize) ||
           isWall(x - halfSize, y + halfSize) ||
           isWall(x + halfSize, y + halfSize);
}

// Проверка коллизии с другими игроками
const checkOtherPlayersCollision = (x, y, collisionRadius = 50) => {
    for (const playerId in otherPlayers) {
        const other = otherPlayers[playerId];
        if (!other) continue;
        
        const dx = x - other.x;
        const dy = y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Если расстояние между центрами меньше суммы радиусов — есть коллизия
        if (distance < collisionRadius) {
            return true;
        }
    }
    return false;
}

// Функция настройки обработчиков сокетов
const setupSocketListeners = () => {
    // Инициализация позиции игрока
    console.log("props.socket", props.socket);
    props.socket.on("init", (players) => {
        console.log("Init players:", players);
        
        const playerData = players[props.socket.id];
        if (!playerData) return;
        
        if(player) {
            // Player уже создан - применяем сразу
            player.x = playerData.x;
            player.y = playerData.y;
        } else {
            // Player ещё не создан - сохраняем для применения позже
            pendingInitData = playerData;
        }
    });

    // Обработка смерти игрока
    props.socket.on("deathPlayer", (data) => {
        if (!isInitialized || !app) return;
        
        const victimId = data.id;
        if (victimId === props.socket.id) {
            // Я умер
            alert("Вы уничтожены! Игра окончена.");
            if (player) {
                app.stage.removeChild(player);
                player.destroy();
                player = null;
            }
        } else {
            // Кто-то другой умер
            if (otherPlayers[victimId]) {
                app.stage.removeChild(otherPlayers[victimId]);
                otherPlayers[victimId].destroy();
                delete otherPlayers[victimId];
            }
        }
    });

    // Обработка выстрелов других игроков
    props.socket.on("shoot", (data) => {
        if (!isInitialized || !app) return;
        
        const bulletData = data.bullet;
        const bullet = new Graphics();
        bullet.circle(0, 0, 2);
        bullet.fill(0xff0000);

        bullet.x = bulletData.x;
        bullet.y = bulletData.y;
        bullet.rotation = bulletData.rotation;
        bullet.speed = bulletData.speed;
        bullet.ownerId = data.playerId;

        app.stage.addChild(bullet);
        bullets.push(bullet);
    });

    // Обновление состояния игры
    props.socket.on("gameState", (players) => {
        if (!isInitialized || !app || !app.renderer) return;
        for(const playerId in players) {
            if(playerId === props.socket.id) continue;

            const playerData = players[playerId];

            if (!otherPlayers[playerId]) {
                // Новый игрок присоединился
                const tankTexture = tankGraphics(app.renderer, playerData.color);
                const newSprite = new Sprite(tankTexture);
                
                newSprite.anchor.set(0.5);
                newSprite.scale.set(2);
                
                // Инициализация целевых значений
                newSprite.targetX = playerData.x;
                newSprite.targetY = playerData.y;
                newSprite.targetRotation = playerData.rotation;
                newSprite.x = playerData.x;
                newSprite.y = playerData.y;
                newSprite.rotation = playerData.rotation;
                
                app.stage.addChild(newSprite);
                otherPlayers[playerId] = newSprite;
            }

            // Обновление целевых координат
            const otherSprite = otherPlayers[playerId];
            otherSprite.targetX = playerData.x;
            otherSprite.targetY = playerData.y;
            otherSprite.targetRotation = playerData.rotation;
        }

        // 2. Удаление отключившихся игроков
        for (const existingPlayerId in otherPlayers) {
            if (!players[existingPlayerId]) {
                if (otherPlayers[existingPlayerId]) {
                    app.stage.removeChild(otherPlayers[existingPlayerId]);
                    otherPlayers[existingPlayerId].destroy();
                    delete otherPlayers[existingPlayerId];
                }
            }
        }
    });
};

onMounted(async () => {
    // Ждём nextTick чтобы DOM был готов
    await nextTick();

    if (!props.matchId || !gameContainer.value) return;

    // Настройка обработчиков сокетов СРАЗУ, до асинхронных операций
    // Это критично, т.к. сервер может отправить init до завершения app.init()
    setupSocketListeners();

    console.log("props", props);

    app = new Application();
    await app.init({
        background: '#5f3a22',
        width: 600,
        height: 600
    });

    // Проверяем gameContainer после асинхронной операции (компонент мог размонтироваться)
    if (!gameContainer.value) {
        if (app) app.destroy();
        app = null;
        return;
    }

    gameContainer.value.appendChild(app.canvas);
    gameContainer.value.focus();

    const field = new Graphics();
    field.rect(0, 0, 600, 600);
    field.stroke({ width: 4, color: 0xffffff });
    app.stage.addChild(field);

    const wallTexture = wallGraphics(app.renderer);

    for (let row = 0; row < MAP_GRID.length; row++) {
        for (let col = 0; col < MAP_GRID[row].length; col++) {
            
            // Если значение в массиве равно 1, создаем стену
            if (MAP_GRID[row][col] === 1) {
                // Создаем новый спрайт, используя общую текстуру
                const wallSprite = new Sprite(wallTexture);

                // Устанавливаем позицию, используя координаты сетки и размер тайла
                wallSprite.x = col * TILE_SIZE;
                wallSprite.y = row * TILE_SIZE;

                // Добавляем стену на сцену
                app.stage.addChild(wallSprite);
            }
        }
    }

    const tankTexture = tankGraphics(app.renderer);
    player = new Sprite(tankTexture);
    player.anchor.set(0.5);
    player.scale.set(2);
    app.stage.addChild(player);

    // Применяем сохранённые данные init если они пришли до создания player
    if (pendingInitData) {
        player.x = pendingInitData.x;
        player.y = pendingInitData.y;
        pendingInitData = null;
    }

    // Помечаем что PIXI готов к работе
    isInitialized = true;

    handleKeyDown = (e) => {
        keys[e.code] = true;

        if (e.code === 'Space') {
            shoot();
            e.preventDefault();
        }
    };

    handleKeyUp = (e) => {
        keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    app.ticker.add(() => {
        // Защита от работы когда компонент размонтирован или player уничтожен
        if (!isInitialized || !player) return;
        
        let moved = false;
        let rotationAngle = 0;
        
        // Сохраняем предыдущую позицию
        const prevX = player.x;
        const prevY = player.y;

        if (keys["ArrowUp"]) {
            player.y -= speed;
            rotationAngle = Math.PI;
            moved = true;
        } else if (keys["ArrowDown"]) {
            player.y += speed;
            rotationAngle = 0;
            moved = true;
        } else if (keys["ArrowLeft"]) {
            player.x -= speed;
            rotationAngle = Math.PI / 2;
            moved = true;
        } else if (keys["ArrowRight"]) {
            player.x += speed;
            rotationAngle = Math.PI * 1.5;
            moved = true;
        }

        // Проверка коллизии со стенами и другими игроками
        if (checkPlayerCollision(player.x, player.y) || checkOtherPlayersCollision(player.x, player.y)) {
            // Откатываем позицию если врезались в стену или другого игрока
            player.x = prevX;
            player.y = prevY;
            moved = false;
        }

        // Keep player within bounds (accounting for player size)
        player.x = Math.max(15, Math.min(585, player.x));
        player.y = Math.max(15, Math.min(585, player.y));

        if (moved) {
            player.rotation = rotationAngle;
            console.log("wallTexture", wallTexture);
            
            props.socket.emit("playerMovement", {
                x: player.x,
                y: player.y,
                rotation: player.rotation
            });
        }

        // Плавная интерполяция других игроков
        for (const playerId in otherPlayers) {
            const other = otherPlayers[playerId];
            if (other && other.targetX !== undefined) {
                other.x = lerp(other.x, other.targetX, 0.15);
                other.y = lerp(other.y, other.targetY, 0.15);
                other.rotation = lerp(other.rotation, other.targetRotation, 0.15);
            }
        }

        updateBullets();
    });

    
});

const createBullet = () => {
    const bullet = new Graphics();
    bullet.circle(0, 0, 2);
    bullet.fill(0xffff00);

    const MUZZLE_DISTANCE = 0;
    const angle = player.rotation;
    const dx = MUZZLE_DISTANCE * Math.cos(angle);
    const dy = MUZZLE_DISTANCE * Math.sin(angle);

    bullet.x = player.x + dx;
    bullet.y = player.y + dy;

    bullet.rotation = angle - Math.PI * 1.5;   

    bullet.speed = 6;
    bullet.ownerId = props.socket.id;

    app.stage.addChild(bullet);

    return bullet;
}

const shoot = () => {
    const now = Date.now();
    if (now - lastShotTime < shotDelay) return;

    const bullet = createBullet();

    props.socket.emit("shoot", {
        playerId: props.socket.id,
        bullet: {
            id: bullet.ownerId,
            x: bullet.x,
            y: bullet.y,
            rotation: bullet.rotation,
            speed: bullet.speed,
        }
    });

    bullets.push(bullet);
    lastShotTime = now;
}

const updateBullets = () => {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        bullet.x += Math.cos(bullet.rotation) * bullet.speed;
        bullet.y += Math.sin(bullet.rotation) * bullet.speed;

        if (bullet.x < -10 || bullet.x > 610 || bullet.y < -10 || bullet.y > 610) {
            bullet.destroy();
            bullets.splice(i, 1);
            continue; // Bullet removed, skip collision check
        }

        // Проверка коллизии пули со стеной
        if (isWall(bullet.x, bullet.y)) {
            bullet.destroy();
            bullets.splice(i, 1);
            continue; // Bullet hit wall, skip player collision check
        }

        if (bullet.ownerId !== props.socket.id) continue; 

        for (const playerId in otherPlayers) {
            const enemy = otherPlayers[playerId];

            if (!enemy) continue;

            // Simple distance check or AABB
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // 20 is approx radius of tank (since scale is 2 and maybe texture is small, actually tank texture size unknown but assuming ~40px width total)
            if (dist < 30) {
                    props.socket.emit("playerHit", { id: playerId });
                    bullet.destroy();
                    bullets.splice(i, 1);
                    break; // Bullet hit something, stop checking other enemies
            }
        }
    }
}


onUnmounted(() => {
    // СНАЧАЛА помечаем что приложение больше не работает
    // Это предотвратит ошибки в socket handlers и ticker
    isInitialized = false;

    // Останавливаем рендеринг ПОЛНОСТЬЮ перед очисткой
    if (app) {
        // Делаем stage невидимым чтобы предотвратить ошибки рендера
        if (app.stage) {
            app.stage.renderable = false;
        }
        // Полностью останавливаем и уничтожаем ticker
        if (app.ticker) {
            app.ticker.stop();
            app.ticker.destroy();
        }
    }

    // Очистка обработчиков сокетов
    if (props.socket) {
        props.socket.off('init');
        props.socket.off('gameState');
        props.socket.off('deathPlayer');
        props.socket.off('shoot');
    }

    // Очистка обработчиков клавиатуры
    if (handleKeyDown) {
        window.removeEventListener('keydown', handleKeyDown);
    }
    if (handleKeyUp) {
        window.removeEventListener('keyup', handleKeyUp);
    }

    // Очистка пуль
    if (bullets && bullets.length > 0) {
        bullets.forEach(bullet => {
            if (bullet && bullet.destroy) {
                try {
                    bullet.destroy();
                } catch (e) {
                    // игнорируем ошибки при очистке
                }
            }
        });
        bullets = [];
    }

    // Очистка других игроков
    for (const playerId in otherPlayers) {
        if (otherPlayers[playerId] && otherPlayers[playerId].destroy) {
            try {
                otherPlayers[playerId].destroy();
            } catch (e) {
                // игнорируем ошибки при очистке
            }
        }
    }
    otherPlayers = {};

    // Очистка игрока
    if (player && player.destroy) {
        try {
            player.destroy();
        } catch (e) {
            // игнорируем ошибки при очистке
        }
        player = null;
    }

    // Очистка PIXI приложения
    if (app) {
        try {
            app.destroy(true);
        } catch (e) {
            // игнорируем ошибки при очистке
        }
        app = null;
    }
});


</script>

<style scoped>
.game-container {
    width: 600px;
    height: 600px;
    margin: 20px auto;
    border: 2px solid #444;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    outline: none;
    /* Remove focus outline */
}
</style>