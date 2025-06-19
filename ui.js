// ui.js (NEW REWRITTEN AND SIMPLIFIED VERSION)
import CONFIG, { BUILDINGS, OWNER_COLORS } from './config.js';
import { camera, gameState, inputState } from './state.js';
import { getPlanetCurrentWorldCoordinates, getBuildingSlots } from './game.js';

// This object will hold all our essential UI elements.
export const uiElements = {};

/**
 * Finds all necessary UI elements on the page and stores them.
 * Also attaches event listeners that only need to be set once.
 */
export function initUI() {
    const ids = [
        'title-screen', 'game-screen', 'play-button', 'solar-system-canvas',
        'planet-list-panel', 'planet-list', 'player-units-panel', 'player-unit-count',
        'player-income-count', 'game-modal-backdrop', 'game-modal', 'modal-message',
        'modal-input-area', 'modal-input', 'modal-input-confirm', 'modal-confirm',
        'modal-input-cancel', 'planet-control-panel', 'control-panel-planet-name',
        'close-control-panel-x', 'launch-all-invasions', 'panel-units',
        'panel-unit-production-rate', 'panel-income-rate', 'panel-size',
        'panel-building-slots-count', 'panel-building-slots',
        'building-options-subpanel', 'building-options-buttons',
        'close-building-options-x'
    ];
    ids.forEach(id => {
        uiElements[id] = document.getElementById(id);
    });

    uiElements.ctx = uiElements['solar-system-canvas'].getContext('2d');

    // Attach listeners that never change
    if (uiElements['close-control-panel-x']) {
        uiElements['close-control-panel-x'].addEventListener('click', hidePlanetControlPanel);
    }
    if (uiElements['close-building-options-x']) {
        uiElements['close-building-options-x'].addEventListener('click', hideBuildingOptionsSubpanel);
    }
}

/**
 * Hides the main planet control panel.
 */
export function hidePlanetControlPanel() {
    if (uiElements['planet-control-panel']) {
        uiElements['planet-control-panel'].classList.remove('active');
    }
    hideBuildingOptionsSubpanel();
}

/**
 * Shows and populates the Planet Control Panel with a planet's data.
 * The panel is positioned next to the user's cursor.
 * @param {object} planet - The planet object to display.
 * @param {MouseEvent} event - The mouse event, used for positioning.
 */
export function showPlanetControlPanel(planet, event) {
    if (!planet) return;

    const panel = uiElements['planet-control-panel'];
    if (!panel) return;

    hideBuildingOptionsSubpanel(); // Hide sub-panel when opening a new main panel

    // --- Populate Panel Data ---
    uiElements['control-panel-planet-name'].textContent = `${planet.name} (${planet.owner})`;
    uiElements['panel-units'].textContent = planet.units;
    uiElements['panel-size'].textContent = planet.radius;

    let currentUnitProduction = CONFIG.PLANET_BASE_UNIT_PRODUCTION_RATE;
    let currentIncomeProduction = CONFIG.PLANET_BASE_INCOME_PRODUCTION_RATE;
    planet.buildings.forEach(buildingName => {
        const building = BUILDINGS[buildingName];
        if (building) {
            currentUnitProduction += building.unitBonus;
            currentIncomeProduction += building.incomeBonus;
        }
    });
    uiElements['panel-unit-production-rate'].textContent = currentUnitProduction;
    uiElements['panel-income-rate'].textContent = currentIncomeProduction;

    // --- Populate Building Slots ---
    const slotsContainer = uiElements['panel-building-slots'];
    const numSlots = getBuildingSlots(planet.radius);
    uiElements['panel-building-slots-count'].textContent = numSlots;
    slotsContainer.innerHTML = ''; // Clear old slots

    for (let i = 0; i < numSlots; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('building-slot');
        const buildingInSlot = planet.buildings[i];

        if (buildingInSlot) {
            slotDiv.textContent = buildingInSlot;
            slotDiv.classList.add('occupied');
        } else {
            slotDiv.textContent = `Empty Slot ${i + 1}`;
            if (planet.owner === 'player') {
                slotDiv.style.cursor = 'pointer';
                slotDiv.addEventListener('click', () => {
                    showBuildingOptionsSubpanel(planet, i);
                });
            }
        }
        slotsContainer.appendChild(slotDiv);
    }

    // --- Position and Show Panel ---
    // This is the critical fix: position the panel before displaying it.
    const panelRect = panel.getBoundingClientRect();
    let x = event.clientX + 15;
    let y = event.clientY + 15;

    // Prevent panel from going off-screen
    if (x + panelRect.width > window.innerWidth) {
        x = window.innerWidth - panelRect.width - 5;
    }
    if (y + panelRect.height > window.innerHeight) {
        y = window.innerHeight - panelRect.height - 5;
    }

    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.transform = 'none'; // Override any CSS transforms

    panel.classList.add('active');
}


// --- All other functions from the original ui.js remain below ---
// (No changes were needed for the functions below, but they are included for completeness)

export function hideBuildingOptionsSubpanel() {
    if(uiElements['building-options-subpanel']) {
        uiElements['building-options-subpanel'].classList.remove('active');
    }
}

export function showBuildingOptionsSubpanel(planet, slotIndex) {
    const subpanel = uiElements['building-options-subpanel'];
    const nameEl = subpanel.querySelector('h3');
    const buttons = uiElements['building-options-buttons'];
    
    if(!subpanel || !nameEl || !buttons) return;

    nameEl.textContent = `Build on ${planet.name}`;
    buttons.innerHTML = '';
    
    for (const buildingKey in BUILDINGS) {
        const buildingData = BUILDINGS[buildingKey];
        const button = document.createElement('button');
        button.textContent = `${buildingData.name} (${buildingData.cost} income)`;
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from bubbling up
            executeBuildingConstruction(buildingKey, planet, slotIndex);
            hideBuildingOptionsSubpanel();
        });
        buttons.appendChild(button);
    }

    subpanel.classList.add('active');
}

export function executeBuildingConstruction(buildingType, planet, slotIndex) {
    const buildingData = BUILDINGS[buildingType];
    const cost = buildingData.cost;
    if (gameState.playerIncome >= cost) {
        gameState.playerIncome -= cost;
        planet.buildings[slotIndex] = buildingType;
        // The panel needs to be "refreshed" but we can't easily get the event
        // Easiest is to hide and tell user to reopen
        hidePlanetControlPanel();
        showModal(`Built ${buildingData.name}. Right-click the planet again to see updates.`, 'alert');
    } else {
        showModal("Not enough income to build that!", 'alert');
    }
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

    ctx.beginPath();
    ctx.arc(0, 0, gameState.currentStarRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.shadowColor = 'orange';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

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

        ctx.save();
        ctx.translate(pos.x, pos.y);
        const nameFontSize = Math.max(10, 18 / camera.zoom);
        const nameOffset = planet.radius + Math.max(20, 25 / camera.zoom);
        ctx.font = `${nameFontSize}px 'Space Mono', monospace`;
        ctx.fillStyle = OWNER_COLORS[planet.owner];
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(planet.name, 0, -nameOffset);
        const unitsFontSize = Math.max(8, 12 / camera.zoom);
        const unitsOffset = nameOffset + Math.max(15, 20 / camera.zoom);
        ctx.font = `${unitsFontSize}px 'Space Mono', monospace`;
        ctx.fillText(`${planet.units}`, 0, -unitsOffset);
        ctx.restore();
    });

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
        const ownerIndicator = document.createElement('span');
        ownerIndicator.className = `owner-indicator owner-${planet.owner}`;
        listItem.appendChild(ownerIndicator);
        const nameSpan = document.createElement('span');
        nameSpan.className = 'planet-name-text';
        nameSpan.textContent = ` ${planet.name} (${planet.units})`;
        listItem.appendChild(nameSpan);

        listItem.addEventListener('click', () => {
            if (camera.activeListItem) {
                camera.activeListItem.classList.remove('active');
            }
            if (camera.targetPlanet === planet) {
                camera.targetPlanet = null;
                camera.activeListItem = null;
            } else {
                camera.targetPlanet = planet;
                camera.activeListItem = listItem;
                listItem.classList.add('active');
            }
        });
        planet.listItemRef = listItem;
        uiElements['planet-list'].appendChild(listItem);
    });
}

export function updateUIAfterGameStateChange() {
    gameState.currentPlanets.forEach(planet => {
        if(planet.listItemRef) {
            const nameTextElement = planet.listItemRef.querySelector('.planet-name-text');
            if (nameTextElement) {
                nameTextElement.textContent = ` ${planet.name} (${planet.units})`;
            }
            const ownerIndicator = planet.listItemRef.querySelector('.owner-indicator');
            if (ownerIndicator) {
                ownerIndicator.className = `owner-indicator owner-${planet.owner}`;
            }
        }
    });
    if(uiElements['player-unit-count'] && gameState.chosenStarterPlanet) {
        uiElements['player-unit-count'].textContent = gameState.chosenStarterPlanet.units;
    }
    if(uiElements['player-income-count']) {
        uiElements['player-income-count'].textContent = gameState.playerIncome;
    }
}

let modalCallback = null;
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

export function processMessageQueue() {
    if (gameState.messageQueue.length > 0) {
        const event = gameState.messageQueue.shift();
        if (event.type === 'alert') {
            showModal(event.message, 'alert');
        }
    }
}
