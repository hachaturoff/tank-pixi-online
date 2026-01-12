import { Graphics, RenderTexture, Sprite } from 'pixi.js';

export function createBaseTexture(app) {
   const targetSize = 40;
    const renderer = app.renderer;
    const g = new Graphics();

    // =========================================
    // 1. КИРПИЧНАЯ СТЕНА (40x40)
    // =========================================
    const COLOR_MORTAR = 0x000000;
    const COLOR_BRICK_BASE = 0xAD4300;
    const COLOR_HIGHLIGHT = 0xCE8541;

    // Уменьшаем размер кирпича для соответствия масштабу
    const brickW = 11; 
    const brickH = 5;
    const gap = 1;

    g.fill(COLOR_MORTAR);
    g.rect(0, 0, targetSize, targetSize);

    let rowCount = 0;
    for (let y = 0; y < targetSize; y += brickH + gap) {
        const offset = (rowCount % 2 === 1) ? -2 : 0;
        for (let x = offset; x < targetSize; x += brickW + gap) {
            g.fill(COLOR_BRICK_BASE);
            g.rect(x, y, brickW, brickH);
            g.fill(COLOR_HIGHLIGHT);
            g.rect(x, y, brickW, 1); // Тонкий блик
            g.rect(x, y, 1, brickH);
        }
        rowCount++;
    }

    // =========================================
    // 2. ОРЁЛ (Уменьшенный масштаб)
    // =========================================
    const E_GOLD = 0xFEFB00;
    const E_SHADOW = 0xD3A100;
    const E_BLACK = 0x000000;
    const E_WHITE = 0xFFFFFF;

    const p = 2; // Уменьшили размер "пикселя" орла с 3 до 2
    const centerX = targetSize / 2;
    const bottomY = targetSize - 2;

    // --- КОНТУР ---
    g.fill(E_BLACK);
    g.rect(centerX - 6*p, bottomY - 12*p, 12*p, 10*p); // Крылья
    g.rect(centerX - 2*p, bottomY - 14*p, 4*p, 3*p);  // Голова

    // --- ТЕЛО И КРЫЛЬЯ ---
    g.fill(E_GOLD);
    g.rect(centerX - 5*p, bottomY - 11*p, 10*p, 8*p); // Размах
    g.rect(centerX - 1.5*p, bottomY - 13*p, 3*p, 3*p); // Голова
    g.rect(centerX - 5*p, bottomY - 2*p, 10*p, 2*p);  // Подставка

    // --- ТЕНИ ---
    g.fill(E_SHADOW);
    g.rect(centerX + 2*p, bottomY - 10*p, 2*p, 6*p); // Тень правого крыла
    g.rect(centerX + 0.5*p, bottomY - 12.5*p, 1*p, 2*p); // Тень головы

    // --- ГЛАЗ ---
    g.fill(E_WHITE);
    g.rect(centerX - 1*p, bottomY - 12.5*p, 1*p, 1*p);

    // =========================================
    // 3. РЕНДЕР
    // =========================================
    const renderTexture = RenderTexture.create({ width: targetSize, height: targetSize });

    renderer.render({
        container: g,
        target: renderTexture,
    });

    renderTexture.source.scaleMode = 'nearest';
    g.destroy();

    return renderTexture;
}

// В файл с текстурами базы добавьте:
export function createDestroyedBaseTexture(app) {
    const targetSize = 40;
    const g = new Graphics();
    
    // Рисуем те же кирпичи (как фон)
    // ... (можно скопировать блок отрисовки кирпичей из createBaseTexture) ...
    // Для краткости здесь только логика поверх:

    // Вместо орла рисуем "кучу обломков" или серый силуэт
    g.fill(0x555555); // Серый цвет обломков
    g.rect(10, 10, 20, 20);
    g.fill(0x000000); 
    g.rect(15, 15, 10, 10); // Дыра в центре

    const renderTexture = app.renderer.generateTexture(g);
    renderTexture.source.scaleMode = 'nearest';
    g.destroy();
    return renderTexture;
}

// Инициализация баз для игроков
export function initBases(app) {
    const baseTexture = createBaseTexture(app);

    const baseP1 = new Sprite(baseTexture);
    baseP1.position.set(195, 0);
    // Можно подкрасить базу первого игрока, например, в синеватый оттенок
    // baseP1.tint = 0xAAAAFF; 

    const baseP2 = new Sprite(baseTexture);
    baseP2.position.set(195, 560);

    return { baseP1, baseP2 };
}