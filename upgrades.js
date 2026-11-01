
function createUpgradeSystem(options = {}) {

    // =========================================
    // KONFIGURATION
    // =========================================

    const settings = {
        key: options.key || "KeyQ"
    };

    // Coins, die zum Erreichen der nächsten Etage
    // benötigt werden. Über options.floors anpassbar.
    const floors = Array.isArray(options.floors) &&
        options.floors.length > 0
        ? [...options.floors]
        : [
            100,
            250,
            500,
            1000,
            2500,
            5000,
            10000,
            25000,
            50000,
            100000
        ];

    const totalGoal = floors.reduce(
        (sum, value) => sum + value,
        0
    );

    // =========================================
    // DATEN
    // =========================================

    let skillPoints = 0;
    let totalCollected = 0;

    let taskLevel = 1;
    let taskProgress = 0;

    let menuOpen = false;
    let activeTab = "hands";

    let currentFloor = 0;
    let floorCoins = 0;

    let vacuumActive = false;
    let vacuumTimer = 0;

    const purchased = new Set();

    const stats = {
        pickupAmount: 1,
        holdToCollect: false,
        pickupSpeed: 1,
        pickupRadius: 1,

        bagCapacity: 25,

        depositSpeed: 1,
        depositTime: 5,

        machineSpeed: 1,
        machineCapacity: 1,

        vacuumEnabled: false,
        vacuumStrength: 1,
        vacuumSpeed: 5,
        vacuumRadius: 1,
        vacuumAmount: 1
    };

    // =========================================
    // AUFGABEN
    // =========================================

    function getTaskGoal(level) {
        return Math.floor(
            50 * Math.pow(1.5, level - 1)
        );
    }

    function addCollectedCoins(amount) {

        amount = Math.max(0, Math.floor(amount));

        if (amount <= 0) return;

        totalCollected += amount;

        let remaining = amount;

        while (remaining > 0) {

            const goal = getTaskGoal(taskLevel);
            const needed = goal - taskProgress;

            const collected = Math.min(
                remaining,
                needed
            );

            taskProgress += collected;
            remaining -= collected;

            if (taskProgress >= goal) {

                taskLevel++;
                taskProgress = 0;

                skillPoints++;

                if (options.onSkillPoint) {
                    options.onSkillPoint(skillPoints);
                }

                if (options.onTaskComplete) {
                    options.onTaskComplete(taskLevel - 1);
                }
            }
        }

        updateTaskUI();
    }

    // =========================================
    // UPGRADE-DATEN
    // =========================================

    const upgradeTrees = {

        hands: {
            title: "Hände",
            upgrades: [

                {
                    id: "hands_1",
                    name: "2 auf einmal",
                    description: "Sammle zwei Coins gleichzeitig.",
                    cost: 1,
                    requires: [],
                    apply() {
                        stats.pickupAmount = 2;
                    }
                },
                {
                    id: "hands_2",
                    name: "Linksklick gedrückt halten",
                    description: "Halte Linksklick zum Sammeln gedrückt.",
                    cost: 2,
                    requires: ["hands_1"],
                    apply() {
                        stats.holdToCollect = true;
                    }
                },
                {
                    id: "hands_3",
                    name: "Schneller sammeln",
                    description: "Sammle schneller.",
                    cost: 2,
                    requires: ["hands_1"],
                    apply() {
                        stats.pickupSpeed *= 1.5;
                    }
                },
                {
                    id: "hands_4",
                    name: "Noch schneller sammeln",
                    description: "Erhöhe deine Sammelgeschwindigkeit.",
                    cost: 3,
                    requires: ["hands_3"],
                    apply() {
                        stats.pickupSpeed *= 1.5;
                    }
                },
                {
                    id: "hands_5",
                    name: "3 auf einmal",
                    description: "Sammle drei Coins gleichzeitig.",
                    cost: 4,
                    requires: ["hands_2"],
                    apply() {
                        stats.pickupAmount = 3;
                    }
                },
                {
                    id: "hands_6",
                    name: "Im größeren Umfeld sammeln",
                    description: "Erhöhe deine Sammelreichweite.",
                    cost: 4,
                    requires: ["hands_4", "hands_5"],
                    apply() {
                        stats.pickupRadius *= 1.5;
                    }
                },
                {
                    id: "hands_7",
                    name: "Noch schneller sammeln",
                    description: "Noch mehr Sammelgeschwindigkeit.",
                    cost: 5,
                    requires: ["hands_6"],
                    apply() {
                        stats.pickupSpeed *= 1.7;
                    }
                },
                {
                    id: "hands_8",
                    name: "4 auf einmal sammeln",
                    description: "Sammle vier Coins gleichzeitig.",
                    cost: 6,
                    requires: ["hands_6"],
                    apply() {
                        stats.pickupAmount = 4;
                    }
                },
                {
                    id: "hands_9",
                    name: "Größerer Bereich",
                    description: "Sammle Coins aus noch größerer Entfernung.",
                    cost: 7,
                    requires: ["hands_7", "hands_8"],
                    apply() {
                        stats.pickupRadius *= 2;
                    }
                },
                {
                    id: "hands_10",
                    name: "Alles auf Maximum",
                    description: "Verbessere alle Hand-Fähigkeiten nochmals.",
                    cost: 10,
                    requires: ["hands_9"],
                    apply() {
                        stats.pickupSpeed *= 1.5;
                        stats.pickupRadius *= 1.5;
                        stats.pickupAmount = 5;
                    }
                }
            ]
        },

        bag: {
            title: "Tasche",
            upgrades: [
                ...[
                    50, 100, 200, 400, 750,
                    1200, 2000, 3500, 5000
                ].map((capacity, index) => ({
                    id: "bag_" + (index + 1),
                    name: capacity.toLocaleString("de-DE") + " Coins Kapazität",
                    description: "Erhöhe deine Taschenkapazität auf " +
                        capacity.toLocaleString("de-DE") + " Coins.",
                    cost: index + 1,
                    requires: index === 0
                        ? []
                        : ["bag_" + index],
                    apply() {
                        stats.bagCapacity = capacity;
                    }
                }))
            ]
        },

        machine: {
            title: "Maschine",
            upgrades: [
                {
                    id: "machine_1",
                    name: "Schnellere Einzahlung",
                    description: "Die Maschine gibt Coins schneller ab.",
                    cost: 2,
                    requires: [],
                    apply() {
                        stats.depositSpeed *= 1.5;
                        stats.depositTime = 5 / stats.depositSpeed;
                    }
                },
                {
                    id: "machine_2",
                    name: "Verbesserte Rollen",
                    description: "Die Maschine verarbeitet Coins schneller.",
                    cost: 3,
                    requires: ["machine_1"],
                    apply() {
                        stats.machineSpeed *= 1.5;
                    }
                },
                {
                    id: "machine_3",
                    name: "Turbo-Einzahlung",
                    description: "Noch schnelleres Einzahlen.",
                    cost: 5,
                    requires: ["machine_2"],
                    apply() {
                        stats.depositSpeed *= 2;
                        stats.depositTime = 5 / stats.depositSpeed;
                    }
                },
                {
                    id: "machine_4",
                    name: "Ultra-Einzahlung",
                    description: "Verbessert die Einzahlung deutlich.",
                    cost: 8,
                    requires: ["machine_3"],
                    apply() {
                        stats.depositSpeed *= 3;
                        stats.depositTime = 5 / stats.depositSpeed;
                    }
                }
            ]
        },

        vacuum: {
            title: "Staubsauger",
            upgrades: [
                {
                    id: "vacuum_1",
                    name: "Staubsauger freischalten",
                    description: "Aktiviere den Saugtrichter.",
                    cost: 3,
                    requires: [],
                    apply() {
                        stats.vacuumEnabled = true;
                    }
                },
                {
                    id: "vacuum_2",
                    name: "Mehr Saugkraft",
                    description: "Coins werden stärker angezogen.",
                    cost: 3,
                    requires: ["vacuum_1"],
                    apply() {
                        stats.vacuumStrength *= 1.5;
                    }
                },
                {
                    id: "vacuum_3",
                    name: "Größerer Saugkreis",
                    description: "Erhöhe die Reichweite.",
                    cost: 4,
                    requires: ["vacuum_1"],
                    apply() {
                        stats.vacuumRadius *= 1.7;
                    }
                },
                {
                    id: "vacuum_4",
                    name: "Schneller saugen",
                    description: "Der Trichter saugt schneller.",
                    cost: 5,
                    requires: ["vacuum_2"],
                    apply() {
                        stats.vacuumSpeed *= 2;
                    }
                },
                {
                    id: "vacuum_5",
                    name: "Doppelter Durchsatz",
                    description: "Der Trichter saugt mehr Coins gleichzeitig.",
                    cost: 7,
                    requires: ["vacuum_3", "vacuum_4"],
                    apply() {
                        stats.vacuumAmount *= 2;
                    }
                }
            ]
        }
    };

    // =========================================
    // UPGRADE KAUFEN
    // =========================================

    function buyUpgrade(id) {

        for (const tree of Object.values(upgradeTrees)) {

            const upgrade = tree.upgrades.find(
                item => item.id === id
            );

            if (!upgrade) continue;

            if (purchased.has(id)) return false;

            const unlocked = upgrade.requires.every(
                requirement => purchased.has(requirement)
            );

            if (!unlocked) return false;

            if (skillPoints < upgrade.cost) return false;

            skillPoints -= upgrade.cost;

            purchased.add(id);

            upgrade.apply();

            updateUI();

            if (options.onUpgrade) {
                options.onUpgrade(id, stats);
            }

            return true;
        }

        return false;
    }

    // =========================================
    // UI ERSTELLEN
    // =========================================

    const style = document.createElement("style");

    style.textContent = `
        #coinTask {
            position: fixed;
            right: 22px;
            bottom: 22px;
            width: 270px;
            padding: 17px;
            background: rgba(13,17,24,.96);
            border: 1px solid #b58a35;
            border-radius: 12px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 10000;
            box-shadow: 0 8px 30px #0008;
        }

        #coinTask .taskTitle {
            font-size: 13px;
            color: #d6a83f;
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }

        #coinTask .taskName {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 7px;
        }

        #coinTask .taskProgress {
            color: #bbb;
            font-size: 13px;
            margin-bottom: 9px;
        }

        #coinTask .taskBar {
            height: 8px;
            background: #30343d;
            border-radius: 10px;
            overflow: hidden;
        }

        #coinTask .taskFill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg,#b78327,#ffdc76);
            transition: width .2s;
        }

        #coinTask .skillPoints {
            margin-top: 13px;
            color: #f5cb65;
            font-size: 15px;
            font-weight: bold;
        }

        #upgradeMenu {
            display: none;
            position: fixed;
            inset: 5%;
            z-index: 10001;
            background: rgba(10,13,19,.98);
            border: 1px solid #b58a35;
            border-radius: 16px;
            color: white;
            font-family: Arial, sans-serif;
            overflow: auto;
            padding: 25px;
            box-sizing: border-box;
        }

        #upgradeMenu h1 {
            color: #f1c65e;
            margin-top: 0;
        }

        #upgradeTabs {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 20px 0;
        }

        #upgradeTabs button,
        #upgradeClose {
            background: #242b36;
            color: white;
            border: 1px solid #505866;
            padding: 11px 17px;
            border-radius: 7px;
            cursor: pointer;
        }

        #upgradeTabs button.active {
            background: #a87924;
            border-color: #f0c76b;
        }

        #upgradeGrid {
            display: grid;
            grid-template-columns: repeat(auto-fit,minmax(230px,1fr));
            gap: 13px;
        }

        .upgradeCard {
            background: #1b222d;
            border: 1px solid #414b5a;
            border-radius: 10px;
            padding: 16px;
        }

        .upgradeCard.locked {
            opacity: .45;
        }

        .upgradeCard.bought {
            border-color: #4caa73;
            background: #14271e;
        }

        .upgradeCard h3 {
            margin: 0 0 8px;
            color: #f1c65e;
            font-size: 16px;
        }

        .upgradeCard p {
            color: #bbc2cc;
            font-size: 13px;
            min-height: 35px;
            line-height: 1.4;
        }

        .upgradeCard button {
            width: 100%;
            padding: 10px;
            border: 0;
            border-radius: 6px;
            background: #b4852c;
            color: white;
            font-weight: bold;
            cursor: pointer;
        }

        .upgradeCard button:disabled {
            background: #424852;
            cursor: not-allowed;
        }

        #upgradePoints {
            color: #f1c65e;
            font-weight: bold;
        }

        #upgradeHint {
            color: #aaa;
            margin-top: 12px;
            font-size: 13px;
        }
    `;

    document.head.appendChild(style);

    const taskUI = document.createElement("div");
    taskUI.id = "coinTask";

    taskUI.innerHTML = `
        <div class="taskTitle">DEINE AUFGABE</div>
        <div class="taskName">Sammle Coins</div>
        <div class="taskProgress">0 / 50 Coins</div>
        <div class="taskBar"><div class="taskFill"></div></div>
        <div class="skillPoints">Skillpunkte: 0</div>
        <div style="color:#888;font-size:11px;margin-top:8px">
            Drücke Q für Upgrades
        </div>
    `;

    document.body.appendChild(taskUI);

    const menu = document.createElement("div");
    menu.id = "upgradeMenu";

    menu.innerHTML = `
        <h1>UPGRADES</h1>
        <div id="upgradePoints">Skillpunkte: 0</div>
        <div id="upgradeTabs"></div>
        <div id="upgradeGrid"></div>
        <div id="upgradeHint">Drücke Q zum Schließen.</div>
        <button id="upgradeClose">Schließen</button>
    `;

    document.body.appendChild(menu);

    // =========================================
    // AUFGABEN-UI AKTUALISIEREN
    // =========================================

    function updateTaskUI() {

        const goal = getTaskGoal(taskLevel);

        const percentage = Math.min(
            100,
            taskProgress / goal * 100
        );

        taskUI.querySelector(".taskName").textContent =
            "Sammle " + goal.toLocaleString("de-DE") + " Coins";

        taskUI.querySelector(".taskProgress").textContent =
            taskProgress.toLocaleString("de-DE") +
            " / " +
            goal.toLocaleString("de-DE") +
            " Coins";

        taskUI.querySelector(".taskFill").style.width =
            percentage + "%";

        taskUI.querySelector(".skillPoints").textContent =
            "Skillpunkte: " + skillPoints;
    }

    // =========================================
    // UPGRADE-MENÜ AKTUALISIEREN
    // =========================================

    function renderTabs() {

        const tabs = menu.querySelector("#upgradeTabs");
        tabs.innerHTML = "";

        for (const [id, tree] of Object.entries(upgradeTrees)) {

            const button = document.createElement("button");

            button.textContent = tree.title;
            button.className =
                activeTab === id ? "active" : "";

            button.onclick = () => {
                activeTab = id;
                renderTabs();
                renderUpgrades();
            };

            tabs.appendChild(button);
        }
    }

    function renderUpgrades() {

        const grid = menu.querySelector("#upgradeGrid");
        grid.innerHTML = "";

        const tree = upgradeTrees[activeTab];

        for (const upgrade of tree.upgrades) {

            const bought = purchased.has(upgrade.id);

            const unlocked = upgrade.requires.every(
                requirement => purchased.has(requirement)
            );

            const canBuy =
                unlocked &&
                skillPoints >= upgrade.cost &&
                !bought;

            const card = document.createElement("div");

            card.className = "upgradeCard";

            if (bought) card.classList.add("bought");

            if (!unlocked && !bought) {
                card.classList.add("locked");
            }

            const requirements = upgrade.requires.length
                ? "Benötigt: " + upgrade.requires.join(", ")
                : "Start-Upgrade";

            const title = document.createElement("h3");
            title.textContent = upgrade.name;

            const description = document.createElement("p");
            description.textContent = upgrade.description;

            const requirementText = document.createElement("div");
            requirementText.style.cssText =
                "color:#aaa;font-size:11px;margin-bottom:12px";
            requirementText.textContent = requirements;

            const button = document.createElement("button");

            button.disabled = !canBuy;

            button.textContent = bought
                ? "Gekauft"
                : !unlocked
                    ? "Gesperrt"
                    : upgrade.cost + " Skillpunkte";

            button.onclick = () => {
                if (buyUpgrade(upgrade.id)) {
                    renderUpgrades();
                }
            };

            card.append(
                title,
                description,
                requirementText,
                button
            );

            grid.appendChild(card);
        }
    }

    function updateUI() {

        updateTaskUI();

        menu.querySelector("#upgradePoints").textContent =
            "Skillpunkte: " + skillPoints;

        renderTabs();
        renderUpgrades();
    }

    // =========================================
    // MENÜ ÖFFNEN / SCHLIESSEN
    // =========================================

    function setMenu(open) {

        menuOpen = Boolean(open);

        menu.style.display =
            menuOpen ? "block" : "none";

        if (options.onMenuToggle) {
            options.onMenuToggle(menuOpen);
        }

        updateUI();
    }

    function keyHandler(event) {

        if (event.code !== settings.key) return;

        const target = event.target;

        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target?.isContentEditable
        ) return;

        event.preventDefault();

        setMenu(!menuOpen);
    }

    document.addEventListener("keydown", keyHandler);

    menu.querySelector("#upgradeClose").onclick = () => {
        setMenu(false);
    };

    // =========================================
    // SKILLPUNKTE UND COINS
    // =========================================

    function addSkillPoints(amount) {

        amount = Math.max(0, Math.floor(amount));

        if (amount <= 0) return;

        skillPoints += amount;

        updateUI();
    }

    function addCoins(amount) {
        addCollectedCoins(amount);
    }

    function getStats() {
        return { ...stats };
    }

    function getSkillPoints() {
        return skillPoints;
    }

    function getTask() {
        return {
            level: taskLevel,
            progress: taskProgress,
            goal: getTaskGoal(taskLevel)
        };
    }

    function getTotalCollected() {
        return totalCollected;
    }

    function hasUpgrade(id) {
        return purchased.has(id);
    }

    function getUpgradeLevel(treeId) {

        const tree = upgradeTrees[treeId];

        if (!tree) return 0;

        return tree.upgrades.filter(
            upgrade => purchased.has(upgrade.id)
        ).length;
    }

    // =========================================
    // ETAGEN-SYSTEM
    // =========================================

    function addFloorCoins(amount) {

        amount = Math.max(0, Math.floor(amount));

        if (amount <= 0) return;

        let remaining = amount;

        while (
            remaining > 0 &&
            currentFloor < floors.length
        ) {

            const goal = floors[currentFloor];
            const needed = goal - floorCoins;

            const collected = Math.min(
                remaining,
                needed
            );

            floorCoins += collected;
            remaining -= collected;

            if (floorCoins >= goal) {

                if (currentFloor < floors.length - 1) {

                    currentFloor++;
                    floorCoins = 0;

                    if (options.onFloorComplete) {
                        options.onFloorComplete(
                            currentFloor
                        );
                    }

                } else {

                    floorCoins = goal;
                    remaining = 0;
                }
            }
        }

        if (options.onFloorProgress) {
            options.onFloorProgress({
                floor: currentFloor + 1,
                coins: floorCoins,
                goal: floors[currentFloor],
                totalGoal
            });
        }
    }

    function getFloorInfo() {

        return {
            floor: currentFloor + 1,
            coins: floorCoins,
            goal: floors[currentFloor],
            totalGoal,
            floors: [...floors],
            completed: currentFloor === floors.length - 1 &&
                floorCoins >= floors[currentFloor]
        };
    }

    // =========================================
    // STAUBSAUGER
    // =========================================

    function updateVacuum(
        deltaTime,
        nearbyCoins,
        absorbCoin
    ) {

        if (
            !stats.vacuumEnabled ||
            !vacuumActive ||
            typeof absorbCoin !== "function" ||
            !Array.isArray(nearbyCoins)
        ) {
            return;
        }

        vacuumTimer += Math.max(0, deltaTime);

        const interval = 5 / stats.vacuumSpeed;

        if (vacuumTimer < interval) return;

        vacuumTimer -= interval;

        let absorbed = 0;

        for (const coin of nearbyCoins) {

            if (absorbed >= stats.vacuumAmount) break;

            // Coins nur als erfolgreich gesammelt zählen,
            // wenn der Callback nicht fehlschlägt.
            try {
                absorbCoin(coin);

                addFloorCoins(1);
                addCollectedCoins(1);

                absorbed++;

            } catch (error) {
                console.error(
                    "Fehler beim Einsaugen eines Coins:",
                    error
                );
            }
        }
    }

    function setVacuumActive(active) {
        vacuumActive = Boolean(active);
    }

    // =========================================
    // AUFRÄUMEN
    // =========================================

    function dispose() {

        document.removeEventListener(
            "keydown",
            keyHandler
        );

        style.remove();
        taskUI.remove();
        menu.remove();
    }

    // =========================================
    // START
    // =========================================

    updateUI();

    return {
        addCoins,
        addCollectedCoins,
        addSkillPoints,

        buyUpgrade,
        hasUpgrade,
        getUpgradeLevel,

        getStats,
        getSkillPoints,
        getTask,
        getTotalCollected,

        setMenu,
        isMenuOpen: () => menuOpen,

        addFloorCoins,
        getFloorInfo,

        updateVacuum,
        setVacuumActive,

        dispose
    };
}
