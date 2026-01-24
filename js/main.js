class LAXIndoorNavApp {
    constructor() {
        this.map = null;
        this.dataLoader = null;
        this.layerManager = null;
        this.pathfinder = null;
        this.navigation = null;
        this.positioning = null;
        this.uiController = null;
        this.navigationPoints = [];
    }

    async initialize() {
        console.log('=== STARTING INITIALIZATION ===');
        
        try {
            console.log('Step 1: Initializing map...');
            this.initializeMap();
            
            console.log('Step 2: Loading data...');
            await this.loadData();
            
            console.log('Step 3: Waiting for map ready...');
            await this.waitForMapReady();
            
            console.log('Step 4: Initializing managers...');
            await this.initializeManagers();
            
            console.log('Step 5: Loading navigation graph...');
            await this.loadNavigationGraph();
            
            console.log('Step 6: Initializing navigation...');
            this.initializeNavigation();
            
            console.log('Step 7: Initializing positioning...');
            this.initializePositioning();
            
            console.log('Step 8: Initializing UI...');
            this.initializeUI();
            
            console.log('=== INITIALIZATION COMPLETE ===');
            
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        } catch (error) {
            console.error('=== INITIALIZATION ERROR ===', error);
            
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #ef4444; margin-bottom: 10px;">Error Loading Application</div>
                        <div style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">${error.message}</div>
                        <button onclick="location.reload()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Reload Page</button>
                    </div>
                `;
            }
        }
    }

    waitForMapReady() {
        return new Promise((resolve) => {
            if (this.map.loaded()) {
                resolve();
                return;
            }

            this.map.once('load', () => {
                resolve();
            });
        });
    }

    initializeMap() {
        this.map = new maplibregl.Map(CONFIG.map);
        this.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
        this.map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
        window.map = this.map;
    }

    async loadData() {
        this.dataLoader = new DataLoader();
        await this.dataLoader.loadAll();
    }

    async initializeManagers() {
        this.layerManager = new LayerManager(this.map, this.dataLoader);
        this.layerManager.app = this;
        await this.layerManager.initialize();
    }

    async loadNavigationGraph() {
        console.log('Loading routing graph...');
        try {
            const response = await fetch(CONFIG.routingGraphPath);
            if (!response.ok) {
                throw new Error(`Failed to load routing graph: ${response.status}`);
            }
            
            const graphData = await response.json();
            console.log(`Loaded graph: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);
            
            // Pass graph data directly to Pathfinder - it handles bidirectional edges automatically
            this.pathfinder = new Pathfinder(graphData);
            console.log('Pathfinder initialized with bidirectional edges');
        } catch (error) {
            console.error('Error loading routing graph:', error);
            throw error;
        }
    }

    initializeNavigation() {
        this.navigation = new NavigationSystem(this.map, this.layerManager, this.pathfinder, null);
        this.navigation.onRouteCalculated((route) => console.log('Route calculated:', route));
        this.navigation.onNavigationStarted(() => console.log('Navigation started'));
        this.navigation.onNavigationEnded(() => console.log('Navigation ended'));
    }

    initializePositioning() {
        this.positioning = new PositioningSystem(this.map, this.layerManager);
        this.navigation.positioning = this.positioning;
        if (CONFIG.positioning.simulationMode) {
            this.positioning.start();
        }
    }

    initializeUI() {
        this.uiController = new UIController(this);
    }

    calculateTerminalBounds(terminalId) {
        const terminal = CONFIG.terminals.find(t => t.id === terminalId);
        if (!terminal) return null;

        const features = this.dataLoader.getFeatures(terminalId, 'building');
        if (!features || !features.features || features.features.length === 0) {
            return null;
        }

        let minLng = Infinity, minLat = Infinity;
        let maxLng = -Infinity, maxLat = -Infinity;

        features.features.forEach(feature => {
            const coords = this.extractCoordinates(feature.geometry);
            coords.forEach(coord => {
                minLng = Math.min(minLng, coord[0]);
                maxLng = Math.max(maxLng, coord[0]);
                minLat = Math.min(minLat, coord[1]);
                maxLat = Math.max(maxLat, coord[1]);
            });
        });

        if (minLng === Infinity) return null;

        return [[minLng, minLat], [maxLng, maxLat]];
    }

    extractCoordinates(geometry) {
        const coords = [];
        if (geometry.type === 'Polygon') {
            geometry.coordinates[0].forEach(coord => coords.push(coord));
        } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(polygon => {
                polygon[0].forEach(coord => coords.push(coord));
            });
        } else if (geometry.type === 'Point') {
            coords.push(geometry.coordinates);
        }
        return coords;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.app = new LAXIndoorNavApp();
    await window.app.initialize();
});