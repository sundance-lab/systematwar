// game.js
import { CONFIG } from './config.js';
import { 
    updatePlanetListItem, 
    updatePlayerUnitDisplay, 
    updatePlayerIncomeDisplay, 
    showModal 
} from './ui.js';

// --- Global Game State Variables ---
export let currentPlanets = [];
export let currentStarRadius;
export const camera = {
    x: 0,
    y: 0,
    zoom: CONFIG.CAMERA_INITIAL_ZOOM,
    scaleFactor: CONFIG.CAMERA_SCALE_FACTOR,
    dragSensitivity: CONFIG.CAMERA_DRAG_SENSITIVITY,
    targetPlanet: null,
    activeListItem: null,
    targetZoom: CONFIG.CAMERA_INITIAL_ZOOM
};
export let gameActive = false;
export let playerIncome = 0;
export let chosenStarterPlanet = null;
export let activeFleets = [];
export let pendingInvasions = [];
export let animationFrameId;

// --- Setters for State ---
export function setGameActive(state) { gameActive = state; }
export function setChosenStarterPlanet(planet) { chosenStarterPlanet = planet; }
export function setPlayerIncome(income) { playerIncome = income; }
export function setCameraTargetPlanet(planet) { camera.targetPlanet = planet; }
export function setCameraActiveListItem(item) { camera.activeListItem = item; }
export function setCameraZoom(zoom) { camera.zoom = zoom; }
export function setCameraTargetZoom(zoom) { camera.targetZoom = zoom; }

// --- Core Game Logic ---
export function initSolarSystem(canvas) {
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

    currentPlanets.length = 0;
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
        const orbitSpeed = (CONFIG.MIN_ORBIT_SPEED + Math.random() * (CONFIG.MAX_ORBIT_SPEED - CONFIG.MIN_ORBIT_SPEED)) * (Math.random() > 0.5 ? 1 : -1);
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
            buildings: []
        };

        newPlanet.buildings.push('Garrison');
        currentPlanets.push(newPlanet);
        previousOrbitRadius = actualOrbitRadius;
    }

    currentPlanets.sort((a, b) => a.orbitRadius - b.orbitRadius);
}

export function generatePlanetProduction() {
    currentPlanets.forEach(planet => {
        let currentUnitProduction = CONFIG.PLANET_BASE_UNIT_PRODUCTION_RATE;
        let currentIncomeProduction = CONFIG.PLANET_BASE_INCOME_PRODUCTION_RATE;

        planet.buildings.forEach(buildingName => {
            const building = CONFIG.BUILDINGS[buildingName];
            if (building) {
                currentUnitProduction += building.unitBonus;
                currentIncomeProduction += building.incomeBonus;
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

export function setInitialCameraZoom(canvas) {
    let maxWorldExtent = currentStarRadius;
    if (currentPlanets.length > 0) {
        const outermostPlanet = currentPlanets[currentPlanets.length - 1];
        const outermostDistance = outermostPlanet.isElliptical ? outermostPlanet.semiMajorAxis : outermostPlanet.orbitRadius;
        maxWorldExtent = Math.max(maxWorldExtent, outermostDistance + outermostPlanet.radius);
    }
    maxWorldExtent *= CONFIG.INITIAL_VIEW_PADDING_FACTOR;
    const requiredZoom = Math.min(canvas.width, canvas.height) / (maxWorldExtent * 2);
    camera.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(requiredZoom, CONFIG.CAMERA_MAX_ZOOM));
    camera.targetZoom = camera.zoom;
}

export function getPlanetAtCoordinates(worldX, worldY) {
    for (const planet of currentPlanets) {
        const planetPos = getPlanetCurrentWorldCoordinates(planet);
        const distance = Math.sqrt(Math.pow(worldX - planetPos.x, 2) + Math.pow(worldY - planetPos.y, 2));
        const renderedRadius = planet.radius * camera.zoom;
        const effectiveClickRadiusPixels = Math.max(renderedRadius, CONFIG.MIN_PLANET_CLICKABLE_PIXELS);
        const effectiveClickRadiusWorld = effectiveClickRadiusPixels / camera.zoom;

        if (distance < effectiveClickRadiusWorld) {
            return planet;
        }
    }
    return null;
}

export function getPlanetCurrentWorldCoordinates(planet) {
    const systemCenterX = 0, systemCenterY = 0;
    if (planet.isElliptical) {
        const unrotatedX = planet.semiMajorAxis * Math.cos(planet.angle);
        const unrotatedY = planet.semiMinorAxis * Math.sin(planet.angle);
        const x = systemCenterX + unrotatedX * Math.cos(planet.rotationAngle) - unrotatedY * Math.sin(planet.rotationAngle);
        const y = systemCenterY + unrotatedX * Math.sin(planet.rotationAngle) + unrotatedY * Math.cos(planet.rotationAngle);
        return { x, y };
    } else {
        const x = systemCenterX + Math.cos(planet.angle) * planet.orbitRadius;
        const y = systemCenterY + Math.sin(planet.angle) * planet.orbitRadius;
        return { x, y };
    }
}

export function getBuildingSlots(planetRadius) {
    return Math.max(1, Math.floor(planetRadius / 25)); 
}

export function calculateTravelDuration(sourcePlanet, targetPlanet) {
    const sourcePos = getPlanetCurrentWorldCoordinates(sourcePlanet);
    const targetPos = getPlanetCurrentWorldCoordinates(targetPlanet);
    const distance = Math.sqrt(Math.pow(targetPos.x - sourcePos.x, 2) + Math.pow(targetPos.y - sourcePos.y, 2));
    return distance / CONFIG.INVASION_TRAVEL_SPEED_WORLD_UNITS_PER_SECOND * 1000;
}

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
    const { units: attackerUnits, target: targetPlanet } = fleet;
    const { units: defenderUnitsRaw } = targetPlanet;

    let defenderBonus = 0;
    targetPlanet.buildings.forEach(buildingName => {
        if (CONFIG.BUILDINGS[buildingName]) {
            defenderBonus += CONFIG.BUILDINGS[buildingName].defenseBonus || 0;
        }
    });

    const effectiveAttackerUnits = attackerUnits * (1 + CONFIG.COMBAT_ATTACKER_BONUS_PERCENT);
    const effectiveDefenderUnits = defenderUnitsRaw * (1 + CONFIG.COMBAT_DEFENDER_BONUS_PERCENT + defenderBonus);

    let resultMessage, winner;
    let remainingAttackerUnits = 0, remainingDefenderUnits = 0;

    if (effectiveAttackerUnits > effectiveDefenderUnits) {
        winner = 'attacker';
        const attackerLosses = Math.round(effectiveDefenderUnits / (1 + CONFIG.COMBAT_ATTACKER_BONUS_PERCENT));
        remainingAttackerUnits = attackerUnits - attackerLosses;
        resultMessage = `Invasion successful! Your ${attackerUnits} units defeated ${targetPlanet.owner}'s ${defenderUnitsRaw} units on ${targetPlanet.name}.\n${remainingAttackerUnits} units remain and claim the planet for you.`;
        targetPlanet.owner = 'player';
        targetPlanet.units = remainingAttackerUnits;
    } else {
        winner = 'defender';
        const defenderLosses = Math.round(effectiveAttackerUnits / (1 + CONFIG.COMBAT_DEFENDER_BONUS_PERCENT + defenderBonus));
        remainingDefenderUnits = defenderUnitsRaw - defenderLosses;
        resultMessage = `Invasion failed! Your ${attackerUnits} units were defeated by ${targetPlanet.owner}'s ${defenderUnitsRaw} units on ${targetPlanet.name}.\n${remainingDefenderUnits} units remain on ${targetPlanet.name}.`;
        targetPlanet.units = remainingDefenderUnits;
    }
    
    updatePlanetListItem(targetPlanet);
    showModal(resultMessage, 'alert');
}

export function animateSolarSystem(canvas, ctx, tempFixedInvasionLine) {
    // --- UPDATE PHASE ---
    currentPlanets.forEach(planet => { planet.angle += planet.speed; });

    for (let i = activeFleets.length - 1; i >= 0; i--) {
        const fleet = activeFleets[i];
        const timeElapsed = performance.now() - fleet.departureTime;
        fleet.progress = Math.min(timeElapsed / fleet.travelDuration, 1);
        const sourcePos = getPlanetCurrentWorldCoordinates(fleet.source);
        const targetPos = getPlanetCurrentWorldCoordinates(fleet.target);
        fleet.currentX = sourcePos.x + (targetPos.x - sourcePos.x) * fleet.progress;
        fleet.currentY = sourcePos.y + (targetPos.y - sourcePos.y) * fleet.progress;
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
        const targetPos = getPlanetCurrentWorldCoordinates(camera.targetPlanet);
        camera.x = targetPos.x;
        camera.y = targetPos.y;
    }

    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const systemCenterX = 0, systemCenterY = 0;
    ctx.beginPath();
    ctx.arc(systemCenterX, systemCenterY, currentStarRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.shadowColor = 'orange';
    ctx.shadowBlur = 15 + (currentStarRadius / 20);
    ctx.fill();
    ctx.shadowBlur = 0;

    currentPlanets.forEach(planet => {
        // Draw orbit
        ctx.beginPath();
        if (planet.isElliptical) {
            ctx.ellipse(systemCenterX, systemCenterY, planet.semiMajorAxis, planet.semiMinorAxis, planet.rotationAngle, 0, Math.PI * 2);
        } else {
            ctx.arc(systemCenterX, systemCenterY, planet.orbitRadius, 0, Math.PI * 2);
        }
        ctx.lineWidth = CONFIG.ORBIT_LINE_WIDTH / camera.zoom;
        ctx.strokeStyle = `rgba(255, 255, 255, ${CONFIG.ORBIT_LINE_ALPHA})`;
        ctx.stroke();

        // Draw planet
        const planetPos = getPlanetCurrentWorldCoordinates(planet);
        ctx.beginPath();
        ctx.arc(planetPos.x, planetPos.y, planet.radius, 0, Math.PI * 2);
        ctx.fillStyle = planet.color;
        ctx.fill();

        // Draw owner indicator border
        ctx.beginPath();
        ctx.arc(planetPos.x, planetPos.y, planet.radius + 5 / camera.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = CONFIG.OWNER_COLORS[planet.owner];
        ctx.lineWidth = Math.min(3 / camera.zoom, 3);
        ctx.stroke();

        // Draw planet name and units
        ctx.save();
        ctx.translate(planetPos.x, planetPos.y);
        const nameFontSize = Math.max(10, 18 / camera.zoom);
        const nameOffset = planet.radius + Math.max(20, 25 / camera.zoom);
        ctx.font = `${nameFontSize}px 'Space Mono', monospace`;
        ctx.fillStyle = CONFIG.OWNER_COLORS[planet.owner];
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(planet.name, 0, -nameOffset);
        const unitsFontSize = Math.max(8, 12 / camera.zoom);
        const unitsOffset = nameOffset + Math.max(15, 20 / camera.zoom);
        ctx.font = `${unitsFontSize}px 'Space Mono', monospace`;
        ctx.fillText(`${planet.units}`, 0, unitsOffset - nameOffset); // Adjusted offset
        ctx.restore();
    });

    // Draw pending invasion lines
    pendingInvasions.forEach(pending => {
        const sourcePos = getPlanetCurrentWorldCoordinates(pending.source);
        const targetPos = getPlanetCurrentWorldCoordinates(pending.target);
        ctx.beginPath();
        ctx.moveTo(sourcePos.x, sourcePos.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([5 / camera.zoom, 5 / camera.zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // Draw active fleets
    activeFleets.forEach(fleet => {
        const fleetRadiusRendered = Math.min(CONFIG.FLEET_BASE_RADIUS / camera.zoom, CONFIG.FLEET_MAX_SCREEN_RADIUS_PX);
        ctx.beginPath();
        ctx.arc(fleet.currentX, fleet.currentY, fleetRadiusRendered, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.OWNER_COLORS[fleet.source.owner] || 'white';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.stroke();
    });

    ctx.restore();
    animationFrameId = requestAnimationFrame(() => animateSolarSystem(canvas, ctx, tempFixedInvasionLine));
}
