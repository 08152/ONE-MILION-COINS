
/*
====================================================
 ONE MILLION COINS
 ANTI_LAGG.JS
====================================================

Performance-System für Three.js

Funktionen:
- Chunk-System
- Frustum Culling
- Distance Culling
- LOD-System
- Instancing
- Object Pooling
- Geometry Cache
- Material Cache
- FPS Monitoring
- Adaptive Quality
- Render Optimierung

====================================================
*/

function createAntiLagg(THREE, scene, camera, renderer, options = {}) {

    const SETTINGS = {
        chunkSize: options.chunkSize ?? 32,
        renderDistance: options.renderDistance ?? 100,
        updateInterval: options.updateInterval ?? 0.25,
        targetFPS: options.targetFPS ?? 60,
        minimumFPS: options.minimumFPS ?? 30,
        autoQuality: options.autoQuality ?? true,
        maxActiveChunks: options.maxActiveChunks ?? 100,
        lodDistance: options.lodDistance ?? 35,
        culling: options.culling ?? true,
        chunkSystem: options.chunkSystem ?? true,
        distanceCulling: options.distanceCulling ?? true,
        frustumCulling: options.frustumCulling ?? true
    };

    // =========================================
    // SYSTEMDATEN
    // =========================================

    const chunks = new Map();
    const registeredObjects = new Map();
    const geometryCache = new Map();
    const materialCache = new Map();
    const objectPools = new Map();
    const instancedGroups = new Map();

    const stats = {
        fps: 60,
        averageFPS: 60,
        frameTime: 0,
        visibleObjects: 0,
        hiddenObjects: 0,
        activeChunks: 0,
        totalChunks: 0,
        drawCalls: 0,
        quality: 1
    };

    let elapsed = 0;
    let updateTimer = 0;
    let frameCounter = 0;
    let fpsTimer = 0;
    let qualityLevel = 1;
    let disposed = false;

    const frustum = new THREE.Frustum();
    const projectionMatrix = new THREE.Matrix4();

    const tempVector = new THREE.Vector3();
    const tempBox = new THREE.Box3();

    // =========================================
    // CHUNK KOORDINATEN
    // =========================================

    function getChunkKey(x, z) {
        const cx = Math.floor(x / SETTINGS.chunkSize);
        const cz = Math.floor(z / SETTINGS.chunkSize);

        return `${cx}_${cz}`;
    }

    function getChunkCoordinates(x, z) {
        return {
            x: Math.floor(x / SETTINGS.chunkSize),
            z: Math.floor(z / SETTINGS.chunkSize)
        };
    }

    // =========================================
    // CHUNK ERSTELLEN
    // =========================================

    function createChunk(x, z) {
        if (disposed) return null;

        const key = `${x}_${z}`;

        if (chunks.has(key)) {
            return chunks.get(key);
        }

        const group = new THREE.Group();

        group.name = `Chunk_${key}`;
        group.userData.isChunk = true;
        group.userData.chunkX = x;
        group.userData.chunkZ = z;

        scene.add(group);

        const chunk = {
            key,
            x,
            z,
            group,
            objects: [],
            active: true,
            lastUsed: performance.now()
        };

        chunks.set(key, chunk);

        stats.totalChunks = chunks.size;

        return chunk;
    }

    // =========================================
    // OBJEKT EINEM CHUNK ZUORDNEN
    // =========================================

    function addToChunk(object, x, z) {
        if (!object || disposed) return null;

        const coordinates = getChunkCoordinates(x, z);

        const chunk = createChunk(
            coordinates.x,
            coordinates.z
        );

        if (!chunk) return null;

        if (object.parent) {
            object.parent.remove(object);
        }

        chunk.group.add(object);

        chunk.objects.push(object);

        object.userData.chunkKey = chunk.key;

        return chunk;
    }

    // =========================================
    // CHUNK ENTFERNEN
    // =========================================

    function removeChunk(key) {
        const chunk = chunks.get(key);

        if (!chunk) return;

        // Objekte nicht zerstören, sondern zurück
        // in die Hauptszene verschieben.
        for (const object of [...chunk.objects]) {
            if (!object) continue;

            scene.attach(object);

            delete object.userData.chunkKey;
        }

        scene.remove(chunk.group);

        chunks.delete(key);

        stats.totalChunks = chunks.size;
        stats.activeChunks = Math.max(
            0,
            stats.activeChunks - (chunk.active ? 1 : 0)
        );
    }

    // =========================================
    // CHUNK SICHTBARKEIT
    // =========================================

    function updateChunks() {
        const cameraPosition = camera.getWorldPosition(
            tempVector
        );

        const current = getChunkCoordinates(
            cameraPosition.x,
            cameraPosition.z
        );

        let activeCount = 0;

        for (const chunk of chunks.values()) {
            const dx = chunk.x - current.x;
            const dz = chunk.z - current.z;

            const distance = Math.sqrt(
                dx * dx + dz * dz
            ) * SETTINGS.chunkSize;

            const active =
                distance <= SETTINGS.renderDistance;

            chunk.active = active;
            chunk.group.visible = active;

            if (active) {
                activeCount++;
                chunk.lastUsed = performance.now();
            }
        }

        stats.activeChunks = activeCount;

        // Alte, weit entfernte Chunks entfernen.
        if (chunks.size > SETTINGS.maxActiveChunks) {
            const inactive = [...chunks.values()]
                .filter(chunk => !chunk.active)
                .sort((a, b) => a.lastUsed - b.lastUsed);

            while (
                chunks.size > SETTINGS.maxActiveChunks &&
                inactive.length > 0
            ) {
                removeChunk(inactive.shift().key);
            }
        }
    }

    // =========================================
    // OBJEKT REGISTRIEREN
    // =========================================

    function registerObject(object, options = {}) {
        if (!object || disposed) return null;

        const existing = registeredObjects.get(object.uuid);

        if (existing) {
            Object.assign(existing, {
                maxDistance:
                    options.maxDistance ??
                    existing.maxDistance,

                lods:
                    options.lods ??
                    existing.lods,

                alwaysVisible:
                    options.alwaysVisible ??
                    existing.alwaysVisible,

                customUpdate:
                    options.update ??
                    existing.customUpdate
            });

            return existing;
        }

        const entry = {
            object,

            maxDistance:
                options.maxDistance ??
                SETTINGS.renderDistance,

            lods: options.lods ?? null,

            originalVisible: object.visible,

            chunked: options.chunked ?? false,

            customUpdate: options.update ?? null,

            alwaysVisible: options.alwaysVisible ?? false,

            lastVisible: object.visible
        };

        registeredObjects.set(object.uuid, entry);

        if (entry.chunked) {
            const worldPosition = object.getWorldPosition(
                new THREE.Vector3()
            );

            addToChunk(
                object,
                worldPosition.x,
                worldPosition.z
            );
        }

        return entry;
    }

    // =========================================
    // OBJEKT ABMELDEN
    // =========================================

    function unregisterObject(object) {
        if (!object) return;

        const entry = registeredObjects.get(object.uuid);

        if (!entry) return;

        // Ursprüngliche Sichtbarkeit wiederherstellen.
        entry.object.visible = entry.originalVisible;

        registeredObjects.delete(object.uuid);
    }

    // =========================================
    // FRUSTUM CULLING
    // =========================================

    function updateFrustum() {
        camera.updateMatrixWorld();

        projectionMatrix.multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse
        );

        frustum.setFromProjectionMatrix(
            projectionMatrix
        );

        stats.visibleObjects = 0;
        stats.hiddenObjects = 0;

        for (const entry of registeredObjects.values()) {
            const object = entry.object;

            if (!object || !object.parent) continue;

            if (entry.alwaysVisible) {
                object.visible = entry.originalVisible;

                if (object.visible) {
                    stats.visibleObjects++;
                }

                continue;
            }

            // Ursprünglich unsichtbare Objekte bleiben
            // unsichtbar.
            if (!entry.originalVisible) {
                object.visible = false;
                stats.hiddenObjects++;
                continue;
            }

            object.updateWorldMatrix(true, false);

            const hasGeometry =
                object.geometry ||
                object.children.length > 0;

            if (!hasGeometry) {
                object.visible = entry.originalVisible;
                continue;
            }

            const box = tempBox.setFromObject(object);

            const inView =
                !SETTINGS.frustumCulling ||
                frustum.intersectsBox(box);

            const objectPosition = object.getWorldPosition(
                new THREE.Vector3()
            );

            const distance = camera.position.distanceTo(
                objectPosition
            );

            const inDistance =
                !SETTINGS.distanceCulling ||
                distance <= entry.maxDistance;

            const visible =
                entry.originalVisible &&
                inView &&
                inDistance;

            object.visible = visible;
            entry.lastVisible = visible;

            if (visible) {
                stats.visibleObjects++;
            } else {
                stats.hiddenObjects++;
            }

            if (entry.customUpdate) {
                entry.customUpdate(
                    object,
                    visible,
                    distance
                );
            }

            if (entry.lods) {
                updateLOD(entry, distance);
            }
        }
    }

    // =========================================
    // LOD SYSTEM
    // =========================================

    function updateLOD(entry, distance) {
        const lods = entry.lods;

        if (!lods || lods.length === 0) return;

        let selected = lods[0];

        for (const lod of lods) {
            if (distance >= lod.distance) {
                selected = lod;
            }
        }

        for (const lod of lods) {
            lod.object.visible =
                entry.originalVisible &&
                lod.object === selected.object;
        }
    }

    function createLOD(objects) {
        const lod = new THREE.LOD();

        for (const item of objects) {
            lod.addLevel(
                item.object,
                item.distance
            );
        }

        return lod;
    }

    // =========================================
    // GEOMETRY CACHE
    // =========================================

    function getGeometry(key, createFunction) {
        if (geometryCache.has(key)) {
            return geometryCache.get(key);
        }

        const geometry = createFunction();

        geometryCache.set(key, geometry);

        return geometry;
    }

    // =========================================
    // MATERIAL CACHE
    // =========================================

    function getMaterial(key, createFunction) {
        if (materialCache.has(key)) {
            return materialCache.get(key);
        }

        const material = createFunction();

        materialCache.set(key, material);

        return material;
    }

    // =========================================
    // OBJECT POOLING
    // =========================================

    function createPool(key, factory, initialSize = 10) {
        if (objectPools.has(key)) {
            return objectPools.get(key);
        }

        const pool = {
            available: [],
            active: new Set(),
            factory
        };

        for (let i = 0; i < initialSize; i++) {
            const object = factory();

            object.visible = false;

            scene.add(object);

            pool.available.push(object);
        }

        objectPools.set(key, pool);

        return pool;
    }

    function acquire(key) {
        if (disposed) return null;

        const pool = objectPools.get(key);

        if (!pool) return null;

        let object = pool.available.pop();

        if (!object) {
            object = pool.factory();

            scene.add(object);
        }

        object.visible = true;

        pool.active.add(object);

        return object;
    }

    function release(key, object) {
        const pool = objectPools.get(key);

        if (!pool || !object) return;

        if (!pool.active.has(object)) return;

        object.visible = false;

        object.position.set(0, -10000, 0);
        object.rotation.set(0, 0, 0);
        object.scale.set(1, 1, 1);

        pool.active.delete(object);
        pool.available.push(object);
    }

    // =========================================
    // INSTANCING
    // =========================================

    function createInstancedGroup(
        key,
        geometry,
        material,
        count
    ) {
        if (instancedGroups.has(key)) {
            return instancedGroups.get(key);
        }

        const mesh = new THREE.InstancedMesh(
            geometry,
            material,
            count
        );

        mesh.count = 0;
        mesh.frustumCulled = true;

        mesh.instanceMatrix.setUsage(
            THREE.DynamicDrawUsage
        );

        scene.add(mesh);

        instancedGroups.set(key, mesh);

        return mesh;
    }

    function setInstance(
        mesh,
        index,
        position,
        rotation,
        scale
    ) {
        if (!mesh || index < 0 || index >= mesh.instanceMatrix.count) {
            return;
        }

        const dummy = new THREE.Object3D();

        dummy.position.copy(position);

        if (rotation) {
            dummy.rotation.copy(rotation);
        }

        if (scale) {
            dummy.scale.copy(scale);
        }

        dummy.updateMatrix();

        mesh.setMatrixAt(index, dummy.matrix);

        mesh.count = Math.max(
            mesh.count,
            index + 1
        );

        mesh.instanceMatrix.needsUpdate = true;
    }

    // =========================================
    // AUTOMATISCHE QUALITÄT
    // =========================================

    function setQuality(level) {
        qualityLevel = THREE.MathUtils.clamp(
            level,
            0.25,
            1
        );

        stats.quality = qualityLevel;

        const pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            2
        ) * qualityLevel;

        renderer.setPixelRatio(pixelRatio);

        renderer.setSize(
            window.innerWidth,
            window.innerHeight,
            false
        );

        if (renderer.shadowMap.enabled) {
            renderer.shadowMap.autoUpdate =
                qualityLevel >= 0.75;
        }

        return qualityLevel;
    }

    function updateAdaptiveQuality() {
        if (!SETTINGS.autoQuality) return;

        // Kleine Schritte statt hektischer Änderungen.
        if (stats.averageFPS < SETTINGS.minimumFPS) {
            setQuality(qualityLevel - 0.05);
        } else if (
            stats.averageFPS > SETTINGS.targetFPS + 5 &&
            qualityLevel < 1
        ) {
            setQuality(qualityLevel + 0.025);
        }
    }

    // =========================================
    // FPS MONITOR
    // =========================================

    function updateFPS(deltaTime) {
        frameCounter++;

        fpsTimer += deltaTime;

        stats.frameTime = deltaTime * 1000;

        if (fpsTimer >= 1) {
            stats.fps = Math.round(
                frameCounter / fpsTimer
            );

            stats.averageFPS =
                stats.averageFPS * 0.8 +
                stats.fps * 0.2;

            frameCounter = 0;
            fpsTimer = 0;

            updateAdaptiveQuality();
        }
    }

    // =========================================
    // HAUPT UPDATE
    // =========================================

    function update(deltaTime) {
        if (disposed) return;

        if (!Number.isFinite(deltaTime) || deltaTime < 0) {
            deltaTime = 0;
        }

        elapsed += deltaTime;

        updateFPS(deltaTime);

        updateTimer += deltaTime;

        if (updateTimer >= SETTINGS.updateInterval) {
            updateTimer = 0;

            if (SETTINGS.chunkSystem) {
                updateChunks();
            }

            if (SETTINGS.culling) {
                if (
                    SETTINGS.frustumCulling ||
                    SETTINGS.distanceCulling
                ) {
                    updateFrustum();
                }
            }
        }
    }

    // =========================================
    // STATISTIKEN
    // =========================================

    function getStats() {
        return {
            ...stats,

            chunks: chunks.size,

            registeredObjects:
                registeredObjects.size,

            geometryCache:
                geometryCache.size,

            materialCache:
                materialCache.size,

            pools:
                objectPools.size,

            instancedGroups:
                instancedGroups.size,

            elapsed
        };
    }

    // =========================================
    // AUFRÄUMEN
    // =========================================

    function dispose() {
        if (disposed) return;

        disposed = true;

        for (const entry of registeredObjects.values()) {
            if (entry.object) {
                entry.object.visible =
                    entry.originalVisible;
            }
        }

        for (const chunk of chunks.values()) {
            scene.remove(chunk.group);
        }

        for (const mesh of instancedGroups.values()) {
            scene.remove(mesh);
        }

        for (const pool of objectPools.values()) {
            for (const object of pool.active) {
                scene.remove(object);
            }

            for (const object of pool.available) {
                scene.remove(object);
            }
        }

        // Cache-Objekte werden nicht automatisch
        // disposed, da andere Spielobjekte sie
        // möglicherweise noch verwenden.

        chunks.clear();
        registeredObjects.clear();
        geometryCache.clear();
        materialCache.clear();
        objectPools.clear();
        instancedGroups.clear();

        stats.totalChunks = 0;
        stats.activeChunks = 0;
        stats.visibleObjects = 0;
        stats.hiddenObjects = 0;
    }

    // =========================================
    // SYSTEM ZURÜCKGEBEN
    // =========================================

    return {
        update,

        registerObject,
        unregisterObject,

        createChunk,
        addToChunk,
        removeChunk,

        createLOD,
        updateLOD,

        getGeometry,
        getMaterial,

        createPool,
        acquire,
        release,

        createInstancedGroup,
        setInstance,

        setQuality,

        getStats,

        dispose,

        settings: SETTINGS
    };
}
