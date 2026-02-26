import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoardsData } from '../hooks';

interface LocationNode {
  key: string;
  label: string;
  boardCount: number;
  children: Map<string, LocationNode>;
}

function buildTree(boards: { locationKey?: string; locationLabel?: string }[]): Map<string, LocationNode> {
  const root = new Map<string, LocationNode>();

  for (const board of boards) {
    if (!board.locationKey) continue;

    const parts = board.locationKey.split('-');
    // parts[0] = country (CA), parts[1] = state (ON), parts[2+] = city (may contain hyphens)
    const country = parts[0];
    const state = parts.length >= 2 ? parts[1] : null;
    const city = parts.length >= 3 ? parts.slice(2).join('-') : null;

    // Parse label: "City, State, Country" or "State, Country" or "Country"
    const labelParts = (board.locationLabel ?? board.locationKey).split(', ');
    const countryLabel = labelParts[labelParts.length - 1] ?? country;
    const stateLabel = labelParts.length >= 2 ? labelParts[labelParts.length - 2] : state ?? '';
    const cityLabel = labelParts.length >= 3 ? labelParts[0] : '';

    // Ensure country node
    if (!root.has(country)) {
      root.set(country, { key: country, label: countryLabel, boardCount: 0, children: new Map() });
    }
    const countryNode = root.get(country)!;
    countryNode.boardCount++;

    if (state) {
      const stateKey = `${country}-${state}`;
      if (!countryNode.children.has(state)) {
        countryNode.children.set(state, { key: stateKey, label: stateLabel || state, boardCount: 0, children: new Map() });
      }
      const stateNode = countryNode.children.get(state)!;
      stateNode.boardCount++;

      if (city) {
        const cityKey = `${country}-${state}-${city}`;
        if (!stateNode.children.has(city)) {
          stateNode.children.set(city, { key: cityKey, label: cityLabel || city, boardCount: 0, children: new Map() });
        }
        stateNode.children.get(city)!.boardCount++;
      }
    }
  }

  return root;
}

interface TreeNodeProps {
  node: LocationNode;
  depth?: number;
}

function TreeNode({ node, depth = 0 }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const navigate = useNavigate();
  const hasChildren = node.children.size > 0;

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}
        onClick={() => {
          if (hasChildren) setExpanded((e) => !e);
          navigate(`/jobs?locationKey=${encodeURIComponent(node.key)}`);
        }}
      >
        {hasChildren && (
          <span style={{ fontSize: 12, color: '#888', userSelect: 'none' }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={{ display: 'inline-block', width: 16 }} />}
        <span className="location-node-label">{node.label}</span>
        <span className="muted" style={{ fontSize: 12 }}>
          {node.boardCount} board{node.boardCount !== 1 ? 's' : ''}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {Array.from(node.children.values())
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((child) => (
              <TreeNode key={child.key} node={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export default function LocationsPage() {
  const { data: boards, loading, error } = useBoardsData();

  if (loading) return <div className="stack"><p className="muted">Loading…</p></div>;
  if (error) return <div className="card">Failed to load locations.</div>;

  const boardsWithLocation = (boards ?? []).filter((b) => b.locationKey);
  const tree = buildTree(boardsWithLocation);
  const sorted = Array.from(tree.values()).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="stack">
      <h2>Locations</h2>

      {sorted.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p className="muted">No boards with locations yet. Set a location when editing a board.</p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="card">
          {sorted.map((node) => (
            <TreeNode key={node.key} node={node} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
