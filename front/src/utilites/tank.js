import { Application, Sprite, Texture, RenderTexture, Graphics } from "pixi.js";

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

export function tankTwoGraphics(renderer) {
  const size = 25;
  // под спрайт 20x25 (вспомогательно, по сути 16x16 растянуто по высоте)
  const renderTexture = RenderTexture.create({ width: 20, height: size });

  // Временный Graphics для рисования танка
  const tankGraphics = new Graphics();

  // фон прозрачный
  tankGraphics.clear();

  // 1. Гусеницы (темно-серые) — узкие столбики по краям
  tankGraphics.rect(0, 3, 4, 19);
  tankGraphics.fill(0x444444);

  tankGraphics.rect(16, 3, 4, 19);
  tankGraphics.fill(0x444444);

  // 2. Корпус (желтый/зеленый как в Battle City)
  tankGraphics.rect(4, 5, 12, 15);
  tankGraphics.fill(0xb8b800); // желтый как у 1P [web:21]

  // 3. Башня (почти квадрат в центре)
  tankGraphics.rect(7, 8, 6, 9);
  tankGraphics.fill(0xa0a000);

  // 4. Ствол (короткий, выступает вверх)
  tankGraphics.rect(9, 0, 2, 8);
  tankGraphics.fill(0xa0a000);

  // Рендерим текстуру
  renderer.render(tankGraphics, { renderTexture });

  // Очищаем временный Graphics
  tankGraphics.destroy();
  return renderTexture;
}
