// ui.js (Corrected)
import CONFIG, { BUILDINGS, OWNER_COLORS } from './config.js';
import { camera, gameState, inputState } from './state.js';
import { getPlanetCurrentWorldCoordinates, getBuildingSlots } from './game.js';

let uiElements = {};
let modalCallback = null;

export function initUI() {
    const ids = [
        'title-screen', 'game-screen', 'play-button', 'solar-system-canvas', 
        'planet-list-panel', 'planet-list', 'player-units-panel', 'player-unit-count', 
        'player-income-count', 'game-modal-backdrop', 'game-modal', 'modal-message', 
        'modal-input-area', 'modal-input', 'modal-input-confirm', 'modal-confirm', 
        'modal-input-cancel', 'planet-control-panel', 'control-panel-planet-name', 
        'close-control-panel-x', 'launch-all-invasions', 'panel-units', 
        'panel-unit-production-rate', 'panel-income-rate', 'panel-size', 
        'panel-building-slots-count', 'panel-building-slots', 'building-options-subpanel', 
        'building-options-buttons'
    ];
    ids.forEach(id => uiElements[id] = document.getElementById(id));
    uiElements.ctx = uiElements['solar-system-canvas'].getContext('2d');
    uiElements.closeBuildingOptionsXButton = uiElements['building-options-subpanel'].querySelector('.close-button-x');
    uiElements.buildingOptionsPlanetName = uiElements['building-options-subpanel'].querySelector('h3');
    
    return uiElements;
}

export function drawGameWorld(currentMouseWorldX, currentMouseWorldY) {
    const { ctx, 'solar-system-canvas': canvas } = uiElements;
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

    // --- Draw Star ---
    ctx.beginPath();
    ctx.arc(0, 0, gameState.currentStarRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.shadowColor = 'orange';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- Draw Planets and Orbits ---
    gameState.currentPlanets.forEach(planet => {
        const pos = getPlanetCurrentWorldCoordinates(planet);
        ctx.beginPath();
        ctx.arc(0, 0, planet.orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${CONFIG.ORBIT_LINE_ALPHA})`;
        ctx.lineWidth = CONFIG.ORBIT_LINE_WIDTH / camera.zoom;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, planet.radius, 0, Math.PI * 2);
        ctx.fillStyle = planet.color;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, planet.radius + 2 / camera.zoom, 0, Math.PI*2);
        ctx.strokeStyle = OWNER_COLORS[planet.owner];
        ctx.lineWidth = 4 / camera.zoom;
        ctx.stroke();
    });

    // --- Draw Fleets ---
    gameState.activeFleets.forEach(fleet => {
        const sourcePos = getPlanetCurrentWorldCoordinates(fleet.source);
        const targetPos = getPlanetCurrentWorldCoordinates(fleet.target);
        const x = sourcePos.x + (targetPos.x - sourcePos.x) * fleet.progress;
        const y = sourcePos.y + (targetPos.y - sourcePos.y) * fleet.progress;
        ctx.beginPath();
        ctx.arc(x, y, CONFIG.FLEET_BASE_RADIUS / camera.zoom, 0, Math.PI*2);
        ctx.fillStyle = OWNER_COLORS[fleet.source.owner];
        ctx.fill();
    });
    
    // --- FIX: Draw pending invasion line to cursor ---
    if (inputState.isDrawingInvasionLine && inputState.selectedSourcePlanet) {
        const sourcePos = getPlanetCurrentWorldCoordinates(inputState.selectedSourcePlanet);
        ctx.beginPath();
        ctx.moveTo(sourcePos.x, sourcePos.y);
        ctx.lineTo(currentMouseWorldX, currentMouseWorldY);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([10 / camera.zoom, 5 / camera.zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.restore();
}

export function populatePlanetList() {
    uiElements['planet-list'].innerHTML = '';
    gameState.currentPlanets.forEach(planet => {
        const listItem = document.createElement('li');
        listItem.textContent = `${planet.name} (${planet.units})`;
        listItem.style.color = OWNER_COLORS[planet.owner];
        
        // --- FIX: Logic to handle active class and camera targeting ---
        listItem.addEventListener('click', () => {
            if (camera.activeListItem) {
                camera.activeListItem.classList.remove('active');
            }
            if (camera.targetPlanet === planet) {
                camera.targetPlanet = null; // Deselect
                camera.activeListItem = null;
            } else {
                camera.targetPlanet = planet; // Select
                camera.activeListItem = listItem;
                listItem.classList.add('active');
            }
        });
        planet.listItemRef = listItem;
        uiElements['planet-list'].appendChild(listItem);
    });
}

export function updateUIAfterGameStateChange() {
    // Update planet list for unit/owner changes
    gameState.currentPlanets.forEach(planet => {
        if(planet.listItemRef) {
            planet.listItemRef.textContent = `${planet.name} (${planet.units})`;
            planet.listItemRef.style.color = OWNER_COLORS[planet.owner];
        }
    });
    // Update player unit/income displays
    if(uiElements['player-unit-count'] && gameState.chosenStarterPlanet) {
        uiElements['player-unit-count'].textContent = gameState.chosenStarterPlanet.units;
    }
    if(uiElements['player-income-count']) {
        uiElements['player-income-count'].textContent = gameState.playerIncome;
    }
}

export function showModal(message, type, callback) {
    gameState.gameActive = false;
    modalCallback = callback;
    uiElements['modal-message'].textContent = message;
    uiElements['modal-input-area'].style.display = type === 'prompt' ? 'flex' : 'none';
    uiElements['modal-confirm'].style.display = type === 'prompt' ? 'none' : 'block';
    uiElements['game-modal-backdrop'].classList.add('active');
    if (type === 'prompt') uiElements['modal-input'].focus();
}

export function hideModal() {
    uiElements['game-modal-backdrop'].classList.remove('active');
    gameState.gameActive = true;
    modalCallback = null;
}

export function getModalCallback() {
    return modalCallback;
}

export function showPlanetControlPanel(planet) {
    if (!planet) return;
    const { 
        'control-panel-planet-name': name, 'panel-units': units, 
        'panel-building-slots-container': slotsContainer,
        'planet-control-panel': panel
    } = uiElements;

    name.textContent = planet.name;
    units.textContent = planet.units;
    
    slotsContainer.innerHTML = '';
    const numSlots = getBuildingSlots(planet.radius);
    for(let i = 0; i < numSlots; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('building-slot');
        slotDiv.textContent = planet.buildings[i] || 'Empty Slot';
        slotsContainer.appendChild(slotDiv);
    }
    
    panel.classList.add('active');
}

export function hidePlanetControlPanel() {
    uiElements['planet-control-panel'].classList.remove('active');
}

export function processMessageQueue() {
    if (gameState.messageQueue.length > 0) {
        const event = gameState.messageQueue.shift();
        if (event.type === 'alert') {
            showModal(event.message, 'alert');
        }
    }
}
