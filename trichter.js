
function createFunnel(THREE, options = {}) {
    const group = new THREE.Group();

    const topWidth = options.topWidth ?? 1.8;
    const topDepth = options.topDepth ?? 1.5;
    const bottomRadius = options.bottomRadius ?? 0.24;
    const height = options.height ?? 1.15;
    const thickness = options.thickness ?? 0.065;

    const steel = new THREE.MeshStandardMaterial({
        color: 0x92999D,
        metalness: 0.92,
        roughness: 0.25
    });

    const darkSteel = new THREE.MeshStandardMaterial({
        color: 0x454B4E,
        metalness: 0.88,
        roughness: 0.32
    });

    const insideSteel = new THREE.MeshStandardMaterial({
        color: 0x303639,
        metalness: 0.8,
        roughness: 0.42,
        side: THREE.DoubleSide
    });

    // Trichterform als rechteckige Öffnung mit rundem Auslass
    const top = [
        [-topWidth / 2, 0, -topDepth / 2],
        [topWidth / 2, 0, -topDepth / 2],
        [topWidth / 2, 0, topDepth / 2],
        [-topWidth / 2, 0, topDepth / 2]
    ];

    const bottom = [];
    for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + i * Math.PI / 2;
        bottom.push([
            Math.cos(angle) * bottomRadius * Math.SQRT2,
            -height,
            Math.sin(angle) * bottomRadius * Math.SQRT2
        ]);
    }

    // Wandflächen
    const vertices = [];
    const indices = [];

    for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        const base = vertices.length / 3;

        vertices.push(...top[i], ...top[next], ...bottom[next], ...bottom[i]);

        indices.push(
            base, base + 1, base + 2,
            base, base + 2, base + 3
        );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const walls = new THREE.Mesh(geometry, steel);
    walls.material.side = THREE.DoubleSide;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Innere dunkle Fläche
    const innerGeometry = geometry.clone();
    const inner = new THREE.Mesh(innerGeometry, insideSteel);
    inner.scale.set(
        (topWidth - thickness * 2) / topWidth,
        0.995,
        (topDepth - thickness * 2) / topDepth
    );
    inner.position.y = -0.008;
    group.add(inner);

    // Verstärkter oberer Rand
    const rim = new THREE.Mesh(
        new THREE.BoxGeometry(topWidth + 0.12, 0.09, topDepth + 0.12),
        darkSteel
    );

    rim.position.y = 0.015;
    group.add(rim);

    // Öffnung im oberen Rand freihalten:
    const opening = new THREE.Mesh(
        new THREE.BoxGeometry(topWidth, 0.095, topDepth),
        insideSteel
    );

    opening.position.y = 0.02;
    opening.scale.set(0.99, 0.8, 0.99);
    group.add(opening);

    // Metallleisten an den vier Außenkanten
    for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + i * Math.PI / 2;

        const edge = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, height * 1.2, 12),
            darkSteel
        );

        edge.position.set(
            Math.cos(angle) * (topWidth * 0.36),
            -height / 2,
            Math.sin(angle) * (topDepth * 0.36)
        );

        group.add(edge);
    }

    // Schrauben am oberen Rand
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const bolt = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.025, 0.025, 12),
                steel
            );

            bolt.position.set(
                -topWidth / 2 + i * topWidth / 3,
                0.075,
                -topDepth / 2 + j * topDepth / 3
            );

            group.add(bolt);
        }
    }

    // Unterer Anschlussflansch
    const flange = new THREE.Mesh(
        new THREE.CylinderGeometry(
            bottomRadius + 0.12,
            bottomRadius + 0.12,
            0.12,
            48
        ),
        darkSteel
    );

    flange.position.y = -height;
    group.add(flange);

    // Auslass
    const outlet = new THREE.Mesh(
        new THREE.CylinderGeometry(
            bottomRadius,
            bottomRadius,
            0.2,
            48,
            1,
            true
        ),
        steel
    );

    outlet.position.y = -height - 0.1;
    group.add(outlet);

    group.traverse(object => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });

    return group;
}
