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

    PLANET_PRODUCTION_INTERVAL_MS: 5000,

    INITIAL_PLAYER_UNITS: 100,
    AI_PLANET_INITIAL_UNITS: 100,
    NEUTRAL_PLANET_INITIAL_UNITS: 100,
    
    // Production Rates
    PLANET_BASE_UNIT_PRODUCTION_RATE: 5,
    PLANET_BASE_INCOME_PRODUCTION_RATE: 5,

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

    // Fleet ball size configuration
    FLEET_BASE_RADIUS: 5,
    FLEET_MAX_SCREEN_RADIUS_PX: 15,

    // Planet click radius multiplier
    PLANET_CLICK_RADIUS_MULTIPLIER: 1.5,

    // Building Costs and Effects
    BUILDINGS: {
        Garrison: {
            name: "Garrison",
            cost: 200,
            unitBonus: 15,
            incomeBonus: 0,
            defenseBonus: 0
        },
        MarketDistrict: {
            name: "Market District",
            cost: 150,
            unitBonus: 0,
            incomeBonus: 5,
            defenseBonus: 0
        },
        PlanetaryDefenses: {
            name: "Planetary Defenses",
            cost: 300,
            unitBonus: 0,
            incomeBonus: 0,
            defenseBonus: 0.2
        }
    }
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
    targetZoom: CONFIG.CAMERA_INITIAL_ZOOM
};
let isDragging = false;
let lastMouseX, lastMouseY;
let selectingStarterPlanet = false;
let gameActive = false;
let playerIncome = 0;
let chosenStarterPlanet = null;
let activeFleets = [];
let animationFrameId;
let planetProductionInterval = null;
let modalCallback = null;

// Global variables for invasion line drawing
let selectedSourcePlanet = null;
let isDrawingInvasionLine = false;
let currentMouseWorldX, currentMouseWorldY;

// Global variable for pending invasions
let pendingInvasions = [];

// Global variable for line attached to target when modal is open
let tempFixedInvasionLine = null;

// Global variables for panel dragging
let isDraggingPanel = false;
let dragPanelOffsetX, dragPanelOffsetY;


// UI element references (declared globally, assigned in DOMContentLoaded)
let titleScreen;
let gameScreen;
let playButton;
let canvas;
let ctx;
let starterPlanetPanel;
let planetListPanel;
let planetList;
let playerUnitsPanel;
let playerIncomeCountDisplay;
let gameModalBackdrop;
let gameModal;
let modalMessage;
let modalInputArea;
let modalInput;
let modalInputConfirm;
let modalConfirm;
let modalInputCancelButton;

// UI element references for planet control panel and launch button
let planetControlPanel;
let controlPanelName;
let closeControlPanelXButton;
let launchAllInvasionsButton;
let panelUnitsDisplay;
let panelUnitProductionRateDisplay;
let panelIncomeRateDisplay;
let panelSizeDisplay;
let panelBuildingSlotsCount;
let panelBuildingSlotsContainer;

// Building Options Sub-panel UI elements (renamed from Building Selection Modal)
let buildingOptionsSubpanel;
let closeBuildingOptionsXButton;
let buildingOptionsPlanetName;
let buildingOptionsButtonsContainer;

// Variables to pass context to building selection modal (now subpanel)
let currentBuildingSlotPlanet = null;
let currentBuildingSlotIndex = -1;


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

        const newPlanet = {
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
            units: initialUnits,
            // Production rates and buildings
            unitProductionRate: CONFIG.PLANET_BASE_UNIT_PRODUCTION_RATE,
            incomeProductionRate: CONFIG.PLANET_BASE_INCOME_PRODUCTION_RATE,
            buildings: []
        };

        // Make all planets start with a Garrison
        newPlanet.buildings.push('Garrison');
        newPlanet.unitProductionRate += CONFIG.BUILDINGS.Garrison.unitBonus; 

        currentPlanets.push(newPlanet);

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
                camera.targetPlanet = null;
                camera.targetZoom = camera.zoom;
                camera.activeListItem = null;
            } else {
                listItem.classList.add('active');
                camera.activeListItem = listItem;
                camera.targetPlanet = planet;
                camera.targetZoom = camera.zoom;

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


function updatePlayerUnitDisplay() {
    playerUnitCountDisplay.textContent = chosenStarterPlanet ? chosenStarterPlanet.units : 0;
}

function updatePlayerIncomeDisplay() {
    playerIncomeCountDisplay.textContent = playerIncome;
}

function generatePlanetProduction() {
    currentPlanets.forEach(planet => {
        let currentUnitProduction = CONFIG.PLANET_BASE_UNIT_PRODUCTION_RATE;
        let currentIncomeProduction = CONFIG.PLANET_BASE_INCOME_PRODUCTION_RATE;

        planet.buildings.forEach(buildingName => {
            if (buildingName === 'Garrison') {
                currentUnitProduction += CONFIG.BUILDINGS.Garrison.unitBonus;
            } else if (buildingName === 'MarketDistrict') {
                currentIncomeProduction += CONFIG.BUILDINGS.MarketDistrict.incomeBonus;
            }
        });

        if (planet.owner === 'player') {
            planet.units += currentUnitProduction;
            playerIncome += currentIncomeProduction;
            updatePlanetListItem(planet);
        } else if (planet.owner === 'ai') {
            planet.units += currentUnitProduction;
            updatePlanetListItem(planet);
        }
    });
    updatePlayerUnitDisplay();
    updatePlayerIncomeDisplay();
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

// Helper function to get planet at coordinates
function getPlanetAtCoordinates(worldX, worldY) {
    for (let i = 0; i < currentPlanets.length; i++) {
        const planet = currentPlanets[i];
        let planetPos = getPlanetCurrentWorldCoordinates(planet);
        let planetWorldX = planetPos.x;
        let planetWorldY = planetPos.y;

        // NEW: Increased hitbox size
        const clickRadius = planet.radius * CONFIG.PLANET_CLICK_RADIUS_MULTIPLIER;
        const distance = Math.sqrt(
            Math.pow(worldX - planetWorldX, 2) +
            Math.pow(worldY - planetWorldY, 2)
        );

        if (distance < clickRadius) {
            return planet;
        }
    }
    return null;
}

// Helper function to get a planet's current world coordinates
function getPlanetCurrentWorldCoordinates(planet) {
    let x, y;
    const systemCenterX = 0;
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

// Helper function to determine building slots
function getBuildingSlots(planetRadius) {
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
            handleFleetArrival(fleet);
            activeFleets.splice(i, 1);
        }
    }


    // --- DRAW PHASE ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (camera.targetPlanet) {
        let targetPos = getPlanetCurrentWorldCoordinates(camera.targetPlanet);
        camera.x = targetPos.x;
        camera.y = targetPos.y;
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
        const ownerIndicatorBorderWidth = Math.min(3 / camera.zoom, 3);
        ctx.strokeStyle = CONFIG.OWNER_COLORS[planet.owner];
        ctx.lineWidth = ownerIndicatorBorderWidth;
        ctx.stroke();

        // Draw planet name on map
        ctx.save();
        ctx.translate(x, y);

        // FIX: Name and units overlap - adjusted font sizes and offsets
        const nameFontSize = Math.max(10, 18 / camera.zoom); // Made smaller
        const nameOffset = planet.radius + Math.max(20, 25 / camera.zoom); // Increased offset
        ctx.font = `${nameFontSize}px 'Space Mono', monospace`;
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(planet.name, 0, -nameOffset);

        // Draw units count on planet
        const unitsFontSize = Math.max(8, 12 / camera.zoom); // Made smaller
        const unitsOffset = nameOffset + Math.max(15, 20 / camera.zoom); // Increased offset
        ctx.font = `${unitsFontSize}px 'Space Mono', monospace`;
        ctx.fillStyle = '#0a0';
        ctx.fillText(`${planet.units}`, 0, -unitsOffset);

        ctx.restore();
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
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([10 / camera.zoom, 5 / camera.zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw temporary fixed line when modal is open
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
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([10 / camera.zoom, 5 / camera.zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
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
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([5 / camera.zoom, 5 / camera.zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
    });


    activeFleets.forEach(fleet => {
        const fleetRadiusRendered = Math.min(CONFIG.FLEET_BASE_RADIUS / camera.zoom, CONFIG.FLEET_MAX_SCREEN_RADIUS_PX);
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

// Generic handler for fleet arrival based on mission
function handleFleetArrival(fleet) {
    if (fleet.mission === 'invasion') {
        resolveCombat(fleet);
    } else if (fleet.mission === 'reinforcement') {
        fleet.target.units += fleet.units;
        updatePlanetListItem(fleet.target);
        showModal(`Reinforcements of ${fleet.units} units arrived at ${fleet.target.name}!`, 'alert');
    }
}

function resolveCombat(fleet) {
    console.log(`COMBAT: Resolving combat for fleet from ${fleet.source.name} to ${fleet.target.name}`);
    const attackerUnits = fleet.units;
    const defenderUnitsRaw = fleet.target.units;
    const targetPlanet = fleet.target;

    let defenderBonus = 0;
    targetPlanet.buildings.forEach(buildingName => {
        if (buildingName === 'PlanetaryDefenses') {
            defenderBonus += CONFIG.BUILDINGS.PlanetaryDefenses.defenseBonus;
        }
    });
    
    let resultMessage = "";
    let winner = null;
    let remainingAttackerUnits = attackerUnits;
    let remainingDefenderUnits = defenderUnitsRaw;

    const effectiveAttackerUnits = attackerUnits * (1 + CONFIG.COMBAT_ATTACKER_BONUS_PERCENT);
    // Apply defense bonus from buildings
    const effectiveDefenderUnits = defenderUnitsRaw * (1 + CONFIG.COMBAT_DEFENDER_BONUS_PERCENT + defenderBonus);
    
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
        resultMessage = `Invasion successful! Your ${attackerUnits} units defeated ${targetPlanet.owner}'s ${defenderUnitsRaw} units on ${targetPlanet.name}.`;
        resultMessage += `\n${remainingAttackerUnits} units remain and claim the planet for you.`;
        targetPlanet.owner = 'player';
        targetPlanet.units = remainingAttackerUnits;
        updatePlanetListItem(targetPlanet);
    } else {
        resultMessage = `Invasion failed! Your ${attackerUnits} units were defeated by ${targetPlanet.owner}'s ${defenderUnitsRaw} units on ${targetPlanet.name}.`;
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
        modalInputCancelButton.style.display = 'block'; // Show cancel button for prompt
        modalInput.value = '';
        modalInput.focus();
    } else {
        modalInputArea.style.display = 'none';
        modalConfirm.style.display = 'block';
        modalInputConfirm.style.display = 'none';
        modalInputCancelButton.style.display = 'none';
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

// NEW: Function to show the building options subpanel
function showBuildingOptionsSubpanel() {
    buildingOptionsSubpanel.classList.add('active');
    // Set position relative to planet control panel
    // These values might need fine-tuning based on actual CSS dimensions
    const panelRect = planetControlPanel.getBoundingClientRect();
    buildingOptionsSubpanel.style.left = `${panelRect.width}px`; // Position to the right
    buildingOptionsSubpanel.style.top = `0px`; // Align to top
}

// NEW: Function to hide the building options subpanel
function hideBuildingOptionsSubpanel() {
    buildingOptionsSubpanel.classList.remove('active');
}


// Function to execute building construction after selection
function executeBuildingConstruction(buildingType, planet, slotIndex) {
    const buildingData = CONFIG.BUILDINGS[buildingType];
    const cost = buildingData.cost;

    if (playerIncome >= cost) {
        playerIncome -= cost;
        planet.buildings[slotIndex] = buildingType;

        if (buildingData.unitBonus) {
            planet.unitProductionRate += buildingData.unitBonus;
        }
        if (buildingData.incomeBonus) {
            planet.incomeProductionRate += buildingData.incomeBonus;
        }

        updatePlayerIncomeDisplay();
        showPlanetControlPanel(planet);
    } else {
        showModal("Not enough income to build that!", 'alert');
        showPlanetControlPanel(planet); 
    }
}


// Functions for planet control panel
function showPlanetControlPanel(planet) {
    if (!planet) return;
    controlPanelName.textContent = `${planet.name} (${planet.owner === 'player' ? 'Your' : planet.owner})`; 
    
    panelUnitsDisplay.textContent = planet.units;

    let currentUnitProductionRate = CONFIG.PLANET_BASE_UNIT_PRODUCTION_RATE;
    let currentIncomeProductionRate = CONFIG.PLANET_BASE_INCOME_PRODUCTION_RATE;

    planet.buildings.forEach(buildingName => {
        if (buildingName === 'Garrison') {
            currentUnitProductionRate += CONFIG.BUILDINGS.Garrison.unitBonus;
        } else if (buildingName === 'MarketDistrict') {
            currentIncomeProductionRate += CONFIG.BUILDINGS.MarketDistrict.incomeBonus;
        }
    });

    panelUnitProductionRateDisplay.textContent = currentUnitProductionRate;
    panelIncomeRateDisplay.textContent = currentIncomeProductionRate;
    panelSizeDisplay.textContent = planet.radius;

    const numSlots = getBuildingSlots(planet.radius);
    panelBuildingSlotsCount.textContent = numSlots;
    panelBuildingSlotsContainer.innerHTML = ''; // Clear existing slots

    for (let i = 0; i < numSlots; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('building-slot');
        
        const buildingInSlot = planet.buildings[i];
        if (buildingInSlot) {
            slotDiv.textContent = buildingInSlot;
            slotDiv.classList.add('occupied');
        } else {
            slotDiv.textContent = `Empty Slot ${i + 1}`;
            slotDiv.classList.remove('occupied');
            
            if (planet.owner === 'player') {
                slotDiv.addEventListener('click', () => {
                    hideBuildingOptionsSubpanel();
                    // Set current context for building options (for the subpanel title)
                    buildingOptionsPlanetName.textContent = `Build on ${planet.name} (Slot ${i + 1})`;
                    buildingOptionsButtonsContainer.innerHTML = '';
                    for (const buildingType in CONFIG.BUILDINGS) {
                        if (CONFIG.BUILDINGS.hasOwnProperty(buildingType)) {
                            const buildingData = CONFIG.BUILDINGS[buildingType];
                            const button = document.createElement('button');
                            button.textContent = `${buildingData.name} (${buildingData.cost} income)`;
                            button.dataset.buildingType = buildingType;
                            button.addEventListener('click', () => {
                                executeBuildingConstruction(buildingType, planet, i);
                                hideBuildingOptionsSubpanel();
                            });
                            buildingOptionsButtonsContainer.appendChild(button);
                        }
                    }
                    showBuildingOptionsSubpanel();
                });
            } else {
                slotDiv.style.cursor = 'default';
            }
        }
        panelBuildingSlotsContainer.appendChild(slotDiv);
    }

    planetControlPanel.classList.add('active');
    hideBuildingOptionsSubpanel(); 
}

function hidePlanetControlPanel() {
    planetControlPanel.classList.remove('active');
    hideBuildingOptionsSubpanel();
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
    modalInputCancelButton = document.getElementById('modal-input-cancel');

    // UI element assignments for planet control panel and launch button
    planetControlPanel = document.getElementById('planet-control-panel');
    controlPanelName = document.getElementById('control-panel-planet-name');
    closeControlPanelXButton = document.getElementById('close-control-panel-x');
    launchAllInvasionsButton = document.getElementById('launch-all-invasions');
    panelUnitsDisplay = document.getElementById('panel-units');
    panelUnitProductionRateDisplay = document.getElementById('panel-unit-production-rate');
    panelIncomeRateDisplay = document.getElementById('panel-income-rate');
    panelSizeDisplay = document.getElementById('panel-size');
    panelBuildingSlotsCount = document.getElementById('panel-building-slots-count');
    panelBuildingSlotsContainer = document.getElementById('panel-building-slots');

    // Building Options Sub-panel UI element assignments
    buildingOptionsSubpanel = document.getElementById('building-options-subpanel');
    closeBuildingOptionsXButton = document.getElementById('close-building-options-x');
    buildingOptionsPlanetName = buildingOptionsSubpanel.querySelector('h3'); // Assuming h3 is first child with name
    buildingOptionsButtonsContainer = document.getElementById('building-options-buttons');


    // Event listeners for modal buttons
    modalConfirm.addEventListener('click', () => {
        hideModal();
        if (modalCallback) {
            modalCallback();
            modalCallback = null;
        }
    });

    modalInputConfirm.addEventListener('click', () => {
        const value = modalInput.value;
        const parsedValue = parseInt(value);
        hideModal();
        if (modalCallback) {
            if (!isNaN(parsedValue) && value.trim() !== '') {
                modalCallback(parsedValue); 
            } else {
                modalCallback(value);
            }
            modalCallback = null;
        }
    });

    // Event listener for the modal input cancel button
    modalInputCancelButton.addEventListener('click', () => {
        hideModal();
        if (tempFixedInvasionLine || selectedSourcePlanet) {
            tempFixedInvasionLine = null;
            selectedSourcePlanet = null;
            isDrawingInvasionLine = false;
            canvas.style.cursor = 'default';
        }
        modalCallback = null;
    });


    // Event listener for the planet control panel 'X' button
    closeControlPanelXButton.addEventListener('click', () => {
        hidePlanetControlPanel();
    });

    // Event listener for the building options subpanel 'X' button
    closeBuildingOptionsXButton.addEventListener('click', () => {
        hideBuildingOptionsSubpanel();
    });

    // Event listener for the Launch All Invasions button
    launchAllInvasionsButton.addEventListener('click', () => {
        if (pendingInvasions.length === 0) {
            return;
        }

        pendingInvasions.forEach(pending => {
            pending.source.units -= pending.units;
            updatePlanetListItem(pending.source);

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
                mission: pending.mission
            });
        });

        pendingInvasions = [];
        launchAllInvasionsButton.style.display = 'none';
        updatePlayerUnitDisplay();
    });

    // Event listeners for panel dragging
    planetControlPanel.addEventListener('mousedown', (e) => {
        if (e.button === 0 && (e.target === planetControlPanel || e.target.tagName === 'H2')) {
            isDraggingPanel = true;
            dragPanelOffsetX = e.clientX - planetControlPanel.getBoundingClientRect().left;
            dragPanelOffsetY = e.clientY - planetControlPanel.getBoundingClientRect().top;
            planetControlPanel.style.cursor = 'default';
            e.preventDefault();
        }
    });

    planetControlPanel.addEventListener('mousemove', (e) => {
        if (isDraggingPanel) {
            const newX = e.clientX - dragPanelOffsetX;
            const newY = e.clientY - dragPanelOffsetY;

            planetControlPanel.style.left = `${newX}px`;
            planetControlPanel.style.top = `${newY}px`;
            planetControlPanel.style.transform = 'none'; 
            e.preventDefault();
        }
    });

    planetControlPanel.addEventListener('mouseup', () => {
        isDraggingPanel = false;
        planetControlPanel.style.cursor = 'default';
    });

    planetControlPanel.addEventListener('mouseleave', () => {
        isDraggingPanel = false;
        planetControlPanel.style.cursor = 'default';
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
        camera.targetZoom = CONFIG.CAMERA_INITIAL_ZOOM;
        playerIncome = 500;
        activeFleets = [];
        pendingInvasions = [];
        launchAllInvasionsButton.style.display = 'none';
        chosenStarterPlanet = null;
        selectedSourcePlanet = null;
        isDrawingInvasionLine = false;
        canvas.style.cursor = 'default';
        updatePlayerIncomeDisplay();

        populatePlanetList();

        animateSolarSystem();

        const randomIndex = Math.floor(Math.random() * currentPlanets.length);
        chosenStarterPlanet = currentPlanets[randomIndex];
        chosenStarterPlanet.owner = 'player';
        chosenStarterPlanet.units = CONFIG.INITIAL_PLAYER_UNITS;
        updatePlanetListItem(chosenStarterPlanet);

        if (chosenStarterPlanet.listItemRef) {
            if (camera.activeListItem) camera.activeListItem.classList.remove('active');
            chosenStarterPlanet.listItemRef.classList.add('active');
            camera.activeListItem = chosenStarterPlanet.listItemRef;
        }

        camera.targetPlanet = chosenStarterPlanet;
        let targetPos = getPlanetCurrentWorldCoordinates(chosenStarterPlanet);
        camera.x = targetPos.x;
        camera.y = targetPos.y;

        camera.targetZoom = CONFIG.CAMERA_INITIAL_ZOOM;
        updatePlayerUnitDisplay();

        selectingStarterPlanet = false;
        starterPlanetPanel.classList.remove('active');
        planetListPanel.classList.add('active');
        playerUnitsPanel.classList.add('active');
        gameActive = true;
        console.log("Game state after Play: gameActive=", gameActive, "selectingStarterPlanet=", selectingStarterPlanet);

        planetProductionInterval = setInterval(generatePlanetProduction, CONFIG.PLANET_PRODUCTION_INTERVAL_MS);
    });


    // Left-click (LMB) for invasion/reinforcement initiation and camera dragging
    canvas.addEventListener('mousedown', (e) => {
        // Block interaction if game is paused (by gameModal or building selection modal) or if click is not directly on canvas
        if (!gameActive || gameModalBackdrop.classList.contains('active') || buildingOptionsSubpanel.classList.contains('active') || e.target !== canvas) {
            return;
        }

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
                        showModal("Cannot send units to the same planet!", 'alert');
                    } else if (clickedPlanet.owner === 'player') {
                        // REINFORCEMENT
                        if (selectedSourcePlanet.units === 0) {
                            showModal("The source planet has no units to send!", 'alert');
                        } else {
                            tempFixedInvasionLine = { source: selectedSourcePlanet, target: clickedPlanet };
                            isDrawingInvasionLine = false;

                            const sourceForCallback = selectedSourcePlanet;
                            const targetForCallback = clickedPlanet;

                            showModal(`Send units from ${sourceForCallback.name} (${sourceForCallback.units} units) to reinforce ${targetForCallback.name} (${targetForCallback.units} units)?\n\nEnter number of units:`, 'prompt', (unitsToSend) => {
                                const parsedUnitsToSend = parseInt(unitsToSend); 

                                if (isNaN(parsedUnitsToSend) || parsedUnitsToSend <= 0) {
                                    showModal("Invalid number of units. Please enter a positive number.", 'alert');
                                } else {
                                    unitsToSend = Math.min(parsedUnitsToSend, sourceForCallback.units);
                                    if (unitsToSend === 0) {
                                        showModal("Not enough units available to send any.", 'alert');
                                    } else {
                                        pendingInvasions.push({
                                            source: sourceForCallback,
                                            target: targetForCallback,
                                            units: unitsToSend,
                                            mission: 'reinforcement'
                                        });
                                        launchAllInvasionsButton.style.display = 'block';
                                    }
                                }
                                tempFixedInvasionLine = null;
                                selectedSourcePlanet = null;
                                isDrawingInvasionLine = false;
                                canvas.style.cursor = 'default';
                            });
                        }
                    } else { // Valid enemy/neutral target for INVASION
                        if (selectedSourcePlanet.units === 0) {
                            showModal("The source planet has no units to send!", 'alert');
                        } else {
                            tempFixedInvasionLine = { source: selectedSourcePlanet, target: clickedPlanet };
                            isDrawingInvasionLine = false;

                            const sourceForCallback = selectedSourcePlanet;
                            const targetForCallback = clickedPlanet;

                            showModal(`Send units from ${sourceForCallback.name} (${sourceForCallback.units} units) to invade ${targetForCallback.name} (currently ${targetForCallback.owner} with ${targetForCallback.units} units)?\n\nEnter number of units:`, 'prompt', (unitsToSend) => {
                                const parsedUnitsToSend = parseInt(unitsToSend); 

                                if (isNaN(parsedUnitsToSend) || parsedUnitsToSend <= 0) {
                                    showModal("Invalid number of units. Please enter a positive number.", 'alert');
                                } else {
                                    unitsToSend = Math.min(parsedUnitsToSend, sourceForCallback.units);
                                    if (unitsToSend === 0) {
                                        showModal("Not enough units available to send any.", 'alert');
                                    } else {
                                        pendingInvasions.push({
                                            source: sourceForCallback,
                                            target: targetForCallback,
                                            units: unitsToSend,
                                            mission: 'invasion'
                                        });
                                        launchAllInvasionsButton.style.display = 'block';
                                    }
                                }
                                tempFixedInvasionLine = null;
                                selectedSourcePlanet = null;
                                isDrawingInvasionLine = false;
                                canvas.style.cursor = 'default';
                            });
                        }
                    }
                } else { // Clicked empty space while source was selected
                    // Just ends the line, no modal
                }
                if (!gameModalBackdrop.classList.contains('active') && !buildingOptionsSubpanel.classList.contains('active')) {
                    selectedSourcePlanet = null;
                    isDrawingInvasionLine = false;
                    canvas.style.cursor = 'default';
                }

            } else { // Phase 1: No source selected
                if (clickedPlanet) {
                    if (clickedPlanet.owner === 'player') {
                        selectedSourcePlanet = clickedPlanet;
                        isDrawingInvasionLine = true;
                        canvas.style.cursor = 'crosshair';
                    } else {
                        showModal("You can only initiate operations from your own planets!", 'alert');
                    }
                } else { // Clicked empty space, start dragging if not focusing a planet
                    if (!camera.targetPlanet) {
                        isDragging = true;
                        lastMouseX = mouseX;
                        lastMouseY = mouseY;
                        canvas.style.cursor = 'default';
                    }
                }
            }
        }
    });

    // Right-click (RMB) for planet control panel
    canvas.addEventListener('contextmenu', (e) => {
        if (!gameActive || gameModalBackdrop.classList.contains('active') || buildingOptionsSubpanel.classList.contains('active')) return;
        e.preventDefault();

        if (e.target !== canvas) {
            return;
        }

        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const worldX = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
        const worldY = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

        const clickedPlanet = getPlanetAtCoordinates(worldX, worldY);

        if (clickedPlanet) {
            hideModal();
            hideBuildingOptionsSubpanel();
            hidePlanetControlPanel();
            showPlanetControlPanel(clickedPlanet);
        } else {
            if (planetControlPanel.classList.contains('active')) {
                hidePlanetControlPanel();
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!gameActive || gameModalBackdrop.classList.contains('active') || buildingOptionsSubpanel.classList.contains('active')) return;

        currentMouseWorldX = camera.x + (e.clientX - canvas.width / 2) / camera.zoom;
        currentMouseWorldY = camera.y + (e.clientY - canvas.height / 2) / camera.zoom;

        if (isDrawingInvasionLine) {
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
        if (!isDragging && !isDrawingInvasionLine && canvas.style.cursor !== 'default') {
            canvas.style.cursor = 'default';
        } else if (isDrawingInvasionLine && canvas.style.cursor !== 'crosshair') {
            canvas.style.cursor = 'crosshair';
        } else if (isDragging && canvas.style.cursor !== 'default') {
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!gameActive || gameModalBackdrop.classList.contains('active') || buildingOptionsSubpanel.classList.contains('active')) return;
        isDragging = false;
        isDraggingPanel = false;
        planetControlPanel.style.cursor = 'default';
        canvas.style.cursor = 'default';
    });

    canvas.addEventListener('mouseleave', () => {
        if (!gameActive || gameModalBackdrop.classList.contains('active') || buildingOptionsSubpanel.classList.contains('active')) return;
        isDragging = false;
        isDraggingPanel = false;
        planetControlPanel.style.cursor = 'default';
        canvas.style.cursor = 'default';
        if (isDrawingInvasionLine) {
            selectedSourcePlanet = null;
            isDrawingInvasionLine = false;
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('wheel', (e) => {
        if (!gameActive || gameModalBackdrop.classList.contains('active') || buildingOptionsSubpanel.classList.contains('active')) return;

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
