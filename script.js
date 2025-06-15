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
    CAMERA_SNAP_THRESHOLD_DISTANCE: 5,
    CAMERA_SNAP_THRESHOLD_ZOOM_DIFF: 0.01,

    PLANET_COUNTER_UPDATE_INTERVAL_MS: 1000,

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


// --- Global Variables (declared at top level for scope) ---
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
    targetZoom: CONFIG.CAMERA_INITIAL_ZOOM // Initial target zoom
};
let isDragging = false;
let lastMouseX, lastMouseY;
let selectingStarterPlanet = false;
let gameActive = false;
let playerIncome = 0;
let chosenStarterPlanet = null;
let activeFleets = [];
let animationFrameId;
let planetCounterInterval = null;
let planetUnitGenerationInterval = null;
let modalCallback = null;

// UI element references (declared globally, assigned in DOMContentLoaded)
let titleScreen;
let gameScreen;
let playButton;
let canvas;
let ctx; // Context for canvas
let starterPlanetPanel;
let planetListPanel;
let planetList;
let playerUnitsPanel;
let playerUnitCountDisplay;
let playerIncomeCountDisplay;
let gameModalBackdrop;
let gameModal;
let modalMessage;
let modalInputArea;
let modalInput;
let modalInputConfirm;
let modalConfirm;


// --- Function Definitions (moved to top for scope) ---

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
    playerUnitCountDisplay.textContent = chosenStarterPlanet ? chosenStarterPlanet.units : 0;
}

function updatePlayerIncomeDisplay() {
    playerIncomeCountDisplay.textContent = playerIncome;
}

function generatePlanetUnits() {
    currentPlanets.forEach(planet => {
        if (planet.owner === 'player' || planet.owner === 'ai') {
            planet.units += CONFIG.PLANET_UNIT_GENERATION_RATE;
            updatePlanetListItem(planet);
        }
    });
    updatePlayerUnitDisplay(); 
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
    camera.targetZoom = camera.zoom; // Set target zoom to initial zoom
}


function animateSolarSystem() {
    // --- UPDATE PHASE ---
    // 1. Update all planet angles
    currentPlanets.forEach(planet => {
        planet.angle += planet.speed;
    });

    // 3. Update active invasion fleets
    for (let i = activeFleets.length - 1; i >= 0; i--) {
        const fleet = activeFleets[i];
        const timeElapsed = performance.now() - fleet.departureTime;
        fleet.progress = Math.min(timeElapsed / fleet.travelDuration, 1);

        let sourceX, sourceY, targetX, targetY;
        if (fleet.source.isElliptical) {
            const unrotatedX = fleet.source.semiMajorAxis * Math.cos(fleet.source.angle);
            const unrotatedY = fleet.semiMinorAxis * Math.sin(fleet.source.angle);
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

        // Snap to target if close enough to remove the slowdown
        if (currentDistance < CONFIG.CAMERA_SNAP_THRESHOLD_DISTANCE) {
            camera.x = targetX;
            camera.y = targetY;
            camera.zoom = camera.targetZoom; // Ensure zoom is set to target, though it should be constant in this mode
        } else {
            camera.x = camera.x + (targetX - camera.x) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;
            camera.y = camera.y + (targetY - camera.y) * CONFIG.CAMERA_FOLLOW_LERP_FACTOR;
            camera.zoom = camera.zoom + (camera.targetZoom - camera.zoom) * CONFIG.CAMERA_ZOOM_LERP_FACTOR; // Ensure zoom LERP continues
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

        ctx.font = `${fixedFontSizeWorldUnits}px Arial`; // Font size is in world units, will scale with zoom
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(planet.name, 0, -fixedTextOffsetWorldUnits);

        ctx.restore(); // Restore context
    });

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
    console.log("HIDE MODAL CALLED.");
    gameModalBackdrop.classList.remove('active');
    gameModal.classList.remove('active');
    gameActive = true;
}


// --- Event Listeners and Initial Game Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Assign global UI element references
    titleScreen = document.getElementById('title-screen');
    gameScreen = document.getElementById('game-screen');
    playButton = document.getElementById('play-button');
    canvas = document.getElementById('solar-system-canvas');
    ctx = canvas.getContext('2d');
    starterPlanetPanel = document.getElementById('starter-planet-panel');
    planetListPanel = document.getElementById('planet-list-panel');
    planetList = document.getElementById('planet-list');
    playerUnitsPanel = document.getElementById('player-units-panel');
    playerUnitCountDisplay = document.getElementById('player-unit-count');
    playerIncomeCountDisplay = document.getElementById('player-income-count');
    gameModalBackdrop = document.getElementById('game-modal-backdrop');
    gameModal = document.getElementById('game-modal');
    modalMessage = document.getElementById('modal-message');
    modalInputArea = document.getElementById('modal-input-area');
    modalInput = document.getElementById('modal-input');
    modalInputConfirm = document.getElementById('modal-input-confirm');
    modalConfirm = document.getElementById('modal-confirm');

    // --- ADDED NEW EVENT LISTENERS FOR MODAL BUTTONS ---
    modalConfirm.addEventListener('click', () => {
        hideModal();
        if (modalCallback) {
            modalCallback();
            modalCallback = null; // Clear callback after use
        }
    });

    modalInputConfirm.addEventListener('click', () => {
        const value = parseInt(modalInput.value);
        hideModal();
        if (modalCallback) {
            modalCallback(value); // Pass the input value to the callback
            modalCallback = null; // Clear callback after use
        }
    });
    // --- END OF NEW EVENT LISTENERS ---

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

        if (planetCounterInterval) clearInterval(planetCounterInterval);
        planetCounterInterval = setInterval(updatePlanetCounters, CONFIG.PLANET_COUNTER_UPDATE_INTERVAL_MS);

        if (planetUnitGenerationInterval) clearInterval(planetUnitGenerationInterval);
        planetUnitGenerationInterval = setInterval(generatePlanetUnits, CONFIG.PLANET_UNIT_GENERATION_INTERVAL_MS);
    });

    canvas.addEventListener('contextmenu', (e) => {
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
        console.log(`CONTEXTMENU: Mouse click world coords: (${worldX.toFixed(2)}, ${worldY.toFixed(2)})`);

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
                console.log(`CONTEXTMENU: Hit planet: ${planet.name}`);
                break;
            }
        }

        if (targetPlanet) {
            console.log(`CONTEXTMENU: Target planet detected: ${targetPlanet.name}. Owner: ${targetPlanet.owner}`);
            if (targetPlanet.owner === 'player') {
                showModal("You already control this planet!", 'alert');
                return;
            }
            if (chosenStarterPlanet.units === 0) {
                 showModal("Your home planet has no units to send!", 'alert');
                 return;
            }

            showModal(`Send units from ${chosenStarterPlanet.name} to invade ${targetPlanet.name} (currently ${targetPlanet.owner} with ${targetPlanet.units} units)?\n\nEnter number of units:`, 'prompt', (unitsToSend) => {
                console.log(`CONTEXTMENU: Units to send callback: ${unitsToSend}`);
                if (isNaN(unitsToSend) || unitsToSend <= 0) { 
                    // This validation will be handled by the clamp below
                }
                
                // Clamp unitsToSend to available units on the starter planet
                unitsToSend = Math.min(unitsToSend, chosenStarterPlanet.units);
                if (unitsToSend === 0) { // If clamped to 0 due to insufficient units
                    showModal("Not enough units available to send any.", 'alert');
                    return;
                }

                chosenStarterPlanet.units -= unitsToSend;
                updatePlayerUnitDisplay();
                updatePlanetListItem(chosenStarterPlanet);

                let sourcePlanetWorldX, sourcePlanetWorldY;
                if (chosenStarterPlanet.isElliptical) {
                    const unrotatedX = chosenStarterPlanet.semiMajorAxis * Math.cos(chosenStarterPlanet.angle);
                    const unrotatedY = chosenStarterPlanet.semiMinorAxis * Math.sin(chosenStarterPlanet.angle);
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

            });

        } else {
            // Right-clicking empty space now does nothing
        }
    });

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

        if (e.button === 0) { // Left mouse button
            e.preventDefault();

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

            // Only start dragging if no planet was clicked and not focusing on a planet
            if (!clickedPlanet && !camera.targetPlanet) {
                isDragging = true;
                lastMouseX = mouseX;
                lastMouseY = mouseY;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return;
        
        if (isDragging) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;

            camera.x -= deltaX / camera.zoom * camera.dragSensitivity;
            camera.y -= deltaY / camera.zoom * camera.dragSensitivity;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return;
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        if (!gameActive) return;
        if (gameModalBackdrop.classList.contains('active')) return;
        isDragging = false;
    });


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
