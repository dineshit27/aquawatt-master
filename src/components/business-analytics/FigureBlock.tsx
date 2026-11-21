import React from 'react';
import { DataProvenance } from '../../types/businessAnalytics';

interface FigureBlockProps {
  figNumber: string;
  title: string;
  subtitle: string;
  provenance: DataProvenance | 'mixed';
  sourceNote: string;
  tableHeaders?: string[];
  tableRows?: (string | number | null)[][];
  tableAlignRightCols?: number[];
  children: React.ReactNode;
}

export const FigureBlock: React.FC<FigureBlockProps> = ({
  figNumber,
  title,
  subtitle,
  provenance,
  sourceNote,
  tableHeaders,
  tableRows,
  tableAlignRightCols = [],
  children,
}) => {
  const [tableOpen, setTableOpen] = React.useState(false);

  const provenanceLabel =
    provenance === 'physical'
      ? 'VERIFIED PHYSICAL (FS-S401)'
      : provenance === 'mixed'
      ? 'HYBRID · PHYSICAL + DEMO'
      : 'DEMO DATA';

  const provenanceClass =
    provenance === 'physical' ? 'is-physical' : 'is-demo';

  const hasTable = Boolean(tableHeaders && tableRows && tableRows.length > 0);

  return (
    <div className="figure-block">
      <div className="fig-head">
        <div>
          <div className="fig-id">
            {figNumber} · {title}
          </div>
          <div className="fig-sub">{subtitle}</div>
        </div>
        <span className={`provenance-mark ${provenanceClass}`}>
          <i aria-hidden="true" />
          {provenanceLabel}
        </span>
      </div>

      <div>{children}</div>

      <div className="fig-foot">
        <span className="mono-meta">{sourceNote}</span>
        {hasTable && (
          <button
            type="button"
            className="fig-table-toggle"
            aria-expanded={tableOpen}
            onClick={() => setTableOpen(prev => !prev)}
          >
            {tableOpen ? 'Hide data table ↑' : 'Show data table ↓'}
          </button>
        )}
      </div>

      {hasTable && tableOpen && tableHeaders && tableRows && (
        <div className="fig-data-table-wrap">
          <table className="fig-data-table">
            <thead>
              <tr>
                {tableHeaders.map((hdr, idx) => (
                  <th
                    key={hdr}
                    className={tableAlignRightCols.includes(idx) ? 'num' : undefined}
                  >
                    {hdr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={tableAlignRightCols.includes(cIdx) ? 'num' : undefined}
                    >
                      {cell === null ? 'Calibration Pending' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
