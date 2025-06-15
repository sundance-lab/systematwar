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

    // Fleet ball size configuration
    FLEET_BASE_RADIUS: 5, // Base radius in world units at zoom 1
    FLEET_MAX_SCREEN_RADIUS_PX: 15, // Maximum size in pixels on screen
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

// Global variables for invasion line drawing
let selectedSourcePlanet = null;
let isDrawingInvasionLine = false; // True if line follows cursor
let currentMouseWorldX, currentMouseWorldY; // To store cursor position in world coords

// Global variable for pending invasions
let pendingInvasions = []; // Stores {source: planet, target: planet, units: number}

// Global variable for line attached to target when modal is open
let tempFixedInvasionLine = null; // Stores {source: planet, target: planet} when modal is active for an invasion

// NEW Global variables for panel dragging
let isDraggingPanel = false;
let dragPanelOffsetX, dragPanelOffsetY;


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

// NEW UI element references for planet control panel and launch button
let planetControlPanel;
let controlPanelPlanetName;
let closeControlPanelButton;
let launchAllInvasionsButton;
let panelUnitsDisplay; // NEW
let panelIncomeDisplay; // NEW
let panelSizeDisplay; // NEW
let panelBuildingSlotsCount; // NEW
let panelBuildingSlotsContainer; // NEW


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

                // Immediately center camera on the newly targeted planet
                let targetPos = getPlanetCurrentWorldCoordinates(planet);
                camera.x = targetPos.x;
                camera.y = targetPos.y;
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
    // This function currently updates based on chosenStarterPlanet
    // To show total player units across all planets, you'd need to sum them:
    // let totalUnits = 0;
    // currentPlanets.forEach(planet => {
    //     if (planet.owner === 'player') {
    //         totalUnits += planet.units;
    //     }
    // });
    // playerUnitCountDisplay.textContent = totalUnits;
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

// Helper function to get planet at coordinates
function getPlanetAtCoordinates(worldX, worldY) {
    for (let i = 0; i < currentPlanets.length; i++) {
        const planet = currentPlanets[i];
        let planetWorldX, planetWorldY;
        let planetPos = getPlanetCurrentWorldCoordinates(planet);
        planetWorldX = planetPos.x;
        planetWorldY = planetPos.y;

        const distance = Math.sqrt(
            Math.pow(worldX - planetWorldX, 2) +
            Math.pow(worldY - planetWorldY, 2)
        );

        if (distance < planet.radius) {
            return planet;
        }
    }
    return null;
}

// Helper function to get a planet's current world coordinates
function getPlanetCurrentWorldCoordinates(planet) {
    let x, y;
    const systemCenterX = 0; // Assume star is at (0,0) world coords
    const systemCenterY = 0;

    if (planet.isElliptical) {
        const unrotatedX = planet.semiMajorAxis * Math.cos(planet.angle);
        const unrotatedY = planet.semiMinorAxis * Math.sin(planet.angle);
        x = systemCenterX + unrotatedX * Math.cos(planet.rotationAngle) - unrotatedY * Math.sin(planet.rotationAngle);
        y = systemCenterY + unrotatedX * Math.sin(planet.rotationAngle) + unrotatedY * Math.cos(planet.rotationAngle);
    } else {
        x = systemCenterX + Math.cos(planet.angle) * planet.orbitRadius;
        y = systemCenterY + Math.sin(planet.angle) * planet.orbitRadius;
    }
    return { x, y };
}

// NEW Helper function to determine building slots
function getBuildingSlots(planetRadius) {
    // Example formula: 1 slot per 25 units of radius, minimum 1 slot
    return Math.max(1, Math.floor(planetRadius / 25)); 
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
        let sourcePos = getPlanetCurrentWorldCoordinates(fleet.source);
        sourceX = sourcePos.x;
        sourceY = sourcePos.y;

        let targetPos = getPlanetCurrentWorldCoordinates(fleet.target);
        targetX = targetPos.x;
        targetY = targetPos.y;

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
        let targetPos = getPlanetCurrentWorldCoordinates(camera.targetPlanet);
        targetX = targetPos.x;
        targetY = targetPos.y;

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
        let planetPos = getPlanetCurrentWorldCoordinates(planet);
        x = planetPos.x;
        y = planetPos.y;

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

    // Draw the temporary invasion line (following cursor)
    if (selectedSourcePlanet && isDrawingInvasionLine) {
        let sourcePos = getPlanetCurrentWorldCoordinates(selectedSourcePlanet);
        let sourcePlanetWorldX = sourcePos.x;
        let sourcePlanetWorldY = sourcePos.y;

        const angleToMouse = Math.atan2(currentMouseWorldY - sourcePlanetWorldY, currentMouseWorldX - sourcePlanetWorldX);
        const lineStartX = sourcePlanetWorldX + Math.cos(angleToMouse) * selectedSourcePlanet.radius;
        const lineStartY = sourcePlanetWorldY + Math.sin(angleToMouse) * selectedSourcePlanet.radius;
        const lineEndX = currentMouseWorldX;
        const lineEndY = currentMouseWorldY;


        ctx.beginPath();
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; // Brighter, semi-transparent cyan
        ctx.lineWidth = 1 / camera.zoom; // Skinny
        ctx.setLineDash([10 / camera.zoom, 5 / camera.zoom]); // Dotted line
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Removed arrowhead drawing
    }

    // NEW: Draw temporary fixed line when modal is open
    if (tempFixedInvasionLine) {
        let sourcePos = getPlanetCurrentWorldCoordinates(tempFixedInvasionLine.source);
        let targetPos = getPlanetCurrentWorldCoordinates(tempFixedInvasionLine.target);

        let sourcePlanetWorldX = sourcePos.x;
        let sourcePlanetWorldY = sourcePos.y;
        let targetPlanetWorldX = targetPos.x;
        let targetPlanetWorldY = targetPos.y;

        const angleFromSourceToTarget = Math.atan2(targetPlanetWorldY - sourcePlanetWorldY, targetPlanetWorldX - sourcePlanetWorldX);
        const lineStartX = sourcePlanetWorldX + Math.cos(angleFromSourceToTarget) * tempFixedInvasionLine.source.radius;
        const lineStartY = sourcePlanetWorldY + Math.sin(angleFromSourceToTarget) * tempFixedInvasionLine.source.radius;

        const lineEndX = targetPlanetWorldX - Math.cos(angleFromSourceToTarget) * tempFixedInvasionLine.target.radius;
        const lineEndY = targetPlanetWorldY - Math.sin(angleFromSourceToTarget) * tempFixedInvasionLine.target.radius;

        ctx.beginPath();
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; // Match cursor-following line
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([10 / camera.zoom, 5 / camera.zoom]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Removed arrowhead drawing
    }


    // Draw pending invasion lines (staged invasions)
    pendingInvasions.forEach(pending => {
        let sourcePos = getPlanetCurrentWorldCoordinates(pending.source);
        let targetPos = getPlanetCurrentWorldCoordinates(pending.target);

        let sourceX = sourcePos.x;
        let sourceY = sourcePos.y;
        let targetX = targetPos.x;
        let targetY = targetPos.y;

        const angleFromSourceToTarget = Math.atan2(targetY - sourceY, targetX - sourceX);
        const lineStartX = sourceX + Math.cos(angleFromSourceToTarget) * pending.source.radius;
        const lineStartY = sourceY + Math.sin(angleFromSourceToTarget) * pending.source.radius;

        const lineEndX = targetX - Math.cos(angleFromSourceToTarget) * pending.target.radius;
        const lineEndY = targetY - Math.sin(angleFromSourceToTarget) * pending.target.radius;

        ctx.beginPath();
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)'; // A subtle green for pending invasions
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([5 / camera.zoom, 5 / camera.zoom]); // Different dash for pending
        ctx.stroke();
        ctx.setLineDash([]);

        // Removed arrowhead drawing
    });


    activeFleets.forEach(fleet => {
        const fleetRadiusRendered = Math.min(CONFIG.FLEET_BASE_RADIUS / camera.zoom, CONFIG.FLEET_MAX_SCREEN_RADIUS_PX); // Apply max pixel size
        ctx.beginPath();
        ctx.arc(fleet.currentX, fleet.currentY, fleetRadiusRendered, 0, Math.PI * 2);
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
    let sourcePos = getPlanetCurrentWorldCoordinates(sourcePlanet);
    let sourceX = sourcePos.x;
    let sourceY = sourcePos.y;

    let targetPos = getPlanetCurrentWorldCoordinates(targetPlanet);
    let targetX = targetPos.x;
    let targetY = targetPos.y;

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
    gameActive = false; // Pause game while modal is open
    console.log("Modal display state: backdrop active=", gameModalBackdrop.classList.contains('active'), "modal active=", gameModal.classList.contains('active'));
}

function hideModal() {
    console.log("HIDE MODAL CALLED.");
    gameModalBackdrop.classList.remove('active');
    gameModal.classList.remove('active');
    gameActive = true; // Resume game after modal closes
}

// Functions for planet control panel
function showPlanetControlPanel(planet) {
    if (!planet) return;
    controlPanelPlanetName.textContent = `${planet.name} Controls (${planet.owner === 'player' ? 'Your' : planet.owner})`; 
    
    panelUnitsDisplay.textContent = planet.units;
    panelIncomeDisplay.textContent = CONFIG.PLANET_UNIT_GENERATION_RATE; // Using global rate for now
    panelSizeDisplay.textContent = planet.radius;

    const numSlots = getBuildingSlots(planet.radius);
    panelBuildingSlotsCount.textContent = numSlots;
    panelBuildingSlotsContainer.innerHTML = ''; // Clear existing slots
    for (let i = 0; i < numSlots; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('building-slot');
        slotDiv.textContent = `Slot ${i + 1} (Empty)`;
        panelBuildingSlotsContainer.appendChild(slotDiv);
    }

    planetControlPanel.classList.add('active');
    gameActive = false; // Pause game while panel is open
}

function hidePlanetControlPanel() {
    planetControlPanel.classList.remove('active');
    gameActive = true; // Resume game
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

    // NEW UI element assignments for planet control panel and launch button
    planetControlPanel = document.getElementById('planet-control-panel');
    controlPanelPlanetName = document.getElementById('control-panel-planet-name');
    closeControlPanelButton = document.getElementById('close-control-panel');
    launchAllInvasionsButton = document.getElementById('launch-all-invasions');
    // NEW assignments for panel content
    panelUnitsDisplay = document.getElementById('panel-units');
    panelIncomeDisplay = document.getElementById('panel-income');
    panelSizeDisplay = document.getElementById('panel-size');
    panelBuildingSlotsCount = document.getElementById('panel-building-slots-count');
    panelBuildingSlotsContainer = document.getElementById('panel-building-slots');


    // Event listeners for modal buttons
    modalConfirm.addEventListener('click', () => {
        hideModal();
        if (modalCallback) {
            modalCallback();
            modalCallback = null;
        }
    });

    modalInputConfirm.addEventListener('click', () => {
        const value = parseInt(modalInput.value);
        hideModal();
        if (modalCallback) {
            modalCallback(value); 
            modalCallback = null;
        }
    });

    // Event listener for the new planet control panel close button
    closeControlPanelButton.addEventListener('click', () => {
        hidePlanetControlPanel();
    });

    // Event listener for the Launch All Invasions button
    launchAllInvasionsButton.addEventListener('click', () => {
        if (pendingInvasions.length === 0) {
            return;
        }

        pendingInvasions.forEach(pending => {
            // Deduct units from source planet
            pending.source.units -= pending.units;
            updatePlanetListItem(pending.source); // Update source planet units in list

            // Create active fleet
            let sourcePos = getPlanetCurrentWorldCoordinates(pending.source);
            let sourcePlanetWorldX = sourcePos.x;
            let sourcePlanetWorldY = sourcePos.y;

            activeFleets.push({
                source: pending.source,
                target: pending.target,
                units: pending.units,
                departureTime: performance.now(),
                travelDuration: calculateTravelDuration(pending.source, pending.target),
                currentX: sourcePlanetWorldX,
                currentY: sourcePlanetWorldY,
                color: CONFIG.OWNER_COLORS['player'] // Fleets are player color
            });
        });

        pendingInvasions = []; // Clear all staged invasions
        launchAllInvasionsButton.style.display = 'none'; // Hide the button
        updatePlayerUnitDisplay(); // Update player's total unit display if needed
    });

    // NEW: Event listeners for panel dragging
    planetControlPanel.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
            isDraggingPanel = true;
            // Calculate offset from mouse to panel's top-left corner
            dragPanelOffsetX = e.clientX - planetControlPanel.getBoundingClientRect().left;
            dragPanelOffsetY = e.clientY - planetControlPanel.getBoundingClientRect().top;
            planetControlPanel.style.cursor = 'grabbing';
            e.preventDefault(); // Prevent text selection etc.
        }
    });

    planetControlPanel.addEventListener('mousemove', (e) => {
        if (isDraggingPanel) {
            // Calculate new position of the panel
            const newX = e.clientX - dragPanelOffsetX;
            const newY = e.clientY - dragPanelOffsetY;

            // Apply new position
            planetControlPanel.style.left = `${newX}px`;
            planetControlPanel.style.top = `${newY}px`;
            // Remove transform centering if it was applied via CSS, as we're now controlling position directly
            planetControlPanel.style.transform = 'none'; 
            e.preventDefault();
        }
    });

    planetControlPanel.addEventListener('mouseup', () => {
        isDraggingPanel = false;
        planetControlPanel.style.cursor = 'grab';
    });

    planetControlPanel.addEventListener('mouseleave', () => {
        isDraggingPanel = false;
        planetControlPanel.style.cursor = 'grab';
    });


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
        pendingInvasions = []; // Clear pending invasions on new game
        launchAllInvasionsButton.style.display = 'none'; // Hide button on new game
        chosenStarterPlanet = null;
        selectedSourcePlanet = null; // Reset source selection on new game
        isDrawingInvasionLine = false; // Reset line drawing
        canvas.style.cursor = 'default'; // Reset cursor
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


    // Left-click (LMB) for invasion initiation and camera dragging
    canvas.addEventListener('mousedown', (e) => {
        // Condition for blocking interaction when modal or control panel is active
        if (!gameActive || gameModalBackdrop.classList.contains('active') || planetControlPanel.classList.contains('active')) return;

        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const worldX = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
        const worldY = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

        const clickedPlanet = getPlanetAtCoordinates(worldX, worldY);

        if (e.button === 0) { // Left mouse button
            e.preventDefault();

            if (selectedSourcePlanet) { // Phase 2: Source already selected, looking for target
                if (clickedPlanet) {
                    if (clickedPlanet === selectedSourcePlanet) {
                        showModal("Cannot invade your own origin planet!", 'alert');
                    } else if (clickedPlanet.owner === 'player') {
                        showModal("You already control this planet!", 'alert');
                    } else { // Valid target for invasion
                        if (selectedSourcePlanet.units === 0) {
                            showModal("The source planet has no units to send!", 'alert');
                            // Reset source and line drawing immediately on this specific error
                            selectedSourcePlanet = null;
                            isDrawingInvasionLine = false;
                            canvas.style.cursor = 'default';
                        } else {
                            // Store source and target for temporary fixed line
                            tempFixedInvasionLine = { source: selectedSourcePlanet, target: clickedPlanet };
                            isDrawingInvasionLine = false; // Stop cursor following line

                            // Pass source and target to the modal callback closure for invasion
                            const sourceForCallback = selectedSourcePlanet;
                            const targetForCallback = clickedPlanet;

                            showModal(`Send units from ${sourceForCallback.name} (${sourceForCallback.units} units) to invade ${targetForCallback.name} (currently ${targetForCallback.owner} with ${targetForCallback.units} units)?\n\nEnter number of units:`, 'prompt', (unitsToSend) => {
                                if (isNaN(unitsToSend) || unitsToSend <= 0) {
                                    unitsToSend = 0; // Ensures 0 if invalid input
                                }
                                unitsToSend = Math.min(unitsToSend, sourceForCallback.units);
                                if (unitsToSend === 0) {
                                    showModal("Not enough units available to send any.", 'alert');
                                    // Make sure to reset tempFixedInvasionLine and selectedSourcePlanet if units are 0
                                    tempFixedInvasionLine = null;
                                    selectedSourcePlanet = null;
                                    canvas.style.cursor = 'default';
                                    return;
                                }

                                // Stage the invasion instead of launching immediately
                                pendingInvasions.push({
                                    source: sourceForCallback,
                                    target: targetForCallback,
                                    units: unitsToSend,
                                    color: CONFIG.OWNER_COLORS['player'] // Staged invasions are player color
                                });
                                launchAllInvasionsButton.style.display = 'block'; // Show launch button

                                // Reset source and line drawing here AFTER staging
                                tempFixedInvasionLine = null; // Clear the temporary fixed line
                                selectedSourcePlanet = null;
                                isDrawingInvasionLine = false;
                                canvas.style.cursor = 'default';
                            });
                        }
                    }
                } else { // Clicked empty space while source was selected
                    showModal("Invasion cancelled.", 'alert');
                }
                // If a modal didn't appear (e.g., "Cannot invade own planet"), reset selection immediately.
                // If modal appeared, it's handled by its callback.
                if (!gameModalBackdrop.classList.contains('active')) {
                    selectedSourcePlanet = null;
                    isDrawingInvasionLine = false;
                    canvas.style.cursor = 'default';
                }

            } else { // Phase 1: No source selected
                if (clickedPlanet) {
                    if (clickedPlanet.owner === 'player') {
                        selectedSourcePlanet = clickedPlanet;
                        isDrawingInvasionLine = true; // Line follows cursor
                        canvas.style.cursor = 'crosshair';
                    } else {
                        showModal("You can only initiate invasions from your own planets!", 'alert');
                    }
                } else { // Clicked empty space, start dragging if not focusing a planet
                    if (!camera.targetPlanet) {
                        isDragging = true;
                        lastMouseX = mouseX;
                        lastMouseY = mouseY;
                    }
                }
            }
        }
    });

    // Right-click (RMB) for planet control panel
    canvas.addEventListener('contextmenu', (e) => {
        if (!gameActive || gameModalBackdrop.classList.contains('active')) return;
        e.preventDefault(); // Prevent default right-click context menu

        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const worldX = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
        const worldY = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

        const clickedPlanet = getPlanetAtCoordinates(worldX, worldY);

        if (clickedPlanet) {
            hideModal(); // Ensure any game modal is hidden
            hidePlanetControlPanel(); // Hide if already open for another planet
            showPlanetControlPanel(clickedPlanet);
        } else {
            // If right-clicked empty space, hide the panel if it's open
            if (planetControlPanel.classList.contains('active')) {
                hidePlanetControlPanel();
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!gameActive || gameModalBackdrop.classList.contains('active') || planetControlPanel.classList.contains('active')) return;

        currentMouseWorldX = camera.x + (e.clientX - canvas.width / 2) / camera.zoom;
        currentMouseWorldY = e.clientY - canvas.height / 2; // Fixed this previously

        // Correction: Recalculate currentMouseWorldY correctly relative to canvas center and zoom
        currentMouseWorldY = camera.y + (e.clientY - canvas.height / 2) / camera.zoom;

        if (isDrawingInvasionLine) { // Only true when selecting target (cursor-following)
            e.preventDefault();
        } else if (isDragging) {
            e.preventDefault();
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;

            camera.x -= deltaX / camera.zoom * camera.dragSensitivity;
            camera.y -= deltaY / camera.zoom * camera.dragSensitivity;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
        // Update cursor based on whether dragging or line drawing is active
        if (!isDragging && !isDrawingInvasionLine && canvas.style.cursor !== 'default') {
            canvas.style.cursor = 'default';
        } else if (isDrawingInvasionLine && canvas.style.cursor !== 'crosshair') {
            canvas.style.cursor = 'crosshair';
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!gameActive || gameModalBackdrop.classList.contains('active') || planetControlPanel.classList.contains('active')) return;
        isDragging = false;
        isDraggingPanel = false; // Reset panel dragging
        planetControlPanel.style.cursor = 'grab'; // Reset panel cursor
    });

    canvas.addEventListener('mouseleave', () => {
        if (!gameActive || gameModalBackdrop.classList.contains('active') || planetControlPanel.classList.contains('active')) return;
        isDragging = false;
        isDraggingPanel = false; // Reset panel dragging
        planetControlPanel.style.cursor = 'grab'; // Reset panel cursor

        // If mouse leaves canvas during line drawing, cancel selection
        if (isDrawingInvasionLine) {
            selectedSourcePlanet = null;
            isDrawingInvasionLine = false;
            canvas.style.cursor = 'default';
            // Optionally, show a "Invasion cancelled" modal here
        }
    });

    // Re-enabled zoom for 'wheel' event by removing blocking conditions
    canvas.addEventListener('wheel', (e) => {
        if (!gameActive || gameModalBackdrop.classList.contains('active') || planetControlPanel.classList.contains('active')) return;

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
