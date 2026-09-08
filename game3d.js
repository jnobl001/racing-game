const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
const keys = {};
let score = 0;
let gameRunning = true;

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

// Road position
let roadOffset = 0;

// Obstacles and coins
let obstacles = [];
let coins = [];
let spawnCounter = 0;

// 3D Obstacle class
class Obstacle3D {
    constructor() {
        this.y = -100;
        this.x = (Math.random() - 0.5) * 200;
        this.width = 50;
        this.height = 60;
    }

    update() {
        this.y += player.speed;
    }

    isOffScreen() {
        return this.y > canvas.height + 50;
    }

    draw() {
        // Perspective scaling based on Y position
        const scale = (canvas.height - this.y) / canvas.height;
        if (scale < 0.1) return;

        const scaledWidth = this.width * scale;
        const scaledHeight = this.height * scale;
        const screenX = canvas.width / 2 + this.x * scale;
        const screenY = this.y;

        // Car body
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(screenX - scaledWidth / 2, screenY, scaledWidth, scaledHeight);

        // Car outline
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - scaledWidth / 2, screenY, scaledWidth, scaledHeight);

        // Windows
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(screenX - scaledWidth / 2 + 5, screenY + 10, scaledWidth - 10, scaledHeight * 0.3);
    }
}

// 3D Coin class
class Coin3D {
    constructor() {
        this.y = -100;
        this.x = (Math.random() - 0.5) * 180;
        this.radius = 12;
        this.rotation = 0;
    }

    update() {
        this.y += player.speed;
        this.rotation += 0.05;
    }

    isOffScreen() {
        return this.y > canvas.height + 50;
    }

    draw() {
        const scale = (canvas.height - this.y) / canvas.height;
        if (scale < 0.1) return;

        const screenX = canvas.width / 2 + this.x * scale;
        const screenY = this.y;
        const scaledRadius = this.radius * scale;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.rotation);

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();

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
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key !== ' ') {
        player.maxSpeed = 8;
    }
});

// Draw road with perspective
function drawRoad() {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw road lines converging to center
    const roadWidth = 300;
    const segmentHeight = 40;

    for (let i = 0; i < canvas.height; i += segmentHeight) {
        const scale = (canvas.height - i) / canvas.height;
        const width = roadWidth * scale;

        // Alternate road color
        if (Math.floor(i / segmentHeight) % 2 === 0) {
            ctx.fillStyle = '#444';
        } else {
            ctx.fillStyle = '#555';
        }

        ctx.fillRect(canvas.width / 2 - width / 2, i, width, segmentHeight);

        // Center line
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, i);
        ctx.lineTo(canvas.width / 2, i + segmentHeight);
        ctx.stroke();

        // Side lines
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - width / 2, i);
        ctx.lineTo(canvas.width / 2 - width / 2, i + segmentHeight);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 + width / 2, i);
        ctx.lineTo(canvas.width / 2 + width / 2, i + segmentHeight);
        ctx.stroke();
    }
}

// Draw player car (fixed at bottom)
function drawPlayer() {
    const carX = canvas.width / 2 + player.x;
    const carY = canvas.height - 100;
    const carWidth = 50;
    const carHeight = 80;

    // Car body
    ctx.fillStyle = '#00AA00';
    ctx.fillRect(carX - carWidth / 2, carY - carHeight, carWidth, carHeight);

    // Car windows
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(carX - carWidth / 2 + 5, carY - carHeight + 15, carWidth - 10, 20);
    ctx.fillRect(carX - carWidth / 2 + 5, carY - carHeight + 45, carWidth - 10, 20);

    // Car headlights
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(carX - 15, carY - carHeight - 5, 6, 5);
    ctx.fillRect(carX + 9, carY - carHeight - 5, 6, 5);

    // Wheels
    ctx.fillStyle = '#333';
    ctx.fillRect(carX - carWidth / 2 - 5, carY, 10, 15);
    ctx.fillRect(carX + carWidth / 2 - 5, carY, 10, 15);
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
        if (scale < 0.1) continue;

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
        }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        const scale = (canvas.height - coin.y) / canvas.height;
        if (scale < 0.1) continue;

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
        }
    }
}

// Update game
function update() {
    updatePlayer();

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        if (obstacles[i].isOffScreen()) {
            obstacles.splice(i, 1);
            score += 5;
        }
    }

    // Update coins
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].update();
        if (coins[i].isOffScreen()) {
            coins.splice(i, 1);
        }
    }

    // Spawn obstacles
    spawnCounter++;
    if (spawnCounter > 60) {
        obstacles.push(new Obstacle3D());
        spawnCounter = 0;
    }

    // Spawn coins
    if (Math.random() < 0.02) {
        coins.push(new Coin3D());
    }

    checkCollisions();
}

// Draw game
function draw() {
    drawRoad();

    // Draw coins (behind obstacles)
    for (let coin of coins) {
        coin.draw();
    }

    // Draw obstacles
    for (let obstacle of obstacles) {
        obstacle.draw();
    }

    drawPlayer();

    // Update UI
    document.getElementById('score').textContent = `Score: ${Math.floor(score)}`;
    document.getElementById('speed').textContent = `Speed: ${Math.floor(player.speed * 10)} mph`;

    // Draw boost bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width - 120, 70, 100, 20);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(canvas.width - 120, 70, player.boostPower, 20);
    ctx.strokeStyle = '#FFFFFF';
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
        // Game over screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CRASH!', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '32px Arial';
        ctx.fillText(`Final Score: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.font = '20px Arial';
        ctx.fillText('Refresh to play again', canvas.width / 2, canvas.height / 2 + 80);
    }
}

// Start game
gameLoop();
