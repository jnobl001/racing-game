const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
const keys = {};
let score = 0;
let gameRunning = true;

// Camera/perspective settings
const camera = {
    x: 0,
    z: 0,
    fov: 90,
    height: 3
};

// Player car
const player = {
    x: 0,
    z: -10,
    width: 2,
    height: 1.5,
    speed: 0,
    maxSpeed: 0.3,
    acceleration: 0.015,
    friction: 0.92,
    angle: 0,
    boostPower: 0,
    maxBoost: 100
};

// Road segments
let roadSegments = [];
let obstacleSegments = [];
let coinSegments = [];
let distanceTraveled = 0;

// Obstacle class for 3D
class Obstacle3D {
    constructor(z) {
        this.z = z;
        this.x = (Math.random() - 0.5) * 6;
        this.width = 1.5;
        this.height = 1.2;
        this.passed = false;
    }

    update() {
        this.z += player.speed;
    }

    isOffScreen() {
        return this.z > 5;
    }
}

// Coin class for 3D
class Coin3D {
    constructor(z) {
        this.z = z;
        this.x = (Math.random() - 0.5) * 5;
        this.radius = 0.3;
        this.rotation = 0;
        this.collected = false;
    }

    update() {
        this.z += player.speed;
        this.rotation += 0.1;
    }

    isOffScreen() {
        return this.z > 5;
    }
}

// 3D to 2D projection
function project3D(x, y, z) {
    const scale = 1 / (z + camera.height);
    const screenX = canvas.width / 2 + x * scale * (canvas.width / 2);
    const screenY = canvas.height / 2 - y * scale * (canvas.height / 2);
    return { x: screenX, y: screenY, scale };
}

// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') {
        e.preventDefault();
        if (player.boostPower > 20) {
            player.maxSpeed = 0.45;
            player.boostPower -= 2;
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key !== ' ') {
        player.maxSpeed = 0.3;
    }
});

// Draw road
function drawRoad() {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw road segments
    const roadWidth = 6;
    const segmentHeight = 1;

    for (let z = -30; z < 5; z += segmentHeight) {
        const projLeft = project3D(-roadWidth / 2, 0, z);
        const projRight = project3D(roadWidth / 2, 0, z);
        const projLeftNext = project3D(-roadWidth / 2, 0, z + segmentHeight);
        const projRightNext = project3D(roadWidth / 2, 0, z + segmentHeight);

        // Alternate road color
        if (Math.floor((z + 30) / segmentHeight) % 2 === 0) {
            ctx.fillStyle = '#444';
        } else {
            ctx.fillStyle = '#555';
        }

        ctx.beginPath();
        ctx.moveTo(projLeft.x, projLeft.y);
        ctx.lineTo(projRight.x, projRight.y);
        ctx.lineTo(projRightNext.x, projRightNext.y);
        ctx.lineTo(projLeftNext.x, projLeftNext.y);
        ctx.fill();

        // Road lines
        if (Math.floor((z + 30) / (segmentHeight * 2)) % 2 === 0) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, projLeft.y);
            ctx.lineTo(canvas.width / 2, projLeftNext.y);
            ctx.stroke();
        }
    }

    // Road edges
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 3;
    for (let z = -30; z < 5; z += 0.5) {
        const projLeftCur = project3D(-roadWidth / 2, 0, z);
        const projLeftNext = project3D(-roadWidth / 2, 0, z + 0.5);
        const projRightCur = project3D(roadWidth / 2, 0, z);
        const projRightNext = project3D(roadWidth / 2, 0, z + 0.5);

        ctx.beginPath();
        ctx.moveTo(projLeftCur.x, projLeftCur.y);
        ctx.lineTo(projLeftNext.x, projLeftNext.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(projRightCur.x, projRightCur.y);
        ctx.lineTo(projRightNext.x, projRightNext.y);
        ctx.stroke();
    }
}

// Draw 3D car from behind
function drawPlayer() {
    const proj = project3D(player.x, 0, player.z);
    const carScale = proj.scale * 3;

    // Car body
    ctx.fillStyle = '#00AA00';
    const bodyWidth = player.width * carScale * 200;
    const bodyHeight = player.height * carScale * 200;
    ctx.fillRect(proj.x - bodyWidth / 2, proj.y - bodyHeight, bodyWidth, bodyHeight);

    // Car windows
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(proj.x - bodyWidth / 2 + 5, proj.y - bodyHeight + 15, bodyWidth - 10, 20);
    ctx.fillRect(proj.x - bodyWidth / 2 + 5, proj.y - bodyHeight + 45, bodyWidth - 10, 20);

    // Car headlights
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(proj.x - bodyWidth / 2 + 8, proj.y - bodyHeight - 5, 6, 5);
    ctx.fillRect(proj.x + bodyWidth / 2 - 14, proj.y - bodyHeight - 5, 6, 5);

    // Wheels
    ctx.fillStyle = '#333';
    ctx.fillRect(proj.x - bodyWidth / 2 - 5, proj.y, 10, 15);
    ctx.fillRect(proj.x + bodyWidth / 2 - 5, proj.y, 10, 15);
}

// Draw obstacles
function drawObstacles() {
    for (let obstacle of obstacleSegments) {
        if (obstacle.z > -20 && obstacle.z < 5) {
            const proj = project3D(obstacle.x, 0, obstacle.z);
            const obsScale = proj.scale * 2;
            const obsWidth = obstacle.width * obsScale * 200;
            const obsHeight = obstacle.height * obsScale * 200;

            ctx.fillStyle = '#FF6B6B';
            ctx.fillRect(proj.x - obsWidth / 2, proj.y - obsHeight, obsWidth, obsHeight);

            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(proj.x - obsWidth / 2, proj.y - obsHeight, obsWidth, obsHeight);

            // Windows
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(proj.x - obsWidth / 2 + 5, proj.y - obsHeight + 10, obsWidth - 10, 15);
        }
    }
}

// Draw coins
function drawCoins() {
    for (let coin of coinSegments) {
        if (coin.z > -20 && coin.z < 5) {
            const proj = project3D(coin.x, 0.5, coin.z);
            const coinSize = proj.scale * 30;

            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.rotate(coin.rotation);

            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, coinSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.restore();
        }
    }
}

// Update player
function updatePlayer() {
    // Horizontal movement
    if (keys['ArrowLeft']) {
        player.x = Math.max(player.x - 0.15, -2.5);
    }
    if (keys['ArrowRight']) {
        player.x = Math.min(player.x + 0.15, 2.5);
    }

    // Speed control
    if (keys['ArrowUp']) {
        player.speed = Math.min(player.speed + player.acceleration, player.maxSpeed);
    } else if (keys['ArrowDown']) {
        player.speed = Math.max(player.speed - player.acceleration, -0.1);
    } else {
        player.speed *= player.friction;
    }

    // Boost recovery
    if (player.boostPower < player.maxBoost) {
        player.boostPower += 0.5;
    }

    distanceTraveled += player.speed;
}

// Check collisions
function checkCollisions() {
    for (let obstacle of obstacleSegments) {
        if (obstacle.z > -2 && obstacle.z < 2) {
            if (Math.abs(player.x - obstacle.x) < 2 && !obstacle.passed) {
                gameRunning = false;
            }
        }
        if (obstacle.z < -2 && !obstacle.passed) {
            obstacle.passed = true;
            score += 5;
        }
    }

    for (let coin of coinSegments) {
        if (coin.z > -1.5 && coin.z < 1.5) {
            if (Math.abs(player.x - coin.x) < 1.5 && !coin.collected) {
                coin.collected = true;
                score += 10;
                player.boostPower = Math.min(player.boostPower + 20, player.maxBoost);
            }
        }
    }
}

// Update game
function update() {
    updatePlayer();

    // Update obstacles
    for (let i = obstacleSegments.length - 1; i >= 0; i--) {
        obstacleSegments[i].update();
        if (obstacleSegments[i].isOffScreen()) {
            obstacleSegments.splice(i, 1);
        }
    }

    // Update coins
    for (let i = coinSegments.length - 1; i >= 0; i--) {
        coinSegments[i].update();
        if (coinSegments[i].isOffScreen()) {
            coinSegments.splice(i, 1);
        }
    }

    // Spawn obstacles
    if (distanceTraveled % 2 < 0.05) {
        obstacleSegments.push(new Obstacle3D(-30));
    }

    // Spawn coins
    if (distanceTraveled % 1.5 < 0.05) {
        coinSegments.push(new Coin3D(-30));
    }

    checkCollisions();
}

// Draw game
function draw() {
    drawRoad();
    drawCoins();
    drawObstacles();
    drawPlayer();

    // Update UI
    document.getElementById('score').textContent = `Score: ${Math.floor(score)}`;
    document.getElementById('speed').textContent = `Speed: ${Math.floor(player.speed * 100)} mph`;

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
