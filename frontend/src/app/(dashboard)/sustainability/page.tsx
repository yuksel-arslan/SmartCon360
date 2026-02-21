'use client';

import { useEffect, useState } from 'react';
import { ModulePageHeader, ContractPolicyBanner } from '@/components/modules';
import { useProjectStore } from '@/stores/projectStore';
import { useSustainabilityStore, CarbonRecord, WasteRecord, Certification } from '@/stores/sustainabilityStore';

type Tab = 'overview' | 'carbon' | 'waste' | 'certifications';

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    achieved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    registered: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    submitted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    recycled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    reused: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    composted: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400',
    landfill: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    incinerated: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default function SustainabilityPage() {
  const { activeProjectId } = useProjectStore();
  const { summary, carbonRecords, wasteRecords, certifications, loading, fetchAll, createCarbon, updateCarbon, deleteCarbon, createWaste, updateWaste, deleteWaste, createCertification, updateCertification, deleteCertification } = useSustainabilityStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');

  // Carbon form
  const [showCarbonForm, setShowCarbonForm] = useState(false);
  const [editCarbon, setEditCarbon] = useState<CarbonRecord | null>(null);
  const [carbonForm, setCarbonForm] = useState({ source: '', category: '', description: '', quantity: 0, unit: 'kWh', emissionFactor: 0, co2eTonnes: 0, notes: '' });

  // Waste form
  const [showWasteForm, setShowWasteForm] = useState(false);
  const [editWaste, setEditWaste] = useState<WasteRecord | null>(null);
  const [wasteForm, setWasteForm] = useState({ wasteType: '', source: '', quantityTonnes: 0, disposition: 'recycled', recyclingPct: 0, destination: '', manifestNumber: '', notes: '' });

  // Certification form
  const [showCertForm, setShowCertForm] = useState(false);
  const [editCert, setEditCert] = useState<Certification | null>(null);
  const [certForm, setCertForm] = useState({ scheme: 'LEED', targetLevel: '', currentStatus: 'registered', totalCredits: 0, earnedCredits: 0, pendingCredits: 0, assessorName: '', notes: '' });

  useEffect(() => { if (activeProjectId) fetchAll(activeProjectId); }, [activeProjectId, fetchAll]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'carbon', label: 'Carbon Records' },
    { key: 'waste', label: 'Waste Records' },
    { key: 'certifications', label: 'Certifications' },
  ];

  // ─── CARBON HANDLERS ──────────────────────────────────────────────────────
  const openCarbonCreate = () => {
    setCarbonForm({ source: '', category: '', description: '', quantity: 0, unit: 'kWh', emissionFactor: 0, co2eTonnes: 0, notes: '' });
    setEditCarbon(null);
    setShowCarbonForm(true);
  };
  const openCarbonEdit = (r: CarbonRecord) => {
    setCarbonForm({ source: r.source, category: r.category, description: r.description || '', quantity: r.quantity, unit: r.unit, emissionFactor: r.emissionFactor || 0, co2eTonnes: r.co2eTonnes, notes: r.notes || '' });
    setEditCarbon(r);
    setShowCarbonForm(true);
  };
  const saveCarbonRecord = async () => {
    const payload = { ...carbonForm, projectId: activeProjectId, date: new Date().toISOString(), recordedBy: 'current-user' };
    if (editCarbon) { await updateCarbon(editCarbon.id, payload); } else { await createCarbon(payload); }
    setShowCarbonForm(false);
  };

  // ─── WASTE HANDLERS ───────────────────────────────────────────────────────
  const openWasteCreate = () => {
    setWasteForm({ wasteType: '', source: '', quantityTonnes: 0, disposition: 'recycled', recyclingPct: 0, destination: '', manifestNumber: '', notes: '' });
    setEditWaste(null);
    setShowWasteForm(true);
  };
  const openWasteEdit = (r: WasteRecord) => {
    setWasteForm({ wasteType: r.wasteType, source: r.source, quantityTonnes: r.quantityTonnes, disposition: r.disposition, recyclingPct: r.recyclingPct || 0, destination: r.destination || '', manifestNumber: r.manifestNumber || '', notes: r.notes || '' });
    setEditWaste(r);
    setShowWasteForm(true);
  };
  const saveWasteRecord = async () => {
    const payload = { ...wasteForm, projectId: activeProjectId, date: new Date().toISOString(), recordedBy: 'current-user' };
    if (editWaste) { await updateWaste(editWaste.id, payload); } else { await createWaste(payload); }
    setShowWasteForm(false);
  };

  // ─── CERTIFICATION HANDLERS ───────────────────────────────────────────────
  const openCertCreate = () => {
    setCertForm({ scheme: 'LEED', targetLevel: '', currentStatus: 'registered', totalCredits: 0, earnedCredits: 0, pendingCredits: 0, assessorName: '', notes: '' });
    setEditCert(null);
    setShowCertForm(true);
  };
  const openCertEdit = (c: Certification) => {
    setCertForm({ scheme: c.scheme, targetLevel: c.targetLevel, currentStatus: c.currentStatus, totalCredits: c.totalCredits || 0, earnedCredits: c.earnedCredits || 0, pendingCredits: c.pendingCredits || 0, assessorName: c.assessorName || '', notes: c.notes || '' });
    setEditCert(c);
    setShowCertForm(true);
  };
  const saveCertRecord = async () => {
    const payload = { ...certForm, projectId: activeProjectId };
    if (editCert) { await updateCertification(editCert.id, payload); } else { await createCertification(payload); }
    setShowCertForm(false);
  };

  // ─── FILTER ───────────────────────────────────────────────────────────────
  const filteredCarbon = carbonRecords.filter((r) => !search || r.source.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()));
  const filteredWaste = wasteRecords.filter((r) => !search || r.wasteType.toLowerCase().includes(search.toLowerCase()) || r.disposition.toLowerCase().includes(search.toLowerCase()));
  const filteredCerts = certifications.filter((c) => !search || c.scheme.toLowerCase().includes(search.toLowerCase()) || c.targetLevel.toLowerCase().includes(search.toLowerCase()));

  const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent';
  const btnPrimary = 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium';
  const btnSecondary = 'px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm';

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="sustainability" />
      <ContractPolicyBanner
        module="green_site"
        policyLabels={{ 'carbon.tracking': 'Carbon Tracking', 'waste.diversion_target': 'Waste Diversion Target %' }}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSearch(''); }}
              className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-green-600 text-green-600 dark:text-green-400 dark:border-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {loading && <div className="text-center py-12 text-gray-500">Loading sustainability data...</div>}

      {/* ─── OVERVIEW TAB ────────────────────────────────────────────────────── */}
      {!loading && tab === 'overview' && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Carbon (tCO\u2082e)', value: summary.totalCarbonTonnes.toFixed(1), sub: summary.carbonTracking, color: 'text-orange-600 dark:text-orange-400' },
              { label: 'Total Waste (tonnes)', value: summary.totalWasteTonnes.toFixed(1), sub: `${summary.recycledWasteTonnes.toFixed(1)}t recycled`, color: 'text-yellow-600 dark:text-yellow-400' },
              { label: 'Diversion Rate', value: `${summary.diversionRate}%`, sub: `Target: ${summary.diversionTarget}%`, color: summary.meetsDiversionTarget ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
              { label: 'Certifications', value: `${summary.achievedCertifications}/${summary.totalCertifications}`, sub: 'Achieved', color: 'text-purple-600 dark:text-purple-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{kpi.label}</p>
                <p className={`text-2xl font-bold font-[family-name:var(--font-fraunces)] ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Waste Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold mb-4">Waste Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: 'Recycled', value: summary.recycledWasteTonnes, color: 'bg-green-500' },
                  { label: 'Landfill', value: summary.landfillWasteTonnes, color: 'bg-red-500' },
                  { label: 'Other', value: Math.max(0, summary.totalWasteTonnes - summary.recycledWasteTonnes - summary.landfillWasteTonnes), color: 'bg-yellow-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                      <span className="font-medium">{item.value.toFixed(1)}t</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className={`${item.color} h-2 rounded-full`} style={{ width: `${summary.totalWasteTonnes > 0 ? (item.value / summary.totalWasteTonnes) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold mb-4">Diversion Target</h3>
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <div className={`text-5xl font-bold font-[family-name:var(--font-fraunces)] ${summary.meetsDiversionTarget ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {summary.diversionRate}%
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {summary.meetsDiversionTarget ? 'Meeting Target' : 'Below Target'} ({summary.diversionTarget}%)
                  </div>
                  <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium ${summary.meetsDiversionTarget ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {summary.meetsDiversionTarget ? 'On Track' : 'Action Required'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CARBON RECORDS TAB ──────────────────────────────────────────────── */}
      {!loading && tab === 'carbon' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <input type="text" placeholder="Search carbon records..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} sm:max-w-xs`} />
            <button onClick={openCarbonCreate} className={btnPrimary}>+ Add Record</button>
          </div>

          {showCarbonForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h3 className="font-semibold text-sm">{editCarbon ? 'Edit Carbon Record' : 'New Carbon Record'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Source</label>
                  <select value={carbonForm.source} onChange={(e) => setCarbonForm({ ...carbonForm, source: e.target.value })} className={inputCls}>
                    <option value="">Select...</option>
                    <option value="electricity">Electricity</option>
                    <option value="diesel">Diesel</option>
                    <option value="gasoline">Gasoline</option>
                    <option value="natural_gas">Natural Gas</option>
                    <option value="concrete">Concrete</option>
                    <option value="steel">Steel</option>
                    <option value="transport">Transport</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Category</label>
                  <select value={carbonForm.category} onChange={(e) => setCarbonForm({ ...carbonForm, category: e.target.value })} className={inputCls}>
                    <option value="">Select...</option>
                    <option value="scope_1">Scope 1 (Direct)</option>
                    <option value="scope_2">Scope 2 (Indirect Energy)</option>
                    <option value="scope_3">Scope 3 (Other Indirect)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Quantity</label>
                  <input type="number" value={carbonForm.quantity} onChange={(e) => setCarbonForm({ ...carbonForm, quantity: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Unit</label>
                  <select value={carbonForm.unit} onChange={(e) => setCarbonForm({ ...carbonForm, unit: e.target.value })} className={inputCls}>
                    <option value="kWh">kWh</option>
                    <option value="litres">Litres</option>
                    <option value="m3">m&sup3;</option>
                    <option value="tonnes">Tonnes</option>
                    <option value="km">km</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Emission Factor (kgCO2e/unit)</label>
                  <input type="number" step="0.001" value={carbonForm.emissionFactor} onChange={(e) => setCarbonForm({ ...carbonForm, emissionFactor: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">CO2e (tonnes)</label>
                  <input type="number" step="0.01" value={carbonForm.co2eTonnes} onChange={(e) => setCarbonForm({ ...carbonForm, co2eTonnes: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium mb-1">Description</label>
                  <input type="text" value={carbonForm.description} onChange={(e) => setCarbonForm({ ...carbonForm, description: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCarbonForm(false)} className={btnSecondary}>Cancel</button>
                <button onClick={saveCarbonRecord} className={btnPrimary}>Save</button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Source</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Category</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Quantity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Unit</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">CO2e (t)</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredCarbon.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-mono text-xs">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{r.source}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.category} /></td>
                      <td className="px-4 py-3 text-right font-mono">{r.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3">{r.unit}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{r.co2eTonnes.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openCarbonEdit(r)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>
                        <button onClick={() => deleteCarbon(r.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filteredCarbon.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No carbon records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── WASTE RECORDS TAB ───────────────────────────────────────────────── */}
      {!loading && tab === 'waste' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <input type="text" placeholder="Search waste records..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} sm:max-w-xs`} />
            <button onClick={openWasteCreate} className={btnPrimary}>+ Add Record</button>
          </div>

          {showWasteForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h3 className="font-semibold text-sm">{editWaste ? 'Edit Waste Record' : 'New Waste Record'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Waste Type</label>
                  <select value={wasteForm.wasteType} onChange={(e) => setWasteForm({ ...wasteForm, wasteType: e.target.value })} className={inputCls}>
                    <option value="">Select...</option>
                    <option value="concrete">Concrete</option>
                    <option value="wood">Wood</option>
                    <option value="metal">Metal</option>
                    <option value="plastic">Plastic</option>
                    <option value="drywall">Drywall</option>
                    <option value="asphalt">Asphalt</option>
                    <option value="soil">Soil</option>
                    <option value="hazardous">Hazardous</option>
                    <option value="mixed">Mixed C&D</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Source</label>
                  <input type="text" value={wasteForm.source} onChange={(e) => setWasteForm({ ...wasteForm, source: e.target.value })} placeholder="e.g. Demolition, Formwork" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Quantity (tonnes)</label>
                  <input type="number" step="0.1" value={wasteForm.quantityTonnes} onChange={(e) => setWasteForm({ ...wasteForm, quantityTonnes: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Disposition</label>
                  <select value={wasteForm.disposition} onChange={(e) => setWasteForm({ ...wasteForm, disposition: e.target.value })} className={inputCls}>
                    <option value="recycled">Recycled</option>
                    <option value="reused">Reused</option>
                    <option value="composted">Composted</option>
                    <option value="landfill">Landfill</option>
                    <option value="incinerated">Incinerated</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Recycling %</label>
                  <input type="number" min="0" max="100" value={wasteForm.recyclingPct} onChange={(e) => setWasteForm({ ...wasteForm, recyclingPct: parseInt(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Destination</label>
                  <input type="text" value={wasteForm.destination} onChange={(e) => setWasteForm({ ...wasteForm, destination: e.target.value })} placeholder="Facility name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Manifest Number</label>
                  <input type="text" value={wasteForm.manifestNumber} onChange={(e) => setWasteForm({ ...wasteForm, manifestNumber: e.target.value })} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">Notes</label>
                  <input type="text" value={wasteForm.notes} onChange={(e) => setWasteForm({ ...wasteForm, notes: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowWasteForm(false)} className={btnSecondary}>Cancel</button>
                <button onClick={saveWasteRecord} className={btnPrimary}>Save</button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Waste Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Source</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Quantity (t)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Disposition</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Manifest</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredWaste.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-mono text-xs">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 capitalize">{r.wasteType}</td>
                      <td className="px-4 py-3">{r.source}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.quantityTonnes.toFixed(1)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.disposition} /></td>
                      <td className="px-4 py-3 font-mono text-xs">{r.manifestNumber || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openWasteEdit(r)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>
                        <button onClick={() => deleteWaste(r.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filteredWaste.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No waste records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── CERTIFICATIONS TAB ──────────────────────────────────────────────── */}
      {!loading && tab === 'certifications' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <input type="text" placeholder="Search certifications..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} sm:max-w-xs`} />
            <button onClick={openCertCreate} className={btnPrimary}>+ Add Certification</button>
          </div>

          {showCertForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h3 className="font-semibold text-sm">{editCert ? 'Edit Certification' : 'New Certification'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Scheme</label>
                  <select value={certForm.scheme} onChange={(e) => setCertForm({ ...certForm, scheme: e.target.value })} className={inputCls}>
                    <option value="LEED">LEED</option>
                    <option value="BREEAM">BREEAM</option>
                    <option value="Green Star">Green Star</option>
                    <option value="WELL">WELL</option>
                    <option value="Envision">Envision</option>
                    <option value="ISO 14001">ISO 14001</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Target Level</label>
                  <input type="text" value={certForm.targetLevel} onChange={(e) => setCertForm({ ...certForm, targetLevel: e.target.value })} placeholder="e.g. Gold, Platinum, Excellent" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Status</label>
                  <select value={certForm.currentStatus} onChange={(e) => setCertForm({ ...certForm, currentStatus: e.target.value })} className={inputCls}>
                    <option value="registered">Registered</option>
                    <option value="in_progress">In Progress</option>
                    <option value="submitted">Submitted</option>
                    <option value="achieved">Achieved</option>
                    <option value="not_achieved">Not Achieved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Total Credits</label>
                  <input type="number" value={certForm.totalCredits} onChange={(e) => setCertForm({ ...certForm, totalCredits: parseInt(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Earned Credits</label>
                  <input type="number" value={certForm.earnedCredits} onChange={(e) => setCertForm({ ...certForm, earnedCredits: parseInt(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Pending Credits</label>
                  <input type="number" value={certForm.pendingCredits} onChange={(e) => setCertForm({ ...certForm, pendingCredits: parseInt(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Assessor Name</label>
                  <input type="text" value={certForm.assessorName} onChange={(e) => setCertForm({ ...certForm, assessorName: e.target.value })} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">Notes</label>
                  <input type="text" value={certForm.notes} onChange={(e) => setCertForm({ ...certForm, notes: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCertForm(false)} className={btnSecondary}>Cancel</button>
                <button onClick={saveCertRecord} className={btnPrimary}>Save</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCerts.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-base">{c.scheme}</h4>
                    <p className="text-sm text-gray-500">{c.targetLevel}</p>
                  </div>
                  <StatusBadge status={c.currentStatus} />
                </div>

                {(c.totalCredits ?? 0) > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Credits Progress</span>
                      <span className="font-medium">{c.earnedCredits ?? 0}/{c.totalCredits}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${((c.earnedCredits ?? 0) / (c.totalCredits ?? 1)) * 100}%` }} />
                    </div>
                    {(c.pendingCredits ?? 0) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{c.pendingCredits} credits pending</p>
                    )}
                  </div>
                )}

                {c.assessorName && (
                  <p className="text-xs text-gray-500 mb-2">Assessor: {c.assessorName}</p>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button onClick={() => openCertEdit(c)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => deleteCertification(c.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                </div>
              </div>
            ))}
            {filteredCerts.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-400">No certifications found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
