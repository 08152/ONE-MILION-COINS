
function createCoinMachine(THREE, options = {}) {
    const group = new THREE.Group();

    const width = options.width ?? 2.2;
    const height = options.height ?? 2.3;
    const depth = options.depth ?? 1.7;

    const interactionDistance = options.interactionDistance ?? 3.5;

    // Inventar-Anbindung
    const getCoins = options.getCoins ?? (() => {
        return options.inventory?.coins ?? 0;
    });

    const removeCoins = options.removeCoins ?? ((amount) => {
        if (options.inventory) {
            options.inventory.coins = Math.max(
                0,
                (options.inventory.coins ?? 0) - amount
            );
        }
    });

    const steel = new THREE.MeshStandardMaterial({
        color: 0x777F83,
        metalness: 0.9,
        roughness: 0.27
    });

    const darkSteel = new THREE.MeshStandardMaterial({
        color: 0x292F33,
        metalness: 0.85,
        roughness: 0.32
    });

    const black = new THREE.MeshStandardMaterial({
        color: 0x111719,
        metalness: 0.35,
        roughness: 0.25
    });

    const glass = new THREE.MeshPhysicalMaterial({
        color: 0x18282C,
        metalness: 0.25,
        roughness: 0.12,
        transmission: 0.15,
        transparent: true,
        opacity: 0.9
    });

    const displayMaterial = new THREE.MeshStandardMaterial({
        color: 0x16352D,
        emissive: 0x073C24,
        emissiveIntensity: 0.5,
        roughness: 0.3
    });

    function addBox(w, h, d, material, x, y, z) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            material
        );

        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        group.add(mesh);
        return mesh;
    }

    // =========================================
    // HAUPTGEHÄUSE
    // =========================================

    addBox(width, height, depth, steel, 0, height / 2, 0);

    // Sockel
    addBox(
        width + 0.12,
        0.2,
        depth + 0.12,
        darkSteel,
        0, 0.1, 0
    );

    // Frontplatte
    addBox(
        width * 0.88,
        height * 0.85,
        0.055,
        darkSteel,
        0,
        height * 0.52,
        depth / 2 + 0.035
    );

    // =========================================
    // SICHTFENSTER
    // =========================================

    addBox(
        width * 0.53,
        height * 0.38,
        0.035,
        black,
        -width * 0.12,
        height * 0.62,
        depth / 2 + 0.075
    );

    addBox(
        width * 0.48,
        height * 0.32,
        0.025,
        glass,
        -width * 0.12,
        height * 0.62,
        depth / 2 + 0.1
    );

    const internalParts = [];

    for (let i = 0; i < 3; i++) {
        const roller = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.4, 32),
            steel
        );

        roller.rotation.z = Math.PI / 2;

        roller.position.set(
            -width * 0.12,
            height * 0.55 + i * 0.17,
            depth / 2 + 0.13
        );

        group.add(roller);
        internalParts.push(roller);
    }

    // Fensterrahmen
    const frameThickness = 0.055;
    const windowWidth = width * 0.53;
    const windowHeight = height * 0.38;

    addBox(
        windowWidth + frameThickness * 2,
        frameThickness,
        0.07,
        steel,
        -width * 0.12,
        height * 0.62 + windowHeight / 2,
        depth / 2 + 0.12
    );

    addBox(
        windowWidth + frameThickness * 2,
        frameThickness,
        0.07,
        steel,
        -width * 0.12,
        height * 0.62 - windowHeight / 2,
        depth / 2 + 0.12
    );

    for (const side of [-1, 1]) {
        addBox(
            frameThickness,
            windowHeight,
            0.07,
            steel,
            -width * 0.12 + side * windowWidth / 2,
            height * 0.62,
            depth / 2 + 0.12
        );
    }

    // =========================================
    // BEDIENFELD
    // =========================================

    const panelX = width * 0.31;

    addBox(
        width * 0.27,
        height * 0.55,
        0.07,
        darkSteel,
        panelX,
        height * 0.65,
        depth / 2 + 0.08
    );

    const displayWidth = width * 0.21;
    const displayHeight = 0.28;
    const displayY = height * 0.79;
    const displayZ = depth / 2 + 0.13;

    addBox(
        displayWidth,
        displayHeight,
        0.035,
        displayMaterial,
        panelX,
        displayY,
        displayZ
    );

    addBox(
        width * 0.23,
        0.32,
        0.025,
        steel,
        panelX,
        displayY,
        depth / 2 + 0.11
    );

    // =========================================
    // DIGITALES DISPLAY
    // =========================================

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;

    const ctx = canvas.getContext("2d");

    const displayTexture = new THREE.CanvasTexture(canvas);

    displayTexture.colorSpace = THREE.SRGBColorSpace;

    const displayScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(
            displayWidth * 0.88,
            displayHeight * 0.82
        ),
        new THREE.MeshBasicMaterial({
            map: displayTexture,
            toneMapped: false
        })
    );

    displayScreen.position.set(
        panelX,
        displayY,
        depth / 2 + 0.151
    );

    group.add(displayScreen);

    let depositedCoins = 0;
    let nearby = false;
    let isDepositing = false;
    let depositAnimation = 0;

    function drawDisplay() {
        ctx.fillStyle = "#07150F";
        ctx.fillRect(0, 0, 512, 256);

        ctx.fillStyle = "#49F59A";
        ctx.font = "bold 27px Arial";
        ctx.textAlign = "center";

        ctx.fillText("COIN MACHINE", 256, 48);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 51px Arial";

        ctx.fillText(
            depositedCoins.toLocaleString("de-DE"),
            256,
            132
        );

        ctx.fillStyle = "#67D99A";
        ctx.font = "23px Arial";

        ctx.fillText("COINS DEPOSITED", 256, 184);

        ctx.fillStyle = "#4A8769";
        ctx.font = "17px Arial";

        ctx.fillText(
            isDepositing ? "PROCESSING..." : "SYSTEM ONLINE",
            256,
            225
        );

        displayTexture.needsUpdate = true;
    }

    drawDisplay();

    // =========================================
    // BEDIENKNÖPFE
    // =========================================

    const buttons = [];

    for (let i = 0; i < 4; i++) {
        const button = new THREE.Mesh(
            new THREE.CylinderGeometry(0.065, 0.07, 0.045, 32),
            i === 0
                ? new THREE.MeshStandardMaterial({
                    color: 0x2EAA59,
                    metalness: 0.4,
                    roughness: 0.25
                })
                : steel
        );

        button.rotation.x = Math.PI / 2;

        button.position.set(
            panelX + (i % 2) * 0.19 - 0.09,
            height * 0.58 - Math.floor(i / 2) * 0.18,
            depth / 2 + 0.15
        );

        group.add(button);
        buttons.push(button);
    }

    // Not-Aus
    const emergency = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.09, 0.08, 32),
        new THREE.MeshStandardMaterial({
            color: 0xCC2424,
            metalness: 0.3,
            roughness: 0.3
        })
    );

    emergency.rotation.x = Math.PI / 2;

    emergency.position.set(
        panelX,
        height * 0.43,
        depth / 2 + 0.16
    );

    group.add(emergency);

    // =========================================
    // LÜFTUNG
    // =========================================

    for (let i = 0; i < 9; i++) {
        addBox(
            0.32,
            0.025,
            0.025,
            darkSteel,
            width / 2 + 0.015,
            height * 0.3 + i * 0.07,
            0
        );
    }

    // Verschraubungen
    for (const x of [-width * 0.43, width * 0.43]) {
        for (const y of [0.3, height - 0.3]) {
            const bolt = new THREE.Mesh(
                new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12),
                steel
            );

            bolt.rotation.x = Math.PI / 2;
            bolt.position.set(x, y, depth / 2 + 0.09);

            group.add(bolt);
        }
    }

    // Oberer Trichteranschluss
    const topConnector = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.16, 48),
        darkSteel
    );

    topConnector.position.set(0, height + 0.08, 0);
    group.add(topConnector);

    const topOpening = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.17, 48, 1, true),
        steel
    );

    topOpening.position.set(0, height + 0.17, 0);
    group.add(topOpening);

    // Münzausgang
    const output = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.27, 0.3, 48),
        darkSteel
    );

    output.rotation.x = Math.PI / 2;

    output.position.set(
        0, 0.55, depth / 2 + 0.22
    );

    group.add(output);

    // =========================================
    // INTERAKTION: E DRÜCKEN
    // =========================================

    function getWorldPosition() {
        return group.getWorldPosition(new THREE.Vector3());
    }

    function getPlayerPosition() {
        if (typeof options.getPlayerPosition === "function") {
            return options.getPlayerPosition();
        }

        if (options.player) {
            return options.player.getWorldPosition(
                new THREE.Vector3()
            );
        }

        return null;
    }

    function canInteract() {
        return nearby && !isDepositing;
    }

    function depositCoins() {
        if (!canInteract()) return 0;

        const amount = Math.max(
            0,
            Math.floor(Number(getCoins()) || 0)
        );

        if (amount <= 0) return 0;

        removeCoins(amount);

        depositedCoins += amount;

        isDepositing = true;
        depositAnimation = 0.8;

        drawDisplay();

        if (typeof options.onDeposit === "function") {
            options.onDeposit(amount, depositedCoins);
        }

        return amount;
    }

    function handleKeyDown(event) {
        if (event.code !== "KeyE" || event.repeat) return;

        // Nicht auslösen, wenn gerade in ein Eingabefeld geschrieben wird.
        const tag = event.target?.tagName;

        if (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            event.target?.isContentEditable
        ) {
            return;
        }

        depositCoins();
    }

    window.addEventListener("keydown", handleKeyDown);

    // =========================================
    // INTERAKTIONSANZEIGE
    // =========================================

    let promptElement = null;

    if (options.showPrompt !== false) {
        promptElement = document.createElement("div");

        promptElement.style.position = "fixed";
        promptElement.style.left = "50%";
        promptElement.style.bottom = "14%";
        promptElement.style.transform = "translateX(-50%)";
        promptElement.style.padding = "12px 22px";
        promptElement.style.background = "rgba(8, 15, 12, 0.9)";
        promptElement.style.border = "1px solid #49F59A";
        promptElement.style.borderRadius = "7px";
        promptElement.style.color = "white";
        promptElement.style.font = "bold 16px Arial";
        promptElement.style.zIndex = "9999";
        promptElement.style.pointerEvents = "none";
        promptElement.style.display = "none";

        document.body.appendChild(promptElement);
    }

    function updateInteraction() {
        const playerPosition = getPlayerPosition();

        if (!playerPosition) {
            nearby = false;

            if (promptElement) {
                promptElement.style.display = "none";
            }

            return;
        }

        const machinePosition = getWorldPosition();

        const distance = playerPosition.distanceTo(
            machinePosition
        );

        nearby = distance <= interactionDistance;

        if (promptElement) {
            if (nearby) {
                const coins = Math.max(
                    0,
                    Math.floor(Number(getCoins()) || 0)
                );

                promptElement.style.display = "block";

                promptElement.textContent =
                    `E  –  Coins einzahlen (${coins.toLocaleString("de-DE")} verfügbar)`;
            } else {
                promptElement.style.display = "none";
            }
        }

        if (typeof options.onInteractionChange === "function") {
            options.onInteractionChange(nearby);
        }
    }

    // =========================================
    // UPDATE
    // =========================================

    function update(deltaTime) {
        internalParts.forEach((part, index) => {
            const speed = isDepositing ? 12 : 2;

            part.rotation.x +=
                deltaTime * speed * (index % 2 === 0 ? 1 : -1);
        });

        if (depositAnimation > 0) {
            depositAnimation -= deltaTime;

            if (depositAnimation <= 0) {
                isDepositing = false;
                drawDisplay();
            }
        }

        updateInteraction();
    }

    // =========================================
    // AUFRÄUMEN
    // =========================================

    function dispose() {
        window.removeEventListener("keydown", handleKeyDown);

        if (promptElement) {
            promptElement.remove();
            promptElement = null;
        }

        displayTexture.dispose();
        displayScreen.geometry.dispose();
    }

    // =========================================
    // SCHATTEN
    // =========================================

    group.traverse(object => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });

    // =========================================
    // RÜCKGABE
    // =========================================

    return {
        group,
        update,
        buttons,
        emergency,
        internalParts,

        depositCoins,
        updateInteraction,
        canInteract,
        dispose,

        get depositedCoins() {
            return depositedCoins;
        },

        get nearby() {
            return nearby;
        },

        get isDepositing() {
            return isDepositing;
        }
    };
}
