import { Application, Sprite, Texture, RenderTexture, Graphics } from 'pixi.js';

export function wallGraphics(renderer) {
    const size = 25;
    const renderTexture = RenderTexture.create({ width: size, height: size });

    const wallGraphics = new Graphics();

    // Рисуем стену (коричневый цвет)
    wallGraphics.rect(0, 0, size, size);
    wallGraphics.fill(0x8B4513); // Коричневый цвет

    renderer.render(wallGraphics, { renderTexture });

    wallGraphics.destroy();

    return renderTexture;
}