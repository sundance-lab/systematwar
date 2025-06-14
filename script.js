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

    const camera = {
        x: 0,
        y: 0,
        zoom: 0.1,
        scaleFactor: 1.1,
        dragSensitivity: 0.8
    };

    let isDragging = false;
    let lastMouseX, lastMouseY;
    let selectingStarterPlanet = false;

    playButton.addEventListener('click', () => {
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');
        initSolarSystem();
        camera.x = 0;
        camera.y = 0;
        camera.zoom = 0.1;
        animateSolarSystem();

        selectingStarterPlanet = true;
        alert("Choose a starter planet by clicking on it!");
        canvas.style.cursor = 'pointer';
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const worldXAtMouse = (mouseX - canvas.width / 2) / camera.zoom - camera.x;
        const worldYAtMouse = (mouseY - canvas.height / 2) / camera.zoom - camera.y;

        if (e.deltaY < 0) { // Zoom in
            camera.zoom *= camera.scaleFactor;
        } else { // Zoom out
            camera.zoom /= camera.scaleFactor;
        }

        camera.zoom = Math.max(0.01, Math.min(camera.zoom, 50));

        camera.x = -worldXAtMouse + (mouseX - canvas.width / 2) / camera.zoom;
        camera.y = -worldYAtMouse + (mouseY - canvas.height / 2) / camera.zoom;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (selectingStarterPlanet && e.button === 0) {
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            const worldX = (mouseX - canvas.width / 2) / camera.zoom - camera.x;
            const worldY = (mouseY - canvas.height / 2) / camera.zoom - camera.y;

            for (let i = 0; i < currentPlanets.length; i++) {
                const planet = currentPlanets[i];
                let planetX, planetY;
                if (planet.isElliptical) {
                    const unrotatedX = planet.semiMajorAxis * Math.cos(planet.angle);
                    const unrotatedY = planet.semiMinorAxis * Math.sin(planet.angle);
                    planetX = unrotatedX * Math.cos(planet.rotationAngle) - unrotatedY * Math.sin(planet.rotationAngle);
                    planetY = unrotatedX * Math.sin(planet.rotationAngle) + unrotatedY * Math.cos(planet.rotationAngle);
                } else {
                    planetX = Math.cos(planet.angle) * planet.orbitRadius;
                    planetY = Math.sin(planet.angle) * planet.orbitRadius;
                }

                const distance = Math.sqrt(
                    Math.pow(worldX - planetX, 2) +
                    Math.pow(worldY - planetY, 2)
                );

                if (distance < planet.radius) {
                    alert(`You chose Planet ${i + 1}!`);
                    selectingStarterPlanet = false;
                    canvas.style.cursor = 'grab';
                    return;
                }
            }
        } else if (e.button === 0) {
            e.preventDefault();
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && !selectingStarterPlanet) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;

            camera.x += (dx / camera.zoom) * camera.dragSensitivity;
            camera.y += (dy / camera.zoom) * camera.dragSensitivity;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        } else if (selectingStarterPlanet) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'grab';
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0 && !selectingStarterPlanet) {
            isDragging = false;
            canvas.style.cursor = 'grab';
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        if (!selectingStarterPlanet) {
            canvas.style.cursor = 'default';
        }
    });

    function initSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const originalStarRadius = 20;
        // Average sun size 20x what it is now (current min 1200, current max 6000)
        // This means scaling current ranges by 20x, but we'll re-center the 'average'.
        // Let's set a new base for the *average* to be around 20x the current average.
        // Current average star radius: (1200 + 6000) / 2 = 3600
        // New desired average: 3600 * 20 = 72000
        // Let's create a range around this new average.
        const minStarRadius = originalStarRadius * 600; // 20 * 600 = 12000
        const maxStarRadius = originalStarRadius * 6000; // 20 * 6000 = 120000

        currentStarRadius = minStarRadius + (Math.random() * (maxStarRadius - minStarRadius));
        currentStarRadius = Math.min(currentStarRadius, Math.min(canvas.width, canvas.height) * 0.4); // Still cap for very small screens

        const numPlanets = Math.floor(Math.random() * 11) + 2;

        const minOverallOrbitRadius = currentStarRadius + 80;
        const maxOverallOrbitRadius = Math.min(canvas.width, canvas.height) * 20; // Increased max orbit distance to accommodate larger gaps

        currentPlanets = [];
        let previousOrbitRadius = minOverallOrbitRadius;

        for (let i = 0; i < numPlanets; i++) {
            const planetRadius = (Math.floor(Math.random() * 10) + 5) * 10; // New range: 50-140

            const minPlanetClearance = 10;
            const minimumOrbitDistanceFromPreviousPlanet = previousOrbitRadius +
                                                           (currentPlanets.length > 0 ? currentPlanets[currentPlanets.length -1].radius : 0) +
                                                           planetRadius + minPlanetClearance;

            // Increase average distance between orbiting planets by 5x (current min 300, max 1500)
            // New average should be 5x current average: (300+1500)/2 = 900. New avg = 4500.
            const minSpacingBetweenOrbits = 1500; // Roughly 5x previous min (300)
            const maxSpacingBetweenOrbits = 7500; // Roughly 5x previous max (1500)

            let potentialOrbitRadius = previousOrbitRadius + minSpacingBetweenOrbits + Math.random() * (maxSpacingBetweenOrbits - minSpacingBetweenOrbits);

            let actualOrbitRadius = Math.max(potentialOrbitRadius, minimumOrbitDistanceFromPreviousPlanet);

            if (actualOrbitRadius > maxOverallOrbitRadius) {
                 if (minimumOrbitDistanceFromPreviousPlanet > maxOverallOrbitRadius) {
                     break;
                 }
                 actualOrbitRadius = maxOverallOrbitRadius;
            }

            const initialAngle = Math.random() * Math.PI * 2;
            const minOrbitSpeed = 0.0001;
            const maxOrbitSpeed = 0.003;

            const orbitSpeed = (minOrbitSpeed + Math.random() * (maxOrbitSpeed - minOrbitSpeed)) * (Math.random() > 0.5 ? 1 : -1);

            const isElliptical = Math.random() < 0.15;
            let semiMajorAxis = actualOrbitRadius;
            let semiMinorAxis = actualOrbitRadius;
            let eccentricity = 0;
            let rotationAngle = 0;

            if (isElliptical) {
                eccentricity = Math.random() * 0.7 + 0.1;
                semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
                rotationAngle = Math.random() * Math.PI * 2;
            }

            currentPlanets.push({
                radius: planetRadius,
                orbitRadius: actualOrbitRadius,
                angle: initialAngle,
                speed: orbitSpeed,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                isElliptical: isElliptical,
                semiMajorAxis: semiMajorAxis,
                semiMinorAxis: semiMinorAxis,
                eccentricity: eccentricity,
                rotationAngle: rotationAngle
            });

            previousOrbitRadius = actualOrbitRadius;
        }

        currentPlanets.sort((a, b) => a.orbitRadius - b.orbitRadius);
    }

    function animateSolarSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(camera.x, camera.y);

        const systemCenterX = 0;
        const systemCenterY = 0;

        ctx.beginPath();
        ctx.arc(systemCenterX, systemCenterY, currentStarRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 15 + (currentStarRadius / 20);
        ctx.fill();
        ctx.shadowBlur = 0;

        currentPlanets.forEach(planet => {
            ctx.beginPath();
            if (planet.isElliptical) {
                ctx.ellipse(
                    systemCenterX,
                    systemCenterY,
                    planet.semiMajorAxis,
                    planet.semiMinorAxis,
                    planet.rotationAngle,
                    0,
                    Math.PI * 2
                );
            } else {
                ctx.arc(systemCenterX, systemCenterY, planet.orbitRadius, 0, Math.PI * 2);
            }
            // Make the orbit lines thinner.
            ctx.lineWidth = 0.25 / camera.zoom; // Halved from 0.5
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.stroke();

            planet.angle += planet.speed;
            let x, y;

            if (planet.isElliptical) {
                const unrotatedX = planet.semiMajorAxis * Math.cos(planet.angle);
                const unrotatedY = planet.semiMinorAxis * Math.sin(planet.angle);

                x = systemCenterX + unrotatedX * Math.cos(planet.rotationAngle) - unrotatedY * Math.sin(planet.rotationAngle);
                y = systemCenterY + unrotatedX * Math.sin(planet.rotationAngle) + unrotatedY * Math.cos(planet.rotationAngle);

            } else {
                x = systemCenterX + Math.cos(planet.angle) * planet.orbitRadius;
                y = systemCenterY + Math.sin(planet.angle) * planet.orbitRadius;
            }

            ctx.beginPath();
            ctx.arc(x, y, planet.radius, 0, Math.PI * 2);
            ctx.fillStyle = planet.color;
            ctx.fill();
        });

        ctx.restore();
        animationFrameId = requestAnimationFrame(animateSolarSystem);
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    canvas.style.cursor = 'grab';
});
