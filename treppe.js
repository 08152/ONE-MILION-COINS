
function createBunkerStairs(THREE, options = {}) {
    const group = new THREE.Group();

    const width = options.width ?? 1.5;
    const stepCount = options.stepCount ?? 24;
    const stepDepth = options.stepDepth ?? 0.38;
    const stepHeight = options.stepHeight ?? 0.12;
    const floorHeight = options.floorHeight ?? 2.88;
    const segmentLength = stepCount * stepDepth;

    const concrete = new THREE.MeshStandardMaterial({
        color: 0x777B7D,
        roughness: 0.92,
        metalness: 0.05
    });

    const concreteDark = new THREE.MeshStandardMaterial({
        color: 0x484D50,
        roughness: 0.88,
        metalness: 0.1
    });

    const metal = new THREE.MeshStandardMaterial({
        color: 0x656D72,
        metalness: 0.88,
        roughness: 0.28
    });

    const handrailMaterial = new THREE.MeshStandardMaterial({
        color: 0x9B9FA1,
        metalness: 0.95,
        roughness: 0.2
    });

    // Hilfsfunktion für Boxen
    function addBox(w, h, d, material, x, y, z) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            material
        );

        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        group.add(mesh);
        return mesh;
    }

    // Einen langen Treppenabschnitt erzeugen
    function createFlight(start, direction, level) {
        const dx = direction.x;
        const dz = direction.z;

        const horizontalLength = segmentLength;
        const verticalLength = floorHeight;

        const slope = verticalLength / horizontalLength;

        // Treppenstufen
        for (let i = 0; i < stepCount; i++) {
            const t = (i + 0.5) / stepCount;

            const x = start.x + dx * horizontalLength * t;
            const z = start.z + dz * horizontalLength * t;
            const y = start.y - verticalLength * t;

            const step = new THREE.Mesh(
                new THREE.BoxGeometry(
                    width,
                    stepHeight,
                    stepDepth
                ),
                concrete
            );

            step.position.set(x, y, z);

            // Stufen bleiben waagerecht.
            step.rotation.y = Math.atan2(-dz, dx);

            group.add(step);
            step.castShadow = true;
            step.receiveShadow = true;
        }

        // Seitliche Betonwangen
        for (const side of [-1, 1]) {
            const rail = new THREE.Mesh(
                new THREE.BoxGeometry(
                    horizontalLength,
                    0.3,
                    0.16
                ),
                concreteDark
            );

            rail.position.set(
                start.x + dx * horizontalLength / 2,
                start.y - verticalLength / 2,
                start.z + dz * horizontalLength / 2
                    + side * (width / 2 + 0.08)
            );

            rail.rotation.y = Math.atan2(-dz, dx);
            rail.rotation.z = -Math.atan2(
                verticalLength,
                horizontalLength
            );

            group.add(rail);
            rail.castShadow = true;
        }

        // Geländerpfosten und Handläufe
        for (const side of [-1, 1]) {
            const postCount = Math.ceil(stepCount / 3);

            for (let i = 0; i <= postCount; i++) {
                const t = i / postCount;

                const post = new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        0.035,
                        0.045,
                        0.9,
                        12
                    ),
                    metal
                );

                post.position.set(
                    start.x + dx * horizontalLength * t,
                    start.y - verticalLength * t + 0.48,
                    start.z + dz * horizontalLength * t
                        + side * (width / 2 + 0.14)
                );

                group.add(post);
                post.castShadow = true;
            }

            const rail = new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.045,
                    0.045,
                    horizontalLength,
                    12
                ),
                handrailMaterial
            );

            rail.position.set(
                start.x + dx * horizontalLength / 2,
                start.y - verticalLength / 2 + 0.95,
                start.z + dz * horizontalLength / 2
                    + side * (width / 2 + 0.14)
            );

            rail.rotation.y = Math.atan2(-dz, dx);
            rail.rotation.z = -Math.atan2(
                verticalLength,
                horizontalLength
            );

            group.add(rail);
        }

        return {
            end: {
                x: start.x + dx * horizontalLength,
                y: start.y - verticalLength,
                z: start.z + dz * horizontalLength
            },
            direction
        };
    }

    // Treppenverlauf über mehrere Etagen.
    // Richtungswechsel um 90 Grad nach jedem Abschnitt.
    const directions = [
        { x: 1, z: 0 },
        { x: 0, z: 1 },
        { x: -1, z: 0 },
        { x: 0, z: -1 }
    ];

    const levels = options.levels ?? 4;

    let current = {
        x: options.startX ?? 0,
        y: options.startY ?? 0,
        z: options.startZ ?? 0
    };

    const connections = [];

    for (let level = 0; level < levels; level++) {
        const direction = directions[level % directions.length];

        // Treppenabschnitt
        const flight = createFlight(
            current,
            direction,
            level
        );

        current = flight.end;

        // Podest am Ende
        addBox(
            width + 0.3,
            0.2,
            width + 0.3,
            concreteDark,
            current.x,
            current.y - 0.1,
            current.z
        );

        // Anschlussposition für den nächsten Abschnitt
        connections.push({
            x: current.x,
            y: current.y,
            z: current.z,
            nextDirection: directions[(level + 1) % directions.length]
        });

        // Versatz für die nächste Treppe
        const nextDirection = directions[(level + 1) % directions.length];

        current.x += nextDirection.x * (width + 0.3);
        current.z += nextDirection.z * (width + 0.3);
    }

    group.traverse(object => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });

    return {
        group,
        connections,
        endPosition: current,
        segmentLength,
        floorHeight
    };
}
