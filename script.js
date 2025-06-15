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

    // NEW: Fleet ball size configuration
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

// NEW Global variables for invasion line drawing
let selectedSourcePlanet = null;
let isDrawingInvasionLine = false;
let currentMouseWorldX, currentMouseWorldY; // To store cursor position in world coords

// NEW Global variable for pending invasions
let pendingInvasions = [];

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

                // FIX: Immediately center camera on the newly targeted planet
                let targetX, targetY;
                if (planet.isElliptical) {
                    const unrotatedX = planet.semiMajorAxis * Math.cos(planet.angle);
                    const unrotatedY = planet.semiMinorAxis * Math.sin(planet.angle);
                    targetX = unrotatedX * Math.cos(planet.rotationAngle) - unrotatedY * Math.sin(planet.rotationAngle);
                    targetY = unrotatedX * Math.sin(planet.rotationAngle) + unrotatedY * Math.cos(planet.rotationAngle);
                } else {
                    targetX = Math.cos(planet.angle) * planet.orbitRadius;
                    targetY = Math.sin(planet.angle) * planet.orbitRadius;
                }
                camera.x = targetX;
                camera.y = targetY;
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
            return planet;
        }
    }
    return null;
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

    // Draw the temporary invasion line (following cursor)
    if (isDrawingInvasionLine && selectedSourcePlanet) {
        ctx.beginPath();
        let sourcePlanetWorldX, sourcePlanetWorldY;
        if (selectedSourcePlanet.isElliptical) {
            const unrotatedX = selectedSourcePlanet.semiMajorAxis * Math.cos(selectedSourcePlanet.angle);
            const unrotatedY = selectedSourcePlanet.semiMinorAxis * Math.sin(selectedSourcePlanet.angle);
            sourcePlanetWorldX = unrotatedX * Math.cos(selectedSourcePlanet.rotationAngle) - unrotatedY * Math.sin(selectedSourcePlanet.rotationAngle);
            sourcePlanetWorldY = unrotatedX * Math.sin(selectedSourcePlanet.rotationAngle) + unrotatedY * Math.cos(selectedSourcePlanet.rotationAngle);
        } else {
            sourcePlanetWorldX = Math.cos(selectedSourcePlanet.angle) * selectedSourcePlanet.orbitRadius;
            sourcePlanetWorldY = Math.sin(selectedSourcePlanet.angle) * selectedSourcePlanet.orbitRadius;
        }

        ctx.moveTo(sourcePlanetWorldX, sourcePlanetWorldY);
        ctx.lineTo(currentMouseWorldX, currentMouseWorldY);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; // Brighter, semi-transparent cyan
        ctx.lineWidth = 0.5 / camera.zoom; // Skinny
        ctx.setLineDash([10 / camera.zoom, 5 / camera.zoom]); // Dotted line
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Draw an arrowhead (simple triangle) - only if mouse is far enough from source planet
        const distance = Math.sqrt(Math.pow(currentMouseWorldX - sourcePlanetWorldX, 2) + Math.pow(currentMouseWorldY - sourcePlanetWorldY, 2));
        const minArrowDrawDistance = 20 / camera.zoom; // Minimum distance to draw the arrowhead

        if (distance > minArrowDrawDistance) {
            const angle = Math.atan2(currentMouseWorldY - sourcePlanetWorldY, currentMouseWorldX - sourcePlanetWorldX);
            const arrowLength = 10 / camera.zoom; // Less thick
            const arrowWidth = 5 / camera.zoom; // Less thick

            ctx.save();
            ctx.translate(currentMouseWorldX, currentMouseWorldY);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(-arrowLength, arrowWidth / 2);
            ctx.lineTo(0, 0);
            ctx.lineTo(-arrowLength, -arrowWidth / 2);
            ctx.fillStyle = 'rgba(0, 255, 255, 0.7)'; // Match line color
            ctx.fill();
            ctx.restore();
        }
    }

    // NEW: Draw pending invasion lines (staged invasions)
    pendingInvasions.forEach(pending => {
        ctx.beginPath();
        let sourceX, sourceY, targetX, targetY;
        if (pending.source.isElliptical) {
            const unrotatedX = pending.source.semiMajorAxis * Math.cos(pending.source.angle);
            const unrotatedY = pending.source.semiMinorAxis * Math.sin(pending.source.angle);
            sourceX = unrotatedX * Math.cos(pending.source.rotationAngle) - unrotatedY * Math.sin(pending.source.rotationAngle);
            sourceY = unrotatedX * Math.sin(pending.source.rotationAngle) + unrotatedY * Math.cos(pending.source.rotationAngle);
        } else {
            sourceX = Math.cos(pending.source.angle) * pending.source.orbitRadius;
            sourceY = Math.sin(pending.source.angle) * pending.source.orbitRadius;
        }
        if (pending.target.isElliptical) {
            const unrotatedX = pending.target.semiMajorAxis * Math.cos(pending.target.angle);
            const unrotatedY = pending.target.semiMinorAxis * Math.sin(pending.target.angle);
            targetX = unrotatedX * Math.cos(pending.target.rotationAngle) - unrotatedY * Math.sin(pending.target.rotationAngle);
            targetY = unrotatedX * Math.sin(pending.target.rotationAngle) + unrotatedY * Math.cos(pending.target.rotationAngle);
        } else {
            targetX = Math.cos(pending.target.angle) * pending.target.orbitRadius;
            targetY = Math.sin(pending.target.angle) * pending.target.orbitRadius;
        }

        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(targetX, targetY);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)'; // A subtle green for pending invasions
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([5 / camera.zoom, 5 / camera.zoom]); // Different dash for pending
        ctx.stroke();
        ctx.setLineDash([]); // Reset for other drawings
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
    // You can add more planet details or control buttons here later
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

    // NEW UI element assignments
    planetControlPanel = document.getElementById('planet-control-panel');
    controlPanelPlanetName = document.getElementById('control-panel-planet-name');
    closeControlPanelButton = document.getElementById('close-control-panel');
    launchAllInvasionsButton = document.getElementById('launch-all-invasions');


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

    // NEW: Event listener for the Launch All Invasions button
    launchAllInvasionsButton.addEventListener('click', () => {
        if (pendingInvasions.length === 0) {
            showModal("No invasions are staged!", 'alert');
            return;
        }

        pendingInvasions.forEach(pending => {
            // Deduct units from source planet
            pending.source.units -= pending.units;
            updatePlanetListItem(pending.source); // Update source planet units in list

            // Create active fleet
            let sourcePlanetWorldX, sourcePlanetWorldY;
            if (pending.source.isElliptical) {
                const unrotatedX = pending.source.semiMajorAxis * Math.cos(pending.source.angle);
                const unrotatedY = pending.source.semiMinorAxis * Math.sin(pending.source.angle);
                sourcePlanetWorldX = unrotatedX * Math.cos(pending.source.rotationAngle) - unrotatedY * Math.sin(pending.source.rotationAngle);
                sourcePlanetWorldY = unrotatedX * Math.sin(pending.source.rotationAngle) + unrotatedY * Math.cos(pending.source.rotationAngle);
            } else {
                sourcePlanetWorldX = Math.cos(pending.source.angle) * pending.source.orbitRadius;
                sourcePlanetWorldY = Math.sin(pending.source.angle) * pending.source.orbitRadius;
            }

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
        showModal("All staged invasions launched!", 'alert');
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
                                    // No need to reset source/line here, as mousedown will handle it
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
                                selectedSourcePlanet = null;
                                isDrawingInvasionLine = false;
                                canvas.style.cursor = 'default';
                            });
                        }
                    }
                } else { // Clicked empty space while source was selected
                    showModal("Invasion cancelled.", 'alert');
                }
                // Always reset source and line drawing after phase 2 click, unless handled inside the modal callback
                if (!gameModalBackdrop.classList.contains('active')) { // Only reset if modal didn't pop up
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
        if (!gameActive || gameModalBackdrop.classList.contains('active')) return;

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
        // Update cursor based on whether dragging or line drawing is active
        if (!isDragging && !isDrawingInvasionLine && canvas.style.cursor !== 'default') {
            canvas.style.cursor = 'default';
        } else if (isDrawingInvasionLine && canvas.style.cursor !== 'crosshair') {
            canvas.style.cursor = 'crosshair';
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!gameActive || gameModalBackdrop.classList.contains('active')) return;
        isDragging = false;
        // isDrawingInvasionLine is reset by mousedown logic itself
    });

    canvas.addEventListener('mouseleave', () => {
        if (!gameActive || gameModalBackdrop.classList.contains('active')) return;
        isDragging = false;
        // Optionally, reset selectedSourcePlanet and isDrawingInvasionLine if mouse leaves canvas during selection
        // For now, mousedown handles the reset on re-click or target click/cancel.
    });

    // Re-enabled zoom for 'wheel' event by removing blocking conditions
    canvas.addEventListener('wheel', (e) => {
        if (!gameActive || gameModalBackdrop.classList.contains('active')) return;

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
