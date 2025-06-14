document.addEventListener('DOMContentLoaded', () => {
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const playButton = document.getElementById('play-button');
    const canvas = document.getElementById('solar-system-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationFrameId;
    let currentPlanets = [];
    let currentStarRadius;

    playButton.addEventListener('click', () => {
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');
        initSolarSystem();
        animateSolarSystem();
    });

    function initSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // 1. Increase min sun size to 20x, max to 100x original
        const originalStarRadius = 20;
        const minStarRadius = originalStarRadius * 20; // 20x original
        const maxStarRadius = originalStarRadius * 100; // 100x original (2000px)

        // Randomly generate star radius within the new range
        currentStarRadius = minStarRadius + (Math.random() * (maxStarRadius - minStarRadius));

        // Still cap it at a reasonable size relative to the canvas to ensure planets can still be seen
        // Cap to ensure it doesn't fill *too* much of the screen, leaving room for planets
        currentStarRadius = Math.min(currentStarRadius, Math.min(canvas.width, canvas.height) / 2.5); // Adjusted cap

        // Draw the Star
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentStarRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 15 + (currentStarRadius / 20);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Generate Planets
        const numPlanets = Math.floor(Math.random() * 11) + 2; // Between 2 and 12 planets

        // 3. Increase the distance a planet can be orbiting the sun by a lot.
        // Adjust the overall range for orbits based on star size and canvas dimensions
        const minOverallOrbitRadius = currentStarRadius + 80; // Start further out from potentially massive star
        const maxOverallOrbitRadius = Math.min(canvas.width, canvas.height) * 0.45; // Can go up to almost half of the screen dimension

        currentPlanets = [];

        let previousOrbitRadius = minOverallOrbitRadius;

        for (let i = 0; i < numPlanets; i++) {
            const planetRadius = Math.floor(Math.random() * 10) + 5; // Planets between 5 and 14 radius

            // 4. Ensure planets can't overlap when orbiting.
            // Minimum spacing needed is the sum of radii of two planets.
            // Let's ensure a minimum clear space between orbits.
            const minClearance = 30; // Minimum pixel space between the outer edge of one orbit and inner edge of next
            const minOrbitGap = planetRadius + (currentPlanets.length > 0 ? currentPlanets[currentPlanets.length -1].radius : 0) + minClearance;
            // The above accounts for the current planet's radius and the previous planet's radius + clearance.
            // Simplified: just ensure a minimum step up, and planets have their own radius.

            const minSpacingBetweenOrbits = 80; // A base minimum for how much orbits should spread
            const maxSpacingBetweenOrbits = 250; // Max random spread

            let potentialOrbitRadius = previousOrbitRadius + minSpacingBetweenOrbits + Math.random() * (maxSpacingBetweenOrbits - minSpacingBetweenOrbits);

            // Ensure the new orbit doesn't exceed the max allowed orbit
            if (potentialOrbitRadius > maxOverallOrbitRadius) {
                 potentialOrbitRadius = maxOverallOrbitRadius;
            }

            // If we've reached the max and still need more planets, we might put them closer
            // or break out. For simplicity, we'll let them cluster if max is hit early.
            // To strictly prevent overlap, ensure new orbit is always >= previous + previous_planet_radius + current_planet_radius.
            const actualOrbitRadius = Math.max(potentialOrbitRadius, previousOrbitRadius + (currentPlanets.length > 0 ? currentPlanets[currentPlanets.length -1].radius : 0) + planetRadius + minClearance);


            // If after all calculations, the actualOrbitRadius is beyond the max, cap it.
            if (actualOrbitRadius > maxOverallOrbitRadius) {
                // If we can't place it without going over max, and it's too close to previous, it might overlap or be off-screen.
                // For a dynamic system, it's better to sometimes not place a planet than to force an overlap or go too far.
                // However, based on the prompt, we prioritize "more distance" and "no overlap."
                // This means the last few planets might be very close to maxOverallOrbitRadius.
                // Let's ensure it's still at least at the previous orbit radius.
                if (actualOrbitRadius - planetRadius < previousOrbitRadius + (currentPlanets.length > 0 ? currentPlanets[currentPlanets.length -1].radius : 0) + minClearance) {
                    // This scenario means we can't place it without overlap or going past max.
                    // Instead of creating invalid state, let's just break if we can't place it.
                    // This might result in fewer than `numPlanets` if the space runs out.
                    break;
                }
                actualOrbitRadius = maxOverallOrbitRadius;
            }


            const initialAngle = Math.random() * Math.PI * 2;
            // 2. Bring down the max speed a planet can orbit by a lot.
            const minOrbitSpeed = 0.0001; // Very slow minimum
            const maxOrbitSpeed = 0.003;  // Slower maximum

            const orbitSpeed = (minOrbitSpeed + Math.random() * (maxOrbitSpeed - minOrbitSpeed)) * (Math.random() > 0.5 ? 1 : -1);

            currentPlanets.push({
                radius: planetRadius,
                orbitRadius: actualOrbitRadius,
                angle: initialAngle,
                speed: orbitSpeed,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`
            });

            previousOrbitRadius = actualOrbitRadius;
        }

        // Sort planets by orbitRadius for correct drawing order (smaller orbits drawn first)
        currentPlanets.sort((a, b) => a.orbitRadius - b.orbitRadius);
    }

    function animateSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Redraw the Star
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentStarRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 15 + (currentStarRadius / 20);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw and update planets
        currentPlanets.forEach(planet => {
            // Draw orbit path
            ctx.beginPath();
            ctx.arc(centerX, centerY, planet.orbitRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Update planet position
            planet.angle += planet.speed;
            const x = centerX + Math.cos(planet.angle) * planet.orbitRadius;
            const y = centerY + Math.sin(planet.angle) * planet.orbitRadius;

            // Draw planet
            ctx.beginPath();
            ctx.arc(x, y, planet.radius, 0, Math.PI * 2);
            ctx.fillStyle = planet.color;
            ctx.fill();
        });

        animationFrameId = requestAnimationFrame(animateSolarSystem);
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (gameScreen.classList.contains('active')) {
            cancelAnimationFrame(animationFrameId);
            initSolarSystem();
            animateSolarSystem();
        }
    });
});
