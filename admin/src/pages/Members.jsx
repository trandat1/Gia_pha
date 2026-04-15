import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../api/axios';
// import { useAuth } from '../context/AuthContext';
import {
    UserPlus, Users, Share2, ZoomIn, ZoomOut, RefreshCw,
    Search, ChevronDown, ChevronRight
} from 'lucide-react';
// ─── CONSTANTS ────────────────────────────────────────────
const NODE_W = 175;
const NODE_H = 88;
const H_GAP  = 80;
const V_GAP  = 110;

// ─── DATE HELPERS ─────────────────────────────────────────
function DateInput({ value, onChange, placeholder }) {
    const toDisplay = (iso) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };
    const [display, setDisplay] = useState(toDisplay(value));
    useEffect(() => { setDisplay(toDisplay(value)); }, [value]);
    const handleChange = (e) => {
        let raw = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
        let fmt = raw;
        if (raw.length > 2) fmt = raw.slice(0,2) + '/' + raw.slice(2);
        if (raw.length > 4) fmt = raw.slice(0,2) + '/' + raw.slice(2,4) + '/' + raw.slice(4);
        setDisplay(fmt);
        if (raw.length === 8) {
            const d=raw.slice(0,2), m=raw.slice(2,4), y=raw.slice(4,8);
            onChange(`${y}-${m}-${d}`);
        } else if (!raw.length) onChange('');
    };
    return (
        <input type="text" placeholder={placeholder || "dd/mm/yyyy"}
            value={display} onChange={handleChange} maxLength={10}
            className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
    );
}

function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

// ─── SEARCHABLE FAMILY SELECT ─────────────────────────────
function FamilySelect({ members, value, onChange, placeholder, filterGender }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const filtered = useMemo(() => {
        const list = filterGender ? members.filter(m => m.gender === filterGender) : members;
        if (!search) return list;
        return list.filter(m => m.full_name.toLowerCase().includes(search.toLowerCase()));
    }, [members, filterGender, search]);

    const grouped = useMemo(() => {
        const byFather = {};
        const noFather = [];
        filtered.forEach(m => {
            if (m.father_id && members.find(p => p.id === m.father_id)) {
                if (!byFather[m.father_id]) byFather[m.father_id] = [];
                byFather[m.father_id].push(m);
            } else noFather.push(m);
        });
        return { byFather, noFather };
    }, [filtered, members]);

    const selectedName = value ? members.find(m => m.id === +value)?.full_name : '';

    return (
        <div ref={ref} className="relative">
            <div className="w-full border rounded text-sm p-2 cursor-pointer flex justify-between items-center bg-white hover:border-blue-400"
                onClick={() => setOpen(o => !o)}>
                <span className={selectedName ? 'text-slate-800' : 'text-slate-400'}>
                    {selectedName || placeholder}
                </span>
                <ChevronDown size={14} className="text-slate-400"/>
            </div>
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    <div className="p-2 border-b sticky top-0 bg-white">
                        <div className="flex items-center gap-2 border rounded px-2 py-1">
                            <Search size={13} className="text-slate-400"/>
                            <input autoFocus className="text-sm flex-1 outline-none"
                                placeholder="Tìm kiếm..." value={search}
                                onChange={e => setSearch(e.target.value)}/>
                        </div>
                    </div>
                    <div className="p-1">
                        <div className="text-xs text-slate-400 px-2 py-1 cursor-pointer hover:bg-slate-50 rounded"
                            onClick={() => { onChange(''); setOpen(false); setSearch(''); }}>
                            -- Không chọn --
                        </div>
                        {grouped.noFather.map(m => (
                            <div key={m.id}
                                className={`px-3 py-1.5 text-sm rounded cursor-pointer hover:bg-blue-50
                                    ${+value === m.id ? 'bg-blue-100 font-semibold' : ''}`}
                                onClick={() => { onChange(String(m.id)); setOpen(false); setSearch(''); }}>
                                {m.full_name}
                            </div>
                        ))}
                        {Object.entries(grouped.byFather).map(([fId, children]) => {
                            const father = members.find(m => m.id === +fId);
                            if (!father) return null;
                            return (
                                <div key={fId}>
                                    <div className="px-2 py-1 text-xs text-slate-500 font-semibold mt-1 bg-slate-50 rounded">
                                        Gia đình: {father.full_name}
                                    </div>
                                    {children.map(m => (
                                        <div key={m.id}
                                            className={`pl-5 pr-3 py-1.5 text-sm rounded cursor-pointer hover:bg-blue-50
                                                ${+value === m.id ? 'bg-blue-100 font-semibold' : ''}`}
                                            onClick={() => { onChange(String(m.id)); setOpen(false); setSearch(''); }}>
                                            └ {m.full_name}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                        {!filtered.length && (
                            <div className="px-3 py-3 text-sm text-slate-400 text-center">Không tìm thấy</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── HEIR / SUCCESSOR LOGIC ────────────────────────────────
// heirChain: nhánh trưởng tộc (is_heir=true, con trai đầu liên tiếp từ root)
// dichTon: con trai đầu của mỗi chi (is_heir=true nhưng KHÔNG trong heirChain)
// noiDoi: con trai is_heir=true nhưng không phải đích tôn của chi đó
function computeHeirInfo(members) {
    const map = {};
    members.forEach(m => { map[m.id] = { ...m, children: [] }; });
    members.forEach(m => {
        if (m.father_id && map[m.father_id]) map[m.father_id].children.push(m.id);
    });

    const heirChain = new Set();   // trưởng tộc chính thống
    const dichTonSet = new Set();  // đích tôn các chi
    const noiDoiSet  = new Set();  // người nối dõi (con trai còn lại có is_heir)

    // Tìm root của nhánh trưởng tộc
    const roots = members.filter(m => !m.father_id && !m.mother_id);

    // Walk heir chain từ root
    const walkHeirChain = (id) => {
        heirChain.add(id);
        const node = map[id];
        const sonHeirs = node.children
            .map(cId => map[cId])
            .filter(c => c && c.gender === 'Nam' && c.is_heir)
            .sort((a, b) => (a.birth_date || '').localeCompare(b.birth_date || ''));
        if (sonHeirs.length > 0) walkHeirChain(sonHeirs[0].id);
    };
    roots.forEach(r => walkHeirChain(r.id));

    // Với mỗi member có is_heir=true không trong heirChain
    // → là đích tôn của chi, nhưng chỉ 1 người/chi (con trai đầu tiên của cha đó)
    // → những người còn lại là "Người nối dõi"
    const fatherProcessed = new Set();
    members.forEach(m => {
        if (!m.is_heir || heirChain.has(m.id)) return;
        if (!m.father_id) return;
        if (!fatherProcessed.has(m.father_id)) {
            dichTonSet.add(m.id);
            fatherProcessed.add(m.father_id);
        } else {
            noiDoiSet.add(m.id);
        }
    });

    return { heirChain, dichTonSet, noiDoiSet };
}

// ─── REINGOLD-TILFORD LAYOUT ────────────────────────────────
function computeLayout(members, collapsed) {
    if (!members.length) return { positions: {}, units: [] };

    const map = {};
    members.forEach(m => { map[m.id] = { ...m, children: [] }; });
    members.forEach(m => {
        [m.father_id, m.mother_id].forEach(pid => {
            if (pid && map[pid] && !map[pid].children.includes(m.id))
                map[pid].children.push(m.id);
        });
    });

    // Hidden nodes (collapsed)
    const hiddenNodes = new Set();
    const getDescendants = (id) => {
        if (!map[id]) return;
        map[id].children.forEach(cId => {
            if (hiddenNodes.has(cId)) return;
            hiddenNodes.add(cId);
            if (map[cId]?.spouse_id) hiddenNodes.add(map[cId].spouse_id);
            getDescendants(cId);
        });
    };
    collapsed.forEach(id => { if (map[id]) getDescendants(id); });

    const isSpouseOf = new Set();
    members.forEach(m => { if (m.spouse_id && map[m.spouse_id]) isSpouseOf.add(m.spouse_id); });

    const trueRoots = members.filter(m => !m.father_id && !m.mother_id && !isSpouseOf.has(m.id) && !hiddenNodes.has(m.id));
    const rootIds = trueRoots.length ? trueRoots.map(m => m.id) : [members[0]?.id].filter(Boolean);

    // BFS to build units
    const units = [];
    const visitedNode = new Set();
    const coupleChildren = (aId, bId) => {
        const s = new Set([...map[aId].children, ...(bId && map[bId] ? map[bId].children : [])]);
        return [...s].filter(cId => !hiddenNodes.has(cId));
    };

    const queue = rootIds.filter(id => !hiddenNodes.has(id)).map(id => ({ id, gen: 0 }));
    const unitByPrimaryId = {};

    while (queue.length) {
        const { id, gen } = queue.shift();
        if (visitedNode.has(id) || hiddenNodes.has(id)) continue;
        visitedNode.add(id);
        const a = map[id];
        let bId = null;
        if (a.spouse_id && map[a.spouse_id] && !visitedNode.has(a.spouse_id) && !hiddenNodes.has(a.spouse_id)) {
            bId = a.spouse_id;
            visitedNode.add(bId);
        }
        const unitIds = bId ? [id, bId] : [id];
        const children = coupleChildren(id, bId);
        const unit = { ids: unitIds, gen, children, primaryId: id };
        units.push(unit);
        unitByPrimaryId[id] = unit;
        children.forEach(cId => { if (!visitedNode.has(cId)) queue.push({ id: cId, gen: gen + 1 }); });
    }

    members.forEach(m => {
        if (!visitedNode.has(m.id) && !hiddenNodes.has(m.id)) {
            units.push({ ids: [m.id], gen: 99, children: [], primaryId: m.id });
            visitedNode.add(m.id);
        }
    });

    // ── Reingold-Tilford: bottom-up subtree width calculation ──
    // Assign each unit a subtree width, then position top-down
    const unitChildren = {}; // unit primaryId → child unit primaryIds
    units.forEach(u => {
        unitChildren[u.primaryId] = u.children
            .map(cId => {
                // find unit that contains this child as primary
                const childUnit = units.find(u2 => u2.ids[0] === cId || (u2.ids.length > 1 && u2.ids.includes(cId) && !isSpouseOf.has(cId)));
                return childUnit?.primaryId;
            })
            .filter(Boolean);
    });

    // Unit width = NODE_W * ids.length + H_GAP*0.4*(ids.length-1)
    const unitW = (u) => u.ids.length * NODE_W + (u.ids.length - 1) * H_GAP * 0.4;

    // Compute subtree width (min = unitW)
    const subtreeW = {};
    const computeSubtreeW = (pid) => {
        if (subtreeW[pid] !== undefined) return subtreeW[pid];
        const children = unitChildren[pid] || [];
        if (!children.length) {
            subtreeW[pid] = unitW(units.find(u => u.primaryId === pid));
            return subtreeW[pid];
        }
        const childrenTotal = children.reduce((sum, cid) => sum + computeSubtreeW(cid) + H_GAP, 0) - H_GAP;
        const self = unitW(units.find(u => u.primaryId === pid));
        subtreeW[pid] = Math.max(childrenTotal, self);
        return subtreeW[pid];
    };
    units.forEach(u => computeSubtreeW(u.primaryId));

    // Position: top-down, center each unit over its subtree
    const positions = {};
    const positionUnit = (pid, centerX, y) => {
        const u = units.find(u => u.primaryId === pid);
        if (!u) return;
        const uw = unitW(u);
        // Center the unit's ids around centerX
        const startX = centerX - uw / 2;
        u.ids.forEach((id, i) => {
            positions[id] = { x: startX + i * (NODE_W + H_GAP * 0.4), y };
        });
        // Position children
        const children = unitChildren[pid] || [];
        if (!children.length) return;
        const totalChildW = children.reduce((s, cid) => s + subtreeW[cid] + H_GAP, 0) - H_GAP;
        let childX = centerX - totalChildW / 2;
        children.forEach(cid => {
            const sw = subtreeW[cid];
            positionUnit(cid, childX + sw / 2, y + NODE_H + V_GAP);
            childX += sw + H_GAP;
        });
    };

    // Position root units
    const rootUnits = units.filter(u => u.gen === 0 && rootIds.includes(u.primaryId));
    const totalRootW = rootUnits.reduce((s, u) => s + subtreeW[u.primaryId] + H_GAP, 0) - H_GAP;
    let rx = -totalRootW / 2;
    rootUnits.forEach(u => {
        const sw = subtreeW[u.primaryId];
        positionUnit(u.primaryId, rx + sw / 2, 60);
        rx += sw + H_GAP;
    });

    return { positions, units, hiddenNodes };
}

// ─── GET ALL DESCENDANTS ──────────────────────────────────
function getDescendantIds(memberId, members) {
    const map = {};
    members.forEach(m => { map[m.id] = { ...m, children: [] }; });
    members.forEach(m => {
        if (m.father_id && map[m.father_id]) map[m.father_id].children.push(m.id);
        if (m.mother_id && map[m.mother_id]) map[m.mother_id].children.push(m.id);
    });
    const result = new Set();
    const walk = (id) => {
        map[id]?.children.forEach(cId => {
            if (!result.has(cId)) { result.add(cId); walk(cId); }
        });
    };
    walk(memberId);
    return result;
}

// ─── CANVAS ────────────────────────────────────────────────
function FamilyTreeCanvas({ members, highlightId, focusId }) {
    const [scale, setScale]         = useState(1);
    const [offset, setOffset]       = useState({ x: 0, y: 0 });
    const [canvasDrag, setCanvasDrag] = useState(null);
    const [collapsed, setCollapsed] = useState(new Set());
    const [nodeOffsets, setNodeOffsets] = useState({}); // manual drag overrides
    const [draggingNode, setDraggingNode] = useState(null); // { id, startMouse, startPos }
    const containerRef = useRef(null);

    const { heirChain, dichTonSet, noiDoiSet } = useMemo(() => computeHeirInfo(members), [members]);
    const { positions: basePositions, units, hiddenNodes } = useMemo(
        () => computeLayout(members, collapsed), [members, collapsed]
    );

    // Merge base positions with manual node offsets
    const positions = useMemo(() => {
        const result = { ...basePositions };
        Object.entries(nodeOffsets).forEach(([id, delta]) => {
            if (result[+id]) result[+id] = { x: result[+id].x + delta.dx, y: result[+id].y + delta.dy };
        });
        return result;
    }, [basePositions, nodeOffsets]);

    // Build nodes & edges from computed positions
    const nodes = useMemo(() =>
        members.filter(m => !hiddenNodes.has(m.id) && positions[m.id])
            .map(m => ({ ...m, x: positions[m.id].x, y: positions[m.id].y })),
        [members, positions, hiddenNodes]
    );

    const edges = useMemo(() => {
        const result = [];
        const edgeSet = new Set();
        units.forEach(u => {
            const [aId, bId] = u.ids;
            const pa = positions[aId], pb = bId ? positions[bId] : null;
            if (!pa) return;
            if (bId && pb) {
                const ek = `sp-${Math.min(aId,bId)}-${Math.max(aId,bId)}`;
                if (!edgeSet.has(ek)) {
                    edgeSet.add(ek);
                    result.push({ id: ek, type: 'spouse',
                        x1: pa.x+NODE_W, y1: pa.y+NODE_H/2,
                        x2: pb.x,        y2: pb.y+NODE_H/2 });
                }
            }
            const ucx = pb ? (pa.x+NODE_W+pb.x)/2 : pa.x+NODE_W/2;
            const uby = pa.y + NODE_H;
            u.children.forEach(cId => {
                const pc = positions[cId];
                if (!pc) return;
                const ek = `pc-${u.ids.join('-')}-${cId}`;
                if (!edgeSet.has(ek)) {
                    edgeSet.add(ek);
                    result.push({ id: ek, type: 'parent', toId: cId,
                        x1: ucx, y1: uby, x2: pc.x+NODE_W/2, y2: pc.y });
                }
            });
        });
        return result;
    }, [units, positions]);

    // Focus: descendants of focusId
    const focusDescendants = useMemo(() =>
        focusId ? getDescendantIds(focusId, members) : null,
        [focusId, members]
    );

    // Auto-center on highlight (FIX: use SVG coords directly)
    useEffect(() => {
        if (!containerRef.current) return;

        // KHI KHÔNG CHỌN AI: Đưa offset về 0, để CSS margin: '0 auto' tự động căn giữa cây gia phả
        if (!highlightId) {
            setOffset({ x: 0, y: 0 });
            return;
        }

        const pos = positions[highlightId];
        if (!pos) return;

        // Lấy thông số để tính toán
        const xs = Object.values(positions).map(p => p.x);
        const ys = Object.values(positions).map(p => p.y);
        if (!xs.length) return;
        
        const minX = Math.min(...xs) - 120;
        const minY = Math.min(...ys) - 80;
        const maxX = Math.max(...xs) + NODE_W + 120;
        const svgW = maxX - minX;

        const container = containerRef.current;
        const cw = container.clientWidth;
        const ch = container.clientHeight;

        // TÍNH TOÁN BÙ TRỪ: Do '0 auto', trình duyệt tự đẩy SVG ra giữa một khoảng. Ta phải tính được khoảng đẩy đó.
        const marginX = cw > (svgW * scale) ? (cw - (svgW * scale)) / 2 : 0;

        // Tọa độ thực tế của Node BÊN TRONG thẻ SVG
        const svgNodeX = pos.x - minX + NODE_W / 2;
        const svgNodeY = pos.y - minY + NODE_H / 2;

        // DỊCH CHUYỂN CAMERA
        // x: Bù trừ marginX để căn ngang cho chuẩn
        // y: Đặt ở ch / 3 (1/3 màn hình phía trên) thay vì ch / 2 để dễ nhìn như Đạt muốn
        setOffset({ 
            x: (cw / 2) - marginX - (svgNodeX * scale), 
            y: (ch / 3) - (svgNodeY * scale) 
        });
    }, [highlightId, positions, scale]);

    const hasChildren = useCallback((id) =>
        members.some(x => x.father_id === id || x.mother_id === id), [members]);

    const toggleCollapse = useCallback((id) => {
        setCollapsed(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
    }, []);

    // Canvas drag
    const onCanvasDown = (e) => {
        if (e.target.closest('[data-nodedrag]') || e.target.closest('[data-btn]')) return;
        setCanvasDrag({ sx: e.clientX - offset.x, sy: e.clientY - offset.y });
    };
    const onMouseMove = (e) => {
        if (draggingNode) {
            const dx = (e.clientX - draggingNode.startMouse.x) / scale;
            const dy = (e.clientY - draggingNode.startMouse.y) / scale;
            setNodeOffsets(prev => ({
                ...prev,
                [draggingNode.id]: { dx: (draggingNode.baseDelta?.dx||0)+dx, dy: (draggingNode.baseDelta?.dy||0)+dy }
            }));
            return;
        }
        if (canvasDrag) setOffset({ x: e.clientX - canvasDrag.sx, y: e.clientY - canvasDrag.sy });
    };
    const onMouseUp = () => { setCanvasDrag(null); setDraggingNode(null); };

    // Node drag start
    const onNodeDragStart = (e, id) => {
        e.stopPropagation();
        const current = nodeOffsets[id] || { dx: 0, dy: 0 };
        setDraggingNode({ id, startMouse: { x: e.clientX, y: e.clientY }, baseDelta: current });
    };

    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    if (!xs.length) return <div className="flex h-full items-center justify-center text-slate-400 italic text-sm">Chưa có dữ liệu…</div>;

    const minX = Math.min(...xs)-120, minY = Math.min(...ys)-80;
    const maxX = Math.max(...xs)+NODE_W+120, maxY = Math.max(...ys)+NODE_H+100;
    const svgW = maxX - minX, svgH = maxY - minY;

    return (
        <div className="flex flex-col h-full gap-2">
            <div className="flex gap-2 flex-shrink-0 items-center flex-wrap">
                <button onClick={() => setScale(s=>Math.min(s+.15,2.5))} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 border"><ZoomIn size={15}/></button>
                <button onClick={() => setScale(s=>Math.max(s-.15,.25))} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 border"><ZoomOut size={15}/></button>
                <button onClick={() => { setScale(1); setOffset({x:0,y:0}); }} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 border"><RefreshCw size={15}/></button>
                <button onClick={() => setNodeOffsets({})} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 border text-xs px-2">Reset vị trí</button>
                <span className="text-xs text-slate-400">{Math.round(scale*100)}%</span>
                {collapsed.size > 0 && (
                    <button onClick={() => setCollapsed(new Set())} className="text-xs text-blue-600 hover:underline">Mở rộng tất cả</button>
                )}
                <span className="text-xs text-slate-300 ml-auto hidden sm:block">Kéo canvas · Kéo node để di chuyển</span>
            </div>

            <div ref={containerRef}
                className="flex-1 overflow-hidden bg-slate-50 rounded-xl border select-none"
                style={{ cursor: draggingNode ? 'grabbing' : canvasDrag ? 'grabbing' : 'grab' }}
                onMouseDown={onCanvasDown} onMouseMove={onMouseMove}
                onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
                <svg width={svgW} height={svgH}
                    viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
                    style={{
                        display:'block', margin:'0 auto',
                        transform:`translate(${offset.x}px,${offset.y}px) scale(${scale})`,
                        transformOrigin:'0 0',
                        transition: (canvasDrag||draggingNode) ? 'none' : 'transform .15s',
                    }}>
                    <defs>
                        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                            <path d="M1,1 L7,4 L1,7" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </marker>
                        <marker id="arr-heir" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                            <path d="M1,1 L7,4 L1,7" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </marker>
                        <marker id="arr-focus" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                            <path d="M1,1 L7,4 L1,7" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </marker>
                        <filter id="glow-orange">
                            <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id="glow-indigo">
                            <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                    </defs>

                    {/* Edges */}
                    {edges.map(e => {
                        if (e.type === 'spouse') {
                            const inFocus = focusDescendants && (focusDescendants.has(e.toId));
                            return <line key={e.id} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                                stroke="#f9a8d4" strokeWidth="2" strokeDasharray="6,4"
                                opacity={focusDescendants && !inFocus ? 0.2 : 1}/>;
                        }
                        const inFocus = focusDescendants && focusDescendants.has(e.toId);
                        const isHeirEdge = heirChain.has(e.toId);
                        const dimmed = focusDescendants && !inFocus;
                        return (
                            <path key={e.id} fill="none"
                                stroke={inFocus ? '#6366f1' : isHeirEdge ? '#f59e0b' : '#93c5fd'}
                                strokeWidth={inFocus ? 2.5 : isHeirEdge ? 2.5 : 1.8}
                                opacity={dimmed ? 0.15 : 1}
                                markerEnd={inFocus ? 'url(#arr-focus)' : isHeirEdge ? 'url(#arr-heir)' : 'url(#arr)'}
                                d={(() => { const my=(e.y1+(e.y2-e.y1)*0.5); return `M${e.x1},${e.y1} C${e.x1},${my} ${e.x2},${my} ${e.x2},${e.y2}`; })()}/>
                        );
                    })}

                    {/* Nodes */}
                    {nodes.map(n => {
                        const male   = n.gender === 'Nam';
                        const isHL   = highlightId === n.id;
                        const isCollapsed = collapsed.has(n.id);
                        const hasCh  = hasChildren(n.id);
                        const inFocus = focusDescendants?.has(n.id);
                        const isFocusRoot = focusId === n.id;
                        const dimmed = focusDescendants && !inFocus && !isFocusRoot;

                        // Label logic
                        const inChain   = heirChain.has(n.id);
                        const isDichTon = dichTonSet.has(n.id);
                        const isNoiDoi  = noiDoiSet.has(n.id);
                        const isTruongToc = n.is_heir && inChain;

                        const border = isHL ? '#f97316'
                            : isFocusRoot ? '#6366f1'
                            : isTruongToc ? '#f59e0b'
                            : male ? '#3b82f6' : '#ec4899';

                        const cardBg = isHL ? '#fff7ed'
                            : inFocus ? '#eef2ff'
                            : isCollapsed ? (male ? '#eff6ff' : '#fdf2f8') : 'white';

                        const avatarBg = male ? '#dbeafe' : '#fce7f3';
                        const name = n.full_name.length > 14 ? n.full_name.slice(0,13)+'…' : n.full_name;
                        const birthFmt = formatDate(n.birth_date);
                        const deathFmt = formatDate(n.death_date);
                        const dateStr = birthFmt && deathFmt ? `${birthFmt} – ${deathFmt}`
                            : birthFmt ? `Sinh: ${birthFmt}`
                            : deathFmt ? `Mất: ${deathFmt}` : '';

                        return (
                            <g key={n.id} transform={`translate(${n.x},${n.y})`}
                                opacity={dimmed ? 0.25 : 1}
                                style={{ transition: 'opacity .2s' }}>

                                {/* Highlight ring */}
                                {isHL && (
                                    <rect width={NODE_W+12} height={NODE_H+12} rx="17" x="-6" y="-6"
                                        fill="none" stroke="#f97316" strokeWidth="2.5"
                                        strokeDasharray="6,3" filter="url(#glow-orange)"/>
                                )}
                                {isFocusRoot && (
                                    <rect width={NODE_W+12} height={NODE_H+12} rx="17" x="-6" y="-6"
                                        fill="none" stroke="#6366f1" strokeWidth="2.5"
                                        strokeDasharray="5,3" filter="url(#glow-indigo)"/>
                                )}
                                {inFocus && !isFocusRoot && (
                                    <rect width={NODE_W+6} height={NODE_H+6} rx="14" x="-3" y="-3"
                                        fill="none" stroke="#a5b4fc" strokeWidth="1.5"/>
                                )}
                                {isTruongToc && (
                                    <rect x="-2" y="4" width="4" height={NODE_H-8} rx="2" fill="#f59e0b"/>
                                )}

                                {/* Shadow */}
                                <rect width={NODE_W} height={NODE_H} rx="12"
                                    fill="rgba(0,0,0,0.06)" transform="translate(2,3)"/>
                                {/* Card */}
                                <rect width={NODE_W} height={NODE_H} rx="12"
                                    fill={cardBg} stroke={border}
                                    strokeWidth={isHL||isFocusRoot||isTruongToc ? 2.5 : 2}/>
                                {/* Top accent */}
                                <rect width={NODE_W} height={4} rx="2" fill={border} opacity="0.75"/>

                                {/* Drag handle — invisible overlay, data-nodedrag to intercept */}
                                <rect width={NODE_W} height={NODE_H} rx="12" fill="transparent"
                                    data-nodedrag="1" style={{ cursor:'move' }}
                                    onMouseDown={e => onNodeDragStart(e, n.id)}/>

                                {/* Avatar */}
                                <circle cx="28" cy={NODE_H/2+4} r="17" fill={avatarBg} style={{pointerEvents:'none'}}/>
                                <text x="28" y={NODE_H/2+10} textAnchor="middle" fontSize="16" style={{pointerEvents:'none'}}>
                                    {male ? '👨' : '👩'}
                                </text>

                                {/* Name */}
                                <text x="52" y={NODE_H/2-12} fontSize="11" fontWeight="700"
                                    fill="#1e293b" style={{pointerEvents:'none'}}>{name}</text>

                                {/* Badge */}
                                {(isTruongToc || isDichTon || isNoiDoi) && (() => {
                                    const label = isTruongToc ? '👑 Trưởng tộc' : isDichTon ? '🌿 Đích tôn' : '🔵 Nối dõi';
                                    const bg    = isTruongToc ? '#fef3c7' : isDichTon ? '#f0fdf4' : '#eff6ff';
                                    const bdr   = isTruongToc ? '#f59e0b' : isDichTon ? '#86efac' : '#93c5fd';
                                    const tc    = isTruongToc ? '#92400e' : isDichTon ? '#166534' : '#1d4ed8';
                                    const w     = isTruongToc ? 50 : isDichTon ? 40 : 38;
                                    return (
                                        <g style={{pointerEvents:'none'}}>
                                            <rect x="52" y={NODE_H/2-2} width={w} height="13" rx="3"
                                                fill={bg} stroke={bdr} strokeWidth="0.8"/>
                                            <text x={52+w/2} y={NODE_H/2+8} textAnchor="middle"
                                                fontSize="7.5" fill={tc} fontWeight="600">{label}</text>
                                        </g>
                                    );
                                })()}

                                {/* Status */}
                                {!n.is_heir && (
                                    <g style={{pointerEvents:'none'}}>
                                        <circle cx="52" cy={NODE_H/2+10} r="3.5"
                                            fill={n.is_alive ? '#22c55e' : '#ef4444'}/>
                                        <text x="59" y={NODE_H/2+14} fontSize="9"
                                            fill={n.is_alive ? '#16a34a' : '#dc2626'}>
                                            {n.is_alive ? 'Còn sống' : 'Đã mất'}
                                        </text>
                                    </g>
                                )}

                                {/* Date */}
                                {dateStr && (
                                    <text x="52" y={NODE_H-8} fontSize="8.5" fill="#94a3b8"
                                        style={{pointerEvents:'none'}}>{dateStr}</text>
                                )}

                                {/* Collapse btn */}
                                {hasCh && (
                                    <g data-btn="1"
                                        onClick={e => { e.stopPropagation(); toggleCollapse(n.id); }}
                                        style={{ cursor:'pointer' }}>
                                        <circle cx={NODE_W/2} cy={NODE_H} r="9"
                                            fill={border} stroke="white" strokeWidth="1.5"/>
                                        <text x={NODE_W/2} y={NODE_H+4.5} textAnchor="middle"
                                            fontSize="13" fill="white" fontWeight="700">
                                            {isCollapsed ? '+' : '−'}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}

// ─── MEMBER LIST ──────────────────────────────────────────
function MemberList({ members, onHighlight, highlightId, onFocus, focusId }) {
    const [search, setSearch] = useState('');
    const [expandedFamilies, setExpandedFamilies] = useState(new Set(['root']));
    const { heirChain, dichTonSet, noiDoiSet } = useMemo(() => computeHeirInfo(members), [members]);

    const filtered = useMemo(() => {
        if (!search) return members;
        return members.filter(m => m.full_name.toLowerCase().includes(search.toLowerCase()));
    }, [members, search]);

    const groups = useMemo(() => {
        const byFather = {};
        const roots = [];
        filtered.forEach(m => {
            if (m.father_id && members.find(p => p.id === m.father_id)) {
                if (!byFather[m.father_id]) byFather[m.father_id] = [];
                byFather[m.father_id].push(m);
            } else roots.push(m);
        });
        return { roots, byFather };
    }, [filtered, members]);

    const toggleFamily = (key) => {
        setExpandedFamilies(prev => { const n=new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; });
    };

    const MemberRow = ({ m, indent=0 }) => {
        const inChain = heirChain.has(m.id);
        const isTT = m.is_heir && inChain;
        const isDT = dichTonSet.has(m.id);
        const isND = noiDoiSet.has(m.id);
        const isHL = highlightId === m.id;
        const isFocus = focusId === m.id;
        const hasFamily = groups.byFather[m.id]?.length > 0;

        return (
            <div className={`flex items-center gap-1 rounded-lg transition-colors mb-0.5
                ${isHL ? 'bg-orange-50 ring-1 ring-orange-300' : isFocus ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-slate-50'}`}
                style={{ paddingLeft: indent*12 }}>
                {hasFamily ? (
                    <button className="p-0.5 text-slate-400 hover:text-slate-600 flex-shrink-0"
                        onClick={() => toggleFamily(`f-${m.id}`)}>
                        {expandedFamilies.has(`f-${m.id}`) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                    </button>
                ) : <div className="w-4 flex-shrink-0"/>}

                <div className="flex items-center gap-2 flex-1 min-w-0 py-1.5 pr-1 cursor-pointer"
                    onClick={() => onHighlight(m.id === highlightId ? null : m.id)}>
                    <span className="flex-shrink-0 text-sm">{m.gender==='Nam'?'👨':'👩'}</span>
                    <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate ${m.gender==='Nam'?'text-blue-700':'text-pink-600'}`}>
                            {m.full_name}
                        </div>
                        {(m.birth_date || m.death_date) && (
                            <div className="text-xs text-slate-400 truncate">
                                {formatDate(m.birth_date)}{m.death_date ? ` – ${formatDate(m.death_date)}` : ''}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        {isTT && <span className="text-xs">👑</span>}
                        {isDT && <span className="text-xs">🌿</span>}
                        {isND && <span className="text-xs text-blue-400 text-[10px]">🔵</span>}
                    </div>
                </div>

                {/* Focus button: click to highlight nhánh con */}
                {m.gender === 'Nam' && (
                    <button title="Xem nhánh con"
                        className={`flex-shrink-0 p-1 rounded text-xs transition-colors
                            ${isFocus ? 'text-indigo-600 bg-indigo-100' : 'text-slate-300 hover:text-indigo-500'}`}
                        onClick={() => onFocus(m.id === focusId ? null : m.id)}>
                        ⬇
                    </button>
                )}
            </div>
        );
    };

    const renderFamily = (m, depth=0) => {
        const children = groups.byFather[m.id] || [];
        return (
            <div key={m.id}>
                <MemberRow m={m} indent={depth}/>
                {children.length > 0 && expandedFamilies.has(`f-${m.id}`) && (
                    <div>{children.map(child => renderFamily(child, depth+1))}</div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 border rounded-lg px-2 py-1.5 mb-2 bg-slate-50">
                <Search size={13} className="text-slate-400 flex-shrink-0"/>
                <input className="text-sm flex-1 outline-none bg-transparent"
                    placeholder="Tìm kiếm..."
                    value={search} onChange={e => setSearch(e.target.value)}/>
                {search && <button onClick={() => setSearch('')} className="text-slate-400 text-xs">✕</button>}
            </div>
            <div className="text-xs text-slate-400 mb-1">{members.length} thành viên</div>
            <div className="flex-1 overflow-y-auto">
                {groups.roots.map(m => renderFamily(m, 0))}
                {!filtered.length && <div className="text-center text-slate-400 text-sm py-6">Không tìm thấy</div>}
            </div>
            <div className="mt-2 pt-2 border-t text-xs text-slate-400 space-y-0.5">
                <div>👑 Trưởng tộc · 🌿 Đích tôn · 🔵 Nối dõi</div>
                <div>⬇ Click để xem nhánh con</div>
            </div>
        </div>
    );
}

// ─── MAIN ─────────────────────────────────────────────────
const Members = () => {
    const [members, setMembers]         = useState([]);
    const [loading, setLoading]         = useState(false);
    const [highlightId, setHighlightId] = useState(null);
    const [focusId, setFocusId]         = useState(null);
    const [formData, setFormData]       = useState({
        full_name:'', gender:'Nam', is_heir:false, is_alive:true,
        birth_date:'', death_date:'', address:'', bio:'',
        father_id:'', mother_id:'', spouse_id:''
    });

    const fetchData = async () => {
        try { const r = await api.get('/members/'); setMembers(r.data); }
        catch(e) { console.error(e); }
    };
    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async e => {
        e.preventDefault(); setLoading(true);
        try {
            await api.post('/members/', {
                ...formData,
                father_id: formData.father_id ? +formData.father_id : null,
                mother_id: formData.mother_id ? +formData.mother_id : null,
                spouse_id: formData.spouse_id ? +formData.spouse_id : null,
                birth_date: formData.birth_date || null,
                death_date: formData.death_date || null,
            });
            alert('Thêm thành công!');
            setFormData({ full_name:'', gender:'Nam', is_heir:false, is_alive:true,
                birth_date:'', death_date:'', address:'', bio:'',
                father_id:'', mother_id:'', spouse_id:'' });
            fetchData();
        } catch(e) {
            alert('Lỗi: ' + (e.response?.data?.detail || 'Không thể lưu'));
        } finally { setLoading(false); }
    };

    const f = (k,v) => setFormData(p => ({...p,[k]:v}));
    const inp = "w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";
    const lbl = "block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide";

    // Spouse filter: con gái chỉ thấy con trai và ngược lại
    const spouseGenderFilter = formData.gender === 'Nam' ? 'Nữ' : 'Nam';

    return (
        <div className="h-full p-4">
            <div className="grid grid-cols-12 gap-4 h-[calc(100vh-2rem)]">

                {/* FORM */}
                <div className="col-span-12 lg:col-span-3 bg-white p-5 rounded-xl shadow-sm border overflow-y-auto">
                    <h2 className="text-blue-700 font-bold mb-5 flex items-center gap-2 text-sm">
                        <UserPlus size={16}/> Thêm Thành Viên
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={lbl}>Họ và tên *</label>
                            <input className={inp} placeholder="Nguyễn Văn A" required
                                value={formData.full_name} onChange={e=>f('full_name',e.target.value)}/>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={lbl}>Giới tính</label>
                                <select className={inp} value={formData.gender}
                                    onChange={e=>{ f('gender',e.target.value); f('spouse_id',''); }}>
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <div>
                                <label className={lbl}>Trạng thái</label>
                                <select className={inp} value={formData.is_alive?'alive':'dead'}
                                    onChange={e=>f('is_alive',e.target.value==='alive')}>
                                    <option value="alive">Còn sống</option>
                                    <option value="dead">Đã mất</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={lbl}>Ngày sinh</label>
                                <DateInput value={formData.birth_date} onChange={v=>f('birth_date',v)} placeholder="dd/mm/yyyy"/>
                            </div>
                            <div>
                                <label className={lbl}>Ngày mất</label>
                                <DateInput value={formData.death_date} onChange={v=>f('death_date',v)} placeholder="dd/mm/yyyy"/>
                            </div>
                        </div>
                        <div>
                            <label className={lbl}>Địa chỉ</label>
                            <input className={inp} placeholder="Số nhà, phố, tỉnh/thành..."
                                value={formData.address} onChange={e=>f('address',e.target.value)}/>
                        </div>
                        <div>
                            <label className={lbl}>Tiểu sử / Ghi chú</label>
                            <textarea className={inp} rows={3} placeholder="Cuộc đời, đóng góp..."
                                value={formData.bio} onChange={e=>f('bio',e.target.value)}/>
                        </div>
                        <hr className="border-slate-100"/>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Quan hệ gia đình</p>
                        <div>
                            <label className={lbl}>Cha</label>
                            <FamilySelect members={members} value={formData.father_id}
                                onChange={v=>f('father_id',v)} placeholder="-- Chọn cha --" filterGender="Nam"/>
                        </div>
                        <div>
                            <label className={lbl}>Mẹ</label>
                            <FamilySelect members={members} value={formData.mother_id}
                                onChange={v=>f('mother_id',v)} placeholder="-- Chọn mẹ --" filterGender="Nữ"/>
                        </div>
                        <div>
                            <label className={lbl}>Vợ / Chồng</label>
                            <FamilySelect members={members} value={formData.spouse_id}
                                onChange={v=>f('spouse_id',v)}
                                placeholder="-- Chọn vợ/chồng --"
                                filterGender={spouseGenderFilter}/>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                                ${formData.is_heir?'bg-amber-400 border-amber-400':'border-slate-300'}`}
                                onClick={()=>f('is_heir',!formData.is_heir)}>
                                {formData.is_heir && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                            <span className="text-sm text-slate-700">Đánh dấu đích tôn / trưởng tộc</span>
                        </label>
                        <button type="submit" disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                            {loading ? '⏳ Đang lưu…' : '💾 Lưu thành viên'}
                        </button>
                    </form>
                </div>

                {/* LIST */}
                <div className="col-span-12 lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border flex flex-col">
                    <h2 className="font-bold mb-3 flex items-center gap-2 text-sm flex-shrink-0">
                        <Users size={15}/> Thành viên
                    </h2>
                    <MemberList members={members}
                        highlightId={highlightId} onHighlight={setHighlightId}
                        focusId={focusId}         onFocus={setFocusId}/>
                </div>

                {/* TREE */}
                <div className="col-span-12 lg:col-span-7 bg-white p-5 rounded-xl shadow-sm border flex flex-col">
                    <h2 className="font-bold mb-3 flex items-center gap-2 text-sm flex-shrink-0 flex-wrap">
                        <Share2 size={15}/> Sơ đồ gia phả
                        {highlightId && (
                            <span className="text-xs text-orange-500 font-normal flex items-center gap-1">
                                · 🔍 {members.find(m=>m.id===highlightId)?.full_name}
                                <button onClick={()=>setHighlightId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </span>
                        )}
                        {focusId && (
                            <span className="text-xs text-indigo-500 font-normal flex items-center gap-1">
                                · ⬇ Nhánh: {members.find(m=>m.id===focusId)?.full_name}
                                <button onClick={()=>setFocusId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </span>
                        )}
                    </h2>
                    <div className="flex-1 min-h-0">
                        <FamilyTreeCanvas members={members}
                            highlightId={highlightId} focusId={focusId}/>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Members;