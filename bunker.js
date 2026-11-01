
function createBunker(THREE, options = {}) {

    // =====================================================
    // EINSTELLUNGEN
    // =====================================================

    const settings = {
        width: options.width ?? 32,
        depth: options.depth ?? 32,
        height: options.height ?? 22,

        wallThickness: options.wallThickness ?? 1.2,
        floorThickness: options.floorThickness ?? 1.2,

        floors: options.floors ?? 10,

        shaftWidth: options.shaftWidth ?? 10,
        shaftDepth: options.shaftDepth ?? 10,

        platformThickness: options.platformThickness ?? 0.35,

        railingHeight: options.railingHeight ?? 1.15,
        railingEnabled: options.railingEnabled ?? true,

        createCeiling: options.createCeiling ?? false,
        details: options.details ?? true,

        stairWidth: options.stairWidth ?? 5.5,
        stairSide: options.stairSide ?? "right",

        stairOpeningWidth: options.stairOpeningWidth ?? 5.5,
        stairOpeningDepth: options.stairOpeningDepth ?? 12
    };

    const W = settings.width;
    const D = settings.depth;
    const H = settings.height;
    const WT = settings.wallThickness;

    const floorCount = Math.max(2, Math.floor(settings.floors));

    const shaftW = Math.min(settings.shaftWidth, W - 8);
    const shaftD = Math.min(settings.shaftDepth, D - 8);

    const innerHalfW = shaftW / 2;
    const innerHalfD = shaftD / 2;

    const outerHalfW = W / 2 - WT - 0.5;
    const outerHalfD = D / 2 - WT - 0.5;

    const sideWidth = outerHalfW - innerHalfW;
    const frontDepth = outerHalfD - innerHalfD;

    const usableHeight = H - 1.6;
    const levelSpacing = usableHeight / (floorCount - 1);

    const group = new THREE.Group();
    group.name = "ONE_MILLION_COINS_BUNKER";

    const collisionObjects = [];
    const floorPlatforms = [];
    const floorHeights = [0];

    const railings = [];
    const railingPosts = [];
    const lightPositions = [];

    let physicsRegistered = false;

    // =====================================================
    // MATERIALIEN
    // =====================================================

    const materials = {

        concrete: new THREE.MeshStandardMaterial({
            color: 0x777b77,
            roughness: 0.96
        }),

        floor: new THREE.MeshStandardMaterial({
            color: 0x555c59,
            roughness: 0.92
        }),

        darkConcrete: new THREE.MeshStandardMaterial({
            color: 0x3c4441,
            roughness: 0.96
        }),

        reinforcedConcrete: new THREE.MeshStandardMaterial({
            color: 0x505754,
            roughness: 0.94
        }),

        metal: new THREE.MeshStandardMaterial({
            color: 0x788286,
            metalness: 0.82,
            roughness: 0.36
        }),

        darkMetal: new THREE.MeshStandardMaterial({
            color: 0x22292c,
            metalness: 0.72,
            roughness: 0.48
        }),

        yellow: new THREE.MeshStandardMaterial({
            color: 0xc2a04b,
            roughness: 0.72
        }),

        black: new THREE.MeshStandardMaterial({
            color: 0x171b1d,
            roughness: 0.9
        })
    };

    // =====================================================
    // HILFSFUNKTIONEN
    // =====================================================

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
        rotationZ = 0,
        collision = false
    ) {

        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius,
                radius,
                length,
                12
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

        if (collision) {
            collisionObjects.push(mesh);
        }

        return mesh;
    }

    function addRail(name, start, end, radius = 0.045) {

        const direction = new THREE.Vector3().subVectors(
            end,
            start
        );

        const length = direction.length();

        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius,
                radius,
                length,
                10
            ),
            materials.metal
        );

        mesh.name = name;

        mesh.position.copy(start).add(end).multiplyScalar(0.5);

        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.clone().normalize()
        );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        group.add(mesh);
        railings.push(mesh);

        return mesh;
    }

    // =====================================================
    // FUNDAMENT UND ERDGESCHOSS
    // =====================================================

    addBox(
        "Bunker_Fundament",
        W + WT * 2,
        1.2,
        D + WT * 2,
        0,
        -1.1,
        0,
        materials.darkConcrete,
        true
    );

    addBox(
        "Erdgeschoss_Boden",
        W,
        settings.floorThickness,
        D,
        0,
        -settings.floorThickness / 2,
        0,
        materials.floor,
        true
    );

    // =====================================================
    // AUSSENWÄNDE
    // =====================================================

    addBox(
        "Aussenwand_Links",
        WT,
        H,
        D + WT * 2,
        -W / 2 - WT / 2,
        H / 2,
        0,
        materials.concrete,
        true
    );

    addBox(
        "Aussenwand_Rechts",
        WT,
        H,
        D + WT * 2,
        W / 2 + WT / 2,
        H / 2,
        0,
        materials.concrete,
        true
    );

    addBox(
        "Aussenwand_Hinten",
        W,
        H,
        WT,
        0,
        H / 2,
        -D / 2 - WT / 2,
        materials.concrete,
        true
    );

    addBox(
        "Aussenwand_Vorne",
        W,
        H,
        WT,
        0,
        H / 2,
        D / 2 + WT / 2,
        materials.concrete,
        true
    );

    if (settings.createCeiling) {

        addBox(
            "Bunker_Decke",
            W + WT * 2,
            0.8,
            D + WT * 2,
            0,
            H + 0.4,
            0,
            materials.darkConcrete,
            true
        );
    }

    // =====================================================
    // BETONSTÜTZEN
    // =====================================================

    const supportPositions = [
        [-W / 2 + 1.5, -D / 2 + 1.5],
        [W / 2 - 1.5, -D / 2 + 1.5],
        [-W / 2 + 1.5, D / 2 - 1.5],
        [W / 2 - 1.5, D / 2 - 1.5],
        [-W / 2 + 1.5, 0],
        [W / 2 - 1.5, 0],
        [0, -D / 2 + 1.5],
        [0, D / 2 - 1.5]
    ];

    supportPositions.forEach((position, index) => {

        addBox(
            "Betonstuetze_" + index,
            0.8,
            H,
            0.8,
            position[0],
            H / 2,
            position[1],
            materials.reinforcedConcrete,
            true
        );
    });

    // =====================================================
    // WANDVERSTÄRKUNGEN
    // =====================================================

    for (let i = 0; i < 6; i++) {

        const z = -D / 2 + 3 + i * (D - 6) / 5;

        addBox(
            "Stahlverstaerkung_Links_" + i,
            0.12,
            H,
            0.16,
            -W / 2 + WT + 0.08,
            H / 2,
            z,
            materials.darkMetal
        );

        addBox(
            "Stahlverstaerkung_Rechts_" + i,
            0.12,
            H,
            0.16,
            W / 2 - WT - 0.08,
            H / 2,
            z,
            materials.darkMetal
        );
    }

    // =====================================================
    // ETAGENHÖHEN
    // =====================================================

    for (let level = 1; level < floorCount; level++) {
        floorHeights.push(level * levelSpacing);
    }

    // =====================================================
    // TREPPENBEREICH
    // =====================================================

    const stairX = settings.stairSide === "left"
        ? -W / 2 + WT + settings.stairWidth / 2
        : W / 2 - WT - settings.stairWidth / 2;

    const stairArea = {

        side: settings.stairSide,

        width: settings.stairWidth,

        length: D - 5,

        height: H,

        floors: floorCount,

        floorHeights: [...floorHeights],

        floorSpacing: levelSpacing,

        center: new THREE.Vector3(
            stairX,
            H / 2,
            0
        ),

        wallPosition: new THREE.Vector3(
            settings.stairSide === "left"
                ? -W / 2 + WT
                : W / 2 - WT,
            H / 2,
            0
        ),

        startPosition: new THREE.Vector3(
            stairX,
            0,
            D / 2 - 3
        ),

        endPosition: new THREE.Vector3(
            stairX,
            H - 1.6,
            -D / 2 + 3
        ),

        openingWidth: settings.stairOpeningWidth,
        openingDepth: settings.stairOpeningDepth,

        stairOptions: {
            width: 1.8,
            stepCount: 24,
            stepDepth: 0.34,
            stepHeight: 0.095,
            floorHeight: levelSpacing,
            levels: floorCount - 1,
            startX: stairX,
            startY: 0,
            startZ: D / 2 - 3,
            direction: 3
        }
    };

    // =====================================================
    // ETAGENPLATTFORMEN
    // =====================================================

    function createPlatformPiece(
        parent,
        name,
        width,
        depth,
        x,
        z,
        pieces
    ) {

        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                settings.platformThickness,
                depth
            ),
            materials.floor
        );

        mesh.name = name;

        mesh.position.set(
            x,
            -settings.platformThickness / 2,
            z
        );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        parent.add(mesh);

        pieces.push(mesh);
        collisionObjects.push(mesh);

        return mesh;
    }

    // =====================================================
    // GELÄNDER
    // =====================================================

    function createRailingSegment(
        name,
        start,
        end,
        postCount
    ) {

        if (!settings.railingEnabled) {
            return;
        }

        const height = settings.railingHeight;

        const topStart = start.clone();
        const topEnd = end.clone();

        topStart.y += height;
        topEnd.y += height;

        const middleStart = start.clone();
        const middleEnd = end.clone();

        middleStart.y += height * 0.5;
        middleEnd.y += height * 0.5;

        const bottomStart = start.clone();
        const bottomEnd = end.clone();

        bottomStart.y += 0.12;
        bottomEnd.y += 0.12;

        addRail(name + "_Handlauf", topStart, topEnd, 0.055);
        addRail(name + "_Mittelstrebe", middleStart, middleEnd, 0.035);
        addRail(name + "_Unterstrebe", bottomStart, bottomEnd, 0.03);

        for (let i = 0; i <= postCount; i++) {

            const t = i / postCount;

            const position = new THREE.Vector3().lerpVectors(
                start,
                end,
                t
            );

            const post = addCylinder(
                name + "_Pfosten_" + i,
                0.055,
                height,
                position.x,
                position.y + height / 2,
                position.z,
                materials.metal,
                0,
                0,
                true
            );

            railingPosts.push(post);

            addBox(
                name + "_Fussplatte_" + i,
                0.16,
                0.045,
                0.16,
                position.x,
                position.y + 0.025,
                position.z,
                materials.darkMetal,
                true
            );
        }
    }

    // =====================================================
    // ETAGEN ERSTELLEN
    // =====================================================

    function createFloorPlatform(level, y) {

        const floorGroup = new THREE.Group();

        floorGroup.name = "Etage_" + level;
        floorGroup.position.y = y;

        group.add(floorGroup);

        const pieces = [];

        // Links
        createPlatformPiece(
            floorGroup,
            "Etage_" + level + "_Links",
            sideWidth,
            outerHalfD * 2,
            -(innerHalfW + sideWidth / 2),
            0,
            pieces
        );

        // Rechts: in zwei Teile aufgeteilt.
        // Dadurch bleibt ein Treppenbereich frei.
        const openingDepth = settings.stairOpeningDepth;
        const openingWidth = settings.stairOpeningWidth;

        const gapHalf = openingDepth / 2;

        const rightX = innerHalfW + sideWidth / 2;

        const rightDepth = outerHalfD - gapHalf;

        if (rightDepth > 0.5) {

            createPlatformPiece(
                floorGroup,
                "Etage_" + level + "_Rechts_Hinten",
                sideWidth,
                rightDepth,
                rightX,
                -(outerHalfD + gapHalf) / 2,
                pieces
            );

            createPlatformPiece(
                floorGroup,
                "Etage_" + level + "_Rechts_Vorne",
                sideWidth,
                rightDepth,
                rightX,
                (outerHalfD + gapHalf) / 2,
                pieces
            );
        }

        // Hinten
        createPlatformPiece(
            floorGroup,
            "Etage_" + level + "_Hinten",
            shaftW,
            frontDepth,
            0,
            -(innerHalfD + frontDepth / 2),
            pieces
        );

        // Vorne
        createPlatformPiece(
            floorGroup,
            "Etage_" + level + "_Vorne",
            shaftW,
            frontDepth,
            0,
            innerHalfD + frontDepth / 2,
            pieces
        );

        // =================================================
        // GELÄNDER AM MITTELSCHACHT
        // =================================================

        if (settings.railingEnabled) {

            const railY = y - settings.platformThickness;

            createRailingSegment(
                "Etage_" + level + "_Geländer_Hinten",
                new THREE.Vector3(
                    -innerHalfW,
                    railY,
                    -innerHalfD
                ),
                new THREE.Vector3(
                    innerHalfW,
                    railY,
                    -innerHalfD
                ),
                5
            );

            createRailingSegment(
                "Etage_" + level + "_Geländer_Vorne",
                new THREE.Vector3(
                    -innerHalfW,
                    railY,
                    innerHalfD
                ),
                new THREE.Vector3(
                    innerHalfW,
                    railY,
                    innerHalfD
                ),
                5
            );

            createRailingSegment(
                "Etage_" + level + "_Geländer_Links",
                new THREE.Vector3(
                    -innerHalfW,
                    railY,
                    -innerHalfD
                ),
                new THREE.Vector3(
                    -innerHalfW,
                    railY,
                    innerHalfD
                ),
                5
            );

            createRailingSegment(
                "Etage_" + level + "_Geländer_Rechts",
                new THREE.Vector3(
                    innerHalfW,
                    railY,
                    -innerHalfD
                ),
                new THREE.Vector3(
                    innerHalfW,
                    railY,
                    innerHalfD
                ),
                5
            );
        }

        // =================================================
        // AUSSENGELÄNDER
        // =================================================

        if (settings.railingEnabled) {

            const railY = y - settings.platformThickness;

            const railOffset = 0.25;

            createRailingSegment(
                "Aussengeländer_Hinten_" + level,
                new THREE.Vector3(
                    -outerHalfW,
                    railY,
                    -outerHalfD + railOffset
                ),
                new THREE.Vector3(
                    outerHalfW,
                    railY,
                    -outerHalfD + railOffset
                ),
                15
            );

            createRailingSegment(
                "Aussengeländer_Vorne_" + level,
                new THREE.Vector3(
                    -outerHalfW,
                    railY,
                    outerHalfD - railOffset
                ),
                new THREE.Vector3(
                    outerHalfW,
                    railY,
                    outerHalfD - railOffset
                ),
                15
            );

            createRailingSegment(
                "Aussengeländer_Links_" + level,
                new THREE.Vector3(
                    -outerHalfW + railOffset,
                    railY,
                    -outerHalfD
                ),
                new THREE.Vector3(
                    -outerHalfW + railOffset,
                    railY,
                    outerHalfD
                ),
                15
            );

            // Rechts nur außerhalb der Treppenöffnung.
            const openingStart = -gapHalf;
            const openingEnd = gapHalf;

            createRailingSegment(
                "Aussengeländer_Rechts_Hinten_" + level,
                new THREE.Vector3(
                    outerHalfW - railOffset,
                    railY,
                    -outerHalfD
                ),
                new THREE.Vector3(
                    outerHalfW - railOffset,
                    railY,
                    openingStart
                ),
                6
            );

            createRailingSegment(
                "Aussengeländer_Rechts_Vorne_" + level,
                new THREE.Vector3(
                    outerHalfW - railOffset,
                    railY,
                    openingEnd
                ),
                new THREE.Vector3(
                    outerHalfW - railOffset,
                    railY,
                    outerHalfD
                ),
                6
            );
        }

        floorPlatforms.push({
            level,
            y,
            group: floorGroup,
            pieces
        });
    }

    for (let level = 1; level < floorCount; level++) {

        createFloorPlatform(
            level,
            floorHeights[level]
        );
    }

    // =====================================================
    // MASCHINENFUNDAMENT
    // =====================================================

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
        materials.darkConcrete,
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
        materials.metal,
        true
    );

    // =====================================================
    // BODENMARKIERUNGEN
    // =====================================================

    for (let i = 0; i < 12; i++) {

        addBox(
            "Bodenmarkierung_" + i,
            0.55,
            0.025,
            0.12,
            -W / 2 + 2 + i * 0.8,
            0.015,
            D / 2 - 1,
            materials.yellow
        );
    }

    // =====================================================
    // TECHNISCHE WANDDETAILS
    // =====================================================

    if (settings.details) {

        for (let i = 0; i < 8; i++) {

            const x = -W / 2 + 3 + i * 3.7;

            addBox(
                "Rueckwand_Metallplatte_" + i,
                1.3,
                1.8,
                0.08,
                x,
                2.5,
                -D / 2 + WT + 0.05,
                materials.darkMetal
            );
        }

        for (let level = 0; level < floorCount; level++) {

            const y = floorHeights[level] + 0.4;

            for (let i = 0; i < 5; i++) {

                const x = -W / 2 + 3 + i * 6;

                addCylinder(
                    "Wandbolzen_" + level + "_" + i,
                    0.075,
                    0.1,
                    x,
                    y,
                    -D / 2 + WT + 0.1,
                    materials.metal,
                    Math.PI / 2
                );
            }
        }
    }

    // =====================================================
    // LICHTPOSITIONEN
    // =====================================================

    for (let level = 0; level < floorCount; level++) {

        const y = level === floorCount - 1
            ? Math.min(H - 0.6, floorHeights[level] + 0.8)
            : floorHeights[level] + Math.min(
                1.7,
                levelSpacing * 0.65
            );

        const positions = [
            [-W / 2 + 4, y, -D / 2 + 4],
            [W / 2 - 4, y, -D / 2 + 4],
            [-W / 2 + 4, y, D / 2 - 4],
            [W / 2 - 4, y, D / 2 - 4],
            [0, y, -D / 2 + 4],
            [0, y, D / 2 - 4]
        ];

        positions.forEach(position => {

            lightPositions.push({
                position: new THREE.Vector3(
                    position[0],
                    position[1],
                    position[2]
                ),
                floor: level + 1
            });
        });
    }

    // =====================================================
    // KEIN DECKEL ÜBER DEM MITTELSCHACHT
    // =====================================================

    const topPlatform = null;

    // =====================================================
    // PHYSIK-KOLLISIONEN
    // =====================================================

    function registerPhysics(physics) {

        if (!physics) {
            throw new Error(
                "Bunker: Physik-System fehlt."
            );
        }

        if (physicsRegistered) {
            return;
        }

        group.updateWorldMatrix(true, true);

        const registered = new Set();

        function registerBox(mesh) {

            if (!mesh || registered.has(mesh)) {
                return;
            }

            registered.add(mesh);

            mesh.updateWorldMatrix(true, false);

            const worldPosition = new THREE.Vector3();
            const worldQuaternion = new THREE.Quaternion();
            const worldScale = new THREE.Vector3();

            mesh.getWorldPosition(worldPosition);
            mesh.getWorldQuaternion(worldQuaternion);
            mesh.getWorldScale(worldScale);

            if (!mesh.geometry.boundingBox) {
                mesh.geometry.computeBoundingBox();
            }

            const localSize = new THREE.Vector3();

            mesh.geometry.boundingBox.getSize(localSize);

            const size = new THREE.Vector3(
                localSize.x * Math.abs(worldScale.x),
                localSize.y * Math.abs(worldScale.y),
                localSize.z * Math.abs(worldScale.z)
            );

            const collider = new THREE.Mesh(
                new THREE.BoxGeometry(
                    Math.max(size.x, 0.01),
                    Math.max(size.y, 0.01),
                    Math.max(size.z, 0.01)
                )
            );

            collider.name = "BunkerCollider_" + mesh.name;

            collider.position.copy(worldPosition);
            collider.quaternion.copy(worldQuaternion);

            physics.addBox(collider, {
                mass: 0
            });
        }

        // Wände, Fundament, Stützen, Maschinenfundament
        for (const mesh of collisionObjects) {
            registerBox(mesh);
        }

        // Alle Etagenböden
        for (const floor of floorPlatforms) {

            for (const piece of floor.pieces) {
                registerBox(piece);
            }
        }

        // Geländer und Pfosten
        for (const rail of railings) {
            registerBox(rail);
        }

        for (const post of railingPosts) {
            registerBox(post);
        }

        physicsRegistered = true;
    }

    // =====================================================
    // ETAGENINFORMATIONEN
    // =====================================================

    function getFloorHeight(floor) {

        const index = Math.max(
            0,
            Math.min(floorCount - 1, floor - 1)
        );

        return floorHeights[index];
    }

    function getFloorInfo(floor) {

        const index = Math.max(
            0,
            Math.min(floorCount - 1, floor - 1)
        );

        return {
            floor: index + 1,
            height: floorHeights[index],
            nextHeight: floorHeights[index + 1] ?? null,
            totalFloors: floorCount
        };
    }

    // =====================================================
    // RÜCKGABE
    // =====================================================

    return {

        group,

        settings,

        collisionObjects,

        lightPositions,

        machinePosition,

        upperPlatform: null,

        topPlatform,

        stairArea,

        floorPlatforms,

        floorHeights,

        railings,

        railingPosts,

        materials,

        registerPhysics,

        getFloorHeight,

        getFloorInfo,

        get physicsRegistered() {
            return physicsRegistered;
        }
    };
}
