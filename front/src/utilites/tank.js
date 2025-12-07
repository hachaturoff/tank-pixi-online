import { Application, Sprite, Texture, RenderTexture, Graphics } from 'pixi.js';

export function tankGraphics(renderer) {
  const size = 25;
  const renderTexture = RenderTexture.create({ width: 20, height: size });

  // Временный Graphics для рисования танка
  const tankGraphics = new Graphics();

  // 1. Гусеницы (темно-серые)
  tankGraphics.rect(0, 0, 6, 25);
  tankGraphics.fill(0x333333);
  
  tankGraphics.rect(14, 0, 6, 25);
  tankGraphics.fill(0x333333);

//   2. Корпус (оливково-зеленый)
  tankGraphics.rect(2, 2, 16, 20);
  tankGraphics.fill(0x4a5d23);

  // 3. Башня ()
  tankGraphics.rect(5, 5, 10, 15);
  tankGraphics.fill(0x3a4d23);


  // 4. Ствол (черный)
  tankGraphics.rect(8, 15, 4, 15);
  tankGraphics.fill(0x222222);


  // Рендерим текстуру
  renderer.render(tankGraphics, { renderTexture });
  
  // Очищаем временный Graphics
  tankGraphics.destroy();

  return renderTexture;
}