import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  RotateCcw,
  FileSpreadsheet,
  FileJson,
  AlertTriangle,
  CheckCircle,
  HardDrive,
} from 'lucide-react';
import { exportExpensesToCSV, exportMonthlyStatsToCSV, parseExpensesCSV } from '../utils/financeCalculators';

export const DataBackupModal = ({
  isOpen,
  onClose,
  fullData,
  monthlyStats,
  onImportData,
  onImportExpenses,
  onResetData,
}) => {
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvSource, setCsvSource] = useState('');
  const [csvMapping, setCsvMapping] = useState({});

  if (!isOpen) return null;

  // Export full JSON backup
  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(fullData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `finance-command-center-backup-${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export CSV of transactions
  const handleExportCSV = () => {
    const csv = exportExpensesToCSV(fullData.expenses || []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMonthlyStats = () => {
    const csv = exportMonthlyStatsToCSV(monthlyStats || {});
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-finance-report-${monthlyStats?.monthKey || new Date().toISOString().slice(0, 7)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Handle JSON file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        const isValidBackup = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          && (parsed.backupVersion === undefined || Number.isInteger(Number(parsed.backupVersion)))
          && (parsed.expenses === undefined || Array.isArray(parsed.expenses))
          && (parsed.bills === undefined || Array.isArray(parsed.bills))
          && (parsed.investments === undefined || Array.isArray(parsed.investments));
        if (!isValidBackup) {
          alert('This file is not a valid finance tracker backup.');
          return;
        }
        if (
          window.confirm(
            'Are you sure you want to restore this backup? This will replace your current data with the backup file records.'
          )
        ) {
          onImportData(parsed);
          setImportStatus('Backup restored successfully!');
          setTimeout(() => {
            setImportStatus(null);
            onClose();
          }, 1500);
        }
      } catch (err) {
        alert('Invalid JSON file format. Please upload a valid backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const source = String(loadEvent.target?.result || '');
      setCsvSource(source);
      setCsvMapping({});
      setCsvPreview(parseExpensesCSV(source));
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const updateCsvMapping = (field, value) => {
    const nextMapping = { ...csvMapping, [field]: value };
    setCsvMapping(nextMapping);
    setCsvPreview(parseExpensesCSV(csvSource, nextMapping));
  };

  const commitCSVImport = () => {
    if (!csvPreview?.rows?.length || !onImportExpenses) return;
    onImportExpenses(csvPreview.rows);
    setImportStatus(`${csvPreview.rows.length} expense rows imported.`);
    setCsvPreview(null);
    setTimeout(() => setImportStatus(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="brutal-card bg-neo-cream max-w-lg w-full p-6 relative">
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neo-green text-black">DATA ENGINE</span>
            <h3 className="text-xl font-black uppercase">Backup, Export & Restore</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black hover:text-white border-2 border-black"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {importStatus && (
          <div className="p-3 bg-emerald-200 border-2 border-black font-bold text-xs mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-900" />
            {importStatus}
          </div>
        )}

        <div className="space-y-4">
          {/* Export section */}
          <div className="border-2 border-black p-4 bg-white shadow-brutal-sm">
            <h4 className="font-black text-sm uppercase mb-1">Export Data</h4>
            <p className="text-xs text-black/70 mb-3">
              Export your records to keep offline copies or open in spreadsheet applications.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleExportCSV}
                className="brutal-btn bg-yellow-200 hover:bg-yellow-300 p-2.5 text-xs font-bold"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportMonthlyStats}
                className="brutal-btn bg-emerald-200 hover:bg-emerald-300 p-2.5 text-xs font-bold"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Monthly Stats + Graph</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="brutal-btn bg-cyan-200 hover:bg-cyan-300 p-2.5 text-xs font-bold"
              >
                <FileJson className="w-4 h-4" />
                <span>Full JSON Backup</span>
              </button>
            </div>
          </div>

          <div className="border-2 border-black p-4 bg-white shadow-brutal-sm">
            <h4 className="font-black text-sm uppercase mb-1">Import Expenses from CSV</h4>
            <p className="text-xs text-black/70 mb-3">Preview rows before adding them. Required columns: Date, Name or Description, Amount.</p>
            <input type="file" accept=".csv,text/csv" onChange={handleCSVUpload} className="block w-full text-xs font-bold" />
            {csvPreview && <div className="mt-3 border-2 border-black p-3 bg-amber-50"><div className="text-xs font-black uppercase">Preview: {csvPreview.rows.length} valid rows · {csvPreview.errors.length} errors</div>{csvPreview.needsMapping?.length > 0 && <div className="mt-3 space-y-2"><div className="text-[11px] font-black uppercase">Map required CSV columns</div>{csvPreview.needsMapping.map((field) => <label key={field} className="flex items-center justify-between gap-2 text-xs font-bold uppercase"><span>{field === 'name' ? 'Name / Description' : field}</span><select value={csvMapping[field] ?? ''} onChange={(event) => updateCsvMapping(field, event.target.value)} className="brutal-input bg-white py-1 text-xs"><option value="">Select column</option>{(csvPreview.headers || []).map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Column ${index + 1}`}</option>)}</select></label>)}</div>}{csvPreview.errors.length > 0 && <ul className="text-xs text-red-700 font-bold mt-2 list-disc pl-4 max-h-20 overflow-auto">{csvPreview.errors.map((error) => <li key={error}>{error}</li>)}</ul>}<div className="flex justify-end gap-2 mt-3"><button onClick={() => { setCsvPreview(null); setCsvSource(''); }} className="brutal-btn bg-white px-3 py-1.5 text-xs font-black">Cancel</button><button onClick={commitCSVImport} disabled={!csvPreview.rows.length} className="brutal-btn bg-neo-green px-3 py-1.5 text-xs font-black disabled:opacity-40">Import Valid Rows</button></div></div>}
          </div>

          {/* Import / Restore section */}
          <div className="border-2 border-black p-4 bg-white shadow-brutal-sm">
            <h4 className="font-black text-sm uppercase mb-1">Restore from Backup</h4>
            <p className="text-xs text-black/70 mb-3">
              Restore transactions, allocations, bills, and investments from a previously exported JSON backup.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="brutal-btn bg-purple-200 hover:bg-purple-300 w-full p-2.5 text-xs font-bold"
            >
              <Upload className="w-4 h-4" />
              <span>Select JSON Backup File to Restore</span>
            </button>
          </div>

          {/* Clean Account Reset & Demo Loader */}
          <div className="border-2 border-black p-4 bg-red-50 shadow-brutal-sm space-y-3">
            <div>
              <h4 className="font-black text-sm uppercase text-red-950 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Reset Account Data
              </h4>
              <p className="text-xs text-red-900">
                Reset your account to a completely fresh slate (0 transactions) or load the ₹1,90,000 demo model.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Are you sure you want to reset everything to a BRAND NEW ACCOUNT? All transactions, bills, and investments will be wiped clean.'
                    )
                  ) {
                    onResetData('clean');
                    onClose();
                  }
                }}
                className="brutal-btn bg-white hover:bg-red-200 text-red-950 border-red-900 p-2 text-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                <span>Reset to Fresh Account (0 Data)</span>
              </button>

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Load the ₹1,90,000 demonstration model with sample bills, expenses, and investments?'
                    )
                  ) {
                    onResetData('demo');
                    onClose();
                  }
                }}
                className="brutal-btn bg-white hover:bg-yellow-200 text-black border-black p-2 text-xs font-bold"
              >
                <span>Load ₹1,90,000 Demo Data</span>
              </button>
            </div>
          </div>

          {/* Storage Disclaimer */}
          <div className="flex items-start gap-2 text-[11px] text-black/70 font-mono pt-1">
            <HardDrive className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Your data is securely stored in a PostgreSQL cloud database. All changes sync automatically. Export backups for offline copies.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
