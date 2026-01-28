class UIController {
    constructor(app) {
        this.app = app;
        this.currentTerminal = 'all';
        this.currentLevel = 'all';
        this.setupPanelToggles();
        this.setupEventListeners();
        this.setupCollapsibleSections();
    }

    setupPanelToggles() {
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        const controlsPanel = document.getElementById('controls');
        
        if (menuToggleBtn) {
            menuToggleBtn.addEventListener('click', () => {
                const isHidden = controlsPanel.classList.contains('panel-hidden');
                
                if (isHidden) {
                    document.getElementById('search-panel').classList.add('panel-hidden');
                    document.getElementById('search-panel').classList.remove('panel-visible');
                    controlsPanel.classList.remove('panel-hidden');
                    controlsPanel.classList.add('panel-visible');
                } else {
                    controlsPanel.classList.add('panel-hidden');
                    controlsPanel.classList.remove('panel-visible');
                }
            });
        }

        const searchToggleBtn = document.getElementById('search-toggle-btn');
        const searchPanel = document.getElementById('search-panel');
        
        if (searchToggleBtn) {
            searchToggleBtn.addEventListener('click', () => {
                const isHidden = searchPanel.classList.contains('panel-hidden');
                
                if (isHidden) {
                    controlsPanel.classList.add('panel-hidden');
                    controlsPanel.classList.remove('panel-visible');
                    searchPanel.classList.remove('panel-hidden');
                    searchPanel.classList.add('panel-visible');
                    
                    setTimeout(() => {
                        document.getElementById('search-input').focus();
                    }, 300);
                } else {
                    searchPanel.classList.add('panel-hidden');
                    searchPanel.classList.remove('panel-visible');
                }
            });
        }

        const closeBtns = document.querySelectorAll('.panel-close-btn');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const panelType = btn.getAttribute('data-panel');
                const panel = panelType === 'search' ? searchPanel : controlsPanel;
                panel.classList.add('panel-hidden');
                panel.classList.remove('panel-visible');
            });
        });

        const map = document.getElementById('map');
        map.addEventListener('click', (e) => {
            if (e.target === map || e.target.classList.contains('maplibregl-canvas')) {
                controlsPanel.classList.add('panel-hidden');
                controlsPanel.classList.remove('panel-visible');
                searchPanel.classList.add('panel-hidden');
                searchPanel.classList.remove('panel-visible');
            }
        });
    }

    setupCollapsibleSections() {
        const collapsibles = document.querySelectorAll('.collapsible');
        
        collapsibles.forEach(section => {
            const header = section.querySelector('.collapsible-header');
            
            if (header) {
                header.addEventListener('click', () => {
                    section.classList.toggle('collapsed');
                });
            }
        });
    }

    setupEventListeners() {
        this.setupTerminalControls();
        this.setupLevelControls();
        this.setupFeatureToggles();
        this.setupViewControls();
        this.setupNavigationControls();
        this.setupSearchControls();
        this.setupPositioningControls();
    }

    setupTerminalControls() {
        const buttons = document.querySelectorAll('.terminal-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const terminal = btn.dataset.terminal;
                
                this.currentTerminal = terminal;
                
                // Update available levels based on terminal
                this.updateLevelControls(terminal);
                
                // Filter map layers
                this.app.layerManager.filterByTerminal(terminal);
                
                if (terminal !== 'all') {
                    this.zoomToTerminal(terminal);
                }
            });
        });
    }

    updateLevelControls(terminalId) {
        const levelControls = document.querySelector('.level-controls');
        
        // Get available levels for this terminal
        const availableLevels = this.app.dataLoader.getAvailableLevels(terminalId);
        
        console.log(`Available levels for ${terminalId}:`, availableLevels);
        
        // Clear existing level buttons
        levelControls.innerHTML = '';
        
        // Always add "All Levels" button
        const allBtn = document.createElement('button');
        allBtn.className = 'level-btn' + (this.currentLevel === 'all' ? ' active' : '');
        allBtn.setAttribute('data-level', 'all');
        allBtn.textContent = 'All';
        levelControls.appendChild(allBtn);
        
        // Add buttons for each available level
        availableLevels.forEach(level => {
            const btn = document.createElement('button');
            btn.className = 'level-btn' + (this.currentLevel === level ? ' active' : '');
            btn.setAttribute('data-level', level);
            btn.textContent = `L${level}`;
            levelControls.appendChild(btn);
        });
        
        // Re-attach event listeners to new buttons
        this.setupLevelControls();
    }

    setupLevelControls() {
        const buttons = document.querySelectorAll('.level-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const level = btn.dataset.level;
                
                this.currentLevel = level === 'all' ? 'all' : parseInt(level);
                
                this.app.layerManager.filterByLevel(this.currentLevel);
            });
        });
    }

    setupFeatureToggles() {
        const toggles = document.querySelectorAll('.feature-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', () => {
                const feature = toggle.dataset.feature;
                const visible = toggle.checked;
                this.app.layerManager.toggleFeature(feature, visible);
            });
        });
    }

    setupViewControls() {
        const view3dBtn = document.getElementById('view-3d-btn');
        const view2dBtn = document.getElementById('view-2d-btn');
        
        view3dBtn.addEventListener('click', () => {
            view3dBtn.classList.add('active');
            view2dBtn.classList.remove('active');
            this.app.map.easeTo({ pitch: 45, bearing: 0, duration: 1000 });
        });
        
        view2dBtn.addEventListener('click', () => {
            view2dBtn.classList.add('active');
            view3dBtn.classList.remove('active');
            this.app.map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
        });
    }

    setupNavigationControls() {
        const findRouteBtn = document.getElementById('find-route-btn');
        const clearRouteBtn = document.getElementById('clear-route-btn');
        const startSelect = document.getElementById('start-select');
        const endSelect = document.getElementById('end-select');

        this.populateNavigationSelects();

        findRouteBtn.addEventListener('click', () => {
            const startValue = startSelect.value;
            const endValue = endSelect.value;

            if (!startValue || !endValue) {
                alert('Please select both start and destination points');
                return;
            }

            if (startValue === endValue) {
                alert('Start and destination cannot be the same');
                return;
            }

            const startPoint = this.app.navigationPoints.find(p => p.selectId === startValue);
            const endPoint = this.app.navigationPoints.find(p => p.selectId === endValue);

            if (!startPoint || !endPoint) {
                alert('Error finding selected points');
                return;
            }

            const startNodeId = this.app.pathfinder.findNearestNode(
                startPoint.coordinates[0],
                startPoint.coordinates[1],
                startPoint.level,
                { maxDistance: 500, preferDestinations: false }
            );

            const endNodeId = this.app.pathfinder.findNearestNode(
                endPoint.coordinates[0],
                endPoint.coordinates[1],
                endPoint.level,
                { maxDistance: 500, preferDestinations: true }
            );

            if (!startNodeId) {
                alert(`No routing node found near "${startPoint.name}"`);
                return;
            }

            if (!endNodeId) {
                alert(`No routing node found near "${endPoint.name}"`);
                return;
            }

            const route = this.app.navigation.calculateRoute(startNodeId, endNodeId);

            if (route) {
                this.showNavigationInstructions(route);
                this.app.navigation.startNavigation();
                
                document.getElementById('controls').classList.add('panel-hidden');
                document.getElementById('controls').classList.remove('panel-visible');
            } else {
                alert('No route found between these points');
            }
        });

        clearRouteBtn.addEventListener('click', () => {
            this.app.navigation.clearRoute();
            this.app.navigation.stopNavigation();
            this.hideNavigationInstructions();
        });
    }

    populateNavigationSelects() {
        const startSelect = document.getElementById('start-select');
        const endSelect = document.getElementById('end-select');

        const featurePoints = this.app.dataLoader.getAllNavigablePoints();
        
        const allPoints = featurePoints.map((fp, index) => ({
            selectId: `point_${index}`,
            id: fp.id,
            name: fp.name,
            type: fp.type,
            terminal: fp.terminal,
            terminalName: fp.terminalName,
            level: fp.level,
            coordinates: fp.coordinates
        }));

        this.app.navigationPoints = allPoints;

        allPoints.sort((a, b) => {
            if (a.terminal !== b.terminal) {
                return a.terminal.localeCompare(b.terminal);
            }
            return a.name.localeCompare(b.name);
        });

        allPoints.forEach(point => {
            const option1 = document.createElement('option');
            option1.value = point.selectId;
            option1.textContent = `${point.name} (${point.terminalName}, L${point.level})`;
            startSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = point.selectId;
            option2.textContent = `${point.name} (${point.terminalName}, L${point.level})`;
            endSelect.appendChild(option2);
        });
    }

    setupSearchControls() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const searchResults = document.getElementById('search-results');

        const performSearch = () => {
            const query = searchInput.value.trim().toLowerCase();
            if (!query) {
                searchResults.classList.add('hidden');
                return;
            }
            const results = this.searchFeatures(query);
            this.displaySearchResults(results);
        };

        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim()) {
                performSearch();
            } else {
                searchResults.classList.add('hidden');
            }
        });
    }

    searchFeatures(query) {
        const allFeatures = this.app.dataLoader.getAllFeaturesForSearch();
        return allFeatures.filter(feature => {
            const name = (feature.properties.name || feature.properties.Name || '').toLowerCase();
            const gate = (feature.properties.gate || '').toLowerCase();
            const category = (feature.properties.category || '').toLowerCase();
            const type = feature.properties.featureType.toLowerCase();
            return name.includes(query) || gate.includes(query) || category.includes(query) || type.includes(query);
        }).slice(0, 10);
    }

    displaySearchResults(results) {
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
            searchResults.classList.remove('hidden');
            return;
        }

        results.forEach(feature => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            const name = feature.properties.name || feature.properties.Name || 'Unnamed';
            const terminal = feature.properties.terminalName;
            const level = feature.properties.level || feature.properties.Level || 1;
            const type = feature.properties.featureType.replace('_', ' ');
            
            item.innerHTML = `
                <div class="search-result-name">${name}</div>
                <div class="search-result-details">
                    <span class="search-result-type">${type}</span>
                    ${terminal}, Level ${level}
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.zoomToFeature(feature);
                searchResults.classList.add('hidden');
                
                document.getElementById('search-panel').classList.add('panel-hidden');
                document.getElementById('search-panel').classList.remove('panel-visible');
            });
            
            searchResults.appendChild(item);
        });

        searchResults.classList.remove('hidden');
    }

    setupPositioningControls() {
        const positionBtn = document.createElement('button');
        positionBtn.id = 'position-btn';
        positionBtn.className = 'nav-btn nav-btn-primary';
        positionBtn.textContent = '📍 Show My Location';
        positionBtn.style.marginTop = '10px';
        
        const navControls = document.querySelector('.navigation-controls');
        navControls.appendChild(positionBtn);

        const manualBtn = document.createElement('button');
        manualBtn.id = 'manual-position-btn';
        manualBtn.className = 'nav-btn nav-btn-secondary';
        manualBtn.textContent = '📌 Set Manual Location';
        manualBtn.style.marginTop = '5px';
        navControls.appendChild(manualBtn);

        positionBtn.addEventListener('click', () => {
            if (this.app.positioning.watchId) {
                this.app.positioning.stop();
                positionBtn.textContent = '📍 Show My Location';
                positionBtn.classList.remove('active');
            } else {
                this.app.positioning.start();
                positionBtn.textContent = '⏸️ Stop Tracking';
                positionBtn.classList.add('active');
            }
        });

        manualBtn.addEventListener('click', () => {
            this.app.positioning.enableManualMode();
            
            document.getElementById('controls').classList.add('panel-hidden');
            document.getElementById('controls').classList.remove('panel-visible');
        });
    }

    showNavigationInstructions(route) {
        const panel = document.getElementById('nav-instructions');
        panel.classList.remove('hidden');

        const totalDistance = Math.round(route.distance);
        const estimatedTime = Math.ceil(route.distance / 1.4 / 60);

        document.getElementById('nav-distance').textContent = `${totalDistance}m`;
        document.getElementById('nav-time').textContent = `${estimatedTime} min`;

        const instructionList = document.getElementById('instruction-list');
        instructionList.innerHTML = '';

        route.instructions.forEach((instruction, index) => {
            const icon = this.getInstructionIcon(instruction.type);
            const item = document.createElement('div');
            item.className = 'instruction-item';
            item.setAttribute('data-index', index);
            
            item.innerHTML = `
                <div class="instruction-icon">${icon}</div>
                <div class="instruction-text">${instruction.text}</div>
            `;
            
            instructionList.appendChild(item);
        });

        document.getElementById('close-nav').addEventListener('click', () => {
            this.hideNavigationInstructions();
        });
    }

    hideNavigationInstructions() {
        document.getElementById('nav-instructions').classList.add('hidden');
    }

    getInstructionIcon(type) {
        const icons = { 
            walk: '🚶', 
            level_change: '🔼', 
            transport: '🚌', 
            arrival: '🎯', 
            entrance: '🚪' 
        };
        return icons[type] || '📍';
    }

    zoomToTerminal(terminalId) {
        const bounds = this.app.calculateTerminalBounds(terminalId);
        if (bounds) {
            this.app.map.fitBounds(bounds, { padding: 50, duration: 1000 });
        }
    }

    zoomToFeature(feature) {
        const center = this.app.dataLoader.getFeatureCenter(feature);
        this.app.map.flyTo({ center: center, zoom: 18, pitch: 45, duration: 1500 });
        setTimeout(() => {
            new maplibregl.Popup()
                .setLngLat(center)
                .setHTML(`
                    <div class="popup-content">
                        <div class="popup-title">${feature.properties.name || feature.properties.Name || 'Feature'}</div>
                        <div class="popup-info"><strong>Terminal:</strong> ${feature.properties.terminalName}</div>
                        <div class="popup-info"><strong>Level:</strong> ${feature.properties.level || feature.properties.Level || 1}</div>
                    </div>
                `)
                .addTo(this.app.map);
        }, 1500);
    }
}