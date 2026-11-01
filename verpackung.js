
function createCoinPackaging(THREE, options = {}) {
    const group = new THREE.Group();

    const radius = options.radius ?? 0.85;
    const height = options.height ?? 2.3;

    const shards = [];
    let isBroken = false;
    let onBreakCallback = null;

    // Materialien
    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0x777d83,
        metalness: 0.9,
        roughness: 0.22
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.015,
        transmission: 1,
        thickness: 0.06,
        ior: 1.52,
        transparent: true,
        opacity: 1,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    // Unterer Metallring
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(radius + 0.08, radius + 0.08, 0.13, 64),
        metalMaterial
    );

    base.position.y = 0;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Oberer Metallring
    const topRing = new THREE.Mesh(
        new THREE.CylinderGeometry(radius + 0.08, radius + 0.08, 0.12, 64),
        metalMaterial
    );

    topRing.position.y = height;
    topRing.castShadow = true;
    group.add(topRing);

    // Glaszylinder
    const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(
            radius,
            radius,
            height - 0.12,
            64,
            1,
            true
        ),
        glassMaterial
    );

    glass.position.y = height / 2;
    glass.castShadow = true;
    glass.receiveShadow = true;
    group.add(glass);

    // Glasdeckel
    const glassTop = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.025, 64),
        glassMaterial.clone()
    );

    glassTop.position.y = height - 0.07;
    group.add(glassTop);

    // Innenboden
    const insideBase = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.96, radius * 0.96, 0.035, 48),
        new THREE.MeshStandardMaterial({
            color: 0x33383d,
            metalness: 0.65,
            roughness: 0.4
        })
    );

    insideBase.position.y = 0.09;
    group.add(insideBase);

    // Million Coin
    let coin = null;

    if (typeof createMillionCoin === "function") {
        const coinData = createMillionCoin(THREE);

        coin = coinData.group || coinData;
        coin.scale.setScalar(options.coinScale ?? 0.72);
        coin.position.set(0, height / 2, 0);
        coin.rotation.x = Math.PI / 2;

        group.add(coin);
    }

    // Zufällige Glasscherbe erstellen
    function createShard(index) {
        const shardGroup = new THREE.Group();

        // Zufällige Abmessungen
        const width = 0.3 + Math.random() * 1.05;
        const shardHeight = 0.4 + Math.random() * 1.35;
        const depth = 0.025 + Math.random() * 0.035;

        // Zufällige polygonale Form
        const shape = new THREE.Shape();

        const pointCount = 3 + Math.floor(Math.random() * 4);

        for (let i = 0; i < pointCount; i++) {
            const angle = (i / pointCount) * Math.PI * 2;

            const randomRadius = 0.65 + Math.random() * 0.35;

            const x = Math.cos(angle) * width * 0.5 * randomRadius;
            const y = Math.sin(angle) * shardHeight * 0.5 * randomRadius;

            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }

        shape.closePath();

        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: depth,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: 0.012,
            bevelThickness: 0.01
        });

        geometry.center();

        const material = glassMaterial.clone();
        material.depthWrite = true;

        const shard = new THREE.Mesh(geometry, material);

        shard.castShadow = true;
        shard.receiveShadow = true;

        shardGroup.add(shard);

        // Zufällige Position
        const angle = Math.random() * Math.PI * 2;
        const distance = radius * (0.65 + Math.random() * 0.3);

        shardGroup.position.set(
            Math.cos(angle) * distance,
            0.3 + Math.random() * (height - 0.6),
            Math.sin(angle) * distance
        );

        // Zufällige Drehung
        shardGroup.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        // Daten für die spätere Physik
        shardGroup.userData.mass = 0.3 + Math.random() * 2;
        shardGroup.userData.needsPhysics = true;
        shardGroup.userData.shardIndex = index;
        shardGroup.userData.width = width;
        shardGroup.userData.height = shardHeight;

        shardGroup.visible = false;
        group.add(shardGroup);

        return shardGroup;
    }

    // Genau 6 Scherben
    for (let i = 0; i < 6; i++) {
        shards.push(createShard(i));
    }

    // Glas zerbrechen
    function breakGlass() {
        if (isBroken) return;

        isBroken = true;

        glass.visible = false;
        glassTop.visible = false;

        // Alle 6 zufälligen Scherben aktivieren
        shards.forEach((shard) => {
            shard.visible = true;

            shard.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                1 + Math.random() * 4,
                (Math.random() - 0.5) * 5
            );

            shard.userData.angularVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
            );
        });

        if (onBreakCallback) {
            onBreakCallback(shards);
        }
    }

    // Linksklick-Erkennung
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function handlePointerDown(event, camera, renderer) {
        if (event.button !== 0 || isBroken) return;

        const rect = renderer.domElement.getBoundingClientRect();

        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);

        const hitObjects = [
            glass,
            glassTop,
            ...shards
        ];

        const hits = raycaster.intersectObjects(hitObjects, true);

        if (hits.length > 0) {
            breakGlass();
        }
    }

    function setOnBreak(callback) {
        onBreakCallback = callback;
    }

    function getGlassPieces() {
        return shards;
    }

    return {
        group,
        coin,
        glass,
        shards,
        breakGlass,
        handlePointerDown,
        setOnBreak,
        getGlassPieces,

        get broken() {
            return isBroken;
        }
    };
}
