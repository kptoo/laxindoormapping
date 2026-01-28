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
            // Initialize map first
            this.initializeMap();
            
            // Show map immediately with loading indicator in corner
            this.hideLoadingScreen();
            this.showProgressIndicator();
            
            // Load everything else
            await this.loadWithProgress();
            
            this.hideProgressIndicator();
            console.log('=== INITIALIZATION COMPLETE ===');
            
        } catch (error) {
            console.error('=== INITIALIZATION ERROR ===', error);
            this.showError(error);
        }
    }

    async loadWithProgress() {
        const steps = [
            { name: 'Loading terminal data...', fn: () => this.loadData() },
            { name: 'Setting up layers...', fn: () => this.initializeManagers() },
            { name: 'Loading routing graph...', fn: () => this.loadNavigationGraph() },
            { name: 'Initializing navigation...', fn: () => this.initializeNavigation() },
            { name: 'Setting up positioning...', fn: () => this.initializePositioning() },
            { name: 'Initializing controls...', fn: () => this.initializeUI() }
        ];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            this.updateProgress(step.name, (i / steps.length) * 100);
            await step.fn();
        }
        
        this.updateProgress('Ready!', 100);
    }

    initializeMap() {
        this.map = new maplibregl.Map(CONFIG.map);
        this.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
        this.map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
        window.map = this.map;
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    showProgressIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'progress-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            background: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 1000;
            font-size: 13px;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        indicator.innerHTML = `
            <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <span id="progress-text">Loading...</span>
        `;
        document.body.appendChild(indicator);
        
        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    updateProgress(text, percent) {
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = text;
        }
        console.log(`[${percent.toFixed(0)}%] ${text}`);
    }

    hideProgressIndicator() {
        const indicator = document.getElementById('progress-indicator');
        if (indicator) {
            setTimeout(() => {
                indicator.style.opacity = '0';
                indicator.style.transition = 'opacity 0.3s';
                setTimeout(() => indicator.remove(), 300);
            }, 500);
        }
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
        const response = await fetch(CONFIG.routingGraphPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const graphData = await response.json();
        this.pathfinder = new Pathfinder(graphData);
    }

    initializeNavigation() {
        this.navigation = new NavigationSystem(this.map, this.layerManager, this.pathfinder, null);
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

    showError(error) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 24px; font-weight: bold; color: #ef4444; margin-bottom: 10px;">⚠️ Error</div>
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">${error.message}</div>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Reload</button>
                </div>
            `;
        }
    }

    calculateTerminalBounds(terminalId) {
        const terminal = CONFIG.terminals.find(t => t.id === terminalId);
        if (!terminal) return null;
        const features = this.dataLoader.getFeatures(terminalId, 'building');
        if (!features || !features.features || features.features.length === 0) return null;
        
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