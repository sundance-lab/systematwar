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

    ELLIPTICAL_ORBIT_CHANCE: 0.25,
    ELLIPSE_ECCENTRICITY_MIN: 0.1,
    ELLIPSE_ECCENTRICITY_MAX: 0.8,

    CAMERA_INITIAL_ZOOM: 1,
    CAMERA_SCALE_FACTOR: 1.1,
    CAMERA_DRAG_SENSITIVITY: 0.8,
    CAMERA_MIN_ZOOM: 0.0001,
    CAMERA_MAX_ZOOM: 50,
    INITIAL_VIEW_PADDING_FACTOR: 1.2,

    CAMERA_FOLLOW_LERP_FACTOR: 0.01,
    CAMERA_ZOOM_LERP_FACTOR: 0.01,
    // CAMERA_FOLLOW_ZOOM_TARGET: 1.5, // Removed as camera no longer changes zoom when focusing
    CAMERA_SNAP_THRESHOLD_DISTANCE: 5,
    CAMERA_SNAP_THRESHOLD_ZOOM_DIFF: 0.01, // Keep for potential future zoom interaction

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


// --- Function Definitions (moved to top for scope) ---

function initSolarSystem() {
    const canvas = document.getElementById('solar-system-canvas');
    const ctx = canvas.getContext('2d'); // Get ctx here as it's used
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
    const planetList = document.getElementById('planet-list'); // Get planetList here
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
            // Check if the clicked planet is already the target planet
            if (planet === camera.targetPlanet) {
                camera.targetPlanet = null; // Unfocus
                camera.targetZoom = camera.zoom; // Keep current zoom, just center camera
                camera.activeListItem = null; // Clear active list item
            } else {
                listItem.classList.add('active');
                camera.activeListItem = listItem;
                camera.targetPlanet = planet; // Focus on the clicked planet
                camera.targetZoom = camera.zoom; // Keep current zoom
            }
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
    const playerUnitCountDisplay = document.getElementById('player-unit-count'); // Get display element here
    playerUnitCountDisplay.textContent = chosenStarterPlanet ? chosenStarterPlanet.units : 0;
}

function updatePlayerIncomeDisplay() {
    const playerIncomeCountDisplay = document.getElementById('player-income-count'); // Get display element here
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
    const canvas = document.getElementById('solar-system-canvas'); // Get canvas here
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
    const canvas = document.getElementById('solar-system-canvas');
    const ctx = canvas.getContext('2d');
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

        // Calculate current distance for snapping
        const currentDistance = Math.sqrt(
            Math.pow(targetX - camera.x, 2) +
            Math.pow(targetY - camera.y, 2)
        );
        // Only check distance for snapping, as zoom is kept constant
        if (currentDistance < CONFIG.CAMERA_SNAP_THRESHOLD_DISTANCE) {
            camera.x = targetX;
            camera.y = targetY;
            // camera.zoom = camera.targetZoom; // Zoom is kept constant by user request
        } else {
            camera.x = camera.x + (targetX - camera.x) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;
            camera.y = camera.y + (targetY - camera.y) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;
            // camera.zoom = camera.zoom + (camera.targetZoom - camera.zoom) * CONFIG.CAMERA_ZOOM_LERP_FACTOR; // Zoom is kept constant by user request
        }
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

        // Draw planet name on map
        ctx.save();
        ctx.translate(x, y); // Translate to planet's center

        const fixedFontSizeWorldUnits = 20; // Fixed size in world units
        const fixedTextOffsetWorldUnits = planet.radius + 15; // Fixed offset in world units

        ctx.font = `${fixedFontSizeWorldUnits}px Arial`;
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(planet.name, 0, -fixedTextOffsetWorldUnits);

        ctx.restore(); // Restore context
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
        resultMessage += `\n${remainingAttackerUnits} units remain and claim the planet for you.`;
        targetPlanet.owner = 'player';
        targetPlanet.units = remainingAttackerUnits;
        updatePlanetListItem(targetPlanet);
    } else {
        resultMessage = `Invasion failed! Your ${attackerUnits} units were defeated by ${targetPlanet.owner}'s ${defenderUnits} units on ${targetPlanet.name}.`;
        resultMessage += `\n${remainingDefenderUnits} units remain on ${targetPlanet.name}.`;
        targetPlanet.units = remainingDefenderUnits;
        updatePlanetListItem(targetPlanet);
    }
    showModal(resultMessage, 'alert');
}

function showModal(message, type, callback = null) {
    const gameModalBackdrop = document.getElementById('game-modal-backdrop'); // Get elements here
    const gameModal = document.getElementById('game-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalInputArea = document.getElementById('modal-input-area');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalInputConfirm = document.getElementById('modal-input-confirm');
    const modalInput = document.getElementById('modal-input');

    console.log(`SHOW MODAL CALLED: Type='${type}', Message='${message}'`);
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
    gameActive = false;
    console.log("Modal display state: backdrop active=", gameModalBackdrop.classList.contains('active'), "modal active=", gameModal.classList.contains('active'));
}

function hideModal() {
    const gameModalBackdrop = document.getElementById('game-modal-backdrop'); // Get elements here
    const gameModal = document.getElementById('game-modal');
    console.log("HIDE MODAL CALLED.");
    gameModalBackdrop.classList.remove('active');
    gameModal.classList.remove('active');
    gameActive = true;
}


// --- Global Variables (must be declared outside functions that use them) ---
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
let animationFrameId;
let planetCounterInterval = null;
let asteroidSpawnInterval = null;
let planetUnitGenerationInterval = null;
let modalCallback = null;


// --- Event Listeners and Initial Game Setup ---
document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('play-button');
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const canvas = document.getElementById('solar-system-canvas');
    const starterPlanetPanel = document.getElementById('starter-planet-panel');
    const planetListPanel = document.getElementById('planet-list-panel');
    const playerUnitsPanel = document.getElementById('player-units-panel');
    // Elements for display updates are now passed to functions or accessed directly within them

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    playButton.addEventListener('click', () => {
        console.log("Play button clicked.");
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

        // Randomly choose a starter planet
        const randomIndex = Math.floor(Math.random() * currentPlanets.length);
        chosenStarterPlanet = currentPlanets[randomIndex];
        chosenStarterPlanet.owner = 'player';
        chosenStarterPlanet.units = CONFIG.INITIAL_PLAYER_UNITS;
        updatePlanetListItem(chosenStarterPlanet);

        // Highlight the randomly chosen starter planet in the right panel
        if (chosenStarterPlanet.listItemRef) {
            if (camera.activeListItem) camera.activeListItem.classList.remove('active');
            chosenStarterPlanet.listItemRef.classList.add('active');
            camera.activeListItem = chosenStarterPlanet.listItemRef;
        }

        camera.targetPlanet = chosenStarterPlanet;
        camera.targetZoom = camera.zoom; // Focus without changing initial zoom
        updatePlayerUnitDisplay();

        selectingStarterPlanet = false;
        starterPlanetPanel.classList.remove('active');
        planetListPanel.classList.add('active');
        playerUnitsPanel.classList.add('active');
        gameActive = true;
        console.log("Game state after Play: gameActive=", gameActive, "selectingStarterPlanet=", selectingStarterPlanet);

        if (asteroidSpawnInterval) clearInterval(asteroidSpawnInterval);
        asteroidSpawnInterval = setInterval(spawnAsteroid, CONFIG.ASTEROID_SPAWN_INTERVAL_MS);

        if (planetCounterInterval) clearInterval(planetCounterInterval);
        planetCounterInterval = setInterval(updatePlanetCounters, CONFIG.PLANET_COUNTER_UPDATE_INTERVAL_MS);

        if (planetUnitGenerationInterval) clearInterval(planetUnitGenerationInterval);
        planetUnitGenerationInterval = setInterval(generatePlanetUnits, CONFIG.PLANET_UNIT_GENERATION_INTERVAL_MS);
    });

    canvas.addEventListener('contextmenu', (e) => {
        // ... (existing right-click logic) ...
        // Note: The contextmenu event listener is defined in the global scope
        // and uses global variables camera, currentPlanets, etc.
    });

    canvas.addEventListener('wheel', (e) => {
        // ... (existing wheel logic) ...
    });

    canvas.addEventListener('mousedown', (e) => {
        // ... (existing mousedown logic, modified for LMB behavior) ...
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return;

        if (e.button === 0) { // Left mouse button
            e.preventDefault();
            let clickHandled = false;

            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const worldX = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
            const worldY = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

            let clickedPlanet = null; // Still needed for asteroid hit target and general click area
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

            let asteroidHit = false;
            for (let i = asteroids.length - 1; i >= 0; i--) {
                const asteroid = asteroids[i];
                const distance = Math.sqrt(
                    Math.pow(worldX - asteroid.x, 2) +
                    Math.pow(worldY - asteroid.y, 2)
                );

                if (distance < asteroid.radius) {
                    if (chosenStarterPlanet) { // Only hit asteroid if starter planet is chosen
                        chosenStarterPlanet.units += CONFIG.ASTEROID_HIT_POINTS;
                        updatePlayerUnitDisplay();
                        updatePlanetListItem(chosenStarterPlanet);
                    }
                    asteroids.splice(i, 1);
                    asteroidHit = true;
                    clickHandled = true;
                    break;
                }
            }

            // If not an asteroid hit, LMB does nothing for now.
            // Removed previous LMB planet focusing and dragging logic here.
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        // ... (mousemove logic, dragging disabled for LMB) ...
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return;
        // isDragging logic removed for LMB
    });

    canvas.addEventListener('mouseup', (e) => {
        // ... (mouseup logic, dragging disabled for LMB) ...
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return;
        // isDragging logic removed for LMB
    });

    canvas.addEventListener('mouseleave', () => {
        // ... (mouseleave logic, dragging disabled for LMB) ...
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return;
        // isDragging logic removed for LMB
    });


    window.addEventListener('resize', () => {
        // ... (existing resize logic) ...
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

    // Initial cursor style
    canvas.style.cursor = 'default';
});
