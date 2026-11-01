
function createMillionCoin(THREE, options = {}) {
    const group = new THREE.Group();

    // Doppelte Größe der normalen Münze
    const radius = options.radius ?? 1;
    const thickness = options.thickness ?? 0.15;

    const gold = new THREE.MeshStandardMaterial({
        color: 0xE8AE35,
        metalness: 1,
        roughness: 0.14
    });

    const brightGold = new THREE.MeshStandardMaterial({
        color: 0xFFE08A,
        metalness: 1,
        roughness: 0.1
    });

    const darkGold = new THREE.MeshStandardMaterial({
        color: 0x95600D,
        metalness: 0.95,
        roughness: 0.22
    });

    // Hauptkörper
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(
            radius,
            radius,
            thickness,
            128,
            1
        ),
        [gold, brightGold, gold]
    );

    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Äußerer massiver Münzrand
    function addRing(r, tube, material, z) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(r, tube, 20, 160),
            material
        );

        ring.position.z = z;
        group.add(ring);

        return ring;
    }

    addRing(radius * 0.94, 0.045, brightGold, thickness * 0.55);
    addRing(radius * 0.87, 0.018, darkGold, thickness * 0.57);
    addRing(radius * 0.81, 0.025, brightGold, thickness * 0.57);
    addRing(radius * 0.73, 0.012, darkGold, thickness * 0.57);
    addRing(radius * 0.67, 0.025, brightGold, thickness * 0.57);

    // Zentrale Fläche
    const center = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 0.65, 128),
        gold
    );

    center.position.z = thickness * 0.51;
    group.add(center);

    // Äußerer dekorativer Sternkranz
    for (let i = 0; i < 24; i++) {
        const angle = i / 24 * Math.PI * 2;

        const star = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.055, 1),
            brightGold
        );

        star.position.set(
            Math.cos(angle) * radius * 0.78,
            Math.sin(angle) * radius * 0.78,
            thickness * 0.65
        );

        group.add(star);
    }

    // Zentrales Medaillon
    addRing(radius * 0.42, 0.025, brightGold, thickness * 0.59);

    // Erhabene zentrale Zahl
    const numberCanvas = document.createElement("canvas");
    numberCanvas.width = 1024;
    numberCanvas.height = 1024;

    const ctx = numberCanvas.getContext("2d");

    ctx.clearRect(0, 0, 1024, 1024);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 175px Georgia";

    ctx.fillStyle = "#FFD76A";
    ctx.shadowColor = "#704000";
    ctx.shadowBlur = 12;

    ctx.fillText("1.000.000", 512, 470);

    ctx.font = "bold 65px Georgia";
    ctx.fillText("ONE MILLION COINS", 512, 610);

    const texture = new THREE.CanvasTexture(numberCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const numberMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        metalness: 0.8,
        roughness: 0.2,
        depthWrite: false
    });

    const number = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 1.05, radius * 1.05),
        numberMaterial
    );

    number.position.z = thickness * 0.58;
    group.add(number);

    // Kleine dekorative Sterne im Medaillon
    for (let i = 0; i < 8; i++) {
        const angle = i / 8 * Math.PI * 2;

        const decoration = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.045, 0),
            brightGold
        );

        decoration.position.set(
            Math.cos(angle) * radius * 0.52,
            Math.sin(angle) * radius * 0.52,
            thickness * 0.6
        );

        group.add(decoration);
    }

    // Animierbare Rotation
    function update(deltaTime) {
        group.rotation.z += deltaTime * 0.15;
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
        radius,
        thickness
    };
}
