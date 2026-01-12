export const createBullet = () => {
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