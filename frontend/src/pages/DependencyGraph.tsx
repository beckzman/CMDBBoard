import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
    addEdge,
    ConnectionLineType,
    Panel,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    MiniMap,
    Connection,
    Edge,
    Node,
    MarkerType,
    Position,
    Handle,
    NodeProps
} from 'reactflow';
import dagre from 'dagre';
import { ciAPI, relationshipAPI } from '../api/client';
import {
    RefreshCw,
    Layout,
    Server,
    Database,
    Monitor,
    HardDrive,
    Cloud,
    Box,
    Layers,
    HelpCircle
} from 'lucide-react';
import 'reactflow/dist/style.css';
import './DependencyGraph.css';

// --- Custom Node Implementation ---
const IconNode = ({ data }: NodeProps) => {
    const { label, type } = data;

    // Icon mapping
    const getIcon = () => {
        switch (type) {
            case 'server': return <Server size={20} />;
            case 'database': return <Database size={20} />;
            case 'application': return <Box size={20} />;
            case 'network_device': return <Cloud size={20} />;
            case 'storage': return <HardDrive size={20} />;
            case 'workstation': return <Monitor size={20} />;
            case 'service': return <Layers size={20} />;
            default: return <HelpCircle size={20} />;
        }
    };

    return (
        <div className={`custom-node-content node-type-${type}`}>
            <Handle type="target" position={Position.Top} />
            <div className="node-icon-wrapper">
                {getIcon()}
            </div>
            <div className="node-label">
                {label}
            </div>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};


const nodeWidth = 172;
const nodeHeight = 50; // Increased since height is somewhat implicit

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    // Create a new graph instance for every layout to avoid stale data
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        // Safety check if node was not layouted (shouldn't happen with clean graph)
        if (!nodeWithPosition) return node;

        const targetPosition = isHorizontal ? Position.Left : Position.Top;
        const sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        return {
            ...node,
            targetPosition,
            sourcePosition,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: newNodes, edges };
};

const DependencyGraph: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [filterCiType, setFilterCiType] = useState<string>('');
    const [filterRelType, setFilterRelType] = useState<string>('');
    const [filterCiName, setFilterCiName] = useState<string>('');
    const [availableCiTypes, setAvailableCiTypes] = useState<string[]>([]);
    const [availableRelTypes, setAvailableRelTypes] = useState<string[]>([]);

    // Raw Data State (to avoid re-fetching on filter change)
    const [rawCIs, setRawCIs] = useState<any[]>([]);
    const [rawRels, setRawRels] = useState<any[]>([]);

    const onConnect = useCallback(
        (params: Connection) =>
            setEdges((eds) =>
                addEdge({ ...params, type: ConnectionLineType.SmoothStep, animated: true }, eds)
            ),
        []
    );

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch CIs (Nodes)
            const ciResponse = await ciAPI.list({ page_size: 1000 });
            const allCIs = ciResponse.items;
            setRawCIs(allCIs);

            // 2. Fetch Relationships (Edges)
            const rels = await relationshipAPI.listAll();
            setRawRels(rels);

            // Populate Filter Options
            const ciTypes = Array.from(new Set(allCIs.map((ci: any) => ci.ci_type))).sort();
            const relTypes = Array.from(new Set(rels.map((rel: any) => rel.relationship_type))).sort();
            setAvailableCiTypes(ciTypes as string[]);
            setAvailableRelTypes(relTypes as string[]);

            // Initial Build
            buildGraph(allCIs, rels, filterCiType, filterRelType, filterCiName);

        } catch (error) {
            console.error("Failed to load graph data", error);
        } finally {
            setLoading(false);
        }
    };

    const [rfInstance, setRfInstance] = useState<any>(null);

    // Re-build graph when filters or raw data changes
    useEffect(() => {
        if (rawCIs.length > 0 && rawRels.length > 0) {
            buildGraph(rawCIs, rawRels, filterCiType, filterRelType, filterCiName);

            // Force re-center after layout update
            if (rfInstance) {
                setTimeout(() => {
                    rfInstance.fitView({ padding: 0.2, duration: 800 });
                }, 50);
            }
        }
    }, [filterCiType, filterRelType, filterCiName, rawCIs, rawRels, rfInstance]);

    // Register custom node types
    const nodeTypes = useMemo(() => ({ iconNode: IconNode }), []);

    const buildGraph = (cis: any[], rels: any[], fCiType: string, fRelType: string, fCiName: string) => {

        let filteredRels = rels;

        // 1. Filter by Relationship Type
        if (fRelType) {
            filteredRels = rels.filter((rel: any) => rel.relationship_type === fRelType);
        }

        // 2. Filter CIs logic
        let visibleCiIds = new Set<number>();

        if (fCiName) {
            // Case A: Search by Name -> Matches + Neighbors
            const searchLower = fCiName.toLowerCase();
            const matchingCIs = cis.filter((ci: any) => ci.name.toLowerCase().includes(searchLower));
            const matchingIds = new Set(matchingCIs.map((c: any) => c.id));

            // Find neighbors of matches
            const neighborIds = new Set<number>();
            filteredRels.forEach((rel: any) => {
                if (matchingIds.has(rel.source_ci_id)) neighborIds.add(rel.target_ci_id);
                if (matchingIds.has(rel.target_ci_id)) neighborIds.add(rel.source_ci_id);
            });

            visibleCiIds = new Set([...matchingIds, ...neighborIds]);

        } else if (fCiType) {
            // Case B: Filter by Type -> Show ALL of that type (even orphans)
            // We initially allow ALL, and let step 3 narrow it down to the type.
            visibleCiIds = new Set(cis.map((c: any) => c.id));

        } else {
            // Case C: Default (No filters) -> Show connected only to reduce noise
            filteredRels.forEach((rel: any) => {
                visibleCiIds.add(rel.source_ci_id);
                visibleCiIds.add(rel.target_ci_id);
            });
        }

        let filteredCIs = cis.filter((ci: any) => visibleCiIds.has(ci.id));

        // 3. Filter by CI Type (Strict filter applied AFTER expansion)
        if (fCiType) {
            filteredCIs = filteredCIs.filter((ci: any) => ci.ci_type === fCiType);
        }

        // 4. Final Edge Cleanup: Ensure both source/target are visible
        const finalNodeIds = new Set(filteredCIs.map((c: any) => c.id));
        filteredRels = filteredRels.filter((rel: any) =>
            finalNodeIds.has(rel.source_ci_id) && finalNodeIds.has(rel.target_ci_id)
        );

        // Map to React Flow Nodes
        const flowNodes: Node[] = filteredCIs.map((ci: any) => ({
            id: ci.id.toString(),
            type: 'iconNode', // Use our custom node
            data: { label: ci.name, type: ci.ci_type }, // Pass type to data
            position: { x: 0, y: 0 },
            // className: `node-type-${ci.ci_type}`, // Class handled inside custom node
            // Style managed by custom node CSS
            style: { width: nodeWidth, height: nodeHeight }
        }));

        // Map to React Flow Edges
        const flowEdges: Edge[] = filteredRels.map((rel: any) => ({
            id: `e${rel.id}`,
            source: rel.source_ci_id.toString(),
            target: rel.target_ci_id.toString(),
            type: 'smoothstep',
            animated: true,
            label: rel.relationship_type.replace('_', ' '),
            style: { stroke: '#888' },
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#888' },
        }));

        // Apply Layout
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            flowNodes,
            flowEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onLayout = useCallback(
        (direction: string) => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                nodes,
                edges,
                direction
            );
            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);
        },
        [nodes, edges]
    );

    // Color helper - REMOVED (moved to CSS/Icon logic)

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1>Dependency Graph</h1>
                    <p className="subtitle">Visualizing CI relationships and dependencies</p>
                </div>
            </header>

            <div className="dependency-graph-container">
                {loading && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100 }}>
                        Loading Graph...
                    </div>
                )}

                <div className="graph-controls">
                    <button onClick={fetchData}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button onClick={() => onLayout('TB')}>
                        <Layout size={16} style={{ transform: 'rotate(0deg)' }} /> Vertical
                    </button>
                    <button onClick={() => onLayout('LR')}>
                        <Layout size={16} style={{ transform: 'rotate(-90deg)' }} /> Horizontal
                    </button>
                </div>

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes} // Register custom types
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setRfInstance}
                    fitView
                    attributionPosition="bottom-right"
                >
                    <Panel position="top-left" className="filter-panel">
                        <div className="filter-group">
                            <label>Search CI:</label>
                            <input
                                type="text"
                                placeholder="CI Name..."
                                value={filterCiName}
                                onChange={(e) => setFilterCiName(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="filter-group">
                            <label>CI Type:</label>
                            <select
                                value={filterCiType}
                                onChange={(e) => setFilterCiType(e.target.value)}
                            >
                                <option value="">All Types</option>
                                {availableCiTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Relation:</label>
                            <select
                                value={filterRelType}
                                onChange={(e) => setFilterRelType(e.target.value)}
                            >
                                <option value="">All Relations</option>
                                {availableRelTypes.map(type => (
                                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                        {(filterCiType || filterRelType || filterCiName) && (
                            <button className="clear-filters" onClick={() => { setFilterCiType(''); setFilterRelType(''); setFilterCiName(''); }}>
                                Clear Filters
                            </button>
                        )}
                    </Panel>

                    <MiniMap
                        nodeStrokeColor={(n) => {
                            if (n.style?.background) return n.style.background as string;
                            if (n.type === 'input') return '#0041d0';
                            if (n.type === 'output') return '#ff0072';
                            if (n.type === 'default') return '#1a192b';
                            return '#eee';
                        }}
                        nodeColor={(n) => {
                            if (n.style?.background) return n.style.background as string;
                            return '#fff';
                        }}
                        maskColor="rgba(0, 0, 0, 0.6)"
                        style={{ background: 'transparent' }}
                    />
                    <Controls />
                    <Background color="#aaa" gap={16} />
                </ReactFlow>
            </div>
        </div>
    );
};

export default DependencyGraph;
