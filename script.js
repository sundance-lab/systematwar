const CONFIG = {
    PLANET_NAMES: [
        "Aethel", "Xylos", "Cygnus", "Vorlag", "Zandor",
        "Kryll", "Solara", "Draxia", "Vespera", "Rilax",
        "Obsidia", "Lumios", "Nyssa", "Grendel", "Thar",
        "Equinox", "Zenith", "Nebulon", "Seraph", "Orion",
        "Aethera", "Titanis", "Vortexia", "Stellara", "Grimor",
        "Echo", "Phobos", "Deimos", "Ares", "Hecate"
    ],

    ORIGINAL_STAR_RADIUS: 20,
    MIN_STAR_MULTIPLIER: 75,
    MAX_STAR_MULTIPLIER: 150,

    PLANET_RADIUS_MIN_BASE: 5,
    PLANET_RADIUS_MAX_BASE: 14,
    PLANET_RADIUS_SCALE_FACTOR: 10,
    MIN_PLANETS: 6,
    MAX_PLANETS: 12,

    MIN_ORBIT_START_FROM_STAR: 80,
    STAR_ORBIT_MULTIPLIER: 50,
    SCREEN_ORBIT_MULTIPLIER: 10,

    MIN_SPACING_BETWEEN_ORBITS: 500,
    MAX_SPACING_BETWEEN_ORBITS: 3000,
    MIN_PLANET_CLEARANCE: 10,

    ORBIT_LINE_WIDTH: 0.25,
    ORBIT_LINE_ALPHA: 0.3, // Increased alpha for visibility

    MIN_ORBIT_SPEED: 0.00002,
    MAX_ORBIT_SPEED: 0.0006,

    ELLIPTICAL_ORBIT_CHANCE: 0.15,
    ELLIPSE_ECCENTRICITY_MIN: 0.1,
    ELLIPSE_ECCENTRICITY_MAX: 0.8,

    CAMERA_INITIAL_ZOOM: 1,
    CAMERA_SCALE_FACTOR: 1.1,
    CAMERA_DRAG_SENSITIVITY: 0.8,
    CAMERA_MIN_ZOOM: 0.0001,
    CAMERA_MAX_ZOOM: 50,
    INITIAL_VIEW_PADDING_FACTOR: 1.2,

    CAMERA_FOLLOW_LERP_FACTOR: 0.08,
    CAMERA_ZOOM_LERP_FACTOR: 0.05,
    CAMERA_FOLLOW_ZOOM_TARGET: 3.0,

    PLANET_COUNTER_UPDATE_INTERVAL_MS: 1000,

    ASTEROID_HIT_POINTS: 50,

    ASTEROID_SPAWN_INTERVAL_MS: 500,
    ASTEROID_MIN_RADIUS: 3,
    ASTEROID_MAX_RADIUS: 10,
    ASTEROID_MIN_SPEED: 0.1,
    ASTEROID_MAX_SPEED: 0.5,
    ASTEROID_SPAWN_DISTANCE_FROM_PLANET: 2000,
    ASTEROID_OFFSCREEN_THRESHOLD: 3000,
    ASTEROID_LIFETIME_MS: 3000,
    MAX_ASTEROIDS_ON_SCREEN: 50,

    INITIAL_PLAYER_UNITS: 1000,
    STARTER_PLANET_INITIAL_UNITS: 500,
    NEUTRAL_PLANET_INITIAL_UNITS: 100,
    AI_PLANET_INITIAL_UNITS: 200,
    PLANET_UNIT_GENERATION_RATE: 10,
    PLANET_UNIT_GENERATION_INTERVAL_MS: 5000,

    OWNER_COLORS: {
        'player': '#00ff00',
        'ai': '#ff0000',
        'neutral': '#888888'
    }
};


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
    const playerUnitsPanel = document.getElementById('player-units-panel');
    const playerUnitCountDisplay = document.getElementById('player-unit-count');

    // NEW MODAL ELEMENTS
    const gameModalBackdrop = document.getElementById('game-modal-backdrop');
    const gameModal = document.getElementById('game-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalInputArea = document.getElementById('modal-input-area');
    const modalInput = document.getElementById('modal-input');
    const modalInputConfirm = document.getElementById('modal-input-confirm');
    const modalConfirm = document.getElementById('modal-confirm');

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
        activeListItem: null,
        targetZoom: CONFIG.CAMERA_INITIAL_ZOOM
    };

    let isDragging = false;
    let lastMouseX, lastMouseY;
    let selectingStarterPlanet = false;
    let gameActive = false;

    let playerUnits = 0;
    let asteroids = [];
    let chosenStarterPlanet = null; // The player's home planet

    let planetCounterInterval = null;
    let asteroidSpawnInterval = null;
    let planetUnitGenerationInterval = null;

    // Modals internal state
    let modalCallback = null;


    playButton.addEventListener('click', () => {
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');

        initSolarSystem();
        setInitialCameraZoom();

        camera.x = 0;
        camera.y = 0;
        camera.targetPlanet = null;
        camera.activeListItem = null;
        camera.targetZoom = camera.zoom;
        playerUnits = CONFIG.INITIAL_PLAYER_UNITS;
        asteroids = [];
        chosenStarterPlanet = null;
        updatePlayerUnitDisplay();

        populatePlanetList();

        animateSolarSystem();

        selectingStarterPlanet = true;
        starterPlanetPanel.classList.add('active');
        planetListPanel.classList.add('active');
        playerUnitsPanel.classList.add('active');
        gameActive = true;

        if (planetCounterInterval) clearInterval(planetCounterInterval);
        planetCounterInterval = setInterval(updatePlanetCounters, CONFIG.PLANET_COUNTER_UPDATE_INTERVAL_MS);

        if (planetUnitGenerationInterval) clearInterval(planetUnitGenerationInterval);
        planetUnitGenerationInterval = setInterval(generatePlanetUnits, CONFIG.PLANET_UNIT_GENERATION_INTERVAL_MS);
    });

    confirmPlanetButton.addEventListener('click', () => {
        planetChosenPanel.classList.remove('active');
        selectingStarterPlanet = false;
        
        chosenStarterPlanet.owner = 'player';
        chosenStarterPlanet.units = CONFIG.STARTER_PLANET_INITIAL_UNITS;
        updatePlanetListItem(chosenStarterPlanet);

        camera.targetPlanet = chosenStarterPlanet; 
        camera.targetZoom = CONFIG.CAMERA_FOLLOW_ZOOM_TARGET;

        if (asteroidSpawnInterval) clearInterval(asteroidSpawnInterval);
        asteroidSpawnInterval = setInterval(spawnAsteroid, CONFIG.ASTEROID_SPAWN_INTERVAL_MS);
    });

    // NEW: Modal OK button click handlers
    modalConfirm.addEventListener('click', () => {
        gameModalBackdrop.classList.remove('active');
        if (modalCallback) modalCallback(); // Execute callback if it's an alert
        modalCallback = null; // Reset callback
    });

    modalInputConfirm.addEventListener('click', () => {
        gameModalBackdrop.classList.remove('active');
        const inputValue = parseInt(modalInput.value);
        if (modalCallback) modalCallback(inputValue); // Pass input value to callback
        modalCallback = null; // Reset callback
    });


    // Handle right-click (contextmenu) for invasion
    canvas.addEventListener('contextmenu', (e) => {
        if (!gameActive) return;
        e.preventDefault();

        // If a modal is open, prevent interaction with game underneath
        if (gameModalBackdrop.classList.contains('active')) return;

        if (!chosenStarterPlanet || selectingStarterPlanet) return;

        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const worldX = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
        const worldY = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

        let targetPlanet = null;
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
                targetPlanet = planet;
                break;
            }
        }

        if (targetPlanet) {
            if (targetPlanet.owner === 'player') {
                showModal("You already control this planet!", 'alert');
                return;
            }
            if (chosenStarterPlanet.units === 0) {
                 showModal("Your home planet has no units to send!", 'alert');
                 return;
            }

            showModal(`Send units from ${chosenStarterPlanet.name} to invade ${targetPlanet.name} (currently ${targetPlanet.owner} with ${targetPlanet.units} units)?\n\nEnter number of units (max ${chosenStarterPlanet.units}):`, 'prompt', (unitsToSend) => {
                if (isNaN(unitsToSend) || unitsToSend <= 0 || unitsToSend > chosenStarterPlanet.units) {
                    showModal("Invalid number of units or not enough units available.", 'alert');
                    return;
                }

                chosenStarterPlanet.units -= unitsToSend;
                updatePlanetListItem(chosenStarterPlanet);

                showModal(`${unitsToSend} units dispatched from ${chosenStarterPlanet.name} to ${targetPlanet.name}! (Actual invasion mechanics not yet implemented.)`, 'alert');
            });

        }
    });


    canvas.addEventListener('wheel', (e) => {
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return; // Prevent interaction if modal is open

        e.preventDefault();

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const worldXBefore = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
        const worldYBefore = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

        if (e.deltaY < 0) {
            camera.zoom *= camera.scaleFactor;
        } else {
            camera.zoom /= camera.scaleFactor;
        }

        camera.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(camera.zoom, CONFIG.CAMERA_MAX_ZOOM));
        camera.targetZoom = camera.zoom;

        if (!camera.targetPlanet) {
            const worldXAfter = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
            const worldYAfter = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

            camera.x -= (worldXAfter - worldXBefore);
            camera.y -= (worldYAfter - worldYBefore);
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return; // Prevent interaction if modal is open

        if (e.button === 0) {
            e.preventDefault();
            let clickHandled = false;

            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const worldX = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
            const worldY = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

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
                        chosenStarterPlanet = planet;
                        starterPlanetPanel.classList.remove('active');
                        chosenPlanetNameDisplay.textContent = `You chose ${planet.name}!`;
                        planetChosenPanel.classList.add('active');
                        clickHandled = true;
                        break;
                    }
                }
            } 
            
            if (!selectingStarterPlanet && !clickHandled && chosenStarterPlanet) {
                for (let i = asteroids.length - 1; i >= 0; i--) {
                    const asteroid = asteroids[i];
                    const distance = Math.sqrt(
                        Math.pow(worldX - asteroid.x, 2) +
                        Math.pow(worldY - asteroid.y, 2)
                    );

                    if (distance < asteroid.radius) {
                        playerUnits += CONFIG.ASTEROID_HIT_POINTS;
                        // updatePlayerUnitDisplay(); // No longer updating constantly or on hit
                        asteroids.splice(i, 1);
                        clickHandled = true;
                        break;
                    }
                }
            }

            if (!clickHandled && !camera.targetPlanet) { 
                isDragging = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return; // Prevent interaction if modal is open

        if (isDragging && !camera.targetPlanet) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;

            camera.x -= (dx / camera.zoom) * camera.dragSensitivity;
            camera.y -= (dy / camera.zoom) * camera.dragSensitivity;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return; // Prevent interaction if modal is open

        if (e.button === 0) {
            isDragging = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return; // Prevent interaction if modal is open
        isDragging = false;
    });

    // NEW: Function to show custom game modal
    // type: 'alert' or 'prompt'
    // callback: function to execute on OK/Confirm (receives input value if type is 'prompt')
    function showModal(message, type, callback = null) {
        modalMessage.textContent = message;
        modalCallback = callback;

        if (type === 'prompt') {
            modalInputArea.style.display = 'flex';
            modalInput.value = ''; // Clear previous input
            modalConfirm.style.display = 'none';
        } else { // 'alert'
            modalInputArea.style.display = 'none';
            modalConfirm.style.display = 'block';
        }

        gameModalBackdrop.classList.add('active');
        gameModal.classList.add('active');
    }


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
                color: `hsl(${Math.random() * 360}, 70%, 50%)`, // Base planet color
                isElliptical: isElliptical,
                semiMajorAxis: semiMajorAxis,
                semiMinorAxis: semiMinorAxis,
                eccentricity: eccentricity,
                rotationAngle: rotationAngle,
                timeSurvived: 0,
                listItemRef: null,
                owner: 'neutral', // All planets start neutral by default
                units: CONFIG.NEUTRAL_PLANET_INITIAL_UNITS
            });

            previousOrbitRadius = actualOrbitRadius;
        }

        currentPlanets.sort((a, b) => a.orbitRadius - b.orbitRadius);
    }

    function populatePlanetList() {
        planetList.innerHTML = '';

        currentPlanets.forEach((planet, index) => {
            const listItem = document.createElement('li');
            
            const ownerIndicator = document.createElement('span');
            ownerIndicator.classList.add('owner-indicator');
            ownerIndicator.classList.add(`owner-${planet.owner}`); // Initial owner class

            const planetNumberSpan = document.createElement('span');
            planetNumberSpan.classList.add('planet-number');
            planetNumberSpan.textContent = `0 `;

            const planetNameText = document.createTextNode(`P${index + 1}: ${planet.name} (${planet.units})`);

            listItem.appendChild(ownerIndicator);
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
                camera.targetZoom = CONFIG.CAMERA_FOLLOW_ZOOM_TARGET;
            });
            planetList.appendChild(listItem);
        });
    }

    function updatePlanetListItem(planet) {
        if (planet.listItemRef) {
            const ownerIndicator = planet.listItemRef.querySelector('.owner-indicator');
            const planetNameTextNode = planet.listItemRef.lastChild;

            // Update owner indicator color
            ownerIndicator.className = 'owner-indicator'; // Reset classes
            ownerIndicator.classList.add(`owner-${planet.owner}`);

            // Update units in text node, preserving existing text around units
            const currentTextParts = planetNameTextNode.textContent.split('(');
            planetNameTextNode.textContent = currentTextParts[0].trim() + ` (${planet.units})`;
        }
    }


    function updatePlanetCounters() {
        currentPlanets.forEach((planet, index) => {
            planet.timeSurvived++;
            if (planet.listItemRef) {
                const counterSpan = planet.listItemRef.querySelector('.planet-number');
                if (counterSpan) {
                    counterSpan.textContent = `${planet.timeSurvived} `;
                }
            }
        });
    }

    function generatePlanetUnits() {
        currentPlanets.forEach(planet => {
            if (planet.owner !== 'neutral') {
                planet.units += CONFIG.PLANET_UNIT_GENERATION_RATE;
                updatePlanetListItem(planet);
            }
        });
    }

    function updatePlayerUnitDisplay() {
        playerUnitCountDisplay.textContent = playerUnits;
    }

    function spawnAsteroid() {
        if (!chosenStarterPlanet || asteroids.length >= CONFIG.MAX_ASTEROIDS_ON_SCREEN) {
            return;
        }

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

        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnX = planetCurrentX + Math.cos(spawnAngle) * CONFIG.ASTEROID_SPAWN_DISTANCE_FROM_PLANET;
        const spawnY = planetCurrentY + Math.sin(spawnAngle) * CONFIG.ASTEROID_SPAWN_DISTANCE_FROM_PLANET;

        const angleToPlanet = Math.atan2(planetCurrentY - spawnY, planetCurrentX - spawnX);
        const velocityX = Math.cos(angleToPlanet) * asteroidSpeed;
        const velocityY = Math.sin(angleToPlanet) * asteroidSpeed;

        asteroids.push({
            x: spawnX,
            y: spawnY,
            radius: asteroidRadius,
            color: `hsl(${Math.random() * 360}, 20%, 40%)`,
            velocityX: velocityX,
            velocityY: velocityY,
            spawnTime: performance.now()
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
        camera.targetZoom = camera.zoom;
    }


    function animateSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update all planet angles first (Fixes "still planet" issue)
        currentPlanets.forEach(planet => {
            planet.angle += planet.speed;
        });

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        if (camera.targetPlanet) {
            let targetX, targetY;
            // Get the current world position of the target planet (already updated for this frame)
            if (camera.targetPlanet.isElliptical) {
                const unrotatedX = camera.targetPlanet.semiMajorAxis * Math.cos(camera.targetPlanet.angle);
                const unrotatedY = camera.targetPlanet.semiMinorAxis * Math.sin(camera.targetPlanet.angle);
                targetX = unrotatedX * Math.cos(camera.targetPlanet.rotationAngle) - unrotatedY * Math.sin(camera.targetPlanet.rotationAngle);
                targetY = unrotatedX * Math.sin(camera.targetPlanet.rotationAngle) + unrotatedY * Math.cos(camera.targetPlanet.rotationAngle);
            } else {
                targetX = Math.cos(camera.targetPlanet.angle) * camera.targetPlanet.orbitRadius;
                targetY = Math.sin(camera.targetPlanet.angle) * camera.targetPlanet.orbitRadius;
            }

            camera.x = camera.x + (targetX - camera.x) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;
            camera.y = camera.y + (targetY - camera.y) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;

            camera.zoom = camera.zoom + (camera.targetZoom - camera.zoom) * CONFIG.CAMERA_ZOOM_LERP_FACTOR;
            camera.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(camera.zoom, CONFIG.CAMERA_MAX_ZOOM));
        }

        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);


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

        // Draw planets (their angles are already updated)
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
            ctx.strokeStyle = `rgba(255, 255, 255, ${CONFIG.ORBIT_LINE_ALPHA})`; // Use CONFIG.ORBIT_LINE_ALPHA
            ctx.stroke();

            // Calculate current position for drawing (angle is already updated)
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
            
            // Draw owner indicator on the planet in the solar system view
            ctx.beginPath();
            ctx.arc(x, y, planet.radius + 5 / camera.zoom, 0, Math.PI * 2); // Ring around the planet
            ctx.strokeStyle = CONFIG.OWNER_COLORS[planet.owner];
            ctx.lineWidth = 3 / camera.zoom;
            ctx.stroke();
        });

        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];

            if (performance.now() - asteroid.spawnTime > CONFIG.ASTEROID_LIFETIME_MS) {
                asteroids.splice(i, 1);
                continue;
            }

            asteroid.x += asteroid.velocityX;
            asteroid.y += asteroid.velocityY;

            const distFromCameraCenter = Math.sqrt(Math.pow(asteroid.x - camera.x, 2) + Math.pow(asteroid.y - camera.y, 2));
            const screenRadiusWorldUnits = (Math.min(canvas.width, canvas.height) / 2) / camera.zoom;

            if (distFromCameraCenter > screenRadiusWorldUnits + CONFIG.ASTEROID_OFFSCREEN_THRESHOLD) {
                asteroids.splice(i, 1);
                continue;
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
            if (!camera.targetPlanet) {
                setInitialCameraZoom();
            }
            animateSolarSystem();
        }
    });

    canvas.style.cursor = 'default';
});
