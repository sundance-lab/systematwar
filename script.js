document.addEventListener('DOMContentLoaded', () => {
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const playButton = document.getElementById('play-button');
    const canvas = document.getElementById('solar-system-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationFrameId;
    let currentPlanets = [];
    let currentStarRadius;

    const camera = {
        x: 0,
        y: 0,
        zoom: 0.1, // Camera starts much further away
        scaleFactor: 1.1
    };

    let isDragging = false;
    let lastMouseX, lastMouseY;

    playButton.addEventListener('click', () => {
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');
        initSolarSystem();
        camera.x = 0;
        camera.y = 0;
        camera.zoom = 0.1; // Reset zoom to initial distant view
        animateSolarSystem();
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Convert mouse coordinates from canvas (screen) space to world space before zoom
        // This calculates where the mouse is pointing in the "solar system" coordinates
        const worldXAtMouse = (mouseX - canvas.width / 2) / camera.zoom - camera.x;
        const worldYAtMouse = (mouseY - canvas.height / 2) / camera.zoom - camera.y;

        if (e.deltaY < 0) { // Zoom in
            camera.zoom *= camera.scaleFactor;
        } else { // Zoom out
            camera.zoom /= camera.scaleFactor;
        }

        camera.zoom = Math.max(0.01, Math.min(camera.zoom, 50));

        // After zoom, recalculate camera position so the world point under the mouse stays fixed
        // This effectively makes the camera zoom in/out on the cursor's location
        camera.x = -worldXAtMouse + (mouseX - canvas.width / 2) / camera.zoom;
        camera.y = -worldYAtMouse + (mouseY - canvas.height / 2) / camera.zoom;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Middle mouse button
            e.preventDefault();
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;

            // Pan based on mouse movement. Scale by 1/zoom to maintain consistent feel.
            camera.x += dx / camera.zoom;
            camera.y += dy / camera.zoom;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 1) {
            isDragging = false;
            canvas.style.cursor = 'grab';
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        canvas.style.cursor = 'default';
    });

    function initSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const originalStarRadius = 20;
        const minStarRadius = originalStarRadius * 20;
        const maxStarRadius = originalStarRadius * 100;

        currentStarRadius = minStarRadius + (Math.random() * (maxStarRadius - minStarRadius));
        currentStarRadius = Math.min(currentStarRadius, Math.min(canvas.width, canvas.height) * 0.4);

        const numPlanets = Math.floor(Math.random() * 11) + 2;

        const minOverallOrbitRadius = currentStarRadius + 80;
        const maxOverallOrbitRadius = Math.min(canvas.width, canvas.height) * 2; // Allow planets to be much further out

        currentPlanets = [];
        let previousOrbitRadius = minOverallOrbitRadius;

        for (let i = 0; i < numPlanets; i++) {
            const planetRadius = Math.floor(Math.random() * 10) + 5;

            const minClearance = 30;
            // Vary the distance between orbitals by a lot more
            const minSpacingBetweenOrbits = 100; // Increased minimum spacing
            const maxSpacingBetweenOrbits = 500; // Significantly increased maximum spacing

            let potentialOrbitRadius = previousOrbitRadius + minSpacingBetweenOrbits + Math.random() * (maxSpacingBetweenOrbits - minSpacingBetweenOrbits);

            const requiredMinOrbitForNoOverlap = previousOrbitRadius + (currentPlanets.length > 0 ? currentPlanets[currentPlanets.length -1].radius : 0) + planetRadius + minClearance;

            let actualOrbitRadius = Math.max(potentialOrbitRadius, requiredMinOrbitForNoOverlap);

            if (actualOrbitRadius > maxOverallOrbitRadius) {
                 if (requiredMinOrbitForNoOverlap > maxOverallOrbitRadius) {
                     break;
                 }
                 actualOrbitRadius = maxOverallOrbitRadius;
            }

            const initialAngle = Math.random() * Math.PI * 2;
            const minOrbitSpeed = 0.0001;
            const maxOrbitSpeed = 0.003;

            const orbitSpeed = (minOrbitSpeed + Math.random() * (maxOrbitSpeed - minOrbitSpeed)) * (Math.random() > 0.5 ? 1 : -1);

            currentPlanets.push({
                radius: planetRadius,
                orbitRadius: actualOrbitRadius,
                angle: initialAngle,
                speed: orbitSpeed,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`
            });

            previousOrbitRadius = actualOrbitRadius;
        }

        currentPlanets.sort((a, b) => a.orbitRadius - b.orbitRadius);
    }

    function animateSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(camera.x, camera.y);

        const systemCenterX = 0;
        const systemCenterY = 0;

        ctx.beginPath();
        ctx.arc(systemCenterX, systemCenterY, currentStarRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 15 + (currentStarRadius / 20);
        ctx.fill();
        ctx.shadowBlur = 0;

        currentPlanets.forEach(planet => {
            ctx.beginPath();
            ctx.arc(systemCenterX, systemCenterY, planet.orbitRadius, 0, Math.PI * 2);
            ctx.lineWidth = 0.5 / camera.zoom;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.stroke();

            planet.angle += planet.speed;
            const x = systemCenterX + Math.cos(planet.angle) * planet.orbitRadius;
            const y = systemCenterY + Math.sin(planet.angle) * planet.orbitRadius;

            ctx.beginPath();
            ctx.arc(x, y, planet.radius, 0, Math.PI * 2);
            ctx.fillStyle = planet.color;
            ctx.fill();
        });

        ctx.restore();
        animationFrameId = requestAnimationFrame(animateSolarSystem);
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    canvas.style.cursor = 'grab';
});
