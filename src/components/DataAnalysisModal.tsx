import type { DocumentAnalysisResult } from '../../electron/documentService';

interface DataAnalysisModalProps {
  isOpen: boolean;
  dataResult: DocumentAnalysisResult | null;
  onClose: () => void;
}

export function DataAnalysisModal({ isOpen, dataResult, onClose }: DataAnalysisModalProps) {
  if (!isOpen || !dataResult) return null;

  const stats = dataResult.stats;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="data-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="icon">📊</span>
            <span>DATA ANALYSIS: {dataResult.fileName}</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="data-stats-bar">
            <div className="stat-card">
              <span className="val">{stats?.rowCount ?? 0}</span>
              <span className="lbl">Total Rows</span>
            </div>
            <div className="stat-card">
              <span className="val">{stats?.colCount ?? 0}</span>
              <span className="lbl">Columns</span>
            </div>
            <div className="stat-card">
              <span className="val">{dataResult.fileType}</span>
              <span className="lbl">File Format</span>
            </div>
          </div>

          {stats?.headers && stats.headers.length > 0 && (
            <div className="data-columns-section">
              <h4>DETECTED SCHEMA & COLUMNS</h4>
              <div className="column-tags">
                {stats.headers.map((col, idx) => (
                  <span key={idx} className="col-chip">
                    🔹 {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {stats?.sampleData && stats.sampleData.length > 0 ? (
            <div className="data-table-container">
              <h4>PREVIEW SAMPLE DATA (First {stats.sampleData.length} Rows)</h4>
              <table className="data-preview-table">
                <thead>
                  <tr>
                    {stats.headers?.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.sampleData.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {stats.headers?.map((h, cIdx) => (
                        <td key={cIdx}>{String(row[h] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="raw-text-view">
              <h4>DOCUMENT CONTENT PREVIEW</h4>
              <pre>{dataResult.text}</pre>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="primary-modal-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
