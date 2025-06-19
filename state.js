// state.js

export const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    scaleFactor: 1.1,
    dragSensitivity: 0.8,
    targetPlanet: null,
    activeListItem: null,
    targetZoom: 1
};

export const gameState = {
    currentPlanets: [],
    currentStarRadius: 0,
    gameActive: false,
    playerIncome: 0,
    chosenStarterPlanet: null,
    activeFleets: [],
    pendingInvasions: [],
    messageQueue: [] // For showing modals without circular dependencies
};

export const inputState = {
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    selectedSourcePlanet: null,
    isDrawingInvasionLine: false,
    isDraggingPanel: false,
    dragPanelOffsetX: 0,
    dragPanelOffsetY: 0,
};
