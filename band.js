
function createConveyorBelt(THREE, options = {}) {
    const group = new THREE.Group();

    const length = options.length ?? 5;
    const width = options.width ?? 1.5;
    const height = options.height ?? 0.65;
    const speed = options.speed ?? 1.5;

    const beltLength = length - 0.35;
    const beltWidth = width - 0.18;

    const metal = new THREE.MeshStandardMaterial({
        color: 0x45494C,
        metalness: 0.85,
        roughness: 0.3
    });

    const darkMetal = new THREE.MeshStandardMaterial({
        color: 0x202427,
        metalness: 0.75,
        roughness: 0.35
    });

    const rubber = new THREE.MeshStandardMaterial({
        color: 0x17191A,
        roughness: 0.88,
        metalness: 0.05
    });

    const silver = new THREE.MeshStandardMaterial({
        color: 0xA7ADB0,
        metalness: 0.95,
        roughness: 0.2
    });

    // Haupttragwerk
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

    // Seitliche Träger
    for (const side of [-1, 1]) {
        addBox(
            beltLength,
            0.18,
            0.12,
            metal,
            0,
            height - 0.09,
            side * (width / 2 - 0.04)
        );

        // Seitliche Führungsschienen
        addBox(
            beltLength,
            0.11,
            0.045,
            silver,
            0,
            height + 0.035,
            side * (width / 2 - 0.12)
        );
    }

    // Querstreben
    for (let i = 0; i < 7; i++) {
        const x = -beltLength / 2 + i * beltLength / 6;

        addBox(
            0.09,
            0.12,
            width - 0.15,
            darkMetal,
            x,
            height - 0.2,
            0
        );
    }

    // Rollen
    const rollers = [];

    function createRoller(x) {
        const roller = new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.105,
                0.105,
                beltWidth,
                32
            ),
            silver
        );

        roller.rotation.x = Math.PI / 2;
        roller.position.set(x, height, 0);
        roller.castShadow = true;

        group.add(roller);
        rollers.push(roller);

        // Rollen-Endkappen
        for (const side of [-1, 1]) {
            const cap = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.12, 0.035, 32),
                darkMetal
            );

            cap.rotation.x = Math.PI / 2;
            cap.position.set(x, height, side * (beltWidth / 2));
            group.add(cap);
        }
    }

    createRoller(-beltLength / 2);
    createRoller(beltLength / 2);

    // Gummioberfläche
    const belt = new THREE.Mesh(
        new THREE.BoxGeometry(beltLength, 0.045, beltWidth),
        rubber
    );

    belt.position.set(0, height + 0.115, 0);
    belt.castShadow = true;
    belt.receiveShadow = true;
    group.add(belt);

    // Strukturierte Querprofile auf dem Band
    const ribs = [];
    const ribCount = 55;

    for (let i = 0; i < ribCount; i++) {
        const rib = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.018, beltWidth - 0.04),
            darkMetal
        );

        rib.position.set(
            -beltLength / 2 + i * beltLength / ribCount,
            height + 0.14,
            0
        );

        group.add(rib);
        ribs.push(rib);
    }

    // Schrauben an den Seiten
    for (const side of [-1, 1]) {
        for (let i = 0; i < 12; i++) {
            const bolt = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.025, 0.025, 12),
                silver
            );

            bolt.rotation.x = Math.PI / 2;

            bolt.position.set(
                -beltLength / 2 + i * beltLength / 11,
                height - 0.09,
                side * (width / 2 - 0.035)
            );

            group.add(bolt);
        }
    }

    // Beine
    for (const x of [-length / 2 + 0.35, length / 2 - 0.35]) {
        for (const z of [-width / 2 + 0.2, width / 2 - 0.2]) {
            addBox(
                0.13,
                height - 0.15,
                0.13,
                metal,
                x,
                (height - 0.15) / 2,
                z
            );

            addBox(
                0.3,
                0.06,
                0.3,
                darkMetal,
                x,
                0.035,
                z
            );
        }
    }

    // Animationssystem
    let animationPosition = 0;

    function update(deltaTime) {
        const movement = speed * deltaTime;
        animationPosition += movement;

        // Struktur läuft über die Oberfläche
        for (let i = 0; i < ribs.length; i++) {
            const baseX = -beltLength / 2 +
                i * beltLength / ribCount;

            const offset = animationPosition % (beltLength / ribCount);

            ribs[i].position.x =
                -beltLength / 2 +
                ((baseX + offset + beltLength / 2) % beltLength);
        }

        // Rollen drehen
        rollers.forEach(roller => {
            roller.rotation.z -= movement / 0.105;
        });
    }

    return {
        group,
        update,
        rollers,
        belt
    };
}
