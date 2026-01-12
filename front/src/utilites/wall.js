import { Graphics, RenderTexture } from 'pixi.js';

export function createWallTexture(app) {
    const size = 25; // Устанавливаем целевой размер 25x25
    const renderer = app.renderer;

    // Палитра Dendy (NES)
    const COLOR_MORTAR = 0x000000;    // Черный (швы)
    const COLOR_BRICK_BASE = 0xAD4300; // Темно-оранжевый (кирпич)
    const COLOR_HIGHLIGHT = 0xCE8541;  // Светло-бежевый (блик)

    // Параметры кирпича (в оригинале на один блок 16x16 шло 4 ряда кирпичей)
    // Для блока 50x50 сделаем их чуть крупнее для сохранения стиля
    const brickW = 11;
    const brickH = 5;
    const gap = 1; // Толщина шва

    const renderTexture = RenderTexture.create({ width: size, height: size });
    const g = new Graphics();

    // 1. Заливаем фон цветом шва (черным)
    g.fill(COLOR_MORTAR);
    g.rect(0, 0, size, size);

    // 2. Рисуем кирпичи
    let rowCount = 0;
    for (let y = 0; y < size; y += brickH + gap) {
        // Каждый второй ряд смещаем на половину ширины кирпича
        const offset = (rowCount % 2 === 1) ? -(brickW / 2) : 0;

        for (let x = offset; x < size; x += brickW + gap) {
            // Рисуем основное тело кирпича
            g.fill(COLOR_BRICK_BASE);
            g.rect(x, y, brickW, brickH);

            // Рисуем Г-образный блик для объема (сверху и слева)
            // Это придает тот самый 8-битный объем
            g.fill(COLOR_HIGHLIGHT);
            // Верхняя грань
            g.rect(x, y, brickW, gap); 
            // Левая грань
            g.rect(x, y, gap, brickH);
        }
        rowCount++;
    }

    // Рендерим графику в текстуру
    renderer.render({
        container: g,
        target: renderTexture,
    });

    // Важно для пиксель-арта: отключаем сглаживание
    renderTexture.source.scaleMode = 'nearest';

    g.destroy();

    return renderTexture;
}