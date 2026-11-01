
/*
====================================================
 ONE MILLION COINS
 HEBEN_DROPPEN.JS
====================================================

Benötigt:
- THREE.js
- createPhysics() aus physik.js

Funktionen:
- Gegenstände aufnehmen
- Gegenstände tragen
- Gegenstände fallen lassen
- Gegenstände werfen
- Physik-Integration
- First-Person-Steuerung

====================================================
*/

function createPickupSystem(THREE, camera, renderer, physics, options = {}) {

    // =========================================
    // EINSTELLUNGEN
    // =========================================

    const SETTINGS = {

        maxDistance: options.maxDistance ?? 4,

        holdDistance: options.holdDistance ?? 2.2,

        holdHeight: options.holdHeight ?? -0.35,

        throwStrength: options.throwStrength ?? 9,

        pickupButton: options.pickupButton ?? 0,

        smoothness: options.smoothness ?? 12,

        maxHoldDistance: options.maxHoldDistance ?? 5
    };

    // =========================================
    // VARIABLEN
    // =========================================

    const raycaster = new THREE.Raycaster();

    const pointer = new THREE.Vector2(0, 0);

    let heldObject = null;
    let heldBody = null;

    let enabled = true;

    const pickupObjects = [];

    // =========================================
    // HILFSFUNKTIONEN
    // =========================================

    function getPhysicsBody(object) {

        return physics.getBody(object);
    }

    function getCameraDirection() {

        const direction = new THREE.Vector3();

        camera.getWorldDirection(direction);

        return direction.normalize();
    }

    function getHoldPosition() {

        const direction = getCameraDirection();

        const position = camera.getWorldPosition(
            new THREE.Vector3()
        );

        position.add(
            direction.multiplyScalar(SETTINGS.holdDistance)
        );

        position.y += SETTINGS.holdHeight;

        return position;
    }

    function getCenterPosition(object) {

        const position = new THREE.Vector3();

        object.getWorldPosition(position);

        return position;
    }

    // =========================================
    // AUFNEHMBARE OBJEKTE REGISTRIEREN
    // =========================================

    function register(object, options = {}) {

        if (!object) return;

        if (pickupObjects.some(item => item.object === object)) {
            return;
        }

        const entry = {
            object,

            radius: options.radius ?? 0.8,

            canPickup: options.canPickup ?? true,

            mass: options.mass ?? 1,

            throwMultiplier: options.throwMultiplier ?? 1
        };

        pickupObjects.push(entry);

        object.userData.pickupEnabled = true;

        return entry;
    }

    function unregister(object) {

        const index = pickupObjects.findIndex(
            item => item.object === object
        );

        if (index !== -1) {
            pickupObjects.splice(index, 1);
        }

        if (heldObject === object) {
            drop();
        }
    }

    // =========================================
    // OBJEKT FINDEN
    // =========================================

    function findPickupObject() {

        raycaster.setFromCamera(pointer, camera);

        const candidates = pickupObjects
            .filter(item => item.canPickup)
            .map(item => item.object);

        const hits = raycaster.intersectObjects(
            candidates,
            true
        );

        for (const hit of hits) {

            let target = hit.object;

            while (
                target &&
                !pickupObjects.some(item => item.object === target)
            ) {
                target = target.parent;
            }

            if (!target) continue;

            const entry = pickupObjects.find(
                item => item.object === target
            );

            if (!entry) continue;

            const distance = hit.distance;

            if (distance > SETTINGS.maxDistance) {
                continue;
            }

            return {
                object: target,
                entry,
                hit
            };
        }

        return null;
    }

    // =========================================
    // AUFNEHMEN
    // =========================================

    function pickup(object) {

        if (!enabled || heldObject) return false;

        const entry = pickupObjects.find(
            item => item.object === object
        );

        if (!entry || !entry.canPickup) return false;

        const body = getPhysicsBody(object);

        if (!body) {
            console.warn(
                "Objekt hat noch keinen Physikkörper:",
                object.name
            );

            return false;
        }

        heldObject = object;
        heldBody = body;

        // Physikkörper während des Tragens anhalten.
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);

        body.force.set(0, 0, 0);
        body.torque.set(0, 0, 0);

        body.sleep();

        body.collisionFilterMask = 0;

        return true;
    }

    // =========================================
    // LOSLASSEN
    // =========================================

    function drop() {

        if (!heldObject || !heldBody) return false;

        const object = heldObject;
        const body = heldBody;

        const position = getHoldPosition();

        object.parent
            ? object.parent.worldToLocal(position)
            : null;

        // Physikkörper wieder aktivieren.
        body.position.set(
            getWorldHoldPosition().x,
            getWorldHoldPosition().y,
            getWorldHoldPosition().z
        );

        body.collisionFilterMask = -1;

        body.wakeUp();

        heldObject = null;
        heldBody = null;

        return true;
    }

    // =========================================
    // WERFEN
    // =========================================

    function throwObject(strength = SETTINGS.throwStrength) {

        if (!heldObject || !heldBody) return false;

        const body = heldBody;

        const direction = getCameraDirection();

        const position = getWorldHoldPosition();

        body.position.set(
            position.x,
            position.y,
            position.z
        );

        body.collisionFilterMask = -1;

        body.wakeUp();

        const impulse = direction.multiplyScalar(
            strength
        );

        body.applyImpulse(
            new CANNON.Vec3(
                impulse.x,
                impulse.y,
                impulse.z
            ),
            body.position
        );

        // Kleine zusätzliche Drehbewegung
        body.angularVelocity.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );

        heldObject = null;
        heldBody = null;

        return true;
    }

    // =========================================
    // HALTEPOSITION
    // =========================================

    function getWorldHoldPosition() {

        return getHoldPosition();
    }

    // =========================================
    // OBJEKT BEWEGEN
    // =========================================

    function update(deltaTime) {

        if (!enabled) return;

        if (!heldObject || !heldBody) return;

        const targetPosition = getWorldHoldPosition();

        const body = heldBody;

        const alpha = 1 - Math.exp(
            -SETTINGS.smoothness * deltaTime
        );

        // Weiche Bewegung
        body.position.x += (
            targetPosition.x - body.position.x
        ) * alpha;

        body.position.y += (
            targetPosition.y - body.position.y
        ) * alpha;

        body.position.z += (
            targetPosition.z - body.position.z
        ) * alpha;

        // Tragen verhindert ungewolltes Umkippen.
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);

        body.quaternion.set(
            camera.quaternion.x,
            camera.quaternion.y,
            camera.quaternion.z,
            camera.quaternion.w
        );

        // Sicherheitsabstand
        const cameraPosition = camera.getWorldPosition(
            new THREE.Vector3()
        );

        const distance = body.position.distanceTo(
            cameraPosition
        );

        if (distance > SETTINGS.maxHoldDistance) {
            drop();
        }
    }

    // =========================================
    // MAUSSTEUERUNG
    // =========================================

    function handlePointerDown(event) {

        if (!enabled) return;

        if (event.button !== SETTINGS.pickupButton) {
            return;
        }

        if (heldObject) {

            drop();

            return;
        }

        const found = findPickupObject();

        if (found) {
            pickup(found.object);
        }
    }

    function handleContextMenu(event) {
        event.preventDefault();

        if (heldObject) {
            throwObject();
        }
    }

    // =========================================
    // STEUERUNG AKTIVIEREN
    // =========================================

    renderer.domElement.addEventListener(
        "pointerdown",
        handlePointerDown
    );

    renderer.domElement.addEventListener(
        "contextmenu",
        handleContextMenu
    );

    // =========================================
    // API
    // =========================================

    return {

        register,
        unregister,

        pickup,
        drop,
        throwObject,

        update,

        findPickupObject,

        get heldObject() {
            return heldObject;
        },

        get isHolding() {
            return heldObject !== null;
        },

        setEnabled(value) {
            enabled = Boolean(value);

            if (!enabled) {
                drop();
            }
        },

        dispose() {

            drop();

            renderer.domElement.removeEventListener(
                "pointerdown",
                handlePointerDown
            );

            renderer.domElement.removeEventListener(
                "contextmenu",
                handleContextMenu
            );

            pickupObjects.length = 0;
        }
    };
}
