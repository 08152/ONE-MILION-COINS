
function createPipe(THREE, options = {}) {
    const group = new THREE.Group();

    const radius = options.radius ?? 0.25;
    const length = options.length ?? 1.5;
    const wallThickness = options.wallThickness ?? 0.045;

    const steel = new THREE.MeshStandardMaterial({
        color: 0xA7ADB0,
        metalness: 0.95,
        roughness: 0.22
    });

    const darkSteel = new THREE.MeshStandardMaterial({
        color: 0x454B4E,
        metalness: 0.9,
        roughness: 0.3
    });

    const innerSteel = new THREE.MeshStandardMaterial({
        color: 0x202528,
        metalness: 0.75,
        roughness: 0.4,
        side: THREE.DoubleSide
    });

    // Rohrkörper
    const pipeGeometry = new THREE.CylinderGeometry(
        radius,
        radius,
        length,
        64,
        1,
        true
    );

    const pipe = new THREE.Mesh(pipeGeometry, steel);
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    group.add(pipe);

    // Dunkle Innenwand
    const innerGeometry = new THREE.CylinderGeometry(
        radius - wallThickness,
        radius - wallThickness,
        length,
        48,
        1,
        true
    );

    const inner = new THREE.Mesh(innerGeometry, innerSteel);
    group.add(inner);

    // Flansche an beiden Rohrenden
    function addFlange(y) {
        const flange = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius + 0.12,
                radius + 0.12,
                0.09,
                64
            ),
            darkSteel
        );

        flange.position.y = y;
        group.add(flange);

        // Schrauben rund um den Flansch
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;

            const bolt = new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.025,
                    0.025,
                    0.035,
                    12
                ),
                steel
            );

            bolt.position.set(
                Math.cos(angle) * (radius + 0.085),
                y,
                Math.sin(angle) * (radius + 0.085)
            );

            group.add(bolt);
        }
    }

    addFlange(length / 2 - 0.05);
    addFlange(-length / 2 + 0.05);

    // Verstärkungsringe am Rohr
    for (const y of [-length * 0.3, 0, length * 0.3]) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(
                radius + 0.012,
                0.025,
                12,
                64
            ),
            darkSteel
        );

        ring.position.y = y;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
    }

    // Rohrschellen
    for (const y of [-length * 0.28, length * 0.28]) {
        const clamp = new THREE.Mesh(
            new THREE.TorusGeometry(
                radius + 0.045,
                0.035,
                12,
                64
            ),
            steel
        );

        clamp.position.y = y;
        clamp.rotation.x = Math.PI / 2;
        group.add(clamp);

        // Kleine Befestigungsblöcke
        for (const side of [-1, 1]) {
            const bracket = new THREE.Mesh(
                new THREE.BoxGeometry(0.13, 0.12, 0.1),
                darkSteel
            );

            bracket.position.set(
                side * (radius + 0.08),
                y,
                0
            );

            group.add(bracket);
        }
    }

    // Rohröffnungen
    for (const y of [-length / 2, length / 2]) {
        const opening = new THREE.Mesh(
            new THREE.CircleGeometry(radius - wallThickness, 64),
            innerSteel
        );

        opening.position.y = y;
        opening.rotation.x = y > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(opening);
    }

    // Schatten und Oberflächen
    group.traverse(object => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });

    return group;
}
