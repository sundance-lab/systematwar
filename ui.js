// ui.js
import { CONFIG } from './config.js';
import { 
    camera, 
    currentPlanets, 
    chosenStarterPlanet,
    playerIncome,
    getPlanetCurrentWorldCoordinates, 
    setCameraTargetPlanet, 
    setCameraActiveListItem,
    getBuildingSlots,
    setPlayerIncome
} from './game.js';

// --- UI Element References ---
export let titleScreen, gameScreen, playButton, canvas, ctx, starterPlanetPanel, 
           planetListPanel, planetList, playerUnitsPanel, playerUnitCountDisplay, 
           playerIncomeCountDisplay, gameModalBackdrop, gameModal, modalMessage, 
           modalInputArea, modalInput, modalInputConfirm, modalConfirm, 
           modalInputCancelButton, planetControlPanel, controlPanelName, 
           closeControlPanelXButton, launchAllInvasionsButton, panelUnitsDisplay, 
           panelUnitProductionRateDisplay, panelIncomeRateDisplay, panelSizeDisplay, 
           panelBuildingSlotsCount, panelBuildingSlotsContainer, buildingOptionsSubpanel, 
           closeBuildingOptionsXButton, buildingOptionsPlanetName, 
           buildingOptionsButtonsContainer;

// --- Modal and Panel State ---
export let modalCallback = null;
export function setModalCallback(cb) { modalCallback = cb; }

// --- UI Initialization ---
export function initUI() {
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
    buildingOptionsSubpanel = document.getElementById('building-options-subpanel');
    closeBuildingOptionsXButton = buildingOptionsSubpanel.querySelector('.close-button-x');
    buildingOptionsPlanetName = buildingOptionsSubpanel.querySelector('h3');
    buildingOptionsButtonsContainer = document.getElementById('building-options-buttons');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cursor = 'default';
}


// --- UI Functions ---
export function populatePlanetList() {
    planetList.innerHTML = '';
    currentPlanets.forEach((planet, index) => {
        const listItem = document.createElement('li');
        const ownerIndicator = document.createElement('span');
        ownerIndicator.classList.add('owner-indicator', `owner-${planet.owner}`);
        const planetNameText = document.createTextNode(`${planet.name} (${planet.units})`);
        listItem.appendChild(ownerIndicator);
        listItem.appendChild(planetNameText);
        listItem.dataset.planetIndex = index;
        planet.listItemRef = listItem;

        listItem.addEventListener('click', () => {
            if (camera.activeListItem) camera.activeListItem.classList.remove('active');
            if (planet === camera.targetPlanet) {
                setCameraTargetPlanet(null);
                setCameraActiveListItem(null);
            } else {
                listItem.classList.add('active');
                setCameraActiveListItem(listItem);
                setCameraTargetPlanet(planet);
                const targetPos = getPlanetCurrentWorldCoordinates(planet);
                camera.x = targetPos.x;
                camera.y = targetPos.y;
            }
        });
        planetList.appendChild(listItem);
    });
}

export function updatePlanetListItem(planet) {
    if (!planet.listItemRef) return;
    const ownerIndicator = planet.listItemRef.querySelector('.owner-indicator');
    const planetNameTextNode = planet.listItemRef.lastChild;
    ownerIndicator.className = 'owner-indicator';
    ownerIndicator.classList.add(`owner-${planet.owner}`);
    planetNameTextNode.textContent = `${planet.name} (${planet.units})`;
}

export function updatePlayerUnitDisplay() {
    if (playerUnitCountDisplay) {
        playerUnitCountDisplay.textContent = chosenStarterPlanet ? chosenStarterPlanet.units : 0;
    }
}

export function updatePlayerIncomeDisplay() {
    if (playerIncomeCountDisplay) {
        playerIncomeCountDisplay.textContent = playerIncome;
    }
}

export function showModal(message, type, callback = null) {
    modalMessage.textContent = message;
    modalCallback = callback;

    modalInputArea.style.display = type === 'prompt' ? 'flex' : 'none';
    modalConfirm.style.display = type === 'prompt' ? 'none' : 'block';
    
    if (type === 'prompt') {
        modalInput.value = '';
        modalInput.focus();
    }
    
    gameModalBackdrop.classList.add('active');
}

export function hideModal() {
    gameModalBackdrop.classList.remove('active');
}

export function showBuildingOptionsSubpanel() {
    buildingOptionsSubpanel.classList.add('active');
    const panelRect = planetControlPanel.getBoundingClientRect();
    buildingOptionsSubpanel.style.left = `${panelRect.width}px`;
    buildingOptionsSubpanel.style.top = `0px`;
}

export function hideBuildingOptionsSubpanel() {
    buildingOptionsSubpanel.classList.remove('active');
}

export function executeBuildingConstruction(buildingType, planet, slotIndex) {
    const buildingData = CONFIG.BUILDINGS[buildingType];
    const cost = buildingData.cost;

    if (playerIncome >= cost) {
        setPlayerIncome(playerIncome - cost);
        planet.buildings[slotIndex] = buildingType;
        updatePlayerIncomeDisplay();
        showPlanetControlPanel(planet);
    } else {
        showModal("Not enough income to build that!", 'alert');
    }
}

export function showPlanetControlPanel(planet) {
    if (!planet) return;
    controlPanelName.textContent = `${planet.name} (${planet.owner})`;
    panelUnitsDisplay.textContent = planet.units;

    let currentUnitProductionRate = CONFIG.PLANET_BASE_UNIT_PRODUCTION_RATE;
    let currentIncomeProductionRate = CONFIG.PLANET_BASE_INCOME_PRODUCTION_RATE;
    planet.buildings.forEach(buildingName => {
        const building = CONFIG.BUILDINGS[buildingName];
        if(building){
            currentUnitProductionRate += building.unitBonus;
            currentIncomeProductionRate += building.incomeBonus;
        }
    });

    panelUnitProductionRateDisplay.textContent = currentUnitProductionRate;
    panelIncomeRateDisplay.textContent = currentIncomeProductionRate;
    panelSizeDisplay.textContent = planet.radius;

    const numSlots = getBuildingSlots(planet.radius);
    panelBuildingSlotsCount.textContent = numSlots;
    panelBuildingSlotsContainer.innerHTML = '';

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
                slotDiv.addEventListener('click', () => {
                    hideBuildingOptionsSubpanel();
                    buildingOptionsPlanetName.textContent = `Build on ${planet.name} (Slot ${i + 1})`;
                    buildingOptionsButtonsContainer.innerHTML = '';
                    for (const buildingKey in CONFIG.BUILDINGS) {
                        const buildingData = CONFIG.BUILDINGS[buildingKey];
                        const button = document.createElement('button');
                        button.textContent = `${buildingData.name} (${buildingData.cost} income)`;
                        button.addEventListener('click', () => {
                            executeBuildingConstruction(buildingKey, planet, i);
                            hideBuildingOptionsSubpanel();
                        });
                        buildingOptionsButtonsContainer.appendChild(button);
                    }
                    showBuildingOptionsSubpanel();
                });
            }
        }
        panelBuildingSlotsContainer.appendChild(slotDiv);
    }
    planetControlPanel.style.left = '50%';
    planetControlPanel.style.top = '50%';
    planetControlPanel.style.transform = 'translate(-50%, -50%)';
    planetControlPanel.classList.add('active');
    hideBuildingOptionsSubpanel();
}

export function hidePlanetControlPanel() {
    planetControlPanel.classList.remove('active');
    hideBuildingOptionsSubpanel();
}
