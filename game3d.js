const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
const keys = {};
let score = 0;
let gameRunning = true;
let particleEffect = [];
let shopOpen = false;

// Camera system
const camera = {
    angle: 0, // 0 = rear view, 1 = right, -1 = left
    targetAngle: 0,
    x: 0,
    y: 0,
    z: 0
};

// Player car with upgrades
const player = {
    x: 0,
    speed: 0,
    maxSpeed: 8,
    acceleration: 0.3,
    friction: 0.95,
    boostPower: 0,
    maxBoost: 100,
    health: 100,
    maxHealth: 100,
    money: 0,
    // Upgrades
    upgrades: {
        engine: 0,      // Increases max speed
        handling: 0,    // Improves turning
        armor: 0,       // Increases health
        turbo: 0        // Increases boost capacity
    }
};

// Upgrade prices and stats
const upgradeShop = {
    engine: {
        name: 'Engine',
        price: 50,
        maxLevel: 5,
        description: 'Increase max speed',
        effect: function(level) {
            return 8 + (level * 0.8);
        }
    },
    handling: {
        name: 'Handling',
        price: 40,
        maxLevel: 5,
        description: 'Improve turning',
        effect: function(level) {
            return 6 + (level * 1.2);
        }
    },
    armor: {
        name: 'Armor',
        price: 60,
        maxLevel: 5,
        description: 'Increase health',
        effect: function(level) {
            return 100 + (level * 20);
        }
    },
    turbo: {
        name: 'Turbo',
        price: 45,
        maxLevel: 5,
        description: 'Boost capacity',
        effect: function(level) {
            return 100 + (level * 20);
        }
    }
};

// Obstacles and coins
let obstacles = [];
let coins = [];
let spawnCounter = 0;

// Particle class for effects
class Particle {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = 1.0;
        this.decay = 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life -= this.decay;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isAlive() {
        return this.life > 0;
    }
}

// 3D Obstacle class
class Obstacle3D {
    constructor() {
        this.y = -100;
        this.x = (Math.random() - 0.5) * 200;
        this.width = 50;
        this.height = 60;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.02 + 0.01;
    }

    update() {
        this.y += player.speed;
        this.wobble += this.wobbleSpeed;
    }

    isOffScreen() {
        return this.y > canvas.height + 50;
    }

    draw() {
        const scale = (canvas.height - this.y) / canvas.height;
        if (scale < 0.05) return;

        const wobbleAmount = Math.sin(this.wobble) * 3;
        const scaledWidth = this.width * scale;
        const scaledHeight = this.height * scale;
        
        // Apply camera offset
        const screenX = canvas.width / 2 + (this.x + camera.x * 300) * scale + wobbleAmount;
        const screenY = this.y;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.ellipse(screenX, screenY + scaledHeight + 5, scaledWidth / 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Gradient car body
        const gradient = ctx.createLinearGradient(screenX - scaledWidth / 2, screenY, screenX - scaledWidth / 2, screenY + scaledHeight);
        gradient.addColorStop(0, '#FF8080');
        gradient.addColorStop(1, '#CC2222');
        ctx.fillStyle = gradient;
        ctx.fillRect(screenX - scaledWidth / 2, screenY, scaledWidth, scaledHeight);

        // Car outline
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - scaledWidth / 2, screenY, scaledWidth, scaledHeight);

        // Windows - gradient
        const windowGradient = ctx.createLinearGradient(screenX - scaledWidth / 2, screenY + 10, screenX - scaledWidth / 2, screenY + 10 + scaledHeight * 0.3);
        windowGradient.addColorStop(0, '#00D4FF');
        windowGradient.addColorStop(1, '#0099CC');
        ctx.fillStyle = windowGradient;
        ctx.fillRect(screenX - scaledWidth / 2 + 5, screenY + 10, scaledWidth - 10, scaledHeight * 0.3);
        ctx.strokeStyle = '#006699';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX - scaledWidth / 2 + 5, screenY + 10, scaledWidth - 10, scaledHeight * 0.3);

        // Headlights - glow effect
        ctx.fillStyle = '#FFFF00';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFFF00';
        ctx.beginPath();
        ctx.arc(screenX - scaledWidth / 3, screenY - 3, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(screenX + scaledWidth / 3, screenY - 3, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Wheels
        ctx.fillStyle = '#222';
        ctx.fillRect(screenX - scaledWidth / 2 - 3, screenY + scaledHeight - 8, 6, 8);
        ctx.fillRect(screenX + scaledWidth / 2 - 3, screenY + scaledHeight - 8, 6, 8);
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(screenX - scaledWidth / 2, screenY + scaledHeight, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(screenX + scaledWidth / 2, screenY + scaledHeight, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 3D Coin class
class Coin3D {
    constructor() {
        this.y = -100;
        this.x = (Math.random() - 0.5) * 180;
        this.radius = 12;
        this.rotation = 0;
        this.spin = Math.random() * 0.1 + 0.05;
    }

    update() {
        this.y += player.speed;
        this.rotation += this.spin;
    }

    isOffScreen() {
        return this.y > canvas.height + 50;
    }

    draw() {
        const scale = (canvas.height - this.y) / canvas.height;
        if (scale < 0.05) return;

        const screenX = canvas.width / 2 + (this.x + camera.x * 300) * scale;
        const screenY = this.y;
        const scaledRadius = this.radius * scale;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.rotation);

        // Glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
        ctx.fill();

        // Coin gradient
        const coinGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, scaledRadius);
        coinGradient.addColorStop(0, '#FFFF99');
        coinGradient.addColorStop(0.7, '#FFD700');
        coinGradient.addColorStop(1, '#CC9900');
        ctx.fillStyle = coinGradient;
        ctx.beginPath();
        ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#994400';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3D effect - lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const x1 = Math.cos(angle) * scaledRadius * 0.6;
            const y1 = Math.sin(angle) * scaledRadius * 0.6;
            ctx.beginPath();
            ctx.moveTo(-x1, -y1);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (e.key === 's' || e.key === 'S') {
        shopOpen = !shopOpen;
    }

    // Camera controls - LARGER increments
    if (e.key === 'q' || e.key === 'Q') {
        camera.targetAngle = Math.max(camera.targetAngle - 0.5, -1);
    }
    if (e.key === 'e' || e.key === 'E') {
        camera.targetAngle = Math.min(camera.targetAngle + 0.5, 1);
    }

    if (e.key === ' ') {
        e.preventDefault();
        if (player.boostPower > 20) {
            player.maxSpeed = upgradeShop.engine.effect(player.upgrades.engine);
            player.boostPower -= 2;
            // Boost particles
            for (let i = 0; i < 10; i++) {
                const angle = (Math.PI * 2 / 10) * i;
                particleEffect.push(new Particle(
                    canvas.width / 2 + player.x,
                    canvas.height - 50,
                    Math.cos(angle) * 4,
                    Math.sin(angle) * 4 - 2,
                    '#FF6B00'
                ));
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Draw background stars/effects
function drawBackground() {
    // Sky gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(0.5, '#0f3460');
    bgGradient.addColorStop(1, '#2a2a3e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Twinkling stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 50; i++) {
        const starX = (i * 100 + Math.sin(Date.now() * 0.0001 + i) * 50) % canvas.width;
        const starY = (i * 50 + Math.cos(Date.now() * 0.00015 + i) * 30) % (canvas.height * 0.3);
        ctx.beginPath();
        ctx.arc(starX, starY, 1, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw road with enhanced graphics
function drawRoad() {
    drawBackground();

    const roadWidth = 300;
    const segmentHeight = 40;

    for (let i = 0; i < canvas.height; i += segmentHeight) {
        const scale = (canvas.height - i) / canvas.height;
        const width = roadWidth * scale;
        const roadGradient = ctx.createLinearGradient(canvas.width / 2 - width / 2, i, canvas.width / 2 + width / 2, i);
        
        if (Math.floor(i / segmentHeight) % 2 === 0) {
            roadGradient.addColorStop(0, '#444');
            roadGradient.addColorStop(0.5, '#555');
            roadGradient.addColorStop(1, '#444');
        } else {
            roadGradient.addColorStop(0, '#555');
            roadGradient.addColorStop(0.5, '#666');
            roadGradient.addColorStop(1, '#555');
        }

        ctx.fillStyle = roadGradient;
        ctx.fillRect(canvas.width / 2 - width / 2, i, width, segmentHeight);

        // Center line
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, i);
        ctx.lineTo(canvas.width / 2, i + segmentHeight);
        ctx.stroke();

        // Side lines with glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFFF00';
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - width / 2, i);
        ctx.lineTo(canvas.width / 2 - width / 2, i + segmentHeight);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 + width / 2, i);
        ctx.lineTo(canvas.width / 2 + width / 2, i + segmentHeight);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.setLineDash([]);
}

// Draw player car with enhanced graphics - show BACK of car
function drawPlayer() {
    const carX = canvas.width / 2 + player.x;
    const carY = canvas.height - 100;
    const carWidth = 50;
    const carHeight = 80;

    // Car shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.ellipse(carX, carY + carHeight + 10, carWidth / 1.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body gradient - BACK VIEW (bottom to top, showing rear)
    const carGradient = ctx.createLinearGradient(carX - carWidth / 2, carY, carX - carWidth / 2, carY - carHeight);
    carGradient.addColorStop(0, '#004400');      // Front (bottom - closer)
    carGradient.addColorStop(0.5, '#008800');    // Middle
    carGradient.addColorStop(1, '#00CC00');      // Back (top - farther)
    ctx.fillStyle = carGradient;
    ctx.fillRect(carX - carWidth / 2, carY - carHeight, carWidth, carHeight);

    // Car outline
    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 2;
    ctx.strokeRect(carX - carWidth / 2, carY - carHeight, carWidth, carHeight);

    // REAR WINDOWS (top part of car in rear view)
    const rearWindowGradient = ctx.createLinearGradient(carX - carWidth / 2, carY - carHeight + 10, carX - carWidth / 2, carY - carHeight + 30);
    rearWindowGradient.addColorStop(0, '#00FFFF');
    rearWindowGradient.addColorStop(1, '#0099FF');
    ctx.fillStyle = rearWindowGradient;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00FFFF';
    ctx.fillRect(carX - carWidth / 2 + 5, carY - carHeight + 10, carWidth - 10, 20);
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 1;
    ctx.strokeRect(carX - carWidth / 2 + 5, carY - carHeight + 10, carWidth - 10, 20);
    ctx.shadowBlur = 0;

    // MIDDLE WINDOW (rear view)
    ctx.fillStyle = rearWindowGradient;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00FFFF';
    ctx.fillRect(carX - carWidth / 2 + 5, carY - carHeight + 40, carWidth - 10, 20);
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 1;
    ctx.strokeRect(carX - carWidth / 2 + 5, carY - carHeight + 40, carWidth - 10, 20);
    ctx.shadowBlur = 0;

    // BRAKE LIGHTS (red lights at back/bottom of car in rear view)
    ctx.fillStyle = '#FF0000';
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#FF0000';
    ctx.beginPath();
    ctx.arc(carX - 15, carY - carHeight + 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(carX + 15, carY - carHeight + 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Trunk/Rear bumper detail
    ctx.fillStyle = '#333';
    ctx.fillRect(carX - carWidth / 2, carY - carHeight - 5, carWidth, 5);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.strokeRect(carX - carWidth / 2, carY - carHeight - 5, carWidth, 5);

    // Wheels with rim detail
    ctx.fillStyle = '#111';
    ctx.fillRect(carX - carWidth / 2 - 5, carY, 10, 15);
    ctx.fillRect(carX + carWidth / 2 - 5, carY, 10, 15);
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(carX - carWidth / 2, carY + 7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(carX + carWidth / 2, carY + 7, 6, 0, Math.PI * 2);
    ctx.fill();

    // Rim highlight
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(carX - carWidth / 2, carY + 7, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(carX + carWidth / 2, carY + 7, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Exhaust smoke when moving fast
    if (player.speed > 3) {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.beginPath();
        ctx.ellipse(carX - 10, carY + 10 + (player.speed * 5), 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(carX + 10, carY + 10 + (player.speed * 5), 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw shop menu
function drawShop() {
    if (!shopOpen) return;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Shop title
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00FF00';
    ctx.fillText('UPGRADE SHOP', canvas.width / 2, 60);
    ctx.shadowBlur = 0;

    // Money display
    ctx.font = '24px Arial';
    ctx.fillText(`Coins: ${player.money}`, canvas.width / 2, 110);

    // Upgrade boxes
    const upgrades = ['engine', 'handling', 'armor', 'turbo'];
    const boxWidth = 200;
    const boxHeight = 120;
    const spacing = 40;
    const startX = canvas.width / 2 - (boxWidth * 2 + spacing) / 2;
    const startY = 150;

    upgrades.forEach((key, index) => {
        const shop = upgradeShop[key];
        const level = player.upgrades[key];
        const isMaxLevel = level >= shop.maxLevel;
        const price = shop.price * (level + 1);
        const canAfford = player.money >= price && !isMaxLevel;

        const x = startX + (index % 2) * (boxWidth + spacing);
        const y = startY + Math.floor(index / 2) * (boxHeight + spacing + 20);

        // Box background
        ctx.fillStyle = canAfford ? '#1a4d1a' : '#4d1a1a';
        ctx.fillRect(x, y, boxWidth, boxHeight);

        // Box border
        ctx.strokeStyle = canAfford ? '#00FF00' : '#FF0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, boxWidth, boxHeight);

        // Text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(shop.name, x + 10, y + 25);

        ctx.font = '12px Arial';
        ctx.fillText(`Lvl: ${level}/${shop.maxLevel}`, x + 10, y + 50);

        if (!isMaxLevel) {
            ctx.fillStyle = canAfford ? '#00FF00' : '#FF0000';
            ctx.fillText(`Cost: ${price}`, x + 10, y + 75);
            ctx.fillText('Press ' + (index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : '4'), x + 10, y + 100);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillText('MAX LEVEL', x + 10, y + 75);
        }
    });

    // Close hint
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press S to close', canvas.width / 2, canvas.height - 30);
}

// Update player
function updatePlayer() {
    // Camera smoothing - MUCH FASTER response
    camera.angle += (camera.targetAngle - camera.angle) * 0.2;
    camera.x = camera.angle; // Direct mapping - no sin for visibility

    if (shopOpen) return;

    // Handling upgrade affects turning
    const turnSpeed = 6 + (player.upgrades.handling * 1.2);

    if (keys['ArrowLeft']) {
        player.x = Math.max(player.x - turnSpeed, -150);
    }
    if (keys['ArrowRight']) {
        player.x = Math.min(player.x + turnSpeed, 150);
    }

    if (keys['ArrowUp']) {
        player.speed = Math.min(player.speed + player.acceleration, player.maxSpeed);
    } else if (keys['ArrowDown']) {
        player.speed = Math.max(player.speed - player.acceleration, 0);
    } else {
        player.speed *= player.friction;
    }

    if (player.boostPower < player.maxBoost) {
        player.boostPower += 0.5;
    }

    // Handle shop purchases (number keys 1-4)
    if (keys['1']) {
        buyUpgrade('engine');
        keys['1'] = false;
    }
    if (keys['2']) {
        buyUpgrade('handling');
        keys['2'] = false;
    }
    if (keys['3']) {
        buyUpgrade('armor');
        keys['3'] = false;
    }
    if (keys['4']) {
        buyUpgrade('turbo');
        keys['4'] = false;
    }
}

// Buy upgrade function
function buyUpgrade(type) {
    const shop = upgradeShop[type];
    const level = player.upgrades[type];
    
    if (level >= shop.maxLevel) return;
    
    const price = shop.price * (level + 1);
    if (player.money >= price) {
        player.money -= price;
        player.upgrades[type]++;
        
        // Apply upgrade effects
        if (type === 'engine') {
            player.maxSpeed = shop.effect(player.upgrades.engine);
        } else if (type === 'armor') {
            player.maxHealth = shop.effect(player.upgrades.armor);
            player.health = player.maxHealth;
        } else if (type === 'turbo') {
            player.maxBoost = shop.effect(player.upgrades.turbo);
        }
    }
}

// Check collisions
function checkCollisions() {
    const carX = canvas.width / 2 + player.x;
    const carY = canvas.height - 100;
    const carWidth = 50;
    const carHeight = 80;

    for (let obstacle of obstacles) {
        const scale = (canvas.height - obstacle.y) / canvas.height;
        if (scale < 0.05) continue;

        const obsX = canvas.width / 2 + (obstacle.x + camera.x * 300) * scale;
        const obsY = obstacle.y;
        const obsWidth = obstacle.width * scale;
        const obsHeight = obstacle.height * scale;

        if (
            carX - carWidth / 2 < obsX + obsWidth / 2 &&
            carX + carWidth / 2 > obsX - obsWidth / 2 &&
            carY < obsY + obsHeight &&
            carY + carHeight > obsY
        ) {
            player.health -= 10;
            if (player.health <= 0) {
                gameRunning = false;
            }
            // Crash particles
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                particleEffect.push(new Particle(
                    carX,
                    carY,
                    Math.cos(angle) * 5,
                    Math.sin(angle) * 5 - 2,
                    '#FF' + Math.floor(Math.random() * 100 + 100).toString(16) + '00'
                ));
            }
        }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        const scale = (canvas.height - coin.y) / canvas.height;
        if (scale < 0.05) continue;

        const coinX = canvas.width / 2 + (coin.x + camera.x * 300) * scale;
        const coinY = coin.y;
        const coinRadius = coin.radius * scale;

        const dx = carX - coinX;
        const dy = carY - coinY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < carWidth / 2 + coinRadius) {
            score += 10;
            player.money += 10;
            player.boostPower = Math.min(player.boostPower + 25, player.maxBoost);
            coins.splice(i, 1);
            // Coin collection particles
            for (let j = 0; j < 15; j++) {
                const angle = Math.random() * Math.PI * 2;
                particleEffect.push(new Particle(
                    coinX,
                    coinY,
                    Math.cos(angle) * 3,
                    Math.sin(angle) * 3 - 1,
                    '#FFD700'
                ));
            }
        }
    }
}

// Update game
function update() {
    updatePlayer();

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        if (obstacles[i].isOffScreen()) {
            obstacles.splice(i, 1);
            score += 5;
        }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].update();
        if (coins[i].isOffScreen()) {
            coins.splice(i, 1);
        }
    }

    // Update particles
    for (let i = particleEffect.length - 1; i >= 0; i--) {
        particleEffect[i].update();
        if (!particleEffect[i].isAlive()) {
            particleEffect.splice(i, 1);
        }
    }

    if (!shopOpen) {
        spawnCounter++;
        if (spawnCounter > 60) {
            obstacles.push(new Obstacle3D());
            spawnCounter = 0;
        }

        if (Math.random() < 0.02) {
            coins.push(new Coin3D());
        }

        checkCollisions();
    }
}

// Draw game
function draw() {
    drawRoad();

    for (let coin of coins) {
        coin.draw();
    }

    for (let obstacle of obstacles) {
        obstacle.draw();
    }

    drawPlayer();

    // Draw particles
    for (let particle of particleEffect) {
        particle.draw();
    }

    // Draw UI with better styling
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, 10, 280, 130);
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 280, 130);

    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Score: ${Math.floor(score)}`, 20, 35);
    ctx.font = '14px Arial';
    ctx.fillText(`Speed: ${Math.floor(player.speed * 10)} mph`, 20, 55);
    ctx.fillText(`Boost: ${Math.floor(player.boostPower)}%`, 20, 75);
    ctx.fillText(`Health: ${Math.floor(player.health)}/${player.maxHealth}`, 20, 95);
    ctx.fillText(`Coins: ${player.money}`, 20, 115);

    // Draw camera angle indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(canvas.width - 200, 10, 190, 80);
    ctx.fillStyle = '#00FF00';
    ctx.font = '12px Arial';
    ctx.fillText('Q/E: Change Camera', canvas.width - 190, 30);
    ctx.fillText('S: Open Shop', canvas.width - 190, 45);

    // Camera angle display
    let cameraText = 'Camera: ';
    if (camera.angle < -0.6) cameraText += 'LEFT';
    else if (camera.angle < -0.2) cameraText += 'LEFT-REAR';
    else if (camera.angle > 0.6) cameraText += 'RIGHT';
    else if (camera.angle > 0.2) cameraText += 'RIGHT-REAR';
    else cameraText += 'REAR';
    ctx.fillText(cameraText, canvas.width - 190, 60);
    ctx.fillText(`(${camera.angle.toFixed(1)})`, canvas.width - 190, 75);

    // Draw boost bar with glow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(canvas.width - 120, 100, 100, 20);
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00FF00';
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(canvas.width - 120, 100, player.boostPower, 20);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - 120, 100, 100, 20);

    // Draw shop if open
    drawShop();
}

// Game loop
function gameLoop() {
    if (gameRunning) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    } else {
        // Game over screen with enhanced graphics
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FF0000';
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = '#FFD700';
        ctx.font = '40px Arial';
        ctx.fillText(`Final Score: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText(`Coins Earned: ${player.money}`, canvas.width / 2, canvas.height / 2 + 90);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#00FF00';
        ctx.font = '20px Arial';
        ctx.fillText('Refresh to play again', canvas.width / 2, canvas.height / 2 + 150);
    }
}

// Start game
gameLoop();
