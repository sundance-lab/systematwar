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
    MIN_STAR_MULTIPLIER: 75,   // Min sun size: ORIGINAL_STAR_RADIUS * 75 (1500px)
    MAX_STAR_MULTIPLIER: 150,  // Max sun size: ORIGINAL_STAR_RADIUS * 150 (3000px)

    // Planet Properties
    PLANET_RADIUS_MIN_BASE: 5,
    PLANET_RADIUS_MAX_BASE: 14,
    PLANET_RADIUS_SCALE_FACTOR: 10, // Planets are (5-14) * 10 = 50-140px
    MIN_PLANETS: 6, // Minimum number of planets to spawn
    MAX_PLANETS: 12, // Maximum number of planets to spawn

    // Orbit Properties
    MIN_ORBIT_START_FROM_STAR: 80, // Min initial distance from star for first planet
    STAR_ORBIT_MULTIPLIER: 50,     // Max orbit can be STAR_ORBIT_MULTIPLIER * currentStarRadius
    SCREEN_ORBIT_MULTIPLIER: 10,   // Max orbit can be SCREEN_ORBIT_MULTIPLIER * min(canvas.width, canvas.height)

    MIN_SPACING_BETWEEN_ORBITS: 500,  // Min random gap between orbits
    MAX_SPACING_BETWEEN_ORBITS: 3000, // Max random gap between orbits
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

    // Camera Tracking
    CAMERA_FOLLOW_LERP_FACTOR: 0.05, // How smoothly the camera follows (0-1, lower is smoother)
    CAMERA_FOLLOW_ZOOM_TARGET: 3.0, // Target zoom level when following a planet (increased for closer view)

    // Planet Counter
    PLANET_COUNTER_UPDATE_INTERVAL_MS: 1000, // Update counter every 1000ms (1 second)

    // Game Score
    CONSTANT_SCORE_INTERVAL_MS: 100, // Gain points every 100ms
    CONSTANT_SCORE_POINTS: 1, // Points gained constantly
    ASTEROID_HIT_POINTS: 50, // Points gained per asteroid destroyed

    // Asteroid Properties
    ASTEROID_SPAWN_INTERVAL_MS: 500, // Spawn a new asteroid every 500ms
    ASTEROID_MIN_RADIUS: 5,
    ASTEROID_MAX_RADIUS: 15,
    ASTEROID_MIN_SPEED: 0.5, // Pixels per frame (at zoom 1)
    ASTEROID_MAX_SPEED: 2.0,
    ASTEROID_SPAWN_DISTANCE_FROM_PLANET: 2000, // Distance from chosen planet to spawn
    ASTEROID_OFFSCREEN_THRESHOLD: 3000, // Distance to remove off-screen asteroids
    MAX_ASTEROIDS_ON_SCREEN: 50, // Max number of asteroids before slowing spawn
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
    const planetListPanel = document.getElementById('planet-list-panel');
    const planetList = document.getElementById('planet-list');
    const scorePanel = document.getElementById('score-panel'); // NEW: Score panel
    const currentScoreDisplay = document.getElementById('current-score'); // NEW: Score display span

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationFrameId;
    let currentPlanets = [];
    let currentStarRadius;

    const camera = {
        x: 0,
        y: 0,
        zoom: CONFIG.CAMERA_INITIAL_ZOOM,
        scaleFactor: CONFIG.CAMERA_SCALE_FACTOR,
        dragSensitivity: CONFIG.CAMERA_DRAG_SENSITIVITY,
        targetPlanet: null,
        activeListItem: null
    };

    let isDragging = false;
    let lastMouseX, lastMouseY;
    let selectingStarterPlanet = false;
    let gameActive = false; // Controls overall interaction after setup

    // Game State Variables
    let score = 0; // NEW: Player's score
    let asteroids = []; // NEW: Array to hold active asteroids
    let chosenStarterPlanet = null; // NEW: Stores the planet chosen by the player

    // Interval IDs for clearing
    let planetCounterInterval = null;
    let constantScoreInterval = null; // NEW: Interval for constant score gain
    let asteroidSpawnInterval = null; // NEW: Interval for asteroid spawning


    playButton.addEventListener('click', () => {
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');

        initSolarSystem();
        setInitialCameraZoom(); // Initial zoom to show whole system

        // Reset game state on play
        camera.x = 0;
        camera.y = 0;
        camera.targetPlanet = null;
        camera.activeListItem = null;
        score = 0;
        asteroids = [];
        chosenStarterPlanet = null;
        updateScoreDisplay(); // Reset score display

        populatePlanetList(); // Populates with 0s for counters

        animateSolarSystem();

        selectingStarterPlanet = true; // Enter selection phase
        starterPlanetPanel.classList.add('active'); // Show "Choose planet" prompt
        planetListPanel.classList.add('active'); // Show planet list
        scorePanel.classList.add('active'); // NEW: Show score panel
        gameActive = true;

        // Start counters
        if (planetCounterInterval) clearInterval(planetCounterInterval);
        planetCounterInterval = setInterval(updatePlanetCounters, CONFIG.PLANET_COUNTER_UPDATE_INTERVAL_MS);

        if (constantScoreInterval) clearInterval(constantScoreInterval);
        constantScoreInterval = setInterval(() => {
            score += CONFIG.CONSTANT_SCORE_POINTS;
            updateScoreDisplay();
        }, CONFIG.CONSTANT_SCORE_INTERVAL_MS);
    });

    confirmPlanetButton.addEventListener('click', () => {
        planetChosenPanel.classList.remove('active');
        selectingStarterPlanet = false; // Exit selection mode
        
        // NEW: Focus camera on the chosen planet immediately and start following
        camera.targetPlanet = chosenStarterPlanet;
        camera.zoom = CONFIG.CAMERA_FOLLOW_ZOOM_TARGET; // Snap zoom to target level
        
        // Start asteroid spawning only after a planet is chosen
        if (asteroidSpawnInterval) clearInterval(asteroidSpawnInterval);
        asteroidSpawnInterval = setInterval(spawnAsteroid, CONFIG.ASTEROID_SPAWN_INTERVAL_MS);
    });

    canvas.addEventListener('wheel', (e) => {
        if (!gameActive) return;

        e.preventDefault();

        // Stop following a planet on manual zoom
        camera.targetPlanet = null;
        if (camera.activeListItem) {
            camera.activeListItem.classList.remove('active');
            camera.activeListItem = null;
        }

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
        if (!gameActive) return;

        // Stop following a planet on manual pan attempt
        if (camera.targetPlanet) {
            camera.targetPlanet = null;
            if (camera.activeListItem) {
                camera.activeListItem.classList.remove('active');
                camera.activeListItem = null;
            }
        }

        if (e.button === 0) { // Left mouse button
            e.preventDefault();
            let clickHandled = false;

            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const worldX = (mouseX - canvas.width / 2) / camera.zoom - camera.x;
            const worldY = (mouseY - canvas.height / 2) / camera.zoom - camera.y;

            // 1. Try to select a starter planet (if in selection phase)
            if (selectingStarterPlanet) {
                for (let i = 0; i < currentPlanets.length; i++) {
                    const planet = currentPlanets[i];
                    let planetWorldX, planetWorldY;
                    if (planet.isElliptical) {
                        const unrotatedX = planet.semiMajorAxis * Math.cos(planet.angle);
                        const unrotatedY = planet.semiMinorAxis * Math.sin(planet.angle);
                        planetWorldX = unrotatedX * Math.cos(planet.rotationAngle) - unrotatedY * Math.sin(planet.rotationAngle);
                        planetWorldY = unrotatedX * Math.sin(planet.rotationAngle) + unrotatedY * Math.cos(planet.rotationAngle);
                    } else {
                        planetWorldX = Math.cos(planet.angle) * planet.orbitRadius;
                        planetWorldY = Math.sin(planet.angle) * planet.orbitRadius;
                    }

                    const distance = Math.sqrt(
                        Math.pow(worldX - planetWorldX, 2) +
                        Math.pow(worldY - planetWorldY, 2)
                    );

                    if (distance < planet.radius) {
                        chosenStarterPlanet = planet; // Store the chosen planet
                        starterPlanetPanel.classList.remove('active');
                        chosenPlanetNameDisplay.textContent = `You chose ${planet.name}!`;
                        planetChosenPanel.classList.add('active');
                        clickHandled = true;
                        break;
                    }
                }
            } 
            
            // 2. If not selecting a starter planet, or if no planet was clicked, try to shoot an asteroid
            if (!selectingStarterPlanet && !clickHandled && chosenStarterPlanet) { // Only shoot if game has started & planet chosen
                for (let i = asteroids.length - 1; i >= 0; i--) { // Iterate backwards to safely remove
                    const asteroid = asteroids[i];
                    const distance = Math.sqrt(
                        Math.pow(worldX - asteroid.x, 2) +
                        Math.pow(worldY - asteroid.y, 2)
                    );

                    if (distance < asteroid.radius) {
                        score += CONFIG.ASTEROID_HIT_POINTS; // Add points
                        updateScoreDisplay(); // Update display
                        asteroids.splice(i, 1); // Remove asteroid
                        clickHandled = true;
                        break;
                    }
                }
            }

            // 3. If nothing else was clicked, initiate drag
            if (!clickHandled) {
                isDragging = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!gameActive) return;

        if (isDragging) {
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

        if (e.button === 0) {
            isDragging = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (!gameActive) return;
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
                rotationAngle: rotationAngle,
                timeSurvived: 0,
                listItemRef: null
            });

            previousOrbitRadius = actualOrbitRadius;
        }

        currentPlanets.sort((a, b) => a.orbitRadius - b.orbitRadius);
    }

    function populatePlanetList() {
        planetList.innerHTML = '';

        currentPlanets.forEach((planet, index) => {
            const listItem = document.createElement('li');
            const planetNumberSpan = document.createElement('span');
            planetNumberSpan.classList.add('planet-number');
            planetNumberSpan.textContent = `0 `; // Removed 's'

            const planetNameText = document.createTextNode(`P${index + 1}: ${planet.name}`);

            listItem.appendChild(planetNumberSpan);
            listItem.appendChild(planetNameText);
            listItem.dataset.planetIndex = index;

            planet.listItemRef = listItem;

            listItem.addEventListener('click', () => {
                if (camera.activeListItem) {
                    camera.activeListItem.classList.remove('active');
                }
                listItem.classList.add('active');
                camera.activeListItem = listItem;

                camera.targetPlanet = planet;
                // NEW: Immediately snap zoom to target when clicked in list
                camera.zoom = CONFIG.CAMERA_FOLLOW_ZOOM_TARGET;
            });
            planetList.appendChild(listItem);
        });
    }

    function updatePlanetCounters() {
        currentPlanets.forEach((planet, index) => {
            planet.timeSurvived++;
            if (planet.listItemRef) {
                const counterSpan = planet.listItemRef.querySelector('.planet-number');
                if (counterSpan) {
                    counterSpan.textContent = `${planet.timeSurvived} `; // Removed 's'
                }
            }
        });
    }

    // NEW: Function to update score display
    function updateScoreDisplay() {
        currentScoreDisplay.textContent = score;
    }

    // NEW: Function to spawn an asteroid
    function spawnAsteroid() {
        if (!chosenStarterPlanet || asteroids.length >= CONFIG.MAX_ASTEROIDS_ON_SCREEN) {
            return; // Only spawn if a planet is chosen and max asteroids not reached
        }

        // Get the current position of the chosen planet
        let planetCurrentX, planetCurrentY;
        if (chosenStarterPlanet.isElliptical) {
            const unrotatedX = chosenStarterPlanet.semiMajorAxis * Math.cos(chosenStarterPlanet.angle);
            const unrotatedY = chosenStarterPlanet.semiMinorAxis * Math.sin(chosenStarterPlanet.angle);
            planetCurrentX = unrotatedX * Math.cos(chosenStarterPlanet.rotationAngle) - unrotatedY * Math.sin(chosenStarterPlanet.rotationAngle);
            planetCurrentY = unrotatedX * Math.sin(chosenStarterPlanet.rotationAngle) + unrotatedY * Math.cos(chosenStarterPlanet.rotationAngle);
        } else {
            planetCurrentX = Math.cos(chosenStarterPlanet.angle) * chosenStarterPlanet.orbitRadius;
            planetCurrentY = Math.sin(chosenStarterPlanet.angle) * chosenStarterPlanet.orbitRadius;
        }

        const asteroidRadius = Math.floor(Math.random() * (CONFIG.ASTEROID_MAX_RADIUS - CONFIG.ASTEROID_MIN_RADIUS + 1)) + CONFIG.ASTEROID_MIN_RADIUS;
        const asteroidSpeed = Math.random() * (CONFIG.ASTEROID_MAX_SPEED - CONFIG.ASTEROID_MIN_SPEED) + CONFIG.ASTEROID_MIN_SPEED;

        // Spawn point: random angle at a set distance from the planet
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnX = planetCurrentX + Math.cos(spawnAngle) * CONFIG.ASTEROID_SPAWN_DISTANCE_FROM_PLANET;
        const spawnY = planetCurrentY + Math.sin(spawnAngle) * CONFIG.ASTEROID_SPAWN_DISTANCE_FROM_PLANET;

        // Direction of movement: towards or slightly away/tangent to the planet
        // For simplicity, let's make them move towards the planet's general vicinity
        // or just a random direction from their spawn point.
        // Let's make them move towards the center of the solar system, for now.
        // Or, a random direction
        const directionAngle = Math.random() * Math.PI * 2;
        const velocityX = Math.cos(directionAngle) * asteroidSpeed;
        const velocityY = Math.sin(directionAngle) * asteroidSpeed;


        asteroids.push({
            x: spawnX,
            y: spawnY,
            radius: asteroidRadius,
            color: `hsl(${Math.random() * 360}, 20%, 40%)`, // Greyish random colors
            velocityX: velocityX,
            velocityY: velocityY
        });
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

        // Camera follow logic
        if (camera.targetPlanet) {
            let targetX, targetY;
            if (camera.targetPlanet.isElliptical) {
                const unrotatedX = camera.targetPlanet.semiMajorAxis * Math.cos(camera.targetPlanet.angle);
                const unrotatedY = camera.targetPlanet.semiMinorAxis * Math.sin(camera.targetPlanet.angle);
                targetX = unrotatedX * Math.cos(camera.targetPlanet.rotationAngle) - unrotatedY * Math.sin(camera.targetPlanet.rotationAngle);
                targetY = unrotatedX * Math.sin(camera.targetPlanet.rotationAngle) + unrotatedY * Math.cos(camera.targetPlanet.rotationAngle);
            } else {
                targetX = Math.cos(camera.targetPlanet.angle) * camera.targetPlanet.orbitRadius;
                targetY = Math.sin(camera.targetPlanet.angle) * camera.targetPlanet.orbitRadius;
            }

            camera.x = camera.x + ((-targetX / camera.zoom) - camera.x) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;
            camera.y = camera.y + ((-targetY / camera.zoom) - camera.y) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;

            camera.zoom = camera.zoom + (CONFIG.CAMERA_FOLLOW_ZOOM_TARGET - camera.zoom) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;
            camera.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(camera.zoom, CONFIG.CAMERA_MAX_ZOOM));
        }

        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(camera.x, camera.y);

        const systemCenterX = 0;
        const systemCenterY = 0;

        // Draw the Star
        ctx.beginPath();
        ctx.arc(systemCenterX, systemCenterY, currentStarRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 15 + (currentStarRadius / 20);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw and update planets
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

        // NEW: Draw and update asteroids
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            asteroid.x += asteroid.velocityX;
            asteroid.y += asteroid.velocityY;

            // Remove asteroids if they fly too far off-screen from the current view center
            const distFromCenter = Math.sqrt(Math.pow(asteroid.x - systemCenterX, 2) + Math.pow(asteroid.y - systemCenterY, 2));
            if (distFromCenter > (Math.min(canvas.width, canvas.height) / camera.zoom) + CONFIG.ASTEROID_OFFSCREEN_THRESHOLD) {
                asteroids.splice(i, 1);
                continue; // Skip drawing this one
            }

            ctx.beginPath();
            ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
            ctx.fillStyle = asteroid.color;
            ctx.fill();
        }


        ctx.restore();
        animationFrameId = requestAnimationFrame(animateSolarSystem);
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (gameActive) {
            cancelAnimationFrame(animationFrameId);
            setInitialCameraZoom();
            animateSolarSystem();
        }
    });

    canvas.style.cursor = 'default';
});
