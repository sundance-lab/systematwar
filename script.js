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
    ORBIT_LINE_ALPHA: 0.3,

    MIN_ORBIT_SPEED: 0.00005,
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

    CAMERA_FOLLOW_LERP_FACTOR: 0.02,
    CAMERA_ZOOM_LERP_FACTOR: 0.02,
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
    STARTER_PLANET_INITIAL_UNITS: 0,
    NEUTRAL_PLANET_INITIAL_UNITS: 100,
    AI_PLANET_INITIAL_UNITS: 200,
    PLANET_UNIT_GENERATION_RATE: 10,
    PLANET_UNIT_GENERATION_INTERVAL_MS: 5000,

    OWNER_COLORS: {
        'player': '#00ff00',
        'ai': '#ff0000',
        'neutral': '#888888'
    },

    INVASION_TRAVEL_SPEED_WORLD_UNITS_PER_SECOND: 500,
    COMBAT_LOSS_RATE_PER_UNIT_PER_MS: 0.0001,
    COMBAT_ROUND_DURATION_MS: 100,
    COMBAT_ATTACKER_BONUS_PERCENT: 0,
    COMBAT_DEFENDER_BONUS_PERCENT: 0.1,
    MIN_UNITS_FOR_AI_PLANET: 50,

    INCOME_GENERATION_PER_PLAYER_PLANET: 1,
};


document.addEventListener('DOMContentLoaded', () => {
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const playButton = document.getElementById('play-button');
    const canvas = document.getElementById('solar-system-canvas');
    const ctx = canvas.getContext('2d');
    const starterPlanetPanel = document.getElementById('starter-planet-panel');
    const planetListPanel = document.getElementById('planet-list-panel');
    const planetList = document.getElementById('planet-list');
    const playerUnitsPanel = document.getElementById('player-units-panel');
    const playerUnitCountDisplay = document.getElementById('player-unit-count');
    const playerIncomeCountDisplay = document.getElementById('player-income-count');

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

    let playerIncome = 0;
    let asteroids = [];
    let chosenStarterPlanet = null;
    let activeFleets = [];

    let planetCounterInterval = null;
    let asteroidSpawnInterval = null;
    let planetUnitGenerationInterval = null;

    let modalCallback = null;

    playButton.addEventListener('click', () => {
        console.log("Play button clicked."); // DEBUG
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');

        initSolarSystem();
        setInitialCameraZoom();

        camera.x = 0;
        camera.y = 0;
        camera.targetPlanet = null;
        camera.activeListItem = null;
        camera.targetZoom = camera.zoom;
        playerIncome = 0;
        asteroids = [];
        activeFleets = [];
        chosenStarterPlanet = null;
        updatePlayerIncomeDisplay();

        populatePlanetList();

        animateSolarSystem();

        selectingStarterPlanet = true;
        starterPlanetPanel.classList.add('active');
        planetListPanel.classList.add('active');
        playerUnitsPanel.classList.add('active');
        gameActive = true;
        console.log("Game state after Play: gameActive=", gameActive, "selectingStarterPlanet=", selectingStarterPlanet); // DEBUG

        if (planetCounterInterval) clearInterval(planetCounterInterval);
        planetCounterInterval = setInterval(updatePlanetCounters, CONFIG.PLANET_COUNTER_UPDATE_INTERVAL_MS);

        if (planetUnitGenerationInterval) clearInterval(planetUnitGenerationInterval);
        planetUnitGenerationInterval = setInterval(generatePlanetUnits, CONFIG.PLANET_UNIT_GENERATION_INTERVAL_MS);
    });

    modalConfirm.addEventListener('click', () => {
        console.log("Modal OK clicked."); // DEBUG
        hideModal();
        if (modalCallback) modalCallback();
        modalCallback = null;
    });

    modalInputConfirm.addEventListener('click', () => {
        console.log("Modal Input OK clicked."); // DEBUG
        const inputValue = parseInt(modalInput.value);
        hideModal();
        if (modalCallback) modalCallback(inputValue);
        modalCallback = null;
    });

    function showModal(message, type, callback = null) {
        console.log(`SHOW MODAL CALLED: Type='${type}', Message='${message}'`); // DEBUG
        modalMessage.textContent = message;
        modalCallback = callback;

        if (type === 'prompt') {
            modalInputArea.style.display = 'flex';
            modalConfirm.style.display = 'none';
            modalInputConfirm.style.display = 'block';
            modalInput.value = '';
            modalInput.focus();
        } else {
            modalInputArea.style.display = 'none';
            modalConfirm.style.display = 'block';
            modalInputConfirm.style.display = 'none';
        }

        gameModalBackdrop.classList.add('active');
        gameModal.classList.add('active');
        gameActive = false; // Pause game interaction while modal is open
        console.log("Modal display state: backdrop active=", gameModalBackdrop.classList.contains('active'), "modal active=", gameModal.classList.contains('active')); // DEBUG
    }

    function hideModal() {
        console.log("HIDE MODAL CALLED."); // DEBUG
        gameModalBackdrop.classList.remove('active');
        gameModal.classList.remove('active');
        gameActive = true; // Resume game interaction
    }

    // Handle right-click (contextmenu) for invasion
    canvas.addEventListener('contextmenu', (e) => {
        console.log("CONTEXTMENU EVENT FIRED!"); // DEBUG
        console.log("gameActive:", gameActive, "gameModalBackdrop active:", gameModalBackdrop.classList.contains('active')); // DEBUG
        console.log("chosenStarterPlanet:", chosenStarterPlanet ? chosenStarterPlanet.name : "null", "selectingStarterPlanet:", selectingStarterPlanet); // DEBUG

        if (!gameActive) return;
        e.preventDefault();

        if (gameModalBackdrop.classList.contains('active')) return;

        if (!chosenStarterPlanet) {
            showModal("You must choose your starter planet first!", 'alert');
            return;
        }
        if (selectingStarterPlanet) {
            showModal("Please click 'Continue' after choosing your starter planet.", 'alert');
            return;
        }

        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const worldX = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
        const worldY = camera.y + (mouseY - canvas.height / 2) / camera.zoom;
        console.log(`CONTEXTMENU: Mouse click world coords: (${worldX.toFixed(2)}, ${worldY.toFixed(2)})`); // DEBUG

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
                console.log(`CONTEXTMENU: Hit planet: ${planet.name}`); // DEBUG
                break;
            }
        }

        if (targetPlanet) {
            console.log(`CONTEXTMENU: Target planet detected: ${targetPlanet.name}. Owner: ${targetPlanet.owner}`); // DEBUG
            if (targetPlanet.owner === 'player') {
                showModal("You already control this planet!", 'alert');
                return;
            }
            if (chosenStarterPlanet.units === 0) {
                 showModal("Your home planet has no units to send!", 'alert');
                 return;
            }

            showModal(`Send units from ${chosenStarterPlanet.name} to invade ${targetPlanet.name} (currently ${targetPlanet.owner} with ${targetPlanet.units} units)?\n\nEnter number of units:`, 'prompt', (unitsToSend) => {
                console.log(`CONTEXTMENU: Units to send callback: ${unitsToSend}`); // DEBUG
                if (isNaN(unitsToSend) || unitsToSend <= 0) { 
                    // This validation will be handled by the clamp below
                }
                
                // Clamp unitsToSend to available units on the starter planet
                unitsToSend = Math.min(unitsToSend, chosenStarterPlanet.units);
                if (unitsToSend === 0) { // If clamped to 0 due to insufficient units
                    showModal("Not enough units available to send any.", 'alert');
                    return;
                }

                chosenStarterPlanet.units -= unitsToSend; // Deduct units from starter planet
                updatePlayerUnitDisplay(); // Update display
                updatePlanetListItem(chosenStarterPlanet); // Update list item for units

                let sourcePlanetWorldX, sourcePlanetWorldY;
                if (chosenStarterPlanet.isElliptical) {
                    const unrotatedX = chosenStarterPlanet.semiMajorAxis * Math.cos(chosenStarterPlanet.angle);
                    const unrotatedY = chosenPlanet.semiMinorAxis * Math.sin(chosenStarterPlanet.angle);
                    sourcePlanetWorldX = unrotatedX * Math.cos(chosenStarterPlanet.rotationAngle) - unrotatedY * Math.sin(chosenStarterPlanet.rotationAngle);
                    sourcePlanetWorldY = unrotatedX * Math.sin(chosenStarterPlanet.rotationAngle) + unrotatedY * Math.cos(chosenStarterPlanet.rotationAngle);
                } else {
                    sourcePlanetWorldX = Math.cos(chosenStarterPlanet.angle) * chosenStarterPlanet.orbitRadius;
                    sourcePlanetWorldY = Math.sin(chosenStarterPlanet.angle) * chosenStarterPlanet.orbitRadius;
                }

                activeFleets.push({
                    source: chosenStarterPlanet,
                    target: targetPlanet,
                    units: unitsToSend,
                    departureTime: performance.now(),
                    travelDuration: calculateTravelDuration(chosenStarterPlanet, targetPlanet),
                    currentX: sourcePlanetWorldX,
                    currentY: sourcePlanetWorldY,
                    color: CONFIG.OWNER_COLORS['player']
                });

                // Removed: showModal(`${unitsToSend} units dispatched from ${chosenStarterPlanet.name} to ${targetPlanet.name}!`, 'alert');
            });

        } else {
            // Right-clicking empty space now does nothing
        }
    });

    function calculateTravelDuration(sourcePlanet, targetPlanet) {
        let sourceX, sourceY;
        if (sourcePlanet.isElliptical) {
            const unrotatedX = sourcePlanet.semiMajorAxis * Math.cos(sourcePlanet.angle);
            const unrotatedY = sourcePlanet.semiMinorAxis * Math.sin(sourcePlanet.angle);
            sourceX = unrotatedX * Math.cos(sourcePlanet.rotationAngle) - unrotatedY * Math.sin(sourcePlanet.rotationAngle);
            sourceY = unrotatedX * Math.sin(sourcePlanet.rotationAngle) + unrotatedY * Math.cos(sourcePlanet.rotationAngle);
        } else {
            sourceX = Math.cos(sourcePlanet.angle) * sourcePlanet.orbitRadius;
            sourceY = Math.sin(sourcePlanet.angle) * sourcePlanet.orbitRadius;
        }

        let targetX, targetY;
        if (targetPlanet.isElliptical) {
            const unrotatedX = targetPlanet.semiMajorAxis * Math.cos(targetPlanet.angle);
            const unrotatedY = targetPlanet.semiMinorAxis * Math.sin(targetPlanet.angle);
            targetX = unrotatedX * Math.cos(targetPlanet.rotationAngle) - unrotatedY * Math.sin(targetPlanet.rotationAngle);
            targetY = unrotatedX * Math.sin(targetPlanet.rotationAngle) + unrotatedY * Math.cos(targetPlanet.rotationAngle);
        } else {
            targetX = Math.cos(targetPlanet.angle) * targetPlanet.orbitRadius;
            targetY = Math.sin(targetPlanet.angle) * targetPlanet.orbitRadius;
        }

        const distance = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
        return distance / CONFIG.INVASION_TRAVEL_SPEED_WORLD_UNITS_PER_SECOND * 1000;
    }

    function resolveCombat(fleet) {
        console.log(`COMBAT: Resolving combat for fleet from ${fleet.source.name} to ${fleet.target.name}`); // DEBUG
        const attackerUnits = fleet.units;
        const defenderUnits = fleet.target.units;
        const targetPlanet = fleet.target;

        let resultMessage = "";
        let winner = null;
        let remainingAttackerUnits = attackerUnits;
        let remainingDefenderUnits = defenderUnits;

        const effectiveAttackerUnits = attackerUnits * (1 + CONFIG.COMBAT_ATTACKER_BONUS_PERCENT);
        const effectiveDefenderUnits = defenderUnits * (1 + CONFIG.COMBAT_DEFENDER_BONUS_PERCENT);
        
        if (effectiveAttackerUnits > effectiveDefenderUnits) {
            remainingAttackerUnits = Math.round(effectiveAttackerUnits - effectiveDefenderUnits);
            remainingDefenderUnits = 0;
            winner = 'attacker';
        } else {
            remainingDefenderUnits = Math.round(effectiveDefenderUnits - effectiveAttackerUnits);
            remainingAttackerUnits = 0;
            winner = 'defender';
        }

        if (winner === 'attacker') {
            resultMessage = `Invasion successful! Your ${attackerUnits} units defeated ${targetPlanet.owner}'s ${defenderUnits} units on ${targetPlanet.name}.`;
            resultMessage += `\n${remainingAttackerUnits} units remain and claim the planet for you.`; // Updated message: units remain
            targetPlanet.owner = 'player';
            targetPlanet.units = remainingAttackerUnits; // Attacker's remaining units now garrison the planet
            updatePlanetListItem(targetPlanet);
        } else {
            resultMessage = `Invasion failed! Your ${attackerUnits} units were defeated by ${targetPlanet.owner}'s ${defenderUnits} units on ${targetPlanet.name}.`;
            resultMessage += `\n${remainingDefenderUnits} units remain on ${targetPlanet.name}.`;
            targetPlanet.units = remainingDefenderUnits;
            updatePlanetListItem(targetPlanet);
        }
        showModal(resultMessage, 'alert');
    }


    canvas.addEventListener('wheel', (e) => {
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return;

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
        if (gameModalBackdrop.classList.contains('active')) return;

        if (e.button === 0) {
            e.preventDefault();
            let clickHandled = false;

            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const worldX = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
            const worldY = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

            let clickedPlanet = null;
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
                    clickedPlanet = planet;
                    break;
                }
            }


            if (selectingStarterPlanet && clickedPlanet) {
                chosenStarterPlanet = clickedPlanet;
                chosenStarterPlanet.owner = 'player';
                chosenStarterPlanet.units = CONFIG.INITIAL_PLAYER_UNITS;
                updatePlanetListItem(chosenStarterPlanet);

                selectingStarterPlanet = false;
                
                starterPlanetPanel.classList.remove('active');
                
                camera.targetPlanet = chosenStarterPlanet; 
                camera.targetZoom = CONFIG.CAMERA_FOLLOW_ZOOM_TARGET;

                updatePlayerUnitDisplay();

                if (asteroidSpawnInterval) clearInterval(asteroidSpawnInterval);
                asteroidSpawnInterval = setInterval(spawnAsteroid, CONFIG.ASTEROID_SPAWN_INTERVAL_MS);
                
                clickHandled = true;

            } else if (!selectingStarterPlanet && chosenStarterPlanet) {
                let asteroidHit = false;
                for (let i = asteroids.length - 1; i >= 0; i--) {
                    const asteroid = asteroids[i];
                    const distance = Math.sqrt(
                        Math.pow(worldX - asteroid.x, 2) +
                        Math.pow(worldY - asteroid.y, 2)
                    );

                    if (distance < asteroid.radius) {
                        chosenStarterPlanet.units += CONFIG.ASTEROID_HIT_POINTS;
                        updatePlayerUnitDisplay();
                        updatePlanetListItem(chosenStarterPlanet);
                        asteroids.splice(i, 1);
                        asteroidHit = true;
                        clickHandled = true;
                        break;
                    }
                }

                if (!asteroidHit && clickedPlanet) {
                    // Prevent double-focusing on the same planet
                    if (clickedPlanet === camera.targetPlanet) {
                        clickHandled = true;
                        return; 
                    }

                    if (camera.activeListItem) camera.activeListItem.classList.remove('active');
                    if (clickedPlanet.listItemRef) {
                        clickedPlanet.listItemRef.classList.add('active');
                        camera.activeListItem = clickedPlanet.listItemRef;
                    }
                    camera.targetPlanet = clickedPlanet;
                    camera.targetZoom = CONFIG.CAMERA_FOLLOW_ZOOM_TARGET;
                    clickHandled = true;
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
        if (gameModalBackdrop.classList.contains('active')) return;

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
        if (gameModalBackdrop.classList.contains('active')) return;

        if (e.button === 0) {
            isDragging = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return;
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
            
            const minOrbitFromStarEdge = currentStarRadius + planetRadius + minPlanetClearance;


            const minSpacingBetweenOrbits = CONFIG.MIN_SPACING_BETWEEN_ORBITS;
            const maxSpacingBetweenOrbits = CONFIG.MAX_SPACING_BETWEEN_ORBITS;

            let potentialOrbitRadius = previousOrbitRadius + minSpacingBetweenOrbits + Math.random() * (maxSpacingBetweenOrbits - minSpacingBetweenOrbits);

            let actualOrbitRadius = Math.max(potentialOrbitRadius, minimumOrbitDistanceFromPreviousPlanet, minOrbitFromStarEdge);

            if (actualOrbitRadius > maxOverallOrbitRadius) {
                 if (minimumOrbitDistanceFromPreviousPlanet > maxOverallOrbitRadius && minOrbitFromStarEdge > maxOverallOrbitRadius) {
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
            
            const ownerType = Math.random() < 0.5 ? 'ai' : 'neutral';
            const initialUnits = ownerType === 'ai' ? CONFIG.AI_PLANET_INITIAL_UNITS : CONFIG.NEUTRAL_PLANET_INITIAL_UNITS;

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
                listItemRef: null,
                owner: ownerType,
                units: initialUnits
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
            ownerIndicator.classList.add(`owner-${planet.owner}`);

            const planetNameText = document.createTextNode(`${planet.name} (${planet.units})`);

            listItem.appendChild(ownerIndicator);
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

            ownerIndicator.className = 'owner-indicator';
            ownerIndicator.classList.add(`owner-${planet.owner}`);

            const currentTextParts = planetNameTextNode.textContent.split('(');
            planetNameTextNode.textContent = currentTextParts[0].trim() + ` (${planet.units})`;
        }
    }


    function updatePlanetCounters() {
        let newlyGeneratedIncome = 0;
        currentPlanets.forEach((planet) => {
            if (planet.owner === 'player') {
                newlyGeneratedIncome += CONFIG.INCOME_GENERATION_PER_PLAYER_PLANET;
            }
        });
        playerIncome += newlyGeneratedIncome;
        updatePlayerIncomeDisplay();
    }

    function updatePlayerUnitDisplay() {
        playerUnitCountDisplay.textContent = chosenStarterPlanet ? chosenStarterPlanet.units : 0;
    }

    function updatePlayerIncomeDisplay() {
        playerIncomeCountDisplay.textContent = playerIncome;
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
        // --- UPDATE PHASE ---
        // 1. Update all planet angles
        currentPlanets.forEach(planet => {
            planet.angle += planet.speed;
        });

        // 2. Update asteroid positions and despawn
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            if (performance.now() - asteroid.spawnTime > CONFIG.ASTEROID_LIFETIME_MS) {
                asteroids.splice(i, 1);
                continue;
            }
            asteroid.x += asteroid.velocityX;
            asteroid.y += asteroid.velocityY;
        }

        // 3. Update active invasion fleets
        for (let i = activeFleets.length - 1; i >= 0; i--) {
            const fleet = activeFleets[i];
            const timeElapsed = performance.now() - fleet.departureTime;
            fleet.progress = Math.min(timeElapsed / fleet.travelDuration, 1);

            let sourceX, sourceY, targetX, targetY;
            if (fleet.source.isElliptical) {
                const unrotatedX = fleet.source.semiMajorAxis * Math.cos(fleet.source.angle);
                const unrotatedY = fleet.source.semiMinorAxis * Math.sin(fleet.source.angle);
                sourceX = unrotatedX * Math.cos(fleet.source.rotationAngle) - unrotatedY * Math.sin(fleet.source.rotationAngle);
                sourceY = unrotatedX * Math.sin(fleet.source.rotationAngle) + unrotatedY * Math.cos(fleet.source.rotationAngle);
            } else {
                sourceX = Math.cos(fleet.source.angle) * fleet.source.orbitRadius;
                sourceY = Math.sin(fleet.source.angle) * fleet.source.orbitRadius;
            }
            if (fleet.target.isElliptical) {
                const unrotatedX = fleet.target.semiMajorAxis * Math.cos(fleet.target.angle);
                const unrotatedY = fleet.target.semiMinorAxis * Math.sin(fleet.target.angle);
                targetX = unrotatedX * Math.cos(fleet.target.rotationAngle) - unrotatedY * Math.sin(fleet.target.rotationAngle);
                targetY = unrotatedX * Math.sin(fleet.target.rotationAngle) + unrotatedY * Math.cos(fleet.target.rotationAngle);
            } else {
                targetX = Math.cos(fleet.target.angle) * fleet.target.orbitRadius;
                targetY = Math.sin(fleet.target.angle) * fleet.target.orbitRadius;
            }

            fleet.currentX = sourceX + (targetX - sourceX) * fleet.progress;
            fleet.currentY = sourceY + (targetY - sourceY) * fleet.progress;

            if (fleet.progress >= 1) {
                resolveCombat(fleet);
                activeFleets.splice(i, 1);
            }
        }


        // --- DRAW PHASE ---
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

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

            camera.x = camera.x + (targetX - camera.x) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;
            camera.y = camera.y + (targetY - camera.y) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;

            camera.zoom = camera.zoom + (camera.targetZoom - camera.zoom) * CONFIG.CAMERA_ZOOM_LERP_FACTOR;
            camera.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(camera.zoom, CONFIG.CAMERA_MAX_ZOOM));
        }

        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);


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
            ctx.strokeStyle = `rgba(255, 255, 255, ${CONFIG.ORBIT_LINE_ALPHA})`;
            ctx.stroke();

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
            
            ctx.beginPath();
            ctx.arc(x, y, planet.radius + 5 / camera.zoom, 0, Math.PI * 2);
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
        }

        activeFleets.forEach(fleet => {
            ctx.beginPath();
            ctx.arc(fleet.currentX, fleet.currentY, 8 / camera.zoom, 0, Math.PI * 2);
            ctx.fillStyle = fleet.color;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.stroke();
        });


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
