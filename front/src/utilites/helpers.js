import { MAP_GRID } from "@/utilites/map.js"
const TILE_SIZE = 25;
// Проверка коллизии игрока со стенами (учитывая размер танка)
export const checkPlayerCollision = (x, y, halfSize = 24) => {
    // Проверяем все 4 угла танка
    return isWall(x - halfSize, y - halfSize) ||
           isWall(x + halfSize, y - halfSize) ||
           isWall(x - halfSize, y + halfSize) ||
           isWall(x + halfSize, y + halfSize);
}

// Проверка, является ли клетка стеной
export const isWall = (x, y) => {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    
    // Проверка границ массива
    if (row < 0 || row >= MAP_GRID.length || col < 0 || col >= MAP_GRID[0].length) {
        return true; // За границами = стена
    }

    if ((x >= 195 && x <= 230 && y >= 0 && y <= 45) || // База 1
        (x >= 195 && x <= 230 && y >= 560 && y <= 600)) { // База 2
        return true;
    }
    
    return MAP_GRID[row][col] === 1;
}

export const isBase = (x, y) => {
    if ((x >= 195 && x <= 230 && y >= 0 && y <= 45) || // База 1
        (x >= 195 && x <= 230 && y >= 560 && y <= 600)) { // База 2
        return true;
    }
}

// Проверка коллизии с другими игроками
export const checkOtherPlayersCollision = (x, y, otherPlayers, collisionRadius = 50) => {
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

// Линейная интерполяция для плавного движения
export const lerp = (start, end, amt) => { 
  return (1 - amt) * start + amt * end;
}