// main.js
import CONFIG from './config.js';
import { camera, gameState, inputState } from './state.js';
import { 
    initGameWorld, 
    updateGameWorld, 
    generatePlanetProduction,
    getPlanetAtCoordinates,
    calculateTravelDuration 
} from './game.js';
import { 
    initUI, 
    drawGameWorld, 
    populatePlanetList,
    updateUIAfterGameStateChange,
    showModal,
    hideModal,
    getModalCallback,
    showPlanetControlPanel,
    hidePlanetControlPanel,
    processMessageQueue
} from './ui.js';

let uiElements;
let planetProductionInterval;
let animationFrameId;

document.addEventListener('DOMContentLoaded', () => {
    uiElements = initUI();
    initEventListeners();
});

function initEventListeners() {
    uiElements['play-button'].addEventListener('click', startGame);

    // Modal Listeners
    uiElements['modal-confirm'].addEventListener('click', () => {
        const cb = getModalCallback();
        hideModal();
        if (cb) cb();
    });
    uiElements['modal-input-confirm'].addEventListener('click', () => {
        const cb = getModalCallback();
        const value = uiElements['modal-input'].value;
        hideModal();
        if (cb) cb(value);
    });
    uiElements['modal-input-cancel'].addEventListener('click', hideModal);
    
    // Launch Button Listener
    uiElements['launch-all-invasions'].addEventListener('click', launchAllInvasions);

    // Canvas Listeners
    uiElements['solar-system-canvas'].addEventListener('mousedown', handleMouseDown);
    uiElements['solar-system-canvas'].addEventListener('contextmenu', handleRightClick);
    uiElements['solar-system-canvas'].addEventListener('mousemove', handleMouseMove);
    uiElements['solar-system-canvas'].addEventListener('mouseup', handleMouseUp);
    uiElements['solar-system-canvas'].addEventListener('mouseleave', handleMouseLeave);
    uiElements['solar-system-canvas'].addEventListener('wheel', handleWheel);
}

function startGame() {
    uiElements['title-screen'].classList.remove('active');
    uiElements['game-screen'].classList.add('active');

    initGameWorld(uiElements['solar-system-canvas']);
    
    populatePlanetList();
    updateUIAfterGameStateChange();

    uiElements['planet-list-panel'].classList.add('active');
    uiElements['player-units-panel'].classList.add('active');

    gameState.gameActive = true;
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animate();

    if (planetProductionInterval) clearInterval(planetProductionInterval);
    planetProductionInterval = setInterval(() => {
        generatePlanetProduction();
        updateUIAfterGameStateChange();
    }, CONFIG.PLANET_PRODUCTION_INTERVAL_MS);
}

function animate() {
    if (!gameState.gameActive) {
        animationFrameId = requestAnimationFrame(animate);
        return;
    }
    
    updateGameWorld();
    drawGameWorld();
    processMessageQueue(); // Check for and show modals
    
    animationFrameId = requestAnimationFrame(animate);
}

function launchAllInvasions() {
    if (gameState.pendingInvasions.length === 0) return;

    gameState.pendingInvasions.forEach(pending => {
        pending.source.units -= pending.units;
        gameState.activeFleets.push({
            ...pending,
            departureTime: performance.now(),
            travelDuration: calculateTravelDuration(pending.source, pending.target),
        });
    });

    gameState.pendingInvasions.length = 0;
    uiElements['launch-all-invasions'].style.display = 'none';
    updateUIAfterGameStateChange();
}

// --- Input Event Handlers ---

function handleMouseDown(e) {
    if (!gameState.gameActive || e.button !== 0) return;
    
    const worldX = camera.x + (e.clientX - uiElements['solar-system-canvas'].width / 2) / camera.zoom;
    const worldY = camera.y + (e.clientY - uiElements['solar-system-canvas'].height / 2) / camera.zoom;
    const clickedPlanet = getPlanetAtCoordinates(worldX, worldY);

    if (inputState.selectedSourcePlanet) {
        if (clickedPlanet && clickedPlanet !== inputState.selectedSourcePlanet) {
            handleTargetPlanetSelection(clickedPlanet);
        }
        inputState.selectedSourcePlanet = null;
    } else {
        if (clickedPlanet && clickedPlanet.owner === 'player') {
            inputState.selectedSourcePlanet = clickedPlanet;
        } else if (!clickedPlanet) {
            inputState.isDragging = true;
            inputState.lastMouseX = e.clientX;
            inputState.lastMouseY = e.clientY;
        }
    }
}

function handleTargetPlanetSelection(targetPlanet) {
    const sourcePlanet = inputState.selectedSourcePlanet;
    if (sourcePlanet.units === 0) {
        return showModal("Source planet has no units.", 'alert');
    }
    const mission = targetPlanet.owner === 'player' ? 'reinforce' : 'invade';
    showModal(`Send how many units to ${mission} ${targetPlanet.name}? (Max: ${sourcePlanet.units})`, 'prompt', (value) => {
        const units = Math.min(parseInt(value) || 0, sourcePlanet.units);
        if (units > 0) {
            gameState.pendingInvasions.push({ source: sourcePlanet, target: targetPlanet, units, mission });
            uiElements['launch-all-invasions'].style.display = 'block';
        }
    });
}

function handleRightClick(e) {
    e.preventDefault();
    if (!gameState.gameActive) return;
    const worldX = camera.x + (e.clientX - uiElements['solar-system-canvas'].width / 2) / camera.zoom;
    const worldY = camera.y + (e.clientY - uiElements['solar-system-canvas'].height / 2) / camera.zoom;
    const clickedPlanet = getPlanetAtCoordinates(worldX, worldY);
    if (clickedPlanet) showPlanetControlPanel(clickedPlanet);
    else hidePlanetControlPanel();
}

function handleMouseMove(e) {
    if (inputState.isDragging) {
        const dx = e.clientX - inputState.lastMouseX;
        const dy = e.clientY - inputState.lastMouseY;
        camera.x -= dx / camera.zoom;
        camera.y -= dy / camera.zoom;
        inputState.lastMouseX = e.clientX;
        inputState.lastMouseY = e.clientY;
    }
}

function handleMouseUp() {
    inputState.isDragging = false;
}

function handleMouseLeave() {
    inputState.isDragging = false;
    inputState.selectedSourcePlanet = null;
}

function handleWheel(e) {
    e.preventDefault();
    const rect = uiElements['solar-system-canvas'].getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldXBefore = (mouseX - rect.width / 2) / camera.zoom + camera.x;
    const worldYBefore = (mouseY - rect.height / 2) / camera.zoom + camera.y;

    const scale = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    camera.zoom = Math.max(CONFIG.CAMERA_MIN_ZOOM, Math.min(camera.zoom * scale, CONFIG.CAMERA_MAX_ZOOM));

    const worldXAfter = (mouseX - rect.width / 2) / camera.zoom + camera.x;
    const worldYAfter = (mouseY - rect.height / 2) / camera.zoom + camera.y;

    camera.x += worldXBefore - worldXAfter;
    camera.y += worldYBefore - worldYAfter;
}
