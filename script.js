document.addEventListener('DOMContentLoaded', () => {
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const playButton = document.getElementById('play-button');
    const canvas = document.getElementById('solar-system-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationFrameId;
    let currentPlanets = []; // Use a local variable to store planets
    let currentStarRadius; // Store the current star radius

    playButton.addEventListener('click', () => {
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');
        initSolarSystem();
        animateSolarSystem();
    });

    function initSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawings

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // 1. Randomly generate Star size (original size up to 75x)
        // Original radius was 20. Max will be 20 * 75 = 1500.
        const originalStarRadius = 20;
        currentStarRadius = originalStarRadius + (Math.random() * (originalStarRadius * 74)); // 0 to 74x original extra size
        // Ensure it doesn't get too big for the canvas visually, though the request is 75x.
        // We'll cap it at a reasonable size relative to the canvas to ensure planets can still be seen.
        currentStarRadius = Math.min(currentStarRadius, Math.min(canvas.width, canvas.height) / 4);


        // Draw the Star
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentStarRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 15 + (currentStarRadius / 20); // Scale shadow blur with size
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // Generate Planets
        const numPlanets = Math.floor(Math.random() * 11) + 2; // Between 2 and 12 planets
        const minOverallOrbitRadius = currentStarRadius + 50; // Minimum distance from the star, relative to star size
        const maxOverallOrbitRadius = Math.min(canvas.width, canvas.height) / 2 - 30; // Max radius, leaving some margin

        currentPlanets = []; // Reset planets array

        let previousOrbitRadius = minOverallOrbitRadius;

        for (let i = 0; i < numPlanets; i++) {
            const planetRadius = Math.floor(Math.random() * 10) + 5; // Planets between 5 and 14 radius

            // 3. Spread out planets a lot more
            // Randomly determine the spacing for the current planet's orbit
            const minSpacing = 40; // Minimum distance between orbits
            const maxSpacing = 150; // Maximum distance between orbits
            const spacing = minSpacing + Math.random() * (maxSpacing - minSpacing);

            let orbitRadius = previousOrbitRadius + spacing;

            // Ensure orbit doesn't exceed canvas bounds
            if (orbitRadius > maxOverallOrbitRadius) {
                orbitRadius = maxOverallOrbitRadius;
            }

            const initialAngle = Math.random() * Math.PI * 2; // Random starting position
            // 2. Heavily vary the orbit speed
            const minOrbitSpeed = 0.0005; // Slower minimum
            const maxOrbitSpeed = 0.015;  // Faster maximum
            const orbitSpeed = (minOrbitSpeed + Math.random() * (maxOrbitSpeed - minOrbitSpeed)) * (Math.random() > 0.5 ? 1 : -1); // Random speed and direction

            currentPlanets.push({
                radius: planetRadius,
                orbitRadius: orbitRadius,
                angle: initialAngle,
                speed: orbitSpeed,
                color: `hsl(${Math.random() * 360}, 70%, 50%)` // Random color
            });

            previousOrbitRadius = orbitRadius; // Set for the next planet
        }

        // Sort planets by orbitRadius to draw smaller orbits first (behind larger ones)
        currentPlanets.sort((a, b) => a.orbitRadius - b.orbitRadius);
    }

    function animateSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Redraw the Star (using the stored random radius)
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
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; // Fainter orbit line
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

    // Handle window resizing
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (gameScreen.classList.contains('active')) {
            cancelAnimationFrame(animationFrameId); // Stop previous animation
            initSolarSystem(); // Re-initialize with new dimensions
            animateSolarSystem();
        }
    });
});
