document.addEventListener('DOMContentLoaded', () => {
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const playButton = document.getElementById('play-button');
    const canvas = document.getElementById('solar-system-canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions to fill the screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationFrameId;

    playButton.addEventListener('click', () => {
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');
        initSolarSystem();
        animateSolarSystem();
    });

    function initSolarSystem() {
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Draw the Star
        const starRadius = 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, starRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow'; // A bright star
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // Generate Planets
        const numPlanets = Math.floor(Math.random() * 11) + 2; // Between 2 and 12 planets
        const minOrbitRadius = 80; // Minimum distance from the star
        const maxOrbitRadius = Math.min(canvas.width, canvas.height) / 2 - 30; // Max radius, leaving some margin

        const planets = [];

        for (let i = 0; i < numPlanets; i++) {
            const planetRadius = Math.floor(Math.random() * 10) + 5; // Planets between 5 and 14 radius
            const orbitRadius = minOrbitRadius + (maxOrbitRadius - minOrbitRadius) * (i / (numPlanets - 1)); // Distribute orbits
            const initialAngle = Math.random() * Math.PI * 2; // Random starting position
            const orbitSpeed = (Math.random() * 0.005 + 0.001) * (Math.random() > 0.5 ? 1 : -1); // Small, random speed and direction

            planets.push({
                radius: planetRadius,
                orbitRadius: orbitRadius,
                angle: initialAngle,
                speed: orbitSpeed,
                color: `hsl(${Math.random() * 360}, 70%, 50%)` // Random color
            });
        }

        // Store planets globally or pass them for animation
        window.currentPlanets = planets; // Make them accessible for the animation loop
    }

    function animateSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Redraw the Star
        const starRadius = 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, starRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw and update planets
        if (window.currentPlanets) {
            window.currentPlanets.forEach(planet => {
                // Update planet position
                planet.angle += planet.speed;
                const x = centerX + Math.cos(planet.angle) * planet.orbitRadius;
                const y = centerY + Math.sin(planet.angle) * planet.orbitRadius;

                // Draw orbit path (optional, but nice for visualization)
                ctx.beginPath();
                ctx.arc(centerX, centerY, planet.orbitRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; // Faint orbit line
                ctx.lineWidth = 0.5;
                ctx.stroke();

                // Draw planet
                ctx.beginPath();
                ctx.arc(x, y, planet.radius, 0, Math.PI * 2);
                ctx.fillStyle = planet.color;
                ctx.fill();
            });
        }

        animationFrameId = requestAnimationFrame(animateSolarSystem);
    }

    // Handle window resizing
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Re-initialize solar system on resize to adjust orbits and positions
        if (gameScreen.classList.contains('active')) {
            cancelAnimationFrame(animationFrameId); // Stop previous animation
            initSolarSystem();
            animateSolarSystem();
        }
    });
});
