
function createCoin(THREE, options = {}) {
    const group = new THREE.Group();

    const radius = options.radius ?? 0.5;
    const thickness = options.thickness ?? 0.075;

    // Hochwertiges Goldmaterial
    const gold = new THREE.MeshStandardMaterial({
        color: 0xE8AD32,
        metalness: 1.0,
        roughness: 0.19
    });

    const brightGold = new THREE.MeshStandardMaterial({
        color: 0xFFD76A,
        metalness: 1.0,
        roughness: 0.13
    });

    const darkGold = new THREE.MeshStandardMaterial({
        color: 0x98600E,
        metalness: 0.95,
        roughness: 0.25
    });

    // Münzkörper mit abgeschrägter Kante
    const bodyGeometry = new THREE.CylinderGeometry(
        radius,
        radius,
        thickness,
        96,
        1,
        false
    );

    const body = new THREE.Mesh(bodyGeometry, [
        gold,
        brightGold,
        gold
    ]);

    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Außenring
    function addRing(r, tube, material, z) {
        const geometry = new THREE.TorusGeometry(r, tube, 12, 128);
        const ring = new THREE.Mesh(geometry, material);

        ring.position.z = z;
        group.add(ring);

        return ring;
    }

    addRing(radius * 0.91, 0.025, brightGold, thickness * 0.53);
    addRing(radius * 0.84, 0.009, darkGold, thickness * 0.55);
    addRing(radius * 0.78, 0.012, brightGold, thickness * 0.55);

    // Zentraler geprägter Kreis
    addRing(radius * 0.62, 0.018, brightGold, thickness * 0.55);

    // Dekorativer Mittelpunkt
    const centerGeometry = new THREE.CircleGeometry(
        radius * 0.57,
        96
    );

    const center = new THREE.Mesh(centerGeometry, gold);
    center.position.z = thickness * 0.51;
    group.add(center);

    // Kleine geprägte Sterne
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;

        const starGeometry = new THREE.OctahedronGeometry(
            radius * 0.035,
            0
        );

        const star = new THREE.Mesh(starGeometry, brightGold);

        star.position.set(
            Math.cos(angle) * radius * 0.71,
            Math.sin(angle) * radius * 0.71,
            thickness * 0.59
        );

        group.add(star);
    }

    // Erhabenes zentrales Symbol
    const emblemGeometry = new THREE.TorusKnotGeometry(
        radius * 0.19,
        radius * 0.035,
        100,
        12,
        2,
        3
    );

    const emblem = new THREE.Mesh(emblemGeometry, brightGold);
    emblem.position.z = thickness * 0.65;
    group.add(emblem);

    // Lichtreflexe durch echte Geometrie
    const highlight = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.94, 0.006, 8, 128),
        brightGold
    );

    highlight.position.z = thickness * 0.54;
    group.add(highlight);

    group.traverse(object => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });

    return group;
}
