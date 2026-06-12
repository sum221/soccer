// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

// We will serve a single HTML file that contains everything (HTML/CSS/JS)
// to make it easy for you to run.
app.get('/', (req, res) => {
    const gameCode = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neon Penalty Shootout</title>
    <style>
        :root {
            --primary: #00ff88;
            --secondary: #7000ff;
            --bg: #1a1a2e;
            --grass: #2d4a3e;
        }

        body {
            margin: 0;
            padding: 0;
            background-color: var(--bg);
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
        }

        h1 { margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 10px var(--primary); }
        
        #game-container {
            position: relative;
            box-shadow: 0 0 50px rgba(0,0,0,0.5);
            border-radius: 8px;
            overflow: hidden;
        }

        canvas {
            background-color: var(--grass);
            display: block;
            cursor: crosshair;
        }

        #ui-layer {
            position: absolute;
            top: 20px;
            left: 20px;
            pointer-events: none;
        }

        .stat-box {
            background: rgba(0,0,0,0.6);
            padding: 10px 20px;
            border-radius: 4px;
            margin-bottom: 5px;
            font-size: 18px;
            border-left: 4px solid var(--primary);
        }

        #message-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            font-weight: bold;
            opacity: 0;
            transition: opacity 0.3s;
            text-shadow: 2px 2px 0 #000;
            pointer-events: none;
        }

        .goal-text { color: var(--primary); }
        .miss-text { color: #ff4444; }

        /* Power Bar UI */
        #power-container {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 300px;
            height: 20px;
            background: rgba(0,0,0,0.5);
            border-radius: 10px;
            overflow: hidden;
            border: 2px solid white;
        }

        #power-fill {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, var(--primary), yellow);
            transition: width 0.1s linear;
        }
        
        .instructions {
            margin-top: 10px;
            color: #aaa;
            font-size: 14px;
        }
    </style>
</head>
<body>

    <h1>Neon Penalty</h1>
    
    <div id="game-container">
        <canvas id="gameCanvas" width="800" height="500"></canvas>
        
        <div id="ui-layer">
            <div class="stat-box">Score: <span id="score">0</span></div>
            <div class="stat-box">Attempts: <span id="attempts">0</span></div>
        </div>

        <div id="message-overlay"></div>

        <div id="power-container">
            <div id="power-fill"></div>
        </div>
    </div>
    
    <p class="instructions">Click and Hold to charge power. Release to shoot.</p>

<script>
/** GAME LOGIC **/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const attemptsEl = document.getElementById('attempts');
const msgOverlay = document.getElementById('message-overlay');
const powerFill = document.getElementById('power-fill');

// Game State
let gameState = 'aiming'; // aiming, flying, result
let score = 0;
let attempts = 0;
let power = 0;
let powerDirection = 1; // 1 for up, -1 for down

// Physics Constants
const FRICTION = 0.985;
const GRAVITY = 0.4; // Slight curve effect

// Objects
const ball = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    radius: 10,
    vx: 0,
    vy: 0,
    z: 0 // Height off ground for arc
};

const goal = {
    x: canvas.width / 2 - 150,
    y: 40,
    width: 300,
    height: 60,
    depth: 20
};

const keeper = {
    x: canvas.width / 2,
    y: 50,
    width: 30,
    height: 40,
    color: '#ffcc00',
    vx: 0
};

// Input Handling
let isMouseDown = false;

canvas.addEventListener('mousedown', () => {
    if (gameState === 'aiming' || gameState === 'result') resetBall();
    isMouseDown = true;
});

window.addEventListener('mouseup', () => {
    if (isMouseDown && gameState === 'aiming') {
        shoot();
    }
    isMouseDown = false;
});

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 60;
    ball.vx = 0;
    ball.vy = 0;
    ball.z = 0;
    power = 0;
    gameState = 'aiming';
    msgOverlay.style.opacity = '0';
    
    // Reset Keeper
    keeper.x = canvas.width / 2;
}

function shoot() {
    gameState = 'flying';
    attempts++;
    attemptsEl.innerText = attempts;

    // Calculate velocity based on power (max power ~100)
    const speedMultiplier = 0.35; 
    ball.vy = -(power * speedMultiplier); // Move Up
    
    // Add slight curve based on mouse position relative to center (simulated here by randomness for simplicity or could track mouse X)
    // For this simple version, we add a little random drift
    ball.vx = (Math.random() - 0.5) * 2; 
    
    // Keeper AI: Dive towards ball x with some delay/error
    const targetX = ball.x + (ball.vx * 10); 
    keeper.vx = (targetX - keeper.x) * 0.08;
}

function update() {
    // Power Bar Logic
    if (gameState === 'aiming') {
        power += 2 * powerDirection;
        if (power >= 100) { power = 100; powerDirection = -1; }
        if (power <= 0) { power = 0; powerDirection = 1; }
        powerFill.style.width = power + '%';
    }

    // Ball Physics
    if (gameState === 'flying') {
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Simulate Arc (Z-axis projection)
        if (ball.z < 100) ball.z += 2; // Go up
        else ball.z -= 3; // Come down
        
        ball.vy *= FRICTION; // Air resistance

        // Keeper Movement
        keeper.x += keeper.vx;
        keeper.vx *= 0.9; // Friction for keeper
        // Keep keeper in goal bounds roughly
        if(keeper.x < goal.x) keeper.x = goal.x;
        if(keeper.x > goal.x + goal.width) keeper.x = goal.x + goal.width;

        checkCollisions();
    }
}

function checkCollisions() {
    // 1. Check Goal (Back of net)
    if (ball.y < goal.y && ball.z <= 20) {
        if (ball.x > goal.x && ball.x < goal.x + goal.width) {
            handleResult('GOAL!', 'goal-text');
            score++;
            scoreEl.innerText = score;
            return;
        }
    }

    // 2. Check Keeper Collision (Simple AABB)
    // We check if ball is near keeper Y level and X overlaps
    const distY = Math.abs(ball.y - keeper.y);
    const distX = Math.abs(ball.x - keeper.x);
    
    if (distY < 30 && distX < 25 && ball.z < 40) {
        handleResult('SAVED!', 'miss-text');
        return;
    }

    // 3. Check Miss (Out of bounds or past goal line without scoring)
    if (ball.y < -50 || ball.x < -50 || ball.x > canvas.width + 50) {
        handleResult('MISS!', 'miss-text');
    }
}

function handleResult(text, className) {
    gameState = 'result';
    msgOverlay.innerText = text;
    msgOverlay.className = className;
    msgOverlay.style.opacity = '1';
    
    setTimeout(resetBall, 2000);
}

function draw() {
    // Clear Screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Field Lines (Penalty Box)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 4;
    
    // Penalty Area
    ctx.strokeRect(canvas.width/2 - 160, 0, 320, 180);
    // Goal Line
    ctx.beginPath();
    ctx.moveTo(goal.x - 20, goal.y);
    ctx.lineTo(goal.x + goal.width + 20, goal.y);
    ctx.stroke();

    // Draw Net (Visual only)
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(goal.x, goal.y - 40, goal.width, 60);

    // Draw Keeper
    ctx.fillStyle = keeper.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "black";
    ctx.fillRect(keeper.x - keeper.width/2, keeper.y - keeper.height/2, keeper.width, keeper.height);
    
    // Draw Ball (with shadow for depth)
    const scale = 1 + (ball.z / 150); // Scale ball when it goes "up" in arc
    
    ctx.save();
    ctx.translate(ball.x, ball.y - ball.z);
    ctx.scale(scale, scale);
    
    // Ball Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(0, 15, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball Body
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Ball Pattern (Simple pentagon look)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
    ctx.moveTo(5, -5); ctx.lineTo(-5, 5);
    ctx.stroke();

    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start Game
loop();

</script>
</body>
</html>
`;
    
    res.send(gameCode);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
