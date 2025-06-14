// --- CONFIGURATION VARIABLES ---
const CONFIG = {
    // Game Flow & UI
    PLANET_NAMES: [
        "Aethel", "Xylos", "Cygnus", "Vorlag", "Zandor",
        "Kryll", "Solara", "Draxia", "Vespera", "Rilax",
        "Obsidia", "Lumios", "Nyssa", "Grendel", "Thar",
        "Equinox", "Zenith", "Nebulon", "Seraph", "Orion",
        "Aethera", "Titanis", "Vortexia", "Stellara", "Grimor",
        "Echo", "Phobos", "Deimos", "Ares", "Hecate"
    ],

    // Star Properties
    ORIGINAL_STAR_RADIUS: 20, // Base reference for scaling
    MIN_STAR_MULTIPLIER: 200,   // Min sun size: ORIGINAL_STAR_RADIUS * 75 (1500px)
    MAX_STAR_MULTIPLIER: 400,  // Max sun size: ORIGINAL_STAR_RADIUS * 150 (3000px)

    // Planet Properties
    PLANET_RADIUS_MIN_BASE: 20,
    PLANET_RADIUS_MAX_BASE: 60,
    PLANET_RADIUS_SCALE_FACTOR: 10, // Planets are (5-14) * 10 = 50-140px
    MIN_PLANETS: 6, // Minimum number of planets to spawn
    MAX_PLANETS: 12, // Maximum number of planets to spawn

    // Orbit Properties
    MIN_ORBIT_START_FROM_STAR: 80, // Min initial distance from star for first planet
    STAR_ORBIT_MULTIPLIER: 50,     // Max orbit can be STAR_ORBIT_MULTIPLIER * currentStarRadius
    SCREEN_ORBIT_MULTIPLIER: 10,   // Max orbit can be SCREEN_ORBIT_MULTIPLIER * min(canvas.width, canvas.height)

    MIN_SPACING_BETWEEN_ORBITS: 1500,  // Min random gap between orbits
    MAX_SPACING_BETWEEN_ORBITS: 5000, // Max random gap between orbits
    MIN_PLANET_CLEARANCE: 10,         // Min pixel space between actual planet bodies on different orbits

    ORBIT_LINE_WIDTH: 0.25, // Base width of orbit lines

    MIN_ORBIT_SPEED: 0.0001,
    MAX_ORBIT_SPEED: 0.003,

    ELLIPTICAL_ORBIT_CHANCE: 0.15, // 15% chance for elliptical orbit
    ELLIPSE_ECCENTRICITY_MIN: 0.1,
    ELLIPSE_ECCENTRICITY_MAX: 0.8,

    // Camera Properties
    CAMERA_INITIAL_ZOOM: 1, // Will be dynamically calculated. Placeholder.
    CAMERA_SCALE_FACTOR: 1.1, // Zoom step size
    CAMERA_DRAG_SENSITIVITY: 0.8, // Slower drag
    CAMERA_MIN_ZOOM: 0.0001, // Max zoom out (can go very far)
    CAMERA_MAX_ZOOM: 50,     // Max zoom in
    INITIAL_VIEW_PADDING_FACTOR: 1.2, // Padding for initial zoom calculation
};
// --- END CONFIGURATION VARIABLES ---


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
        zoom: CONFIG.CAMERA_INITIAL_ZOOM, // Use config
        scaleFactor: CONFIG.CAMERA_SCALE_FACTOR, // Use config
        dragSensitivity: CONFIG.CAMERA_DRAG_SENSITIVITY // Use config
    };

    let isDragging = false;
    let lastMouseX, lastMouseY;
    let selectingStarterPlanet = false;
    let gameActive = false; // Controls overall interaction after setup


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
        if (!gameActive) return; // Allow zoom only if game is active

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

        camera.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(camera.zoom, CONFIG.CAMERA_MAX_ZOOM));

        camera.x = -worldXAtMouse + (mouseX - canvas.width / 2) / camera.zoom;
        camera.y = -worldYAtMouse + (mouseY - canvas.height / 2) / camera.zoom;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (!gameActive) return; // Allow clicks only if game is active

        if (e.button === 0) { // Left mouse button
            e.preventDefault(); // Prevent default browser drag for images, etc.
            let planetClicked = false;

            // Handle planet selection if in selecting mode
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
                        planetClicked = true;
                        break; // Stop checking
                    }
                }
            }

            // If a planet was NOT clicked OR if we're not in planet selection mode, allow dragging.
            // This ensures dragging works on empty space even when the "choose planet" panel is up.
            if (!planetClicked) {
                isDragging = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!gameActive) return; // Allow mousemove only if game is active

        if (isDragging) { // Dragging is now independent of selectingStarterPlanet state
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;

            camera.x += (dx / camera.zoom) * camera.dragSensitivity;
            camera.y += (dy / camera.zoom) * camera.dragSensitivity;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!gameActive) return; // Allow mouseup only if game is active

        if (e.button === 0) { // Stop dragging regardless of selection state
            isDragging = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (!gameActive) return; // Allow mouseleave only if game is active
        isDragging = false;
    });

    function initSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const originalStarRadius = CONFIG.ORIGINAL_STAR_RADIUS;
        const minStarRadius = originalStarRadius * CONFIG.MIN_STAR_MULTIPLIER;
        const maxStarRadius = originalStarRadius * CONFIG.MAX_STAR_MULTIPLIER;

        currentStarRadius = minStarRadius + (Math.random() * (maxStarRadius - minStarRadius));

        const numPlanets = Math.floor(Math.random() * (CONFIG.MAX_PLANETS - CONFIG.MIN_PLANETS + 1)) + CONFIG.MIN_PLANETS;

        const minOverallOrbitRadius = currentStarRadius + CONFIG.MIN_ORBIT_START_FROM_STAR;
        const maxOverallOrbitRadius = Math.max(
            Math.min(canvas.width, canvas.height) * CONFIG.SCREEN_ORBIT_MULTIPLIER,
            currentStarRadius * CONFIG.STAR_ORBIT_MULTIPLIER
        );

        currentPlanets = [];
        const shuffledPlanetNames = [...CONFIG.PLANET_NAMES].sort(() => 0.5 - Math.random());

        let previousOrbitRadius = minOverallOrbitRadius;

        for (let i = 0; i < numPlanets; i++) {
            const planetRadius = (Math.floor(Math.random() * (CONFIG.PLANET_RADIUS_MAX_BASE - CONFIG.PLANET_RADIUS_MIN_BASE + 1)) + CONFIG.PLANET_RADIUS_MIN_BASE) * CONFIG.PLANET_RADIUS_SCALE_FACTOR;

            const minPlanetClearance = CONFIG.MIN_PLANET_CLEARANCE;
            const minimumOrbitDistanceFromPreviousPlanet = previousOrbitRadius +
                                                           (currentPlanets.length > 0 ? currentPlanets[currentPlanets.length -1].radius : 0) +
                                                           planetRadius + minPlanetClearance;

            const minSpacingBetweenOrbits = CONFIG.MIN_SPACING_BETWEEN_ORBITS;
            const maxSpacingBetweenOrbits = CONFIG.MAX_SPACING_BETWEEN_ORBITS;

            let potentialOrbitRadius = previousOrbitRadius + minSpacingBetweenOrbits + Math.random() * (maxSpacingBetweenOrbits - minSpacingBetweenOrbits);

            let actualOrbitRadius = Math.max(potentialOrbitRadius, minimumOrbitDistanceFromPreviousPlanet);

            if (actualOrbitRadius > maxOverallOrbitRadius) {
                 if (minimumOrbitDistanceFromPreviousPlanet > maxOverallOrbitRadius) {
                     break;
                 }
                 actualOrbitRadius = maxOverallOrbitRadius;
            }

            const initialAngle = Math.random() * Math.PI * 2;
            const minOrbitSpeed = CONFIG.MIN_ORBIT_SPEED;
            const maxOrbitSpeed = CONFIG.MAX_ORBIT_SPEED;

            const orbitSpeed = (minOrbitSpeed + Math.random() * (maxOrbitSpeed - minOrbitSpeed)) * (Math.random() > 0.5 ? 1 : -1);

            const isElliptical = Math.random() < CONFIG.ELLIPTICAL_ORBIT_CHANCE;
            let semiMajorAxis = actualOrbitRadius;
            let semiMinorAxis = actualOrbitRadius;
            let eccentricity = 0;
            let rotationAngle = 0;

            if (isElliptical) {
                eccentricity = Math.random() * (CONFIG.ELLIPSE_ECCENTRICITY_MAX - CONFIG.ELLIPSE_ECCENTRICITY_MIN) + CONFIG.ELLIPSE_ECCENTRICITY_MIN;
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

        maxWorldExtent *= CONFIG.INITIAL_VIEW_PADDING_FACTOR;

        const requiredZoom = Math.min(canvas.width, canvas.height) / (maxWorldExtent * 2);

        camera.zoom = requiredZoom;
        camera.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(camera.zoom, CONFIG.CAMERA_MAX_ZOOM));
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
            ctx.lineWidth = CONFIG.ORBIT_LINE_WIDTH / camera.zoom;
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
