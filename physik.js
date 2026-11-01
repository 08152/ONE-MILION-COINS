
/*
====================================================
 ONE MILLION COINS
 PHYSIK.JS
 Three.js + Cannon-es
====================================================

Voraussetzung:
Cannon-es muss vor dieser Datei geladen sein.

Diese Datei bietet:
- Münzphysik
- Münzen anstoßen
- Münzen stapeln
- Münzen rollen und umkippen
- Glasscherben-Physik
- Schwerkraft
- Reibung
- Rückprall
- Kollisionen
- Boden und Wände
- Physik-Update
====================================================
*/

function createPhysics(THREE, scene, options = {}) {

    if (typeof CANNON === "undefined") {
        throw new Error(
            "Cannon-es wurde nicht geladen!"
        );
    }

    // =========================================
    // EINSTELLUNGEN
    // =========================================

    const SETTINGS = {

        gravity: options.gravity ?? -9.82,

        fixedTimeStep: 1 / 120,
        maxSubSteps: 10,

        solverIterations: 20,

        coinMass: 0.25,
        coinFriction: 0.55,
        coinRestitution: 0.2,

        glassFriction: 0.35,
        glassRestitution: 0.12,

        groundFriction: 0.85,
        groundRestitution: 0.05,

        maxFrameTime: 0.05
    };

    // =========================================
    // PHYSIK-WELT
    // =========================================

    const world = new CANNON.World();

    world.gravity.set(0, SETTINGS.gravity, 0);

    world.allowSleep = true;

    world.broadphase = new CANNON.SAPBroadphase(world);

    world.solver.iterations = SETTINGS.solverIterations;
    world.solver.tolerance = 0.001;

    // =========================================
    // MATERIALIEN
    // =========================================

    const coinMaterial = new CANNON.Material("coin");
    const glassMaterial = new CANNON.Material("glass");
    const groundMaterial = new CANNON.Material("ground");
    const defaultMaterial = new CANNON.Material("default");

    world.defaultContactMaterial.friction = 0.4;
    world.defaultContactMaterial.restitution = 0.15;

    world.addContactMaterial(
        new CANNON.ContactMaterial(
            coinMaterial,
            coinMaterial,
            {
                friction: SETTINGS.coinFriction,
                restitution: SETTINGS.coinRestitution
            }
        )
    );

    world.addContactMaterial(
        new CANNON.ContactMaterial(
            coinMaterial,
            groundMaterial,
            {
                friction: SETTINGS.groundFriction,
                restitution: SETTINGS.groundRestitution
            }
        )
    );

    world.addContactMaterial(
        new CANNON.ContactMaterial(
            glassMaterial,
            groundMaterial,
            {
                friction: SETTINGS.glassFriction,
                restitution: SETTINGS.glassRestitution
            }
        )
    );

    world.addContactMaterial(
        new CANNON.ContactMaterial(
            coinMaterial,
            glassMaterial,
            {
                friction: 0.4,
                restitution: 0.15
            }
        )
    );

    world.addContactMaterial(
        new CANNON.ContactMaterial(
            defaultMaterial,
            groundMaterial,
            {
                friction: 0.6,
                restitution: 0.1
            }
        )
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

        object.getWorldPosition(position);
        object.getWorldQuaternion(quaternion);

        return {
            position,
            quaternion
        };
    }

    function getWorldSize(object) {

        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();

        box.getSize(size);

        return size;
    }

    function cannonVector(vector) {

        return new CANNON.Vec3(
            vector.x,
            vector.y,
            vector.z
        );
    }

    function addBody(object, body, type) {

        if (bodyMap.has(object)) {
            removeObject(object);
        }

        world.addBody(body);

        const entry = {
            object,
            body,
            type
        };

        objects.push(entry);
        bodyMap.set(object, entry);

        return entry;
    }

    function removeObject(object) {

        const entry = bodyMap.get(object);

        if (!entry) return false;

        world.removeBody(entry.body);

        const index = objects.indexOf(entry);

        if (index !== -1) {
            objects.splice(index, 1);
        }

        bodyMap.delete(object);

        return true;
    }

    // =========================================
    // THREE.JS POSITION AKTUALISIEREN
    // =========================================

    function syncObject(entry) {

        const object = entry.object;
        const body = entry.body;

        const worldPosition = new THREE.Vector3(
            body.position.x,
            body.position.y,
            body.position.z
        );

        const worldQuaternion = new THREE.Quaternion(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w
        );

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
    // BODEN
    // =========================================

    function createGround(options = {}) {

        const width = options.width ?? 100;
        const depth = options.depth ?? 100;
        const thickness = options.thickness ?? 1;

        const body = new CANNON.Body({
            mass: 0,
            material: groundMaterial,
            shape: new CANNON.Box(
                new CANNON.Vec3(
                    width / 2,
                    thickness / 2,
                    depth / 2
                )
            )
        });

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
            material: groundMaterial
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

        const radius = options.radius ?? 0.5;
        const thickness = options.thickness ?? 0.075;
        const mass = options.mass ?? SETTINGS.coinMass;

        const transform = getTransform(object);

        const body = new CANNON.Body({

            mass: mass,

            material: coinMaterial,

            linearDamping: 0.025,
            angularDamping: 0.08,

            allowSleep: true,
            sleepSpeedLimit: 0.12,
            sleepTimeLimit: 1
        });

        // Cannon-Zylinderachse ist Y.
        body.addShape(
            new CANNON.Cylinder(
                radius,
                radius,
                thickness,
                32
            ),
            new CANNON.Vec3(0, 0, 0),
            new CANNON.Quaternion()
        );

        // Cannon-Zylinder liegt zunächst entlang Y.
        // Münzen sollen mit ihrer flachen Seite nach oben liegen.
        const cylinderRotation = new CANNON.Quaternion();

        cylinderRotation.setFromEuler(
            Math.PI / 2,
            0,
            0
        );

        body.shapeOrientations[0].copy(cylinderRotation);

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

        const width = Math.max(size.x, 0.06);
        const height = Math.max(size.y, 0.06);
        const depth = Math.max(size.z, 0.025);

        const mass =
            options.mass ??
            shard.userData.mass ??
            0.8;

        const body = new CANNON.Body({

            mass: mass,

            material: glassMaterial,

            linearDamping: 0.035,
            angularDamping: 0.06,

            allowSleep: true,
            sleepSpeedLimit: 0.1,
            sleepTimeLimit: 1
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

        const transform = getTransform(shard);

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

        // Startgeschwindigkeit aus verpackung.js
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
    // VERPACKUNG VERBINDEN
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

            packaging.setOnBreak((pieces) => {

                result.shards = addGlassPieces(pieces);

            });
        }

        return result;
    }

    // =========================================
    // ALLGEMEINE BOX-PHYSIK
    // =========================================

    function addBox(object, options = {}) {

        const size = getWorldSize(object);
        const transform = getTransform(object);

        const body = new CANNON.Body({

            mass: options.mass ?? 1,

            material: options.material ?? defaultMaterial,

            linearDamping: options.linearDamping ?? 0.02,
            angularDamping: options.angularDamping ?? 0.08
        });

        body.addShape(
            new CANNON.Box(
                new CANNON.Vec3(
                    Math.max(size.x / 2, 0.05),
                    Math.max(size.y / 2, 0.05),
                    Math.max(size.z / 2, 0.05)
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

        addBody(object, body, "box");

        return body;
    }

    // =========================================
    // OBJEKTE ANSTOSSEN
    // =========================================

    function applyImpulse(object, impulse, point = null) {

        const entry = bodyMap.get(object);

        if (!entry) return false;

        const body = entry.body;

        body.wakeUp();

        const impulseVector = cannonVector(impulse);

        const worldPoint = point
            ? cannonVector(point)
            : body.position.clone();

        body.applyImpulse(
            impulseVector,
            worldPoint
        );

        return true;
    }

    // =========================================
    // MÜNZEN ANSTOSSEN
    // =========================================

    function nudgeCoins(position, radius = 2, strength = 5) {

        const origin = cannonVector(position);

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

            const power = strength * (1 - distance / radius);

            body.wakeUp();

            body.applyImpulse(
                difference.scale(power),
                body.position
            );

            hitCount++;
        }

        return hitCount;
    }

    // =========================================
    // EXPLOSIONSARTIGER IMPULS
    // =========================================

    function radialImpulse(position, radius = 4, strength = 10) {

        return nudgeCoins(position, radius, strength);
    }

    // =========================================
    // DIREKTEN KÖRPER ZURÜCKGEBEN
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

            world.step(SETTINGS.fixedTimeStep);

            accumulator -= SETTINGS.fixedTimeStep;

            steps++;
        }

        // Darstellung mit Physik synchronisieren
        for (const entry of objects) {

            if (!entry.object || !entry.body) continue;

            syncObject(entry);
        }
    }

    // =========================================
    // PHYSIK ZURÜCKSETZEN
    // =========================================

    function resetObject(object, position, quaternion = null) {

        const body = getBody(object);

        if (!body) return false;

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

        syncObject(bodyMap.get(object));

        return true;
    }

    // =========================================
    // PHYSIK STATISTIK
    // =========================================

    function getStats() {

        return {
            bodies: world.bodies.length,
            dynamicObjects: objects.length,
            coins: objects.filter(o => o.type === "coin").length,
            glassPieces: objects.filter(o => o.type === "glass").length
        };
    }

    // =========================================
    // ENTFERNEN
    // =========================================

    function dispose() {

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

        materials: {
            coin: coinMaterial,
            glass: glassMaterial,
            ground: groundMaterial,
            default: defaultMaterial
        },

        createGround,
        createWall,

        addCoin,
        addCoins,

        addGlassShard,
        addGlassPieces,

        addPackaging,

        addBox,

        applyImpulse,
        nudgeCoins,
        radialImpulse,

        getBody,
        removeObject,
        resetObject,

        update,
        getStats,
        dispose
    };
}
