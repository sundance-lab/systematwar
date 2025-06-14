document.addEventListener('DOMContentLoaded', () => {
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const playButton = document.getElementById('play-button');
    const canvas = document.getElementById('solar-system-canvas');
    const ctx = canvas.getContext('2d');
    const starterPlanetPanel = document.getElementById('starter-planet-panel');
    const planetChosenPanel = document.getElementById('planet-chosen-panel');
    const chosenPlanetNameDisplay = document.getElementById('chosen-planet-name');
    const confirmPlanetButton = document.getElementById('confirm-planet-button');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationFrameId;
    let currentPlanets = [];
    let currentStarRadius;

    const camera = {
        x: 0,
        y: 0,
        zoom: 1, // Will be set dynamically to fit system
        scaleFactor: 1.1,
        dragSensitivity: 0.8
    };

    let isDragging = false;
    let lastMouseX, lastMouseY;
    let selectingStarterPlanet = false;
    let gameActive = false;

    const planetNames = [
        "Aethel", "Xylos", "Cygnus", "Vorlag", "Zandor",
        "Kryll", "Solara", "Draxia", "Vespera", "Rilax",
        "Obsidia", "Lumios", "Nyssa", "Grendel", "Thar",
        "Equinox", "Zenith", "Nebulon", "Seraph", "Orion",
        "Aethera", "Titanis", "Vortexia", "Stellara", "Grimor",
        "Echo", "Phobos", "Deimos", "Ares", "Hecate"
    ];


    playButton.addEventListener('click', () => {
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');

        initSolarSystem(); // Initialize solar system first to get star and planet data
        setInitialCameraZoom(); // Then calculate initial zoom based on generated system

        camera.x = 0; // Reset camera position to center (0,0) of the world
        camera.y = 0;

        animateSolarSystem();

        selectingStarterPlanet = true;
        starterPlanetPanel.classList.add('active'); // Show in-game panel
        gameActive = true; // Game interactions now allowed
    });

    confirmPlanetButton.addEventListener('click', () => {
        planetChosenPanel.classList.remove('active'); // Hide confirmation panel
        selectingStarterPlanet = false; // End selection phase for good
    });

    canvas.addEventListener('wheel', (e) => {
        if (!gameActive) return;

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

        camera.zoom = Math.max(0.0001, Math.min(camera.zoom, 50)); // Allow very far zoom out

        camera.x = -worldXAtMouse + (mouseX - canvas.width / 2) / camera.zoom;
        camera.y = -worldYAtMouse + (mouseY - canvas.height / 2) / camera.zoom;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (!gameActive) return;

        if (e.button === 0) { // Left mouse button
            if (selectingStarterPlanet) {
                const mouseX = e.clientX;
                const mouseY = e.clientY;

                const worldX = (mouseX - canvas.width / 2) / camera.zoom - camera.x;
                const worldY = (mouseY - canvas.height / 2) / camera.zoom - camera.y;

                for (let i = 0; i < currentPlanets.length; i++) {
                    const planet = currentPlanets[i];
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

                    const distance = Math.sqrt(
                        Math.pow(worldX - planetX, 2) +
                        Math.pow(worldY - planetY, 2)
                    );

                    if (distance < planet.radius) {
                        starterPlanetPanel.classList.remove('active');
                        chosenPlanetNameDisplay.textContent = `You chose ${planet.name}!`;
                        planetChosenPanel.classList.add('active');
                        return;
                    }
                }
            } else {
                e.preventDefault();
                isDragging = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!gameActive) return;

        if (isDragging && !selectingStarterPlanet) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;

            camera.x += (dx / camera.zoom) * camera.dragSensitivity;
            camera.y += (dy / camera.zoom) * camera.dragSensitivity;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!gameActive) return;

        if (e.button === 0 && !selectingStarterPlanet) {
            isDragging = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (!gameActive) return;
        isDragging = false;
    });

    function initSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const originalStarRadius = 20;
        const minStarRadius = originalStarRadius * 75; // 1500px
        const maxStarRadius = originalStarRadius * 150; // 3000px

        currentStarRadius = minStarRadius + (Math.random() * (maxStarRadius - minStarRadius));

        // Minimum number of planets spawn be 6 (max 12 still)
        const numPlanets = Math.floor(Math.random() * 7) + 6; // (12 - 6 + 1) + 6 = 7 + 6 = range of 6 to 12


        const minOverallOrbitRadius = currentStarRadius + 80;
        // Increase the max distance a planet can be orbiting the sun by a lot.
        // Screen-based multiplier significantly increased.
        const starOrbitMultiplier = 50; // Increased from 30
        const screenOrbitMultiplier = Math.min(canvas.width, canvas.height) * 10; // Increased from 5

        const maxOverallOrbitRadius = Math.max(screenOrbitMultiplier, currentStarRadius * starOrbitMultiplier);


        currentPlanets = [];
        const shuffledPlanetNames = [...planetNames].sort(() => 0.5 - Math.random());

        let previousOrbitRadius = minOverallOrbitRadius;

        for (let i = 0; i < numPlanets; i++) {
            const planetRadius = (Math.floor(Math.random() * 10) + 5) * 10;

            const minPlanetClearance = 10;
            const minimumOrbitDistanceFromPreviousPlanet = previousOrbitRadius +
                                                           (currentPlanets.length > 0 ? currentPlanets[currentPlanets.length -1].radius : 0) +
                                                           planetRadius + minPlanetClearance;

            // Further vary the orbit distances from one another.
            // Made the range for minSpacingBetweenOrbits and maxSpacingBetweenOrbits much wider.
            const minSpacingBetweenOrbits = 500; // Increased from 300
            const maxSpacingBetweenOrbits = 3000; // Increased from 1500

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
                name: shuffledPlanetNames[i % shuffledPlanetNames.length],
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

    function setInitialCameraZoom() {
        let maxWorldExtent = currentStarRadius;

        if (currentPlanets.length > 0) {
            const outermostPlanet = currentPlanets[currentPlanets.length - 1];
            const outermostDistance = outermostPlanet.isElliptical ? outermostPlanet.semiMajorAxis : outermostPlanet.orbitRadius;
            maxWorldExtent = Math.max(maxWorldExtent, outermostDistance + outermostPlanet.radius);
        }

        maxWorldExtent *= 1.2; // 20% padding

        const requiredZoom = Math.min(canvas.width, canvas.height) / (maxWorldExtent * 2);

        camera.zoom = requiredZoom;
        camera.zoom = Math.max(0.0001, Math.min(camera.zoom, 50));
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
            ctx.lineWidth = 0.25 / camera.zoom;
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
        if (gameActive) {
            cancelAnimationFrame(animationFrameId);
            setInitialCameraZoom(); // Recalculate zoom to fit new screen size
            animateSolarSystem();
        }
    });

    canvas.style.cursor = 'default';
});
