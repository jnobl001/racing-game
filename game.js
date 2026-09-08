const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
const keys = {};
let score = 0;
let gameRunning = true;

// Player car
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 80,
    width: 40,
    height: 60,
    speed: 0,
    maxSpeed: 8,
    acceleration: 0.3,
    friction: 0.95,
    angle: 0,
    boostPower: 0,
    maxBoost: 100
};

// Obstacles
let obstacles = [];
let obstacleCounter = 0;

// Coins/Powerups
let coins = [];
let coinCounter = 0;

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

// Obstacle class
class Obstacle {
    constructor() {
        this.width = 40 + Math.random() * 30;
        this.height = 60;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = 3 + Math.random() * 2;
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        // Draw window
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(this.x + 5, this.y + 10, this.width - 10, 15);
    }

    isOffScreen() {
        return this.y > canvas.height;
    }
}

// Coin class
class Coin {
    constructor() {
        this.radius = 8;
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = -this.radius;
        this.speed = 2;
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    isOffScreen() {
        return this.y > canvas.height;
    }
}

// Draw road
function drawRoad() {
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Road lines
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Side lines
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(10, 0, 3, canvas.height);
    ctx.fillRect(canvas.width - 13, 0, 3, canvas.height);
}

// Draw player car
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.angle);

    // Car body
    ctx.fillStyle = '#00AA00';
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    // Car windows
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(-player.width / 2 + 5, -player.height / 2 + 5, player.width - 10, 15);
    ctx.fillRect(-player.width / 2 + 5, -player.height / 2 + 30, player.width - 10, 15);

    // Car headlights
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(-8, -player.height / 2 - 2, 6, 3);
    ctx.fillRect(2, -player.height / 2 - 2, 6, 3);

    ctx.restore();
}

// Update player
function updatePlayer() {
    // Movement
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= 5;
        player.angle = -0.1;
    } else if (keys['ArrowRight'] && player.x + player.width < canvas.width) {
        player.x += 5;
        player.angle = 0.1;
    } else {
        player.angle *= 0.9;
    }

    // Speed
    if (keys['ArrowUp']) {
        player.speed = Math.min(player.speed + player.acceleration, player.maxSpeed);
    } else if (keys['ArrowDown']) {
        player.speed = Math.max(player.speed - player.acceleration, -2);
    } else {
        player.speed *= player.friction;
    }

    // Boost recovery
    if (player.boostPower < player.maxBoost) {
        player.boostPower += 0.5;
    }
}

// Check collision
function checkCollisions() {
    // Obstacle collisions
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (
            player.x < obstacles[i].x + obstacles[i].width &&
            player.x + player.width > obstacles[i].x &&
            player.y < obstacles[i].y + obstacles[i].height &&
            player.y + player.height > obstacles[i].y
        ) {
            gameRunning = false;
        }
    }

    // Coin collisions
    for (let i = coins.length - 1; i >= 0; i--) {
        const dx = player.x + player.width / 2 - coins[i].x;
        const dy = player.y + player.height / 2 - coins[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < coins[i].radius + player.width / 2) {
            score += 10;
            coins.splice(i, 1);
        }
    }
}

// Update game
function update() {
    updatePlayer();

    // Spawn obstacles
    obstacleCounter++;
    if (obstacleCounter > 60) {
        obstacles.push(new Obstacle());
        obstacleCounter = 0;
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        if (obstacles[i].isOffScreen()) {
            obstacles.splice(i, 1);
            score += 5;
        }
    }

    // Spawn coins
    coinCounter++;
    if (coinCounter > 40) {
        coins.push(new Coin());
        coinCounter = 0;
    }

    // Update coins
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].update();
        if (coins[i].isOffScreen()) {
            coins.splice(i, 1);
        }
    }

    checkCollisions();
}

// Draw game
function draw() {
    drawRoad();

    // Draw coins
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
    document.getElementById('speed').textContent = `Speed: ${Math.floor(Math.abs(player.speed) * 10)} mph`;

    // Draw boost bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width - 120, 70, 100, 20);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(canvas.width - 120, 70, player.boostPower, 20);
    ctx.strokeStyle = '#FFFFFF';
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
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '32px Arial';
        ctx.fillText(`Final Score: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.font = '20px Arial';
        ctx.fillText('Refresh to play again', canvas.width / 2, canvas.height / 2 + 80);
    }
}

// Start game
gameLoop();
