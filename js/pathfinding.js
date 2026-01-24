class Pathfinder {
    constructor(graphData) {
        this.nodes = new Map();
        this.edges = new Map();
        
        // Load nodes
        graphData.nodes.forEach(node => {
            this.nodes.set(node.id, node);
        });
        
        // Load edges (build adjacency list with automatic bidirectional edges)
        graphData.edges.forEach(edge => {
            if (!this.edges.has(edge.from)) {
                this.edges.set(edge.from, []);
            }
            if (!this.edges.has(edge.to)) {
                this.edges.set(edge.to, []);
            }
            
            // Add forward edge
            this.edges.get(edge.from).push({
                to: edge.to,
                weight: edge.weight,
                type: edge.type
            });
            
            // Add reverse edge automatically (graph is undirected for indoor navigation)
            this.edges.get(edge.to).push({
                to: edge.from,
                weight: edge.weight,
                type: edge.type
            });
        });
        
        console.log(`Pathfinder loaded: ${this.nodes.size} nodes, ${graphData.edges.length * 2} bidirectional edges`);
    }

    findPath(startNodeId, endNodeId, algorithm = 'astar') {
        if (algorithm === 'astar') {
            return this.astar(startNodeId, endNodeId);
        } else {
            return this.dijkstra(startNodeId, endNodeId);
        }
    }

    dijkstra(startNodeId, endNodeId) {
        const distances = new Map();
        const previous = new Map();
        const visited = new Set();
        const queue = new PriorityQueue();

        this.nodes.forEach((node, id) => {
            distances.set(id, Infinity);
            previous.set(id, null);
        });

        distances.set(startNodeId, 0);
        queue.enqueue(startNodeId, 0);

        while (!queue.isEmpty()) {
            const currentId = queue.dequeue();

            if (currentId === endNodeId) {
                return this.reconstructPath(previous, startNodeId, endNodeId);
            }

            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const edges = this.edges.get(currentId) || [];

            edges.forEach(edge => {
                const neighborId = edge.to;
                const weight = edge.weight;

                if (visited.has(neighborId)) return;

                const newDist = distances.get(currentId) + weight;

                if (newDist < distances.get(neighborId)) {
                    distances.set(neighborId, newDist);
                    previous.set(neighborId, currentId);
                    queue.enqueue(neighborId, newDist);
                }
            });
        }

        return null;
    }

    astar(startNodeId, endNodeId) {
        const gScore = new Map();
        const fScore = new Map();
        const previous = new Map();
        const openSet = new PriorityQueue();
        const closedSet = new Set();

        const endNode = this.nodes.get(endNodeId);
        if (!endNode) return null;

        this.nodes.forEach((node, id) => {
            gScore.set(id, Infinity);
            fScore.set(id, Infinity);
            previous.set(id, null);
        });

        gScore.set(startNodeId, 0);
        fScore.set(startNodeId, this.heuristic(startNodeId, endNodeId));
        openSet.enqueue(startNodeId, fScore.get(startNodeId));

        while (!openSet.isEmpty()) {
            const currentId = openSet.dequeue();

            if (currentId === endNodeId) {
                return this.reconstructPath(previous, startNodeId, endNodeId);
            }

            closedSet.add(currentId);

            const edges = this.edges.get(currentId) || [];

            edges.forEach(edge => {
                const neighborId = edge.to;

                if (closedSet.has(neighborId)) return;

                const tentativeGScore = gScore.get(currentId) + edge.weight;

                if (tentativeGScore < gScore.get(neighborId)) {
                    previous.set(neighborId, currentId);
                    gScore.set(neighborId, tentativeGScore);
                    fScore.set(neighborId, tentativeGScore + this.heuristic(neighborId, endNodeId));

                    if (!openSet.contains(neighborId)) {
                        openSet.enqueue(neighborId, fScore.get(neighborId));
                    }
                }
            });
        }

        return null;
    }

    heuristic(nodeId1, nodeId2) {
        const node1 = this.nodes.get(nodeId1);
        const node2 = this.nodes.get(nodeId2);

        if (!node1 || !node2) return Infinity;

        const R = 6371e3;
        const φ1 = node1.lat * Math.PI / 180;
        const φ2 = node2.lat * Math.PI / 180;
        const Δφ = (node2.lat - node1.lat) * Math.PI / 180;
        const Δλ = (node2.lon - node1.lon) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const levelDiff = Math.abs((node1.level || 0) - (node2.level || 0));
        const levelPenalty = levelDiff * 30;

        return R * c + levelPenalty;
    }

    reconstructPath(previous, startNodeId, endNodeId) {
        const path = [];
        let current = endNodeId;

        while (current !== null) {
            path.unshift(current);
            current = previous.get(current);
        }

        if (path[0] !== startNodeId) {
            return null;
        }

        return {
            nodeIds: path,
            nodes: path.map(id => this.nodes.get(id)),
            distance: this.calculatePathDistance(path),
            instructions: this.generateInstructions(path)
        };
    }

    calculatePathDistance(nodeIds) {
        let totalDistance = 0;

        for (let i = 0; i < nodeIds.length - 1; i++) {
            const fromId = nodeIds[i];
            const toId = nodeIds[i + 1];

            const edges = this.edges.get(fromId) || [];
            const edge = edges.find(e => e.to === toId);

            if (edge) {
                totalDistance += edge.weight;
            }
        }

        return totalDistance;
    }

    generateInstructions(nodeIds) {
        const instructions = [];
        let currentLevel = null;
        let currentTransport = null;
        let walkDistance = 0;

        for (let i = 0; i < nodeIds.length - 1; i++) {
            const fromId = nodeIds[i];
            const toId = nodeIds[i + 1];
            
            const fromNode = this.nodes.get(fromId);
            const toNode = this.nodes.get(toId);

            const edges = this.edges.get(fromId) || [];
            const edge = edges.find(e => e.to === toId);

            if (!edge) continue;

            if (fromNode.level !== currentLevel && currentLevel !== null) {
                if (edge.type === 'vertical') {
                    instructions.push({
                        type: 'level_change',
                        from_level: fromNode.level,
                        to_level: toNode.level,
                        direction: toNode.level > fromNode.level ? 'up' : 'down',
                        method: fromNode.name || 'stairs/elevator',
                        text: `Take ${fromNode.name || 'stairs/elevator'} to Level ${toNode.level}`
                    });
                }
            }

            if (edge.type !== 'corridor' && edge.type !== 'road' && edge.type !== currentTransport) {
                if (walkDistance > 0) {
                    instructions.push({
                        type: 'walk',
                        distance: walkDistance,
                        text: `Walk ${Math.round(walkDistance)}m`
                    });
                    walkDistance = 0;
                }

                if (edge.type === 'entrance') {
                    instructions.push({
                        type: 'entrance',
                        text: fromNode.indoor ? 'Exit building to outdoor area' : 'Enter building from outdoor area'
                    });
                }
                
                currentTransport = edge.type;
            } else if (edge.type === 'corridor' || edge.type === 'road') {
                walkDistance += edge.weight;
                currentTransport = 'walk';
            }

            currentLevel = toNode.level;
        }

        if (walkDistance > 0) {
            instructions.push({
                type: 'walk',
                distance: walkDistance,
                text: `Walk ${Math.round(walkDistance)}m`
            });
        }

        const lastNode = this.nodes.get(nodeIds[nodeIds.length - 1]);
        if (lastNode && lastNode.name) {
            instructions.push({
                type: 'arrival',
                destination: lastNode.name,
                text: `Arrive at ${lastNode.name}`
            });
        }

        return instructions;
    }

    findNearestNode(longitude, latitude, level = null, options = {}) {
        const maxDistance = options.maxDistance || 500;
        const preferDestinations = options.preferDestinations !== false;
        
        let nearest = null;
        let minDist = Infinity;

        this.nodes.forEach((node, id) => {
            if (level !== null && node.level !== level) return;

            const dist = this.calculateDistance(
                [longitude, latitude],
                [node.lon, node.lat]
            );

            if (dist > maxDistance) return;

            if (preferDestinations && node.is_destination && dist < minDist) {
                minDist = dist;
                nearest = id;
            } else if (!preferDestinations || !this.nodes.get(nearest)?.is_destination) {
                if (dist < minDist) {
                    minDist = dist;
                    nearest = id;
                }
            }
        });

        if (nearest !== null) {
            console.log(`Found nearest node ${nearest} at distance ${minDist.toFixed(2)}m`);
        }

        return nearest;
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
    
    getDestinationNodes() {
        const destinations = [];
        this.nodes.forEach((node, id) => {
            if (node.is_destination) {
                destinations.push({
                    id: id,
                    name: node.name,
                    type: node.feature_type,
                    terminal: node.terminal,
                    level: node.level,
                    coordinates: [node.lon, node.lat]
                });
            }
        });
        return destinations;
    }
    
    getGraph() {
        return {
            nodes: this.nodes,
            edges: this.edges
        };
    }
}

class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(element, priority) {
        const queueElement = { element, priority };
        let added = false;

        for (let i = 0; i < this.items.length; i++) {
            if (queueElement.priority < this.items[i].priority) {
                this.items.splice(i, 0, queueElement);
                added = true;
                break;
            }
        }

        if (!added) {
            this.items.push(queueElement);
        }
    }

    dequeue() {
        return this.items.shift()?.element;
    }

    isEmpty() {
        return this.items.length === 0;
    }

    contains(element) {
        return this.items.some(item => item.element === element);
    }
}