
/*
====================================================
 ONE MILLION COINS
 PHYSIK.JS - ADVANCED PHYSICS
 Three.js + Cannon-es
====================================================

Voraussetzung:
Cannon-es muss als globales CANNON geladen sein.

Funktionen:
- Realistische Münzphysik
- Münzen stapeln und rollen
- Reibung und Trägheit
- Glasscherben-Physik
- Boxen und Zylinder
- Stabile Kollisionen
- Feste Physik-Zeitschritte
- Flüssige Darstellung durch Interpolation
- Schlafende Physikkörper
- Impulse und Kräfte
- Physik-Statistiken
====================================================
*/

function createPhysics(THREE, scene, options = {}) {

    if (typeof CANNON === "undefined") {
        throw new Error("Cannon-es wurde nicht geladen!");
    }

    // =========================================
    // EINSTELLUNGEN
    // =========================================

    const SETTINGS = {

        gravity: options.gravity ?? -9.82,

        fixedTimeStep: 1 / 120,
        maxSubSteps: 12,
        maxFrameTime: 0.1,

        solverIterations: 30,
        solverTolerance: 0.0001,

        coinMass: 0.25,
        coinFriction: 0.38,
        coinRestitution: 0.10,

        glassMass: 0.8,
        glassFriction: 0.32,
        glassRestitution: 0.08,

        groundFriction: 0.85,
        groundRestitution: 0.03,

        defaultFriction: 0.55,
        defaultRestitution: 0.08,

        allowSleep: true
    };

    // =========================================
    // PHYSIK-WELT
    // =========================================

    const world = new CANNON.World();

    world.gravity.set(0, SETTINGS.gravity, 0);

    world.allowSleep = SETTINGS.allowSleep;

    world.broadphase = new CANNON.SAPBroadphase(world);

    world.solver.iterations = SETTINGS.solverIterations;
    world.solver.tolerance = SETTINGS.solverTolerance;

    world.defaultContactMaterial.friction =
        SETTINGS.defaultFriction;

    world.defaultContactMaterial.restitution =
        SETTINGS.defaultRestitution;

    // =========================================
    // MATERIALIEN
    // =========================================

    const materials = {
        coin: new CANNON.Material("coin"),
        glass: new CANNON.Material("glass"),
        ground: new CANNON.Material("ground"),
        metal: new CANNON.Material("metal"),
        default: new CANNON.Material("default")
    };

    function addContact(a, b, friction, restitution) {

        world.addContactMaterial(
            new CANNON.ContactMaterial(a, b, {
                friction,
                restitution,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e8,
                frictionEquationRelaxation: 3
            })
        );
    }

    addContact(
        materials.coin,
        materials.coin,
        SETTINGS.coinFriction,
        SETTINGS.coinRestitution
    );

    addContact(
        materials.coin,
        materials.ground,
        SETTINGS.groundFriction,
        SETTINGS.groundRestitution
    );

    addContact(
        materials.coin,
        materials.glass,
        0.32,
        0.08
    );

    addContact(
        materials.glass,
        materials.ground,
        SETTINGS.glassFriction,
        SETTINGS.glassRestitution
    );

    addContact(
        materials.glass,
        materials.glass,
        0.3,
        0.06
    );

    addContact(
        materials.metal,
        materials.ground,
        0.65,
        0.04
    );

    addContact(
        materials.coin,
        materials.metal,
        0.4,
        0.07
    );

    addContact(
        materials.default,
        materials.ground,
        SETTINGS.defaultFriction,
        SETTINGS.defaultRestitution
    );

    addContact(
        materials.coin,
        materials.default,
        0.45,
        0.08
    );

    // =========================================
    // OBJEKTVERWALTUNG
    // =========================================

    const objects = [];
    const bodyMap = new Map();

    let accumulator = 0;
    let disposed = false;

    // =========================================
    // HILFSFUNKTIONEN
    // =========================================

    function getTransform(object) {

        object.updateWorldMatrix(true, false);

        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();

        object.getWorldPosition(position);
        object.getWorldQuaternion(quaternion);
        object.getWorldScale(scale);

        return {
            position,
            quaternion,
            scale
        };
    }

    function getWorldSize(object) {

        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();

        box.getSize(size);

        return size;
    }

    function toCannonVector(vector) {

        return new CANNON.Vec3(
            vector.x,
            vector.y,
            vector.z
        );
    }

    function toThreeVector(vector) {

        return new THREE.Vector3(
            vector.x,
            vector.y,
            vector.z
        );
    }

    function createBody(options = {}) {

        return new CANNON.Body({
            mass: options.mass ?? 1,
            material: options.material ?? materials.default,

            linearDamping: options.linearDamping ?? 0.015,
            angularDamping: options.angularDamping ?? 0.04,

            allowSleep: options.allowSleep ?? true,
            sleepSpeedLimit: options.sleepSpeedLimit ?? 0.08,
            sleepTimeLimit: options.sleepTimeLimit ?? 1
        });
    }

    function addBody(object, body, type) {

        if (bodyMap.has(object)) {
            removeObject(object);
        }

        world.addBody(body);

        const entry = {
            object,
            body,
            type,

            previousPosition: toThreeVector(body.position),

            previousQuaternion: new THREE.Quaternion(
                body.quaternion.x,
                body.quaternion.y,
                body.quaternion.z,
                body.quaternion.w
            )
        };

        objects.push(entry);
        bodyMap.set(object, entry);

        world.broadphase.dirty = true;

        return entry;
    }

    // =========================================
    // OBJEKT ENTFERNEN
    // =========================================

    function removeObject(object) {

        const entry = bodyMap.get(object);

        if (!entry) return false;

        world.removeBody(entry.body);

        const index = objects.indexOf(entry);

        if (index !== -1) {
            objects.splice(index, 1);
        }

        bodyMap.delete(object);

        world.broadphase.dirty = true;

        return true;
    }

    // =========================================
    // THREE.JS SYNCHRONISIEREN
    // =========================================

    function syncObject(entry, alpha = 1) {

        const object = entry.object;
        const body = entry.body;

        const currentPosition = toThreeVector(body.position);

        const currentQuaternion = new THREE.Quaternion(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w
        );

        const worldPosition = entry.previousPosition.clone()
            .lerp(currentPosition, alpha);

        const worldQuaternion = entry.previousQuaternion.clone()
            .slerp(currentQuaternion, alpha);

        if (object.parent) {

            object.parent.updateWorldMatrix(true, false);

            object.parent.worldToLocal(worldPosition);

            const parentQuaternion = new THREE.Quaternion();

            object.parent.getWorldQuaternion(parentQuaternion);

            parentQuaternion.invert();

            worldQuaternion.premultiply(parentQuaternion);
        }

        object.position.copy(worldPosition);
        object.quaternion.copy(worldQuaternion);
    }

    // =========================================
    // VORHERIGE POSITION SPEICHERN
    // =========================================

    function savePreviousTransforms() {

        for (const entry of objects) {

            entry.previousPosition.copy(
                toThreeVector(entry.body.position)
            );

            entry.previousQuaternion.set(
                entry.body.quaternion.x,
                entry.body.quaternion.y,
                entry.body.quaternion.z,
                entry.body.quaternion.w
            );
        }
    }

    // =========================================
    // BODEN
    // =========================================

    function createGround(options = {}) {

        const width = options.width ?? 100;
        const depth = options.depth ?? 100;
        const thickness = options.thickness ?? 1;

        const body = new CANNON.Body({
            mass: 0,
            material: materials.ground
        });

        body.addShape(
            new CANNON.Box(
                new CANNON.Vec3(
                    width / 2,
                    thickness / 2,
                    depth / 2
                )
            )
        );

        body.position.set(
            options.x ?? 0,
            options.y ?? -thickness / 2,
            options.z ?? 0
        );

        world.addBody(body);

        return body;
    }

    // =========================================
    // WÄNDE
    // =========================================

    function createWall(options = {}) {

        const width = options.width ?? 10;
        const height = options.height ?? 4;
        const depth = options.depth ?? 0.3;

        const body = new CANNON.Body({
            mass: 0,
            material: materials.ground
        });

        body.addShape(
            new CANNON.Box(
                new CANNON.Vec3(
                    width / 2,
                    height / 2,
                    depth / 2
                )
            )
        );

        body.position.set(
            options.x ?? 0,
            options.y ?? height / 2,
            options.z ?? 0
        );

        body.quaternion.setFromEuler(
            options.rotationX ?? 0,
            options.rotationY ?? 0,
            options.rotationZ ?? 0
        );

        world.addBody(body);

        return body;
    }

    // =========================================
    // MÜNZEN
    // =========================================

    function addCoin(object, options = {}) {

        const transform = getTransform(object);

        const radius = options.radius ?? 0.5;
        const thickness = options.thickness ?? 0.075;

        const mass = options.mass ?? SETTINGS.coinMass;

        const body = createBody({
            mass,
            material: materials.coin,

            linearDamping: 0.015,
            angularDamping: 0.055,

            sleepSpeedLimit: 0.06,
            sleepTimeLimit: 1.2
        });

        // Cannon-Zylinder und Three.js-CylinderGeometry
        // besitzen beide eine Y-Achse.
        // Deshalb keine zusätzliche 90-Grad-Drehung!

        body.addShape(
            new CANNON.Cylinder(
                radius,
                radius,
                thickness,
                options.segments ?? 48
            )
        );

        body.position.set(
            transform.position.x,
            transform.position.y,
            transform.position.z
        );

        body.quaternion.set(
            transform.quaternion.x,
            transform.quaternion.y,
            transform.quaternion.z,
            transform.quaternion.w
        );

        body.updateMassProperties();

        addBody(object, body, "coin");

        return body;
    }

    function addCoins(coins, options = {}) {

        return coins.map(coin => {

            if (!coin) return null;

            return addCoin(coin, options);

        }).filter(Boolean);
    }

    // =========================================
    // GLASSCHERBEN
    // =========================================

    function addGlassShard(shard, options = {}) {

        const size = getWorldSize(shard);
        const transform = getTransform(shard);

        const body = createBody({

            mass: options.mass ??
                shard.userData.mass ??
                SETTINGS.glassMass,

            material: materials.glass,

            linearDamping: 0.025,
            angularDamping: 0.045,

            sleepSpeedLimit: 0.07
        });

        body.addShape(
            new CANNON.Box(
                new CANNON.Vec3(
                    Math.max(size.x / 2, 0.025),
                    Math.max(size.y / 2, 0.025),
                    Math.max(size.z / 2, 0.015)
                )
            )
        );

        body.position.set(
            transform.position.x,
            transform.position.y,
            transform.position.z
        );

        body.quaternion.set(
            transform.quaternion.x,
            transform.quaternion.y,
            transform.quaternion.z,
            transform.quaternion.w
        );

        addBody(shard, body, "glass");

        if (shard.userData.velocity) {

            const velocity = shard.userData.velocity;

            body.velocity.set(
                velocity.x,
                velocity.y,
                velocity.z
            );
        }

        if (shard.userData.angularVelocity) {

            const angular = shard.userData.angularVelocity;

            body.angularVelocity.set(
                angular.x,
                angular.y,
                angular.z
            );
        }

        return body;
    }

    function addGlassPieces(shards) {

        return shards.map(shard => {

            if (!shard || !shard.visible) return null;

            return addGlassShard(shard);

        }).filter(Boolean);
    }

    // =========================================
    // VERPACKUNG
    // =========================================

    function addPackaging(packaging) {

        if (!packaging) return null;

        const result = {
            coin: null,
            shards: []
        };

        if (packaging.coin) {

            result.coin = addCoin(
                packaging.coin,
                {
                    radius: 0.72,
                    thickness: 0.12,
                    mass: 1.2
                }
            );
        }

        if (packaging.setOnBreak) {

            packaging.setOnBreak(pieces => {

                result.shards = addGlassPieces(pieces);

            });
        }

        return result;
    }

    // =========================================
    // BOX-PHYSIK
    // =========================================

    function addBox(object, options = {}) {

        const size = getWorldSize(object);
        const transform = getTransform(object);

        const body = createBody({

            mass: options.mass ?? 1,

            material: options.material ?? materials.default,

            linearDamping: options.linearDamping ?? 0.02,
            angularDamping: options.angularDamping ?? 0.06
        });

        body.addShape(
            new CANNON.Box(
                new CANNON.Vec3(
                    Math.max(size.x / 2, 0.025),
                    Math.max(size.y / 2, 0.025),
                    Math.max(size.z / 2, 0.025)
                )
            )
        );

        body.position.set(
            transform.position.x,
            transform.position.y,
            transform.position.z
        );

        body.quaternion.set(
            transform.quaternion.x,
            transform.quaternion.y,
            transform.quaternion.z,
            transform.quaternion.w
        );

        body.updateMassProperties();

        addBody(object, body, "box");

        return body;
    }

    // =========================================
    // KUGEL-PHYSIK
    // =========================================

    function addSphere(object, options = {}) {

        const transform = getTransform(object);

        const radius = options.radius ?? 0.5;

        const body = createBody({
            mass: options.mass ?? 1,
            material: options.material ?? materials.default
        });

        body.addShape(
            new CANNON.Sphere(radius)
        );

        body.position.set(
            transform.position.x,
            transform.position.y,
            transform.position.z
        );

        body.quaternion.set(
            transform.quaternion.x,
            transform.quaternion.y,
            transform.quaternion.z,
            transform.quaternion.w
        );

        body.updateMassProperties();

        addBody(object, body, "sphere");

        return body;
    }

    // =========================================
    // ZYLINDER-PHYSIK
    // =========================================

    function addCylinder(object, options = {}) {

        const transform = getTransform(object);

        const radius = options.radius ?? 0.5;
        const height = options.height ?? 1;

        const body = createBody({
            mass: options.mass ?? 1,
            material: options.material ?? materials.metal
        });

        body.addShape(
            new CANNON.Cylinder(
                radius,
                radius,
                height,
                options.segments ?? 32
            )
        );

        body.position.set(
            transform.position.x,
            transform.position.y,
            transform.position.z
        );

        body.quaternion.set(
            transform.quaternion.x,
            transform.quaternion.y,
            transform.quaternion.z,
            transform.quaternion.w
        );

        body.updateMassProperties();

        addBody(object, body, "cylinder");

        return body;
    }

    // =========================================
    // OBJEKTE ANSTOSSEN
    // =========================================

    function applyImpulse(object, impulse, worldPoint = null) {

        const entry = bodyMap.get(object);

        if (!entry) return false;

        const body = entry.body;

        body.wakeUp();

        const impulseVector = toCannonVector(impulse);

        let relativePoint = new CANNON.Vec3(0, 0, 0);

        if (worldPoint) {

            relativePoint = new CANNON.Vec3(
                worldPoint.x - body.position.x,
                worldPoint.y - body.position.y,
                worldPoint.z - body.position.z
            );
        }

        body.applyImpulse(
            impulseVector,
            relativePoint
        );

        return true;
    }

    // =========================================
    // MÜNZEN ANSTOSSEN
    // =========================================

    function nudgeCoins(position, radius = 2, strength = 5) {

        const origin = toCannonVector(position);

        let hitCount = 0;

        for (const entry of objects) {

            if (entry.type !== "coin") continue;

            const body = entry.body;

            const difference = body.position.vsub(origin);

            const distance = difference.length();

            if (distance > radius || distance < 0.0001) {
                continue;
            }

            difference.normalize();

            const power = strength *
                Math.pow(1 - distance / radius, 1.5);

            body.wakeUp();

            body.applyImpulse(
                difference.scale(power),
                new CANNON.Vec3(0, 0, 0)
            );

            hitCount++;
        }

        return hitCount;
    }

    // =========================================
    // RADIALER IMPULS
    // =========================================

    function radialImpulse(position, radius = 4, strength = 10) {

        return nudgeCoins(position, radius, strength);
    }

    // =========================================
    // KRAFT ANWENDEN
    // =========================================

    function applyForce(object, force, worldPoint = null) {

        const entry = bodyMap.get(object);

        if (!entry) return false;

        const body = entry.body;

        body.wakeUp();

        const forceVector = toCannonVector(force);

        let relativePoint = new CANNON.Vec3(0, 0, 0);

        if (worldPoint) {

            relativePoint = new CANNON.Vec3(
                worldPoint.x - body.position.x,
                worldPoint.y - body.position.y,
                worldPoint.z - body.position.z
            );
        }

        body.applyForce(
            forceVector,
            relativePoint
        );

        return true;
    }

    // =========================================
    // KÖRPER ZURÜCKSETZEN
    // =========================================

    function resetObject(object, position, quaternion = null) {

        const entry = bodyMap.get(object);

        if (!entry) return false;

        const body = entry.body;

        body.position.set(
            position.x,
            position.y,
            position.z
        );

        if (quaternion) {

            body.quaternion.set(
                quaternion.x,
                quaternion.y,
                quaternion.z,
                quaternion.w
            );
        }

        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);

        body.force.set(0, 0, 0);
        body.torque.set(0, 0, 0);

        body.wakeUp();

        entry.previousPosition.copy(
            toThreeVector(body.position)
        );

        entry.previousQuaternion.set(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w
        );

        syncObject(entry, 1);

        return true;
    }

    // =========================================
    // KÖRPER ABFRAGEN
    // =========================================

    function getBody(object) {

        const entry = bodyMap.get(object);

        return entry ? entry.body : null;
    }

    // =========================================
    // PHYSIK UPDATE
    // =========================================

    function update(deltaTime) {

        if (disposed) return;

        const dt = Math.min(
            Math.max(deltaTime || 0, 0),
            SETTINGS.maxFrameTime
        );

        accumulator += dt;

        let steps = 0;

        while (
            accumulator >= SETTINGS.fixedTimeStep &&
            steps < SETTINGS.maxSubSteps
        ) {

            savePreviousTransforms();

            world.step(SETTINGS.fixedTimeStep);

            accumulator -= SETTINGS.fixedTimeStep;

            steps++;
        }

        // Verhindert, dass nach langen Frame-Aussetzern
        // die Physik immer weiter hinterherläuft.
        if (steps >= SETTINGS.maxSubSteps) {
            accumulator = Math.min(
                accumulator,
                SETTINGS.fixedTimeStep
            );
        }

        const alpha = Math.min(
            accumulator / SETTINGS.fixedTimeStep,
            1
        );

        for (const entry of objects) {

            if (!entry.object || !entry.body) continue;

            syncObject(entry, alpha);
        }
    }

    // =========================================
    // PHYSIK-STATISTIK
    // =========================================

    function getStats() {

        return {
            totalBodies: world.bodies.length,

            trackedObjects: objects.length,

            coins: objects.filter(
                entry => entry.type === "coin"
            ).length,

            glassPieces: objects.filter(
                entry => entry.type === "glass"
            ).length,

            boxes: objects.filter(
                entry => entry.type === "box"
            ).length,

            sleepingBodies: world.bodies.filter(
                body => body.sleepState === CANNON.Body.SLEEPING
            ).length
        };
    }

    // =========================================
    // EINSTELLUNGEN ÄNDERN
    // =========================================

    function setGravity(value) {
        world.gravity.set(0, value, 0);
    }

    function wakeAll() {

        for (const body of world.bodies) {
            body.wakeUp();
        }
    }

    // =========================================
    // AUFRÄUMEN
    // =========================================

    function dispose() {

        if (disposed) return;

        for (const entry of [...objects]) {
            removeObject(entry.object);
        }

        for (const body of [...world.bodies]) {
            world.removeBody(body);
        }

        objects.length = 0;
        bodyMap.clear();

        disposed = true;
    }

    // =========================================
    // API
    // =========================================

    return {

        world,

        materials,

        createGround,
        createWall,

        addCoin,
        addCoins,

        addGlassShard,
        addGlassPieces,

        addPackaging,

        addBox,
        addSphere,
        addCylinder,

        applyImpulse,
        applyForce,

        nudgeCoins,
        radialImpulse,

        getBody,
        removeObject,
        resetObject,

        setGravity,
        wakeAll,

        update,
        getStats,

        dispose
    };
}
