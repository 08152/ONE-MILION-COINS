
function createBunkerStairs(THREE, options = {}) {

    const group = new THREE.Group();
    group.name = "Bunker_Treppenanlage";

    // =====================================================
    // EINSTELLUNGEN
    // =====================================================

    const settings = {

        width: options.width ?? 1.8,

        stepCount: options.stepCount ?? 24,

        stepDepth: options.stepDepth ?? 0.34,

        stepHeight: options.stepHeight ?? 0.095,

        floorHeight: options.floorHeight ?? 2.266,

        levels: options.levels ?? 9,

        landingLength: options.landingLength ?? 2.2,

        railingHeight: options.railingHeight ?? 1.05,

        railingEnabled: options.railingEnabled ?? true,

        startX: options.startX ?? 10,

        startY: options.startY ?? 0,

        startZ: options.startZ ?? 12,

        direction: options.direction ?? 0,

        wallOffset: options.wallOffset ?? 0,

        stairWidth: options.stairWidth ?? 1.8,

        createCollision: options.createCollision ?? true
    };

    const width = settings.width;
    const stepCount = settings.stepCount;
    const stepDepth = settings.stepDepth;
    const floorHeight = settings.floorHeight;

    const segmentLength = stepCount * stepDepth;

    // =====================================================
    // MATERIALIEN
    // =====================================================

    const concrete = new THREE.MeshStandardMaterial({
        color: 0x777b7d,
        roughness: 0.92,
        metalness: 0.05
    });

    const concreteDark = new THREE.MeshStandardMaterial({
        color: 0x484d50,
        roughness: 0.88,
        metalness: 0.1
    });

    const concreteEdge = new THREE.MeshStandardMaterial({
        color: 0x62696b,
        roughness: 0.9
    });

    const metal = new THREE.MeshStandardMaterial({
        color: 0x656d72,
        metalness: 0.88,
        roughness: 0.28
    });

    const handrailMaterial = new THREE.MeshStandardMaterial({
        color: 0x9b9fa1,
        metalness: 0.95,
        roughness: 0.2
    });

    const darkMetal = new THREE.MeshStandardMaterial({
        color: 0x252b2e,
        metalness: 0.8,
        roughness: 0.4
    });

    const warningMaterial = new THREE.MeshStandardMaterial({
        color: 0xc4a044,
        roughness: 0.72
    });

    // =====================================================
    // SPEICHER
    // =====================================================

    const collisionObjects = [];

    const steps = [];
    const landings = [];
    const railings = [];
    const railingPosts = [];
    const sideWalls = [];

    const connections = [];
    const stairFlights = [];

    let physicsRegistered = false;

    // =====================================================
    // HILFSFUNKTIONEN
    // =====================================================

    function addBox(
        name,
        w,
        h,
        d,
        material,
        x,
        y,
        z,
        collision = false
    ) {

        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
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
        material,
        x,
        y,
        z,
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

    function vector(x, y, z) {
        return new THREE.Vector3(x, y, z);
    }

    function localToWorld(start, direction, forward, side) {

        return vector(
            start.x + direction.x * forward - direction.z * side,
            start.y,
            start.z + direction.z * forward + direction.x * side
        );
    }

    function addRail(name, start, end, radius = 0.045) {

        const direction = new THREE.Vector3().subVectors(
            end,
            start
        );

        const length = direction.length();

        if (length < 0.001) {
            return null;
        }

        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius,
                radius,
                length,
                12
            ),
            handrailMaterial
        );

        mesh.name = name;

        mesh.position.copy(start).add(end).multiplyScalar(0.5);

        mesh.quaternion.setFromUnitVectors(
            vector(0, 1, 0),
            direction.normalize()
        );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        group.add(mesh);

        railings.push(mesh);

        return mesh;
    }

    // =====================================================
    // GELÄNDER
    // =====================================================

    function createRailing(name, start, end, height) {

        if (!settings.railingEnabled) {
            return;
        }

        const direction = new THREE.Vector3().subVectors(
            end,
            start
        );

        const length = direction.length();

        const postCount = Math.max(
            2,
            Math.ceil(length / 0.9)
        );

        const topStart = start.clone();
        const topEnd = end.clone();

        topStart.y += height;
        topEnd.y += height;

        const middleStart = start.clone();
        const middleEnd = end.clone();

        middleStart.y += height * 0.52;
        middleEnd.y += height * 0.52;

        // Oberer Handlauf
        addRail(
            name + "_Handlauf",
            topStart,
            topEnd,
            0.055
        );

        // Mittlere Strebe
        addRail(
            name + "_Mittelstrebe",
            middleStart,
            middleEnd,
            0.035
        );

        // Untere Strebe
        const lowerStart = start.clone();
        const lowerEnd = end.clone();

        lowerStart.y += 0.12;
        lowerEnd.y += 0.12;

        addRail(
            name + "_Unterstrebe",
            lowerStart,
            lowerEnd,
            0.03
        );

        // Pfosten
        for (let i = 0; i <= postCount; i++) {

            const t = i / postCount;

            const position = new THREE.Vector3().lerpVectors(
                start,
                end,
                t
            );

            const post = addCylinder(
                name + "_Pfosten_" + i,
                0.045,
                height,
                metal,
                position.x,
                position.y + height / 2,
                position.z,
                0,
                0,
                true
            );

            railingPosts.push(post);

            // Kleine Fußplatte
            addBox(
                name + "_Fussplatte_" + i,
                0.16,
                0.045,
                0.16,
                darkMetal,
                position.x,
                position.y + 0.025,
                position.z
            );
        }
    }

    // =====================================================
    // TREPPENWANGEN
    // =====================================================

    function createSideWall(
        name,
        start,
        direction,
        side,
        length,
        verticalHeight
    ) {

        const center = localToWorld(
            start,
            direction,
            length / 2,
            side * (width / 2 + 0.07)
        );

        const wall = addBox(
            name,
            length,
            0.38,
            0.16,
            concreteDark,
            center.x,
            center.y - verticalHeight / 2 - 0.04,
            center.z
        );

        wall.rotation.y = Math.atan2(
            -direction.z,
            direction.x
        );

        wall.rotation.z = -Math.atan2(
            verticalHeight,
            length
        );

        sideWalls.push(wall);

        collisionObjects.push(wall);

        return wall;
    }

    // =====================================================
    // EIN TREPPENABSCHNITT
    // =====================================================

    function createFlight(start, direction, level) {

        const horizontalLength = segmentLength;

        const verticalLength = floorHeight;

        const angle = Math.atan2(
            -direction.z,
            direction.x
        );

        const stepRise = verticalLength / stepCount;

        const stepRotation = angle;

        // ---------------------------------------------
        // STUFEN
        // ---------------------------------------------

        for (let i = 0; i < stepCount; i++) {

            const forward = (i + 0.5) * stepDepth;

            const rise = (i + 0.5) * stepRise;

            const position = localToWorld(
                start,
                direction,
                forward,
                0
            );

            const step = addBox(
                "Treppe_Etage_" + level + "_Stufe_" + i,
                width,
                settings.stepHeight,
                stepDepth,
                concrete,
                position.x,
                start.y - rise,
                position.z,
                true
            );

            step.rotation.y = stepRotation;

            steps.push(step);

            // Stufenvorderkante
            const edgePosition = localToWorld(
                start,
                direction,
                (i + 1) * stepDepth - 0.025,
                0
            );

            const edge = addBox(
                "Stufenkante_" + level + "_" + i,
                width * 0.94,
                0.035,
                0.045,
                concreteEdge,
                edgePosition.x,
                start.y - (i + 1) * stepRise + 0.02,
                edgePosition.z
            );

            edge.rotation.y = stepRotation;
        }

        // ---------------------------------------------
        // SEITLICHE BETONWANGEN
        // ---------------------------------------------

        for (const side of [-1, 1]) {

            createSideWall(
                "Treppenwange_" + level + "_" + side,
                start,
                direction,
                side,
                horizontalLength,
                verticalLength
            );
        }

        // ---------------------------------------------
        // GELÄNDER
        // ---------------------------------------------

        for (const side of [-1, 1]) {

            const railStart = localToWorld(
                start,
                direction,
                0,
                side * (width / 2 + 0.17)
            );

            const railEnd = localToWorld(
                start,
                direction,
                horizontalLength,
                side * (width / 2 + 0.17)
            );

            createRailing(
                "Treppengelaender_" + level + "_" + side,
                railStart,
                railEnd,
                settings.railingHeight
            );
        }

        // ---------------------------------------------
        // ABSCHLUSSPOSITION
        // ---------------------------------------------

        const end = localToWorld(
            start,
            direction,
            horizontalLength,
            0
        );

        end.y -= verticalLength;

        return {
            end,
            direction,
            horizontalLength,
            verticalLength
        };
    }

    // =====================================================
    // PODest
    // =====================================================

    function createLanding(position, direction, level) {

        const landingLength = settings.landingLength;

        const center = localToWorld(
            position,
            direction,
            landingLength / 2,
            0
        );

        const landing = addBox(
            "Treppenpodest_" + level,
            width + 0.45,
            0.24,
            landingLength,
            concreteDark,
            center.x,
            position.y - 0.12,
            center.z,
            true
        );

        landing.rotation.y = Math.atan2(
            -direction.z,
            direction.x
        );

        landings.push(landing);

        // Podest-Oberfläche
        const surface = addBox(
            "Podestoberflaeche_" + level,
            width + 0.35,
            0.035,
            landingLength - 0.12,
            concrete,
            center.x,
            position.y + 0.015,
            center.z
        );

        surface.rotation.y = landing.rotation.y;

        // Warnstreifen an der Podestkante
        const warningPosition = localToWorld(
            position,
            direction,
            landingLength - 0.1,
            0
        );

        const warningStripe = addBox(
            "Podestwarnstreifen_" + level,
            width + 0.2,
            0.025,
            0.1,
            warningMaterial,
            warningPosition.x,
            position.y + 0.04,
            warningPosition.z
        );

        warningStripe.rotation.y = landing.rotation.y;

        return {
            end: localToWorld(
                position,
                direction,
                landingLength,
                0
            )
        };
    }

    // =====================================================
    // TREPPENVERLAUF
    // =====================================================

    const directions = [
        vector(1, 0, 0),
        vector(0, 0, 1),
        vector(-1, 0, 0),
        vector(0, 0, -1)
    ];

    let current = {
        x: settings.startX,
        y: settings.startY,
        z: settings.startZ
    };

    let currentDirection = directions[
        ((settings.direction % 4) + 4) % 4
    ].clone();

    for (let level = 0; level < settings.levels; level++) {

        const start = vector(
            current.x,
            current.y,
            current.z
        );

        const flight = createFlight(
            start,
            currentDirection,
            level + 1
        );

        const landingPosition = flight.end.clone();

        const landing = createLanding(
            landingPosition,
            currentDirection,
            level + 1
        );

        const connection = {

            floor: level + 1,

            x: landing.end.x,
            y: landing.end.y,
            z: landing.end.z,

            position: landing.end.clone(),

            nextDirection: directions[
                (settings.direction + level + 1) % 4
            ].clone()
        };

        connections.push(connection);

        stairFlights.push({
            level: level + 1,
            start,
            end: flight.end.clone(),
            direction: currentDirection.clone()
        });

        // Richtungswechsel
        current = {
            x: landing.end.x,
            y: landing.end.y,
            z: landing.end.z
        };

        currentDirection = directions[
            (settings.direction + level + 1) % 4
        ].clone();

        // Seitlicher Versatz für den nächsten Treppenlauf
        const sideDirection = vector(
            -currentDirection.z,
            0,
            currentDirection.x
        );

        current.x += sideDirection.x * (width + 0.45);
        current.z += sideDirection.z * (width + 0.45);
    }

    // =====================================================
    // PHYSIK-KOLLISIONEN
    // =====================================================

    function registerPhysics(physics) {

        if (!physics) {
            throw new Error(
                "Treppen: Physik-System fehlt."
            );
        }

        if (physicsRegistered) {
            return;
        }

        if (!settings.createCollision) {
            physicsRegistered = true;
            return;
        }

        group.updateWorldMatrix(true, true);

        const registered = new Set();

        function registerObject(mesh) {

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

            collider.name = "Treppencollider_" + mesh.name;

            collider.position.copy(worldPosition);
            collider.quaternion.copy(worldQuaternion);

            physics.addBox(collider, {
                mass: 0
            });
        }

        for (const object of collisionObjects) {
            registerObject(object);
        }

        for (const post of railingPosts) {
            registerObject(post);
        }

        physicsRegistered = true;
    }

    // =====================================================
    // ABSCHLUSS
    // =====================================================

    group.traverse(object => {

        if (object.isMesh) {

            object.castShadow = true;
            object.receiveShadow = true;
        }
    });

    const endPosition = {
        x: current.x,
        y: current.y,
        z: current.z
    };

    return {

        group,

        connections,

        endPosition,

        segmentLength,

        floorHeight,

        settings,

        steps,

        landings,

        railings,

        railingPosts,

        sideWalls,

        stairFlights,

        collisionObjects,

        registerPhysics,

        get physicsRegistered() {
            return physicsRegistered;
        }
    };
}
