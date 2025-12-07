<template>
    <div ref="gameContainer" class="game-container" tabindex="0"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Application, Sprite, Texture, RenderTexture, Graphics } from 'pixi.js';
import { tankGraphics } from "@/utilites/tank.js"

import { io } from "socket.io-client";
const socket = io("http://localhost:3000");


const gameContainer = ref(null);
const keys = {};
let app = null;
let player = null;
let otherPlayer = {};
let speed = 2;
let bullets = [];
let lastShotTime = 0;
const shotDelay = 400;
let handleKeyDown, handleKeyUp;

socket.on("init", (players) => {
    console.log("Init players:", players);
        
    if(player) {
        const playerData = players[socket.id];

        player.x = playerData.x;
        player.y = playerData.y;
    } else {

    }
        
})

socket.on("shoot", (data) => {
    const bulletData = data.bullet;
    const bullet = new Graphics();
    // bullet.rect(-2, -2, 4, 4);
    bullet.circle(0, 0, 2);
    bullet.fill(0xff0000);

    bullet.x = bulletData.x;
    bullet.y = bulletData.y;
    bullet.rotation = bulletData.rotation;
    bullet.speed = bulletData.speed;

    app.stage.addChild(bullet);
    bullets.push(bullet);
});

socket.on("gameState", (players) => {
    // 1. Update or Create players
    for(const playerId in players) {
        if(playerId === socket.id) continue;

        const playerData = players[playerId];

        if (!otherPlayer[playerId]) {
            // New player joined
            const tankTexture = tankGraphics(app.renderer);
            const newSprite = new Sprite(tankTexture);
            
            newSprite.anchor.set(0.5);
            newSprite.scale.set(2);
            
            app.stage.addChild(newSprite);
            otherPlayer[playerId] = newSprite;
        }

        // Update position
        const otherSprite = otherPlayer[playerId];
        otherSprite.x = playerData.x;
        otherSprite.y = playerData.y;
        otherSprite.rotation = playerData.rotation;
    }

    // 2. Remove disconnected players
    for (const existingPlayerId in otherPlayer) {
        if (!players[existingPlayerId]) {
            // Player left
            if (otherPlayer[existingPlayerId]) {
                app.stage.removeChild(otherPlayer[existingPlayerId]);
                otherPlayer[existingPlayerId].destroy();
                delete otherPlayer[existingPlayerId];
            }
        }
    }
});

onMounted(async () => {

    app = new Application();
    await app.init({
        background: '#5f3a22',
        width: 600,
        
        height: 600
    });

    gameContainer.value.appendChild(app.canvas);
    gameContainer.value.focus();

    const field = new Graphics();
    field.rect(0, 0, 600, 600);
    field.stroke({ width: 4, color: 0xffffff });
    app.stage.addChild(field);

    const tankTexture = tankGraphics(app.renderer);
    player = new Sprite(tankTexture);
    player.anchor.set(0.5);
    player.scale.set(2);
    app.stage.addChild(player);

    

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
        let moved = false;
        let rotationAngle = 0;

        if (keys["ArrowUp"]) {
            player.y -= speed;
            rotationAngle = Math.PI;
            moved = true;
        }
        if (keys["ArrowDown"]) {
            player.y += speed;
            rotationAngle = 0;
            moved = true;
        }
        if (keys["ArrowLeft"]) {
            player.x -= speed;
            rotationAngle = Math.PI / 2;
            moved = true;
        }
        if (keys["ArrowRight"]) {
            player.x += speed;
            rotationAngle = Math.PI * 1.5;
            moved = true;
        }

        // Keep player within bounds (accounting for player size)
        player.x = Math.max(15, Math.min(585, player.x));
        player.y = Math.max(15, Math.min(585, player.y));

        if (moved) {
            player.rotation = rotationAngle;

            socket.emit("playerMovement", {
                x: player.x,
                y: player.y,
                rotation: player.rotation
            });
        }

        updateBullets();
    });
});

const createBullet = () => {
    const bullet = new Graphics();
    // bullet.rect(-2, -2, 4, 4);
    bullet.circle(0, 0, 2);
    bullet.fill(0xffff00);

    const MUZZLE_DISTANCE = 0;
    const angle = player.rotation;
    const dx = MUZZLE_DISTANCE * Math.cos(angle);
    const dy = MUZZLE_DISTANCE * Math.sin(angle);

    bullet.x = player.x + dx;
    bullet.y = player.y + dy;

    bullet.rotation = angle - Math.PI * 1.5;   

    bullet.speed = 8;
    app.stage.addChild(bullet);

    

    return bullet;
}

const shoot = () => {
    const now = Date.now();
    if (now - lastShotTime < shotDelay) return;

    const bullet = createBullet();

    socket.emit("shoot", {
        playerId: socket.id,
        bullet: {
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
        }
    }
}

onUnmounted(() => {
    // Clean up event listeners
    if (handleKeyDown) {
        window.removeEventListener('keydown', handleKeyDown);
    }
    if (handleKeyUp) {
        window.removeEventListener('keyup', handleKeyUp);
    }

    bullets.forEach(bullet => bullet.destroy());
    bullets = [];

    if (app) {
        app.destroy(true, { children: true, texture: true, baseTexture: true });
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