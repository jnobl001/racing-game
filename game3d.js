const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
const keys = {};
let score = 0;
let gameRunning = true;
let particleEffect = [];

// Player car
const player = {
    x: 0,
    speed: 0,
    maxSpeed: 8,
    acceleration: 0.3,
    friction: 0.95,
    boostPower: 0,
    maxBoost: 100
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
        const screenX = canvas.width / 2 + this.x * scale + wobbleAmount;
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

        const screenX = canvas.width / 2 + this.x * scale;
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
    if (e.key === ' ') {
        e.preventDefault();
        if (player.boostPower > 20) {
            player.maxSpeed = 12;
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
    if (e.key !== ' ') {
        player.maxSpeed = 8;
    }
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

    // Draw road segments with gradient
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

// Draw player car with enhanced graphics
function drawPlayer() {
    const carX = canvas.width / 2 + player.x;
    const carY = canvas.height - 100;
    const carWidth = 50;
    const carHeight = 80;

    // Car shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.ellipse(carX, carY + carHeight + 10, carWidth / 1.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body gradient
    const carGradient = ctx.createLinearGradient(carX - carWidth / 2, carY - carHeight, carX - carWidth / 2, carY);
    carGradient.addColorStop(0, '#00CC00');
    carGradient.addColorStop(0.5, '#008800');
    carGradient.addColorStop(1, '#004400');
    ctx.fillStyle = carGradient;
    ctx.fillRect(carX - carWidth / 2, carY - carHeight, carWidth, carHeight);

    // Car outline
    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 2;
    ctx.strokeRect(carX - carWidth / 2, carY - carHeight, carWidth, carHeight);

    // Car windows with gradient and glow
    const windowGradient = ctx.createLinearGradient(carX - carWidth / 2, carY - carHeight + 15, carX - carWidth / 2, carY - carHeight + 35);
    windowGradient.addColorStop(0, '#00FFFF');
    windowGradient.addColorStop(1, '#0099FF');
    ctx.fillStyle = windowGradient;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00FFFF';
    ctx.fillRect(carX - carWidth / 2 + 5, carY - carHeight + 15, carWidth - 10, 20);
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 1;
    ctx.strokeRect(carX - carWidth / 2 + 5, carY - carHeight + 15, carWidth - 10, 20);

    ctx.fillRect(carX - carWidth / 2 + 5, carY - carHeight + 45, carWidth - 10, 20);
    ctx.strokeRect(carX - carWidth / 2 + 5, carY - carHeight + 45, carWidth - 10, 20);

    // Headlights with intense glow
    ctx.fillStyle = '#FFFF00';
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#FFFF00';
    ctx.beginPath();
    ctx.arc(carX - 15, carY - carHeight - 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(carX + 15, carY - carHeight - 5, 6, 0, Math.PI * 2);
    ctx.fill();

    // Brake lights
    ctx.fillStyle = '#FF0000';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FF0000';
    ctx.beginPath();
    ctx.arc(carX - 15, carY + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(carX + 15, carY + 5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

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

    // Speed lines when moving fast
    if (player.speed > 5) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(carX - carWidth / 2 - 10 - i * 5, carY - carHeight / 2 + (i % 2) * 10);
            ctx.lineTo(carX - carWidth / 2 - 30 - i * 5, carY - carHeight / 2 + (i % 2) * 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(carX + carWidth / 2 + 10 + i * 5, carY - carHeight / 2 + (i % 2) * 10);
            ctx.lineTo(carX + carWidth / 2 + 30 + i * 5, carY - carHeight / 2 + (i % 2) * 10);
            ctx.stroke();
        }
    }
}

// Update player
function updatePlayer() {
    if (keys['ArrowLeft']) {
        player.x = Math.max(player.x - 6, -150);
    }
    if (keys['ArrowRight']) {
        player.x = Math.min(player.x + 6, 150);
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

        const obsX = canvas.width / 2 + obstacle.x * scale;
        const obsY = obstacle.y;
        const obsWidth = obstacle.width * scale;
        const obsHeight = obstacle.height * scale;

        if (
            carX - carWidth / 2 < obsX + obsWidth / 2 &&
            carX + carWidth / 2 > obsX - obsWidth / 2 &&
            carY < obsY + obsHeight &&
            carY + carHeight > obsY
        ) {
            gameRunning = false;
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

        const coinX = canvas.width / 2 + coin.x * scale;
        const coinY = coin.y;
        const coinRadius = coin.radius * scale;

        const dx = carX - coinX;
        const dy = carY - coinY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < carWidth / 2 + coinRadius) {
            score += 10;
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
    ctx.fillRect(10, 10, 200, 80);
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 200, 80);

    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Score: ${Math.floor(score)}`, 20, 35);
    ctx.font = '16px Arial';
    ctx.fillText(`Speed: ${Math.floor(player.speed * 10)} mph`, 20, 60);
    ctx.fillText(`Boost: ${Math.floor(player.boostPower)}%`, 20, 80);

    // Draw controls hint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(canvas.width - 220, 10, 210, 50);
    ctx.fillStyle = '#00FF00';
    ctx.font = '12px Arial';
    ctx.fillText('← → Move | ↑↓ Speed | Space Boost', canvas.width - 210, 30);

    // Draw boost bar with glow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(canvas.width - 120, 70, 100, 20);
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00FF00';
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(canvas.width - 120, 70, player.boostPower, 20);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - 120, 70, 100, 20);
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
        ctx.fillText('CRASH!', canvas.width / 2, canvas.height / 2 - 50);

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = '#FFD700';
        ctx.font = '40px Arial';
        ctx.fillText(`Final Score: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 40);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#00FF00';
        ctx.font = '20px Arial';
        ctx.fillText('Refresh to play again', canvas.width / 2, canvas.height / 2 + 100);
    }
}

// Start game
gameLoop();
