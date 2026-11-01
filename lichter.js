
function createBunkerLight(THREE, options = {}) {
    const group = new THREE.Group();

    const length = options.length ?? 1.5;
    const intensity = options.intensity ?? 2.5;
    const color = options.color ?? 0xffe8c5;
    const flicker = options.flicker ?? false;

    const housingMaterial = new THREE.MeshStandardMaterial({
        color: 0x555B5E,
        metalness: 0.85,
        roughness: 0.35
    });

    const diffuserMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFF5DC,
        emissive: color,
        emissiveIntensity: 1.8,
        roughness: 0.3
    });

    const screwMaterial = new THREE.MeshStandardMaterial({
        color: 0xA4A9AA,
        metalness: 0.95,
        roughness: 0.2
    });

    // Lampengehäuse
    const housing = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.12, 0.24),
        housingMaterial
    );

    group.add(housing);
    housing.castShadow = true;

    // Lichtabdeckung
    const diffuser = new THREE.Mesh(
        new THREE.BoxGeometry(length - 0.12, 0.035, 0.19),
        diffuserMaterial
    );

    diffuser.position.y = -0.075;
    group.add(diffuser);

    // Seitliche Metallabdeckungen
    for (const side of [-1, 1]) {
        const sidePlate = new THREE.Mesh(
            new THREE.BoxGeometry(length, 0.06, 0.025),
            screwMaterial
        );

        sidePlate.position.z = side * 0.115;
        group.add(sidePlate);
    }

    // Befestigungsschrauben
    for (const x of [-length * 0.4, length * 0.4]) {
        for (const z of [-0.09, 0.09]) {
            const screw = new THREE.Mesh(
                new THREE.CylinderGeometry(0.018, 0.018, 0.018, 12),
                screwMaterial
            );

            screw.position.set(x, 0.065, z);
            group.add(screw);
        }
    }

    // Befestigungsbügel
    for (const x of [-length * 0.35, length * 0.35]) {
        const mount = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.08, 0.12),
            housingMaterial
        );

        mount.position.set(x, 0.095, 0);
        group.add(mount);
    }

    // Tatsächliche Lichtquelle
    const light = new THREE.PointLight(
        color,
        intensity,
        options.distance ?? 9,
        1.5
    );

    light.position.set(0, -0.18, 0);
    light.castShadow = options.shadows ?? false;

    group.add(light);

    // Zusätzliche Lichtquelle für breite Ausleuchtung
    const fillLight = new THREE.PointLight(
        color,
        intensity * 0.25,
        options.distance ?? 7,
        2
    );

    fillLight.position.set(0, -0.5, 0);
    group.add(fillLight);

    let elapsed = 0;

    function update(deltaTime) {
        elapsed += deltaTime;

        if (flicker) {
            const wave = Math.sin(elapsed * 18);
            const randomFlicker = Math.random() > 0.985 ? 0.2 : 1;

            light.intensity =
                intensity * (0.94 + wave * 0.025) * randomFlicker;
        } else {
            light.intensity = intensity;
        }
    }

    return {
        group,
        light,
        update
    };
}


// Mehrere Bunkerleuchten platzieren
function createBunkerLighting(THREE, scene, options = {}) {
    const lights = [];

    const count = options.count ?? 8;
    const spacing = options.spacing ?? 4;
    const height = options.height ?? 3.5;

    for (let i = 0; i < count; i++) {
        const lamp = createBunkerLight(THREE, {
            length: 1.8,
            intensity: 2.5,
            color: 0xffe8c5,
            distance: 10,
            flicker: options.flicker === true && i === 2
        });

        lamp.group.position.set(
            options.startX ?? 0,
            height,
            (i - (count - 1) / 2) * spacing
        );

        scene.add(lamp.group);
        lights.push(lamp);
    }

    function update(deltaTime) {
        lights.forEach(lamp => lamp.update(deltaTime));
    }

    return {
        lights,
        update
    };
}
