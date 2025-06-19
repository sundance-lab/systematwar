// input.js
import { CONFIG } from './config.js';
import { 
    camera, 
    gameActive, 
    pendingInvasions,
    activeFleets,
    getPlanetAtCoordinates, 
    getPlanetCurrentWorldCoordinates,
    calculateTravelDuration, 
    setGameActive,
    setChosenStarterPlanet,
    setPlayerIncome,
    initSolarSystem,
    setInitialCameraZoom,
    animateSolarSystem,
    generatePlanetProduction
} from './game.js';
import { 
    initUI,
    canvas, 
    ctx,
    titleScreen, 
    gameScreen, 
    playButton, 
    planetListPanel, 
    playerUnitsPanel,
    launchAllInvasionsButton,
    planetControlPanel,
    buildingOptionsSubpanel,
    modalConfirm,
    modalInputConfirm,
    modalInputCancelButton,
    modalInput,
    modalCallback,
    populatePlanetList,
    updatePlayerUnitDisplay,
    updatePlayerIncomeDisplay,
    showModal,
    hideModal,
    showPlanetControlPanel,
    hidePlanetControlPanel,
    setModalCallback
} from './ui.js';

// --- Input State ---
let isDragging = false;
let lastMouseX, lastMouseY;
let selectedSourcePlanet = null;
let isDrawingInvasionLine = false;
let currentMouseWorldX, currentMouseWorldY;
let tempFixedInvasionLine = null;
let isDraggingPanel = false;
let dragPanelOffsetX, dragPanelOffsetY;
let planetProductionInterval = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initEventListeners();
});

function initEventListeners() {
    playButton.addEventListener('click', startGame);

    // Modal Buttons
    modalConfirm.addEventListener('click', () => {
        setGameActive(true);
        hideModal();
        if (modalCallback) modalCallback();
        setModalCallback(null);
    });

    modalInputConfirm.addEventListener('click', () => {
        setGameActive(true);
        hideModal();
        if (modalCallback) modalCallback(modalInput.value);
        setModalCallback(null);
    });
    
    modalInputCancelButton.addEventListener('click', () => {
        setGameActive(true);
        hideModal();
        tempFixedInvasionLine = null;
        selectedSourcePlanet = null;
        isDrawingInvasionLine = false;
        canvas.style.cursor = 'default';
        setModalCallback(null);
    });

    // Canvas Listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('contextmenu', handleRightClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('wheel', handleWheel);

    // Panel Listeners
    planetControlPanel.addEventListener('mousedown', handlePanelDragStart);
    document.addEventListener('mousemove', handlePanelDrag);
    document.addEventListener('mouseup', handlePanelDragEnd);
}

function startGame() {
    titleScreen.classList.remove('active');
    gameScreen.classList.add('active');

    initSolarSystem(canvas);
    setInitialCameraZoom(canvas);

    camera.x = 0;
    camera.y = 0;
    activeFleets.length = 0;
    pendingInvasions.length = 0;
    launchAllInvasionsButton.style.display = 'none';
    
    setPlayerIncome(500);
    updatePlayerIncomeDisplay();
    populatePlanetList();

    const randomIndex = Math.floor(Math.random() * CONFIG.MAX_PLANETS);
    const starter = currentPlanets[randomIndex];
    starter.owner = 'player';
    starter.units = CONFIG.INITIAL_PLAYER_UNITS;
    setChosenStarterPlanet(starter);
    updatePlanetListItem(starter);
    updatePlayerUnitDisplay();
    
    planetListPanel.classList.add('active');
    playerUnitsPanel.classList.add('active');
    
    setGameActive(true);
    animateSolarSystem(canvas, ctx, tempFixedInvasionLine);
    if(planetProductionInterval) clearInterval(planetProductionInterval);
    planetProductionInterval = setInterval(generatePlanetProduction, CONFIG.PLANET_PRODUCTION_INTERVAL_MS);
}

// --- Event Handlers ---
function handleMouseDown(e) {
    if (!gameActive || e.button !== 0 || e.target !== canvas) return;
    
    const worldX = camera.x + (e.clientX - canvas.width / 2) / camera.zoom;
    const worldY = camera.y + (e.clientY - canvas.height / 2) / camera.zoom;
    const clickedPlanet = getPlanetAtCoordinates(worldX, worldY);

    if (selectedSourcePlanet) { // Phase 2: Target selection
        if (clickedPlanet && clickedPlanet !== selectedSourcePlanet) {
            handleTargetPlanetSelection(clickedPlanet);
        }
        selectedSourcePlanet = null;
        isDrawingInvasionLine = false;
        canvas.style.cursor = 'default';
    } else { // Phase 1: Source selection or drag
        if (clickedPlanet && clickedPlanet.owner === 'player') {
            selectedSourcePlanet = clickedPlanet;
            isDrawingInvasionLine = true;
            canvas.style.cursor = 'crosshair';
        } else if (!clickedPlanet) {
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    }
}

function handleTargetPlanetSelection(targetPlanet) {
    const sourcePlanet = selectedSourcePlanet;
    if (sourcePlanet.units === 0) {
        return showModal("The source planet has no units to send!", 'alert');
    }

    const missionType = targetPlanet.owner === 'player' ? 'reinforcement' : 'invasion';
    const message = `Send units from ${sourcePlanet.name} to ${missionType} ${targetPlanet.name}?\nEnter number of units (max: ${sourcePlanet.units}):`;
    
    showModal(message, 'prompt', (value) => {
        let unitsToSend = parseInt(value);
        if (isNaN(unitsToSend) || unitsToSend <= 0) {
            return showModal("Invalid number of units.", 'alert');
        }
        unitsToSend = Math.min(unitsToSend, sourcePlanet.units);
        
        pendingInvasions.push({
            source: sourcePlanet,
            target: targetPlanet,
            units: unitsToSend,
            mission: missionType
        });
        launchAllInvasionsButton.style.display = 'block';
    });
}

function handleRightClick(e) {
    e.preventDefault();
    if (!gameActive) return;

    const clickedOnUIPanel = e.target.closest('.in-game-panel');
    if (clickedOnUIPanel) return;

    const worldX = camera.x + (e.clientX - canvas.width / 2) / camera.zoom;
    const worldY = camera.y + (e.clientY - canvas.height / 2) / camera.zoom;
    const clickedPlanet = getPlanetAtCoordinates(worldX, worldY);

    if (clickedPlanet) {
        showPlanetControlPanel(clickedPlanet);
    } else {
        hidePlanetControlPanel();
    }
}

function handleMouseMove(e) {
    if (!gameActive) return;
    currentMouseWorldX = camera.x + (e.clientX - canvas.width / 2) / camera.zoom;
    currentMouseWorldY = camera.y + (e.clientY - canvas.height / 2) / camera.zoom;
    if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        camera.x -= deltaX / camera.zoom * camera.dragSensitivity;
        camera.y -= deltaY / camera.zoom * camera.dragSensitivity;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
}

function handleMouseUp() {
    isDragging = false;
}

function handleMouseLeave() {
    isDragging = false;
    if (isDrawingInvasionLine) {
        selectedSourcePlanet = null;
        isDrawingInvasionLine = false;
        canvas.style.cursor = 'default';
    }
}

function handleWheel(e) {
    e.preventDefault();
    if (!gameActive) return;

    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const worldXBefore = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
    const worldYBefore = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

    const scale = e.deltaY < 0 ? camera.scaleFactor : 1 / camera.scaleFactor;
    camera.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(camera.zoom * scale, CONFIG.CAMERA_MAX_ZOOM));
    
    const worldXAfter = camera.x + (mouseX - canvas.width / 2) / camera.zoom;
    const worldYAfter = camera.y + (mouseY - canvas.height / 2) / camera.zoom;

    camera.x -= (worldXAfter - worldXBefore);
    camera.y -= (worldYAfter - worldYBefore);
}

function handlePanelDragStart(e) {
    if (e.target.closest('#planet-control-panel')) {
        isDraggingPanel = true;
        dragPanelOffsetX = e.clientX - planetControlPanel.getBoundingClientRect().left;
        dragPanelOffsetY = e.clientY - planetControlPanel.getBoundingClientRect().top;
    }
}

function handlePanelDrag(e) {
    if (isDraggingPanel) {
        planetControlPanel.style.left = `${e.clientX - dragPanelOffsetX}px`;
        planetControlPanel.style.top = `${e.clientY - dragPanelOffsetY}px`;
        planetControlPanel.style.transform = 'none';
    }
}

function handlePanelDragEnd() {
    isDraggingPanel = false;
}

launchAllInvasionsButton.addEventListener('click', () => {
    if (pendingInvasions.length === 0) return;

    pendingInvasions.forEach(pending => {
        pending.source.units -= pending.units;
        updatePlanetListItem(pending.source);

        activeFleets.push({
            ...pending,
            departureTime: performance.now(),
            travelDuration: calculateTravelDuration(pending.source, pending.target),
            currentX: getPlanetCurrentWorldCoordinates(pending.source).x,
            currentY: getPlanetCurrentWorldCoordinates(pending.source).y,
        });
    });
    pendingInvasions.length = 0;
    launchAllInvasionsButton.style.display = 'none';
    updatePlayerUnitDisplay();
});
