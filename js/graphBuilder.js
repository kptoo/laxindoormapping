class GraphBuilder {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.graph = {
            nodes: new Map(),
            edges: new Map()
        };
    }

    async loadRoutingGraph() {
        console.log('Loading routing graph from file...');
        
        try {
            const response = await fetch(CONFIG.routingGraphPath);
            if (!response.ok) {
                throw new Error(`Failed to load routing graph: ${response.status}`);
            }
            
            const graphData = await response.json();
            this.convertToInternalFormat(graphData);
            
            console.log(`Graph loaded: ${this.graph.nodes.size} nodes, ${this.graph.edges.size} edges`);
            return this.graph;
        } catch (error) {
            console.error('Error loading routing graph:', error);
            throw error;
        }
    }

    convertToInternalFormat(graphData) {
        console.log(`Converting ${graphData.nodes.length} nodes...`);
        graphData.nodes.forEach(node => {
            this.graph.nodes.set(node.id, {
                id: node.id,
                longitude: node.lon,
                latitude: node.lat,
                level: node.level,
                terminal: node.terminal,
                indoor: node.indoor,
                type: node.node_type,
                name: node.name || null,
                featureType: node.feature_type || null,
                isDestination: node.is_destination || node.node_type !== 'corridor'
            });
        });

        if (graphData.edges) {
            console.log(`Converting ${graphData.edges.length} edges...`);
            graphData.edges.forEach(edge => {
                if (!this.graph.edges.has(edge.from)) {
                    this.graph.edges.set(edge.from, []);
                }
                
                this.graph.edges.get(edge.from).push({
                    to: edge.to,
                    weight: edge.weight || edge.distance || this.calculateEdgeWeight(edge.from, edge.to),
                    type: edge.type || 'walk'
                });
            });
        } else {
            console.warn('No edges in graph file, this may cause routing issues');
        }
    }

    calculateEdgeWeight(fromId, toId) {
        const fromNode = this.graph.nodes.get(fromId);
        const toNode = this.graph.nodes.get(toId);
        
        if (!fromNode || !toNode) return Infinity;
        
        return this.calculateDistance(
            [fromNode.longitude, fromNode.latitude],
            [toNode.longitude, toNode.latitude]
        );
    }

    calculateDistance(coord1, coord2) {
        const R = 6371e3;
        const φ1 = coord1[1] * Math.PI / 180;
        const φ2 = coord2[1] * Math.PI / 180;
        const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
        const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    getGraph() {
        return this.graph;
    }

    findNearestNode(longitude, latitude, level = null, terminal = null, maxDistance = 100) {
        let nearest = null;
        let minDist = Infinity;

        this.graph.nodes.forEach((node, id) => {
            if (level !== null && node.level !== level) return;
            if (terminal !== null && node.terminal !== terminal) return;

            const dist = this.calculateDistance(
                [longitude, latitude],
                [node.longitude, node.latitude]
            );

            if (dist < minDist && dist < maxDistance) {
                minDist = dist;
                nearest = id;
            }
        });

        if (nearest !== null) {
            console.log(`Found nearest node ${nearest} at distance ${minDist.toFixed(2)}m`);
        } else {
            console.warn(`No node found within ${maxDistance}m of [${longitude}, ${latitude}] (level: ${level}, terminal: ${terminal})`);
        }

        return nearest;
    }

    findNodeByName(name, terminal = null, level = null) {
        console.log(`Searching for node by name: "${name}" (terminal: ${terminal}, level: ${level})`);
        
        let found = null;
        
        this.graph.nodes.forEach((node, id) => {
            if (!node.name) return;
            
            // Exact match
            if (node.name === name) {
                if (terminal && node.terminal !== terminal) return;
                if (level !== null && node.level !== level) return;
                found = id;
                console.log(`Found exact match: node ${id}`);
            }
        });

        return found;
    }

    findNodeByNameOrProximity(name, longitude, latitude, level = null, terminal = null) {
        // First try to find by name
        const byName = this.findNodeByName(name, terminal, level);
        if (byName !== null) {
            return byName;
        }

        // Fall back to proximity search with larger distance for destinations
        console.log(`Name search failed for "${name}", trying proximity search with increased distance`);
        
        // Try with 500m radius first
        let nearest = this.findNearestNode(longitude, latitude, level, terminal, 500);
        
        if (nearest !== null) {
            return nearest;
        }

        // If still not found, try without level/terminal restrictions but with larger radius
        console.log(`Proximity search failed, trying relaxed search (no level/terminal filter)`);
        nearest = this.findNearestNode(longitude, latitude, null, null, 1000);
        
        return nearest;
    }

    getDestinationNodes() {
        const destinations = [];
        
        this.graph.nodes.forEach((node, id) => {
            if (node.name && node.isDestination) {
                destinations.push({
                    id: id,
                    name: node.name,
                    type: node.type,
                    terminal: node.terminal,
                    level: node.level,
                    coordinates: [node.longitude, node.latitude]
                });
            }
        });
        
        return destinations;
    }
}