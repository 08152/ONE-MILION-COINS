
function createBunker(THREE, options = {}) {

    const group = new THREE.Group();

    // =========================================
    // ABMESSUNGEN
    // =========================================

    const settings = {
        width: options.width ?? 32,
        depth: options.depth ?? 32,
        height: options.height ?? 22,

        wallThickness: options.wallThickness ?? 1.2,
        floorThickness: options.floorThickness ?? 1.2,
        ceilingThickness: options.ceilingThickness ?? 1,

        createCeiling: options.createCeiling ?? false
    };

    const W = settings.width;
    const D = settings.depth;
    const H = settings.height;
    const WT = settings.wallThickness;

    const collisionObjects = [];

    // =========================================
    // MATERIALIEN
    // =========================================

    const concreteMaterial = new THREE.MeshStandardMaterial({
        color: 0x777873,
        roughness: 0.96,
        metalness: 0.02
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x555956,
        roughness: 0.92
    });

    const darkConcreteMaterial = new THREE.MeshStandardMaterial({
        color: 0x454947,
        roughness: 0.95
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0x555d61,
        metalness: 0.8,
        roughness: 0.4
    });

    const darkMetalMaterial = new THREE.MeshStandardMaterial({
        color: 0x202629,
        metalness: 0.65,
        roughness: 0.55
    });

    const yellowMaterial = new THREE.MeshStandardMaterial({
        color: 0xb99842,
        roughness: 0.8
    });

    // =========================================
    // HILFSFUNKTION
    // =========================================

    function addBox(
        name,
        width,
        height,
        depth,
        x,
        y,
        z,
        material,
        collision = false
    ) {

        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            material
        );

        mesh.name = name;
        mesh.position.set(x, y, z);

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        group.add(mesh);

        if (collision) {
            collisionObjects.push(mesh);
        }

        return mesh;
    }

    function addCylinder(
        name,
        radius,
        length,
        x,
        y,
        z,
        material,
        rotationX = 0,
        rotationZ = 0
    ) {

        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius,
                radius,
                length,
                20
            ),
            material
        );

        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.rotation.x = rotationX;
        mesh.rotation.z = rotationZ;

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        group.add(mesh);

        return mesh;
    }

    // =========================================
    // FUNDAMENT
    // =========================================

    addBox(
        "Bunker_Fundament",
        W + WT * 2,
        1,
        D + WT * 2,
        0,
        -0.9,
        0,
        darkConcreteMaterial,
        true
    );

    // =========================================
    // BODEN
    // =========================================

    addBox(
        "Bunker_Boden",
        W,
        settings.floorThickness,
        D,
        0,
        -settings.floorThickness / 2,
        0,
        floorMaterial,
        true
    );

    // =========================================
    // VIER MASSIVE AUSSENWÄNDE
    // =========================================

    addBox(
        "Wand_Links",
        WT,
        H,
        D + WT * 2,
        -W / 2 - WT / 2,
        H / 2,
        0,
        concreteMaterial,
        true
    );

    addBox(
        "Wand_Rechts",
        WT,
        H,
        D + WT * 2,
        W / 2 + WT / 2,
        H / 2,
        0,
        concreteMaterial,
        true
    );

    addBox(
        "Wand_Hinten",
        W,
        H,
        WT,
        0,
        H / 2,
        -D / 2 - WT / 2,
        concreteMaterial,
        true
    );

    addBox(
        "Wand_Vorne",
        W,
        H,
        WT,
        0,
        H / 2,
        D / 2 + WT / 2,
        concreteMaterial,
        true
    );

    // =========================================
    // DECKE OPTIONAL
    // =========================================

    if (settings.createCeiling) {

        addBox(
            "Bunker_Decke",
            W + WT * 2,
            settings.ceilingThickness,
            D + WT * 2,
            0,
            H + settings.ceilingThickness / 2,
            0,
            darkConcreteMaterial,
            true
        );
    }

    // =========================================
    // BETONSTÜTZEN
    // =========================================

    const supportPositions = [
        [-W / 2 + 1.5, -D / 2 + 1.5],
        [ W / 2 - 1.5, -D / 2 + 1.5],
        [-W / 2 + 1.5,  D / 2 - 1.5],
        [ W / 2 - 1.5,  D / 2 - 1.5]
    ];

    supportPositions.forEach((position, index) => {

        const [x, z] = position;

        addBox(
            "Betonstuetze_" + index,
            0.75,
            H,
            0.75,
            x,
            H / 2,
            z,
            darkConcreteMaterial,
            true
        );
    });

    // =========================================
    // DECKENBALKEN
    // =========================================

    for (let z = -D / 2 + 3; z < D / 2; z += 6) {

        addBox(
            "Deckenbalken",
            W,
            0.35,
            0.45,
            0,
            H - 0.25,
            z,
            darkConcreteMaterial
        );
    }

    // =========================================
    // WANDVERSTÄRKUNGEN
    // =========================================

    for (let i = 0; i < 5; i++) {

        const z = -D / 2 + 3 + i * 6;

        addBox(
            "Verstaerkung_Links_" + i,
            0.2,
            H,
            0.3,
            -W / 2 + WT,
            H / 2,
            z,
            darkConcreteMaterial
        );

        addBox(
            "Verstaerkung_Rechts_" + i,
            0.2,
            H,
            0.3,
            W / 2 - WT,
            H / 2,
            z,
            darkConcreteMaterial
        );
    }

    // =========================================
    // OBERE KLEINE PLATTFORM
    // =========================================

    const platformWidth = 7;
    const platformDepth = 5;
    const platformHeight = 0.45;

    const platformX = -W / 2 + platformWidth / 2 + 1;
    const platformZ = -D / 2 + platformDepth / 2 + 1;

    const upperPlatform = addBox(
        "Obere_Plattform",
        platformWidth,
        platformHeight,
        platformDepth,
        platformX,
        H - platformHeight / 2 - 0.2,
        platformZ,
        floorMaterial,
        true
    );

    // Metallkante der Plattform
    addBox(
        "Plattform_Kante",
        platformWidth + 0.15,
        0.12,
        platformDepth + 0.15,
        platformX,
        H - platformHeight - 0.1,
        platformZ,
        metalMaterial
    );

    // =========================================
    // GELÄNDER DER OBEREN PLATTFORM
    // =========================================

    const railingY = H - 0.2;

    // Hinteres Geländer
    addCylinder(
        "Plattform_Gelaender_Hinten",
        0.045,
        platformWidth,
        platformX,
        railingY,
        platformZ - platformDepth / 2,
        metalMaterial,
        0,
        Math.PI / 2
    );

    // Rechtes Geländer
    addCylinder(
        "Plattform_Gelaender_Rechts",
        0.045,
        platformDepth,
        platformX + platformWidth / 2,
        railingY,
        platformZ,
        metalMaterial
    );

    // Geländerpfosten
    for (let i = 0; i < 5; i++) {

        const x = platformX - platformWidth / 2 + i * platformWidth / 4;

        addCylinder(
            "Plattform_Pfosten_" + i,
            0.055,
            1,
            x,
            railingY - 0.5,
            platformZ - platformDepth / 2,
            metalMaterial
        );
    }

    // =========================================
    // TREPPENBEREICH
    // =========================================

    // Große freie Fläche entlang der rechten Wand.
    // Hier wird später treppe.js eingesetzt.

    const stairArea = {
        side: "right",

        width: 7,

        length: D - 3,

        height: H,

        center: new THREE.Vector3(
            W / 2 - 4,
            H / 2,
            0
        ),

        wallPosition: new THREE.Vector3(
            W / 2 - WT / 2,
            H / 2,
            0
        )
    };

    // =========================================
    // MASCHINENPLATTFORM
    // =========================================

    const machinePosition = new THREE.Vector3(
        -W / 2 + 8,
        0,
        0
    );

    addBox(
        "Maschinenfundament",
        5,
        0.3,
        5,
        machinePosition.x,
        0.15,
        machinePosition.z,
        darkConcreteMaterial,
        true
    );

    addBox(
        "Maschinen_Metallplatte",
        4.6,
        0.08,
        4.6,
        machinePosition.x,
        0.34,
        machinePosition.z,
        metalMaterial
    );

    // =========================================
    // BODENMARKIERUNGEN
    // =========================================

    const markingMaterial = new THREE.MeshStandardMaterial({
        color: 0xb99b4b,
        roughness: 0.85
    });

    for (let i = 0; i < 12; i++) {

        addBox(
            "Bodenmarkierung_" + i,
            0.5,
            0.015,
            0.12,
            -W / 2 + 2 + i * 0.8,
            0.01,
            D / 2 - 1,
            markingMaterial
        );
    }

    // =========================================
    // DECKENLICHT-POSITIONEN
    // =========================================

    const lightPositions = [];

    for (let x = -W / 2 + 4; x <= W / 2 - 4; x += 6) {

        for (let z = -D / 2 + 4; z <= D / 2 - 4; z += 6) {

            lightPositions.push(
                new THREE.Vector3(
                    x,
                    H - 0.5,
                    z
                )
            );
        }
    }

    // =========================================
    // PHYSIK-REGISTRIERUNG
    // =========================================

    function registerPhysics(physics) {

        if (!physics) return;

        for (const object of collisionObjects) {

            physics.addBox(object, {
                mass: 0
            });
        }
    }

    // =========================================
    // ERGEBNIS
    // =========================================

    return {

        group,

        settings,

        collisionObjects,

        lightPositions,

        machinePosition,

        upperPlatform,

        stairArea,

        registerPhysics,

        materials: {
            concrete: concreteMaterial,
            floor: floorMaterial,
            darkConcrete: darkConcreteMaterial,
            metal: metalMaterial,
            darkMetal: darkMetalMaterial,
            yellow: yellowMaterial
        }

    };
}
