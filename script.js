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

    // Camera object to manage zoom and pan
    const camera = {
        x: 0, // Camera's X position relative to the center of the solar system
        y: 0, // Camera's Y position relative to the center of the solar system
        zoom: 1, // Current zoom level (1 = no zoom)
        scaleFactor: 1.1 // How much to zoom in/out with each scroll
    };

    let isDragging = false;
    let lastMouseX, lastMouseY;

    playButton.addEventListener('click', () => {
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');
        initSolarSystem();
        // Reset camera when starting new game
        camera.x = 0;
        camera.y = 0;
        camera.zoom = 1;
        animateSolarSystem();
    });

    // --- Camera Control Event Listeners ---
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); // Prevent page scrolling

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Calculate world coordinates before zoom
        const worldXBefore = (mouseX - canvas.width / 2) / camera.zoom - camera.x;
        const worldYBefore = (mouseY - canvas.height / 2) / camera.zoom - camera.y;

        if (e.deltaY < 0) { // Zoom in (scroll up)
            camera.zoom *= camera.scaleFactor;
        } else { // Zoom out (scroll down)
            camera.zoom /= camera.scaleFactor;
        }

        // Clamp zoom to reasonable limits
        camera.zoom = Math.max(0.1, Math.min(camera.zoom, 50)); // Min 0.1x, Max 50x

        // Adjust camera position to zoom towards the mouse cursor
        const worldXAfter = (mouseX - canvas.width / 2) / camera.zoom - camera.x;
        const worldYAfter = (mouseY - canvas.height / 2) / camera.zoom - camera.y;

        camera.x -= (worldXAfter - worldXBefore);
        camera.y -= (worldYAfter - worldYBefore);
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Middle mouse button
            e.preventDefault(); // Prevent default middle click behavior (e.g., auto-scroll)
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            canvas.style.cursor = 'grabbing'; // Change cursor
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;

            // Adjust camera position based on mouse movement and current zoom level
            // Divide by camera.zoom so that movement feels consistent regardless of zoom
            camera.x += dx / camera.zoom;
            camera.y += dy / camera.zoom;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 1) {
            isDragging = false;
            canvas.style.cursor = 'grab'; // Change cursor back
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false; // Stop dragging if mouse leaves canvas
        canvas.style.cursor = 'default';
    });
    // --- End Camera Control Event Listeners ---


    function initSolarSystem() {
        // Clear previous drawings (not strictly necessary before transform, but good practice)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // 1. Increase min sun size to 20x, max to 100x original
        const originalStarRadius = 20;
        const minStarRadius = originalStarRadius * 20; // 20x original
        const maxStarRadius = originalStarRadius * 100; // 100x original (2000px)

        currentStarRadius = minStarRadius + (Math.random() * (maxStarRadius - minStarRadius));
        // Removed the strong cap here, as zoom allows us to view very large stars
        // currentStarRadius = Math.min(currentStarRadius, Math.min(canvas.width, canvas.height) / 2.5);

        // Generate Planets
        const numPlanets = Math.floor(Math.random() * 11) + 2; // Between 2 and 12 planets

        // 3. Increase the distance a planet can be orbiting the sun by a lot.
        const minOverallOrbitRadius = currentStarRadius + 80;
        // Allow planets to be very far out, as we can zoom out
        const maxOverallOrbitRadius = (currentStarRadius * 3) + 1000; // Example: Star size * 3 + a large offset

        currentPlanets = [];

        let previousOrbitRadius = minOverallOrbitRadius;

        for (let i = 0; i < numPlanets; i++) {
            const planetRadius = Math.floor(Math.random() * 10) + 5; // Planets between 5 and 14 radius

            const minClearance = 30; // Minimum pixel space between the outer edge of one orbit and inner edge of next
            const minSpacingBetweenOrbits = 80; // A base minimum for how much orbits should spread
            const maxSpacingBetweenOrbits = 250; // Max random spread

            let potentialOrbitRadius = previousOrbitRadius + minSpacingBetweenOrbits + Math.random() * (maxSpacingBetweenOrbits - minSpacingBetweenOrbits);

            const requiredMinOrbitForNoOverlap = previousOrbitRadius + (currentPlanets.length > 0 ? currentPlanets[currentPlanets.length -1].radius : 0) + planetRadius + minClearance;

            let actualOrbitRadius = Math.max(potentialOrbitRadius, requiredMinOrbitForNoOverlap);

            // If we're pushing past the maximum, we might need to cap it
            if (actualOrbitRadius > maxOverallOrbitRadius) {
                 // If the required minimum orbit for no overlap is already greater than maxOverallOrbitRadius,
                 // then we can't place this planet without violating the max distance or overlapping.
                 if (requiredMinOrbitForNoOverlap > maxOverallOrbitRadius) {
                     break; // Cannot place this planet without overlap or exceeding max.
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

        // Apply camera transformations
        // Save the current canvas state (no transformations)
        ctx.save();

        // Translate to the center of the canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);
        // Apply zoom (scaling)
        ctx.scale(camera.zoom, camera.zoom);
        // Translate by the camera's position (panning)
        ctx.translate(camera.x, camera.y);

        // All drawing operations from here on will be affected by the camera transform

        // Center of the solar system (0,0 in the transformed coordinate space)
        const systemCenterX = 0;
        const systemCenterY = 0;

        // Redraw the Star
        ctx.beginPath();
        ctx.arc(systemCenterX, systemCenterY, currentStarRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 15 + (currentStarRadius / 20);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw and update planets
        currentPlanets.forEach(planet => {
            // Draw orbit path
            ctx.beginPath();
            ctx.arc(systemCenterX, systemCenterY, planet.orbitRadius, 0, Math.PI * 2);
            // Adjust line width to appear consistent regardless of zoom
            ctx.lineWidth = 0.5 / camera.zoom;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.stroke();

            // Update planet position
            planet.angle += planet.speed;
            const x = systemCenterX + Math.cos(planet.angle) * planet.orbitRadius;
            const y = systemCenterY + Math.sin(planet.angle) * planet.orbitRadius;

            // Draw planet
            ctx.beginPath();
            // Adjust planet radius to appear consistent (or not, depending on desired effect)
            // For this, we want planets to look "actual size" even when zoomed, so their drawn radius is fixed.
            ctx.arc(x, y, planet.radius, 0, Math.PI * 2);
            ctx.fillStyle = planet.color;
            ctx.fill();
        });

        // Restore the canvas state (remove transformations for next frame)
        ctx.restore();

        animationFrameId = requestAnimationFrame(animateSolarSystem);
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // No need to re-init solar system on resize if camera handles the view
        // Just keep the existing system and the camera will adjust to the new canvas size.
        // If you want a *new* system on resize, uncomment initSolarSystem();
        // if (gameScreen.classList.contains('active')) {
        //     cancelAnimationFrame(animationFrameId);
        //     initSolarSystem();
        //     animateSolarSystem();
        // }
    });

    // Initial cursor style
    canvas.style.cursor = 'grab';
});
