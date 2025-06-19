// game.js
import CONFIG, { BUILDINGS } from './config.js';
import { gameState, camera } from './state.js';

// --- Core Game Logic ---
export function initGameWorld(canvas) {
    // World Generation
    const minStarRadius = CONFIG.ORIGINAL_STAR_RADIUS * CONFIG.MIN_STAR_MULTIPLIER;
    const maxStarRadius = CONFIG.ORIGINAL_STAR_RADIUS * CONFIG.MAX_STAR_MULTIPLIER;
    gameState.currentStarRadius = minStarRadius + Math.random() * (maxStarRadius - minStarRadius);

    const numPlanets = Math.floor(Math.random() * (CONFIG.MAX_PLANETS - CONFIG.MIN_PLANETS + 1)) + CONFIG.MIN_PLANETS;
    const shuffledPlanetNames = [...CONFIG.PLANET_NAMES].sort(() => 0.5 - Math.random());
    
    gameState.currentPlanets = [];
    let previousOrbitRadius = gameState.currentStarRadius + CONFIG.MIN_ORBIT_START_FROM_STAR;

    for (let i = 0; i < numPlanets; i++) {
        // This complex logic remains the same...
        const planetRadius = (Math.floor(Math.random() * (CONFIG.PLANET_RADIUS_MAX_BASE - CONFIG.PLANET_RADIUS_MIN_BASE + 1)) + CONFIG.PLANET_RADIUS_MIN_BASE) * CONFIG.PLANET_RADIUS_SCALE_FACTOR;
        const actualOrbitRadius = previousOrbitRadius + CONFIG.MIN_SPACING_BETWEEN_ORBITS + Math.random() * (CONFIG.MAX_SPACING_BETWEEN_ORBITS - CONFIG.MIN_SPACING_BETWEEN_ORBITS);
        previousOrbitRadius = actualOrbitRadius;
        
        const ownerType = Math.random() < 0.5 ? 'ai' : 'neutral';
        const newPlanet = {
            name: shuffledPlanetNames[i % shuffledPlanetNames.length],
            radius: planetRadius,
            orbitRadius: actualOrbitRadius,
            angle: Math.random() * Math.PI * 2,
            speed: (CONFIG.MIN_ORBIT_SPEED + Math.random() * (CONFIG.MAX_ORBIT_SPEED - CONFIG.MIN_ORBIT_SPEED)) * (Math.random() > 0.5 ? 1 : -1),
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            isElliptical: false, // Simplified for brevity, your full logic is fine here
            owner: ownerType,
            units: ownerType === 'ai' ? CONFIG.AI_PLANET_INITIAL_UNITS : CONFIG.NEUTRAL_PLANET_INITIAL_UNITS,
            buildings: ['Garrison'] // Start with a Garrison
        };
        gameState.currentPlanets.push(newPlanet);
    }
    gameState.currentPlanets.sort((a, b) => a.orbitRadius - b.orbitRadius);

    // Set Initial Player State
    const randomIndex = Math.floor(Math.random() * gameState.currentPlanets.length);
    gameState.chosenStarterPlanet = gameState.currentPlanets[randomIndex];
    gameState.chosenStarterPlanet.owner = 'player';
    gameState.chosenStarterPlanet.units = CONFIG.INITIAL_PLAYER_UNITS;
    gameState.playerIncome = 500;

    // Set Initial Camera
    setInitialCameraZoom(canvas);
}

export function updateGameWorld() {
    // Update planet positions
    gameState.currentPlanets.forEach(planet => {
        planet.angle += planet.speed;
    });

    // Update active fleets
    for (let i = gameState.activeFleets.length - 1; i >= 0; i--) {
        const fleet = gameState.activeFleets[i];
        const timeElapsed = performance.now() - fleet.departureTime;
        fleet.progress = Math.min(timeElapsed / fleet.travelDuration, 1);
        if (fleet.progress >= 1) {
            handleFleetArrival(fleet);
            gameState.activeFleets.splice(i, 1);
        }
    }
}

export function generatePlanetProduction() {
    gameState.currentPlanets.forEach(planet => {
        let currentUnitProduction = CONFIG.PLANET_BASE_UNIT_PRODUCTION_RATE;
        let currentIncomeProduction = CONFIG.PLANET_BASE_INCOME_PRODUCTION_RATE;

        planet.buildings.forEach(buildingName => {
            const building = BUILDINGS[buildingName];
            if (building) {
                currentUnitProduction += building.unitBonus;
                currentIncomeProduction += building.incomeBonus;
            }
        });

        if (planet.owner === 'player') {
            planet.units += currentUnitProduction;
            gameState.playerIncome += currentIncomeProduction;
        } else if (planet.owner === 'ai') {
            planet.units += currentUnitProduction;
        }
    });
}

function handleFleetArrival(fleet) {
    if (fleet.mission === 'invasion') {
        resolveCombat(fleet);
    } else if (fleet.mission === 'reinforcement') {
        fleet.target.units += fleet.units;
        gameState.messageQueue.push({ 
            type: 'alert', 
            message: `Reinforcements of ${fleet.units} units arrived at ${fleet.target.name}!`
        });
    }
}

function resolveCombat(fleet) {
    const { units: attackerUnits, target: targetPlanet } = fleet;
    const { units: defenderUnitsRaw } = targetPlanet;

    let defenderBonus = 0;
    targetPlanet.buildings.forEach(buildingName => {
        if (BUILDINGS[buildingName]) {
            defenderBonus += BUILDINGS[buildingName].defenseBonus || 0;
        }
    });

    const effectiveAttackerUnits = attackerUnits * (1 + CONFIG.COMBAT_ATTACKER_BONUS_PERCENT);
    const effectiveDefenderUnits = defenderUnitsRaw * (1 + CONFIG.COMBAT_DEFENDER_BONUS_PERCENT + defenderBonus);
    
    let resultMessage;

    if (effectiveAttackerUnits > effectiveDefenderUnits) {
        const attackerLosses = Math.round(effectiveDefenderUnits / (1 + CONFIG.COMBAT_ATTACKER_BONUS_PERCENT));
        const remainingAttackerUnits = attackerUnits - attackerLosses;
        resultMessage = `Invasion successful! Your ${attackerUnits} units defeated ${targetPlanet.owner}'s ${defenderUnitsRaw} units. ${remainingAttackerUnits} units claim the planet.`;
        targetPlanet.owner = 'player';
        targetPlanet.units = remainingAttackerUnits;
    } else {
        const defenderLosses = Math.round(effectiveAttackerUnits / (1 + CONFIG.COMBAT_DEFENDER_BONUS_PERCENT + defenderBonus));
        const remainingDefenderUnits = defenderUnitsRaw - defenderLosses;
        resultMessage = `Invasion failed! Your ${attackerUnits} units were defeated. ${remainingDefenderUnits} defending units remain.`;
        targetPlanet.units = remainingDefenderUnits;
    }
    
    gameState.messageQueue.push({ type: 'alert', message: resultMessage });
}

export function getPlanetAtCoordinates(worldX, worldY) {
    for (const planet of gameState.currentPlanets) {
        const planetPos = getPlanetCurrentWorldCoordinates(planet);
        const distance = Math.sqrt(Math.pow(worldX - planetPos.x, 2) + Math.pow(worldY - planetPos.y, 2));
        const renderedRadius = planet.radius * camera.zoom;
        const effectiveClickRadiusPixels = Math.max(renderedRadius, CONFIG.MIN_PLANET_CLICKABLE_PIXELS);
        const effectiveClickRadiusWorld = effectiveClickRadiusPixels / camera.zoom;

        if (distance < effectiveClickRadiusWorld) return planet;
    }
    return null;
}

export function getPlanetCurrentWorldCoordinates(planet) {
    const x = Math.cos(planet.angle) * planet.orbitRadius;
    const y = Math.sin(planet.angle) * planet.orbitRadius;
    return { x, y };
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

function setInitialCameraZoom(canvas) {
    let maxOrbit = 0;
    if (gameState.currentPlanets.length > 0) {
        maxOrbit = gameState.currentPlanets.reduce((max, p) => Math.max(max, p.orbitRadius), 0);
    }
    const maxWorldExtent = (maxOrbit + gameState.currentStarRadius) * CONFIG.INITIAL_VIEW_PADDING_FACTOR;
    const requiredZoom = Math.min(canvas.width, canvas.height) / (maxWorldExtent * 2);
    camera.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(requiredZoom, CONFIG.CAMERA_MAX_ZOOM));
    camera.targetZoom = camera.zoom;
}
