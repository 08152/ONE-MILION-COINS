
function createCoinMachine(THREE, options = {}) {
    const group = new THREE.Group();

    const width = options.width ?? 2.2;
    const height = options.height ?? 2.3;
    const depth = options.depth ?? 1.7;

    const steel = new THREE.MeshStandardMaterial({
        color: 0x777F83,
        metalness: 0.9,
        roughness: 0.27
    });

    const darkSteel = new THREE.MeshStandardMaterial({
        color: 0x292F33,
        metalness: 0.85,
        roughness: 0.32
    });

    const black = new THREE.MeshStandardMaterial({
        color: 0x111719,
        metalness: 0.35,
        roughness: 0.25
    });

    const glass = new THREE.MeshPhysicalMaterial({
        color: 0x18282C,
        metalness: 0.25,
        roughness: 0.12,
        transmission: 0.15,
        transparent: true,
        opacity: 0.9
    });

    const displayMaterial = new THREE.MeshStandardMaterial({
        color: 0x16352D,
        emissive: 0x073C24,
        emissiveIntensity: 0.5,
        roughness: 0.3
    });

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

    // Hauptgehäuse
    addBox(
        width,
        height,
        depth,
        steel,
        0,
        height / 2,
        0
    );

    // Dunkler Sockel
    addBox(
        width + 0.12,
        0.2,
        depth + 0.12,
        darkSteel,
        0,
        0.1,
        0
    );

    // Frontplatte
    addBox(
        width * 0.88,
        height * 0.85,
        0.055,
        darkSteel,
        0,
        height * 0.52,
        depth / 2 + 0.035
    );

    // Sichtfenster
    addBox(
        width * 0.53,
        height * 0.38,
        0.035,
        black,
        -width * 0.12,
        height * 0.62,
        depth / 2 + 0.075
    );

    addBox(
        width * 0.48,
        height * 0.32,
        0.025,
        glass,
        -width * 0.12,
        height * 0.62,
        depth / 2 + 0.1
    );

    // Innere mechanische Walzen hinter dem Fenster
    const internalParts = [];

    for (let i = 0; i < 3; i++) {
        const roller = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.4, 32),
            steel
        );

        roller.rotation.z = Math.PI / 2;
        roller.position.set(
            -width * 0.12,
            height * 0.55 + i * 0.17,
            depth / 2 + 0.13
        );

        group.add(roller);
        internalParts.push(roller);
    }

    // Fensterrahmen
    const frameThickness = 0.055;
    const windowWidth = width * 0.53;
    const windowHeight = height * 0.38;

    addBox(
        windowWidth + frameThickness * 2,
        frameThickness,
        0.07,
        steel,
        -width * 0.12,
        height * 0.62 + windowHeight / 2,
        depth / 2 + 0.12
    );

    addBox(
        windowWidth + frameThickness * 2,
        frameThickness,
        0.07,
        steel,
        -width * 0.12,
        height * 0.62 - windowHeight / 2,
        depth / 2 + 0.12
    );

    for (const side of [-1, 1]) {
        addBox(
            frameThickness,
            windowHeight,
            0.07,
            steel,
            -width * 0.12 + side * windowWidth / 2,
            height * 0.62,
            depth / 2 + 0.12
        );
    }

    // Bedienfeld rechts
    const panelX = width * 0.31;

    addBox(
        width * 0.27,
        height * 0.55,
        0.07,
        darkSteel,
        panelX,
        height * 0.65,
        depth / 2 + 0.08
    );

    // Digitaldisplay
    addBox(
        width * 0.21,
        0.28,
        0.035,
        displayMaterial,
        panelX,
        height * 0.79,
        depth / 2 + 0.13
    );

    // Display-Rahmen
    addBox(
        width * 0.23,
        0.32,
        0.025,
        steel,
        panelX,
        height * 0.79,
        depth / 2 + 0.11
    );

    // Bedienknöpfe
    const buttons = [];

    for (let i = 0; i < 4; i++) {
        const button = new THREE.Mesh(
            new THREE.CylinderGeometry(0.065, 0.07, 0.045, 32),
            i === 0
                ? new THREE.MeshStandardMaterial({
                    color: 0x2EAA59,
                    metalness: 0.4,
                    roughness: 0.25
                })
                : steel
        );

        button.rotation.x = Math.PI / 2;

        button.position.set(
            panelX + (i % 2) * 0.19 - 0.09,
            height * 0.58 - Math.floor(i / 2) * 0.18,
            depth / 2 + 0.15
        );

        group.add(button);
        buttons.push(button);
    }

    // Not-Aus-Schalter
    const emergency = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.09, 0.08, 32),
        new THREE.MeshStandardMaterial({
            color: 0xCC2424,
            metalness: 0.3,
            roughness: 0.3
        })
    );

    emergency.rotation.x = Math.PI / 2;
    emergency.position.set(
        panelX,
        height * 0.43,
        depth / 2 + 0.16
    );

    group.add(emergency);

    // Lüftungsschlitze auf der rechten Seite
    for (let i = 0; i < 9; i++) {
        addBox(
            0.32,
            0.025,
            0.025,
            darkSteel,
            width / 2 + 0.015,
            height * 0.3 + i * 0.07,
            0
        );
    }

    // Metallverschraubungen an der Front
    for (const x of [-width * 0.43, width * 0.43]) {
        for (const y of [0.3, height - 0.3]) {
            const bolt = new THREE.Mesh(
                new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12),
                steel
            );

            bolt.rotation.x = Math.PI / 2;
            bolt.position.set(
                x,
                y,
                depth / 2 + 0.09
            );

            group.add(bolt);
        }
    }

    // Oberer Anschluss für Trichter
    const topConnector = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.16, 48),
        darkSteel
    );

    topConnector.position.set(0, height + 0.08, 0);
    group.add(topConnector);

    // Oberer Rohranschluss
    const topOpening = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.17, 48, 1, true),
        steel
    );

    topOpening.position.set(0, height + 0.17, 0);
    group.add(topOpening);

    // Münzausgang vorne
    const output = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.27, 0.3, 48),
        darkSteel
    );

    output.rotation.x = Math.PI / 2;
    output.position.set(
        0,
        0.55,
        depth / 2 + 0.22
    );

    group.add(output);

    // Animationsfunktion
    function update(deltaTime) {
        internalParts.forEach((part, index) => {
            part.rotation.x += deltaTime * (index % 2 === 0 ? 2 : -2);
        });
    }

    group.traverse(object => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });

    return {
        group,
        update,
        buttons,
        emergency,
        internalParts
    };
}
