// config.js

export const CONFIG = {
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
    MIN_UNITS_for_AI_PLANET: 50,

    // Fleet ball size configuration
    FLEET_BASE_RADIUS: 5,
    FLEET_MAX_SCREEN_RADIUS_PX: 15,

    // Planet click radius multiplier
    PLANET_CLICK_RADIUS_MULTIPLIER: 1.5,
    MIN_PLANET_CLICKABLE_PIXELS: 25,


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
