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
        zoom: 0.1,
        scaleFactor: 1.1,
        dragSensitivity: 0.8
    };

    let isDragging = false;
    let lastMouseX, lastMouseY;
    let selectingStarterPlanet = false; // New state variable

    playButton.addEventListener('click', () => {
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');
        initSolarSystem();
        camera.x = 0;
        camera.y = 0;
        camera.zoom = 0.1;
        animateSolarSystem();

        // Prompt user to choose a starter planet
        selectingStarterPlanet = true;
        alert("Choose a starter planet by clicking on it!");
        canvas.style.cursor = 'pointer'; // Indicate clickable
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const worldXAtMouse = (mouseX - canvas.width / 2) / camera.zoom - camera.x;
        const worldYAtMouse = (mouseY - canvas.height / 2) / camera.zoom - camera.y;

        if (e.deltaY < 0) { // Zoom in
            camera.zoom *= camera.scaleFactor;
        } else { // Zoom out
            camera.zoom /= camera.scaleFactor;
        }

        camera.zoom = Math.max(0.01, Math.min(camera.zoom, 50));

        camera.x = -worldXAtMouse + (mouseX - canvas.width / 2) / camera.zoom;
        camera.y = -worldYAtMouse + (mouseY - canvas.height / 2) / camera.zoom;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (selectingStarterPlanet && e.button === 0) { // If selecting and left-click
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            // Convert canvas coordinates to world coordinates
            const worldX = (mouseX - canvas.width / 2) / camera.zoom - camera.x;
            const worldY = (mouseY - canvas.height / 2) / camera.zoom - camera.y;

            // Check if a planet was clicked
            for (let i = 0; i < currentPlanets.length; i++) {
                const planet = currentPlanets[i];
                // Calculate planet's current world position
                let planetX, planetY;
                if (planet.isElliptical) {
                    const unrotatedX = planet.semiMajorAxis * Math.cos(planet.angle);
                    const unrotatedY = planet.semiMinorAxis * Math.sin(planet.angle);
                    planetX = unrotatedX * Math.cos(planet.rotationAngle) - unrotatedY * Math.sin(planet.rotationAngle);
                    planetY = unrotatedX * Math.sin(planet.rotationAngle) + unrotatedY * Math.cos(planet.rotationAngle);
                } else {
                    planetX = Math.cos(planet.angle) * planet.orbitRadius;
                    planetY = Math.sin(planet.angle) * planet.orbitRadius;
                }

                // Distance from mouse click to planet center
                const distance = Math.sqrt(
                    Math.pow(worldX - planetX, 2) +
                    Math.pow(worldY - planetY, 2)
                );

                if (distance < planet.radius) {
                    // Planet clicked!
                    alert(`You chose Planet ${i + 1}!`); // Simple feedback
                    selectingStarterPlanet = false; // End selection phase
                    canvas.style.cursor = 'grab'; // Restore cursor for dragging
                    return; // Stop checking
                }
            }
        } else if (e.button === 0) { // Left mouse button for dragging
            e.preventDefault();
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && !selectingStarterPlanet) { // Only drag if not selecting
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;

            camera.x += (dx / camera.zoom) * camera.dragSensitivity;
            camera.y += (dy / camera.zoom) * camera.dragSensitivity;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        } else if (selectingStarterPlanet) {
            canvas.style.cursor = 'pointer'; // Keep pointer cursor during selection
        } else {
            canvas.style.cursor = 'grab'; // Default grab cursor
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0 && !selectingStarterPlanet) { // Left mouse button and not selecting
            isDragging = false;
            canvas.style.cursor = 'grab';
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        if (!selectingStarterPlanet) { // Only reset to default if not in selection mode
            canvas.style.cursor = 'default';
        }
    });

    function initSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const originalStarRadius = 20;
        // Average sun size 3x what it is now (current min 400, current max 2000)
        // Let's scale these up by roughly 3.
        const minStarRadius = originalStarRadius * 60; // Was 20 * 20 = 400, now 20 * 60 = 1200
        const maxStarRadius = originalStarRadius * 300; // Was 20 * 100 = 2000, now 20 * 300 = 6000

        currentStarRadius = minStarRadius + (Math.random() * (maxStarRadius - minStarRadius));
        currentStarRadius = Math.min(currentStarRadius, Math.min(canvas.width, canvas.height) * 0.4);

        const numPlanets = Math.floor(Math.random() * 11) + 2;

        const minOverallOrbitRadius = currentStarRadius + 80;
        const maxOverallOrbitRadius = Math.min(canvas.width, canvas.height) * 10;

        currentPlanets = [];
        let previousOrbitRadius = minOverallOrbitRadius;

        for (let i = 0; i < numPlanets; i++) {
            // Average planet size 10x what it is now (currently 5-14)
            // Let's scale the random range up by 10.
            const planetRadius = (Math.floor(Math.random() * 10) + 5) * 10; // New range: 50-140

            const minPlanetClearance = 10;
            const minimumOrbitDistanceFromPreviousPlanet = previousOrbitRadius +
                                                           (currentPlanets.length > 0 ? currentPlanets[currentPlanets.length -1].radius : 0) +
                                                           planetRadius + minPlanetClearance;

            const minSpacingBetweenOrbits = 300;
            const maxSpacingBetweenOrbits = 1500;

            let potentialOrbitRadius = previousOrbitRadius + minSpacingBetweenOrbits + Math.random() * (maxSpacingBetweenOrbits - minSpacingBetweenOrbits);

            let actualOrbitRadius = Math.max(potentialOrbitRadius, minimumOrbitDistanceFromPreviousPlanet);

            if (actualOrbitRadius > maxOverallOrbitRadius) {
                 if (minimumOrbitDistanceFromPreviousPlanet > maxOverallOrbitRadius) {
                     break;
                 }
                 actualOrbitRadius = maxOverallOrbitRadius;
            }

            const initialAngle = Math.random() * Math.PI * 2;
            const minOrbitSpeed = 0.0001;
            const maxOrbitSpeed = 0.003;

            const orbitSpeed = (minOrbitSpeed + Math.random() * (maxOrbitSpeed - minOrbitSpeed)) * (Math.random() > 0.5 ? 1 : -1);

            const isElliptical = Math.random() < 0.15;
            let semiMajorAxis = actualOrbitRadius;
            let semiMinorAxis = actualOrbitRadius;
            let eccentricity = 0;
            let rotationAngle = 0;

            if (isElliptical) {
                eccentricity = Math.random() * 0.7 + 0.1;
                semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
                rotationAngle = Math.random() * Math.PI * 2;
            }

            currentPlanets.push({
                radius: planetRadius,
                orbitRadius: actualOrbitRadius,
                angle: initialAngle,
                speed: orbitSpeed,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                isElliptical: isElliptical,
                semiMajorAxis: semiMajorAxis,
                semiMinorAxis: semiMinorAxis,
                eccentricity: eccentricity,
                rotationAngle: rotationAngle
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
            if (planet.isElliptical) {
                ctx.ellipse(
                    systemCenterX,
                    systemCenterY,
                    planet.semiMajorAxis,
                    planet.semiMinorAxis,
                    planet.rotationAngle,
                    0,
                    Math.PI * 2
                );
            } else {
                ctx.arc(systemCenterX, systemCenterY, planet.orbitRadius, 0, Math.PI * 2);
            }
            ctx.lineWidth = 0.5 / camera.zoom;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.stroke();

            planet.angle += planet.speed;
            let x, y;

            if (planet.isElliptical) {
                const unrotatedX = planet.semiMajorAxis * Math.cos(planet.angle);
                const unrotatedY = planet.semiMinorAxis * Math.sin(planet.angle);

                x = systemCenterX + unrotatedX * Math.cos(planet.rotationAngle) - unrotatedY * Math.sin(planet.rotationAngle);
                y = systemCenterY + unrotatedX * Math.sin(planet.rotationAngle) + unrotatedY * Math.cos(planet.rotationAngle);

            } else {
                x = systemCenterX + Math.cos(planet.angle) * planet.orbitRadius;
                y = systemCenterY + Math.sin(planet.angle) * planet.orbitRadius;
            }

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
