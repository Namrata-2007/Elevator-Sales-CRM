import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Filter,
  Search,
  Building,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Printer,
  Compass,
} from 'lucide-react';
import { api, formatCurrency, formatDate } from '../../lib/api.ts';
import { Enquiry, Lead, EnquiryStatus, LiftType } from '../../types/crm.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface EnquiriesViewProps {
  onOpenCreateQuotationWithEnquiry?: (enquiry: Enquiry) => void;
}

const LIFT_TYPES: LiftType[] = ['Passenger', 'Goods', 'Hospital', 'Home', 'Capsule', 'Other'];
const STATUS_OPTIONS: EnquiryStatus[] = [
  'Draft',
  'Technical Review',
  'Pending Quotation',
  'Quotation Created',
  'Cancelled',
];

export const EnquiriesView: React.FC<EnquiriesViewProps> = ({
  onOpenCreateQuotationWithEnquiry,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [liftTypeFilter, setLiftTypeFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);
  const [viewingEnquiry, setViewingEnquiry] = useState<Enquiry | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    leadId: '',
    projectName: '',
    customerName: '',
    mobileNumber: '',
    email: '',
    buildingType: 'Commercial',
    buildingConfiguration: 'B + G + 5 Floors',
    liftType: 'Passenger' as LiftType,
    liftQuantity: 1,
    ratedCapacity: '8 Persons / 544 kg',
    ratedSpeed: '1.0 m/s',
    numberOfFloors: 5,
    numberOfStops: 5,
    numberOfOpenings: 5,
    machineRoom: 'Machine Room-Less (MRL)',
    doorType: 'Auto Center Opening',
    doorOpeningDimensions: '800 mm (W) x 2000 mm (H)',
    cabinDimensions: '1100 mm (W) x 1400 mm (D) x 2200 mm (H)',
    shaftDimensions: '1800 mm (W) x 1900 mm (D)',
    pitDepth: '1500 mm',
    overheadClearance: '4500 mm',
    powerSupply: '3 Phase 415V, 50Hz',
    interiorFinish: 'Hairline Stainless Steel (SS 304)',
    specialRequirements: 'Automatic Rescue Device (ARD), Voice Announcer, Fireman Switch',
    technicalNotes: 'PMSM gearless traction machine with VVVF drive for high energy efficiency.',
    expectedBudget: '',
    civilWorkResponsibility: 'Client',
    electricalWorkResponsibility: 'Client',
    expectedDeliveryTimeline: '6-8 Weeks',
    paymentTerms: '30% Advance, 60% Material Delivery, 10% Handover',
    enquiryDate: new Date().toISOString().split('T')[0],
    expectedQuotationDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    status: 'Draft' as EnquiryStatus,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (liftTypeFilter !== 'all') params.liftType = liftTypeFilter;

      const [enqData, leadData] = await Promise.all([
        api.getEnquiries(params),
        api.getLeads(),
      ]);
      setEnquiries(enqData);
      setLeads(leadData);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch enquiries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, liftTypeFilter]);

  const openCreateModal = () => {
    setEditingEnquiry(null);
    const firstLead = leads[0];
    setFormData({
      leadId: firstLead ? String(firstLead.id) : '',
      projectName: firstLead ? firstLead.projectName : '',
      customerName: firstLead ? firstLead.customerName : '',
      mobileNumber: firstLead ? firstLead.mobileNumber : '',
      email: firstLead ? firstLead.email || '' : '',
      buildingType: firstLead ? firstLead.buildingType : 'Commercial',
      buildingConfiguration: firstLead ? `G + ${firstLead.numberOfFloors} Floors` : 'G + 4 Floors',
      liftType: 'Passenger',
      liftQuantity: firstLead ? firstLead.requiredLiftQty : 1,
      ratedCapacity: '8 Persons / 544 kg',
      ratedSpeed: '1.0 m/s',
      numberOfFloors: firstLead ? firstLead.numberOfFloors : 5,
      numberOfStops: firstLead ? firstLead.numberOfFloors : 5,
      numberOfOpenings: firstLead ? firstLead.numberOfFloors : 5,
      machineRoom: 'Machine Room-Less (MRL)',
      doorType: 'Auto Center Opening',
      doorOpeningDimensions: '800 mm (W) x 2000 mm (H)',
      cabinDimensions: '1100 mm (W) x 1400 mm (D) x 2200 mm (H)',
      shaftDimensions: '1800 mm (W) x 1900 mm (D)',
      pitDepth: '1500 mm',
      overheadClearance: '4500 mm',
      powerSupply: '3 Phase 415V, 50Hz',
      interiorFinish: 'Hairline Stainless Steel (SS 304)',
      specialRequirements: 'Automatic Rescue Device (ARD), Voice Announcer, Fireman Switch',
      technicalNotes: 'PMSM gearless traction machine with VVVF drive.',
      expectedBudget: firstLead?.estimatedBudget ? String(firstLead.estimatedBudget) : '',
      civilWorkResponsibility: 'Client',
      electricalWorkResponsibility: 'Client',
      expectedDeliveryTimeline: '6-8 Weeks',
      paymentTerms: '30% Advance, 60% Material Delivery, 10% Handover',
      enquiryDate: new Date().toISOString().split('T')[0],
      expectedQuotationDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      status: 'Draft',
    });
    setIsModalOpen(true);
  };

  const handleLeadSelect = (leadIdStr: string) => {
    const selected = leads.find((l) => String(l.id) === leadIdStr);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        leadId: leadIdStr,
        projectName: selected.projectName,
        customerName: selected.customerName,
        mobileNumber: selected.mobileNumber,
        email: selected.email || '',
        buildingType: selected.buildingType,
        buildingConfiguration: `G + ${selected.numberOfFloors} Floors`,
        liftQuantity: selected.requiredLiftQty,
        numberOfFloors: selected.numberOfFloors,
        numberOfStops: selected.numberOfFloors,
        numberOfOpenings: selected.numberOfFloors,
        expectedBudget: selected.estimatedBudget ? String(selected.estimatedBudget) : prev.expectedBudget,
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEnquiry) {
        await api.updateEnquiry(editingEnquiry.id, formData);
        showToast(`Enquiry ${editingEnquiry.enquiryNumber} updated!`, 'success');
      } else {
        const created = await api.createEnquiry(formData);
        showToast(`Enquiry ${created.enquiryNumber} created successfully!`, 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this technical enquiry?')) return;
    try {
      await api.deleteEnquiry(id);
      showToast('Enquiry deleted', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete enquiry', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Elevator Technical Enquiries
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Engineered hoistway specifications, cabin finishes, speeds, capacities, and commercial milestones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> New Technical Enquiry
          </button>
        </div>
      </div>

      {/* Safety & Engineering Disclaimer */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Engineering Compliance Note:</strong> All shaft dimensions,
          pit depths, and overhead clearances recorded below must be physically verified by qualified
          elevator engineers before releasing factory production drawings or confirming final pricing.
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter className="w-3.5 h-3.5" /> Filter by:
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          value={liftTypeFilter}
          onChange={(e) => setLiftTypeFilter(e.target.value)}
          className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
        >
          <option value="all">All Lift Types</option>
          {LIFT_TYPES.map((lt) => (
            <option key={lt} value={lt}>
              {lt} Elevators
            </option>
          ))}
        </select>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadData();
          }}
          className="ml-auto flex items-center gap-1"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search enquiries..."
            className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-medium text-xs"
          >
            Search
          </button>
        </form>
      </div>

      {/* Enquiries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Enquiry ID</th>
                <th className="py-3 px-4">Project & Customer</th>
                <th className="py-3 px-4">Lift Specifications</th>
                <th className="py-3 px-4">Shaft & Machine Room</th>
                <th className="py-3 px-4">Floors / Stops</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Enquiry Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && enquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Fetching enquiries...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No enquiries found matching filters.
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr
                    key={enq.id}
                    className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                    onClick={() => setViewingEnquiry(enq)}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-sky-700">
                      {enq.enquiryNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {enq.projectName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Client: {enq.customerName} ({enq.buildingType})
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">
                        {enq.liftQuantity}x {enq.liftType} Lift ({enq.ratedCapacity})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Speed: {enq.ratedSpeed} • {enq.doorType}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {enq.machineRoom}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Shaft: {enq.shaftDimensions || '1800x1900'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {enq.numberOfFloors} Floors / {enq.numberOfStops} Stops
                      </div>
                      <div className="text-[10px] text-slate-500">{enq.buildingConfiguration}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={enq.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {formatDate(enq.enquiryDate)}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            if (onOpenCreateQuotationWithEnquiry) {
                              onOpenCreateQuotationWithEnquiry(enq);
                            }
                          }}
                          title="Generate Quotation"
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold flex items-center gap-1"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" /> Quote
                        </button>
                        <button
                          onClick={() => {
                            setEditingEnquiry(enq);
                            setFormData({
                              leadId: String(enq.leadId),
                              projectName: enq.projectName,
                              customerName: enq.customerName,
                              mobileNumber: enq.mobileNumber || '',
                              email: enq.email || '',
                              buildingType: enq.buildingType,
                              buildingConfiguration: enq.buildingConfiguration || '',
                              liftType: enq.liftType,
                              liftQuantity: enq.liftQuantity,
                              ratedCapacity: enq.ratedCapacity || '8 Persons / 544 kg',
                              ratedSpeed: enq.ratedSpeed || '1.0 m/s',
                              numberOfFloors: enq.numberOfFloors || 5,
                              numberOfStops: enq.numberOfStops || 5,
                              numberOfOpenings: enq.numberOfOpenings || 5,
                              machineRoom: enq.machineRoom || 'Machine Room-Less (MRL)',
                              doorType: enq.doorType || 'Auto Center Opening',
                              doorOpeningDimensions: enq.doorOpeningDimensions || '',
                              cabinDimensions: enq.cabinDimensions || '',
                              shaftDimensions: enq.shaftDimensions || '',
                              pitDepth: enq.pitDepth || '',
                              overheadClearance: enq.overheadClearance || '',
                              powerSupply: enq.powerSupply || '',
                              interiorFinish: enq.interiorFinish || '',
                              specialRequirements: enq.specialRequirements || '',
                              technicalNotes: enq.technicalNotes || '',
                              expectedBudget: enq.expectedBudget ? String(enq.expectedBudget) : '',
                              civilWorkResponsibility: enq.civilWorkResponsibility || 'Client',
                              electricalWorkResponsibility: enq.electricalWorkResponsibility || 'Client',
                              expectedDeliveryTimeline: enq.expectedDeliveryTimeline || '6-8 Weeks',
                              paymentTerms: enq.paymentTerms || '',
                              enquiryDate: enq.enquiryDate,
                              expectedQuotationDate: enq.expectedQuotationDate || '',
                              status: enq.status,
                            });
                            setIsModalOpen(true);
                          }}
                          title="Edit Technical Specs"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {(user?.role === 'admin' || user?.role === 'manager') && (
                          <button
                            onClick={() => handleDelete(enq.id)}
                            title="Delete Enquiry"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Technical Enquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {editingEnquiry
                    ? `Edit Technical Enquiry ${editingEnquiry.enquiryNumber}`
                    : 'Create Elevator Technical Enquiry'}
                </h2>
                <p className="text-xs text-slate-500">Capture engineering, hoistway, and commercial specifications</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
              {/* Section 1: Customer & Building */}
              <div>
                <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2 text-blue-600 border-b pb-1">
                  1. Project & Customer Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Link Existing Lead <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.leadId}
                      onChange={(e) => handleLeadSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="">Select lead...</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.leadNumber} - {l.customerName} ({l.projectName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Project Name</label>
                    <input
                      type="text"
                      required
                      value={formData.projectName}
                      onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Customer / Client</label>
                    <input
                      type="text"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Building Type</label>
                    <input
                      type="text"
                      value={formData.buildingType}
                      onChange={(e) => setFormData({ ...formData, buildingType: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Building Configuration</label>
                    <input
                      type="text"
                      value={formData.buildingConfiguration}
                      onChange={(e) => setFormData({ ...formData, buildingConfiguration: e.target.value })}
                      placeholder="e.g. Basement + Ground + 7 Floors"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Enquiry Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as EnquiryStatus })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Elevator Engineering Specifications */}
              <div>
                <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2 text-indigo-600 border-b pb-1">
                  2. Elevator Technical & Shaft Dimensions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Lift Type</label>
                    <select
                      value={formData.liftType}
                      onChange={(e) => setFormData({ ...formData, liftType: e.target.value as LiftType })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      {LIFT_TYPES.map((lt) => (
                        <option key={lt} value={lt}>
                          {lt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Lift Quantity (Units)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.liftQuantity}
                      onChange={(e) => setFormData({ ...formData, liftQuantity: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rated Capacity</label>
                    <input
                      type="text"
                      value={formData.ratedCapacity}
                      onChange={(e) => setFormData({ ...formData, ratedCapacity: e.target.value })}
                      placeholder="e.g. 8 Persons / 544 kg"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rated Speed</label>
                    <input
                      type="text"
                      value={formData.ratedSpeed}
                      onChange={(e) => setFormData({ ...formData, ratedSpeed: e.target.value })}
                      placeholder="e.g. 1.0 m/s or 1.5 m/s"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Machine Room Type</label>
                    <select
                      value={formData.machineRoom}
                      onChange={(e) => setFormData({ ...formData, machineRoom: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="Machine Room-Less (MRL)">Machine Room-Less (MRL)</option>
                      <option value="Machine Room (MR)">Machine Room (MR)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Door Mechanism</label>
                    <input
                      type="text"
                      value={formData.doorType}
                      onChange={(e) => setFormData({ ...formData, doorType: e.target.value })}
                      placeholder="e.g. Auto Center Opening (2 Panel)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Door Opening Dimensions</label>
                    <input
                      type="text"
                      value={formData.doorOpeningDimensions}
                      onChange={(e) => setFormData({ ...formData, doorOpeningDimensions: e.target.value })}
                      placeholder="e.g. 800 mm (W) x 2000 mm (H)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Shaft Clear Width & Depth</label>
                    <input
                      type="text"
                      value={formData.shaftDimensions}
                      onChange={(e) => setFormData({ ...formData, shaftDimensions: e.target.value })}
                      placeholder="e.g. 1800 mm (W) x 1900 mm (D)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cabin Dimensions</label>
                    <input
                      type="text"
                      value={formData.cabinDimensions}
                      onChange={(e) => setFormData({ ...formData, cabinDimensions: e.target.value })}
                      placeholder="e.g. 1100 mm (W) x 1400 mm (D) x 2200 mm (H)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pit Depth</label>
                    <input
                      type="text"
                      value={formData.pitDepth}
                      onChange={(e) => setFormData({ ...formData, pitDepth: e.target.value })}
                      placeholder="e.g. 1500 mm"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Overhead Clearance</label>
                    <input
                      type="text"
                      value={formData.overheadClearance}
                      onChange={(e) => setFormData({ ...formData, overheadClearance: e.target.value })}
                      placeholder="e.g. 4500 mm"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Power Supply</label>
                    <input
                      type="text"
                      value={formData.powerSupply}
                      onChange={(e) => setFormData({ ...formData, powerSupply: e.target.value })}
                      placeholder="e.g. 3 Phase 415V, 50Hz"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cabin Interior Finish</label>
                    <input
                      type="text"
                      value={formData.interiorFinish}
                      onChange={(e) => setFormData({ ...formData, interiorFinish: e.target.value })}
                      placeholder="e.g. Hairline Stainless Steel (SS 304) with false ceiling & mirror"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Special Requirements & Safety</label>
                    <input
                      type="text"
                      value={formData.specialRequirements}
                      onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                      placeholder="e.g. ARD, Voice Synthesizer, Fireman Switch, Intercom, Full Curtain Sensor"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Commercial Terms & Delivery */}
              <div>
                <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2 text-emerald-600 border-b pb-1">
                  3. Commercial Terms & Responsibilities
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Expected Budget (INR)</label>
                    <input
                      type="number"
                      value={formData.expectedBudget}
                      onChange={(e) => setFormData({ ...formData, expectedBudget: e.target.value })}
                      placeholder="e.g. 3500000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Civil Work Responsibility</label>
                    <select
                      value={formData.civilWorkResponsibility}
                      onChange={(e) => setFormData({ ...formData, civilWorkResponsibility: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="Client">Client</option>
                      <option value="Elevator Co.">Elevator Co.</option>
                      <option value="Shared">Shared</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Electrical Work Responsibility</label>
                    <select
                      value={formData.electricalWorkResponsibility}
                      onChange={(e) => setFormData({ ...formData, electricalWorkResponsibility: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="Client">Client</option>
                      <option value="Elevator Co.">Elevator Co.</option>
                      <option value="Shared">Shared</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Delivery Timeline</label>
                    <input
                      type="text"
                      value={formData.expectedDeliveryTimeline}
                      onChange={(e) => setFormData({ ...formData, expectedDeliveryTimeline: e.target.value })}
                      placeholder="e.g. 6-8 Weeks"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Enquiry Date</label>
                    <input
                      type="date"
                      value={formData.enquiryDate}
                      onChange={(e) => setFormData({ ...formData, enquiryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Expected Quotation Date</label>
                    <input
                      type="date"
                      value={formData.expectedQuotationDate}
                      onChange={(e) => setFormData({ ...formData, expectedQuotationDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  {editingEnquiry ? 'Save Specification Changes' : 'Create Engineering Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Technical Spec Sheet Modal */}
      {viewingEnquiry && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                    {viewingEnquiry.enquiryNumber}
                  </span>
                  <StatusBadge status={viewingEnquiry.status} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{viewingEnquiry.projectName}</h2>
                <div className="text-xs text-slate-500">Client: {viewingEnquiry.customerName}</div>
              </div>
              <button
                onClick={() => setViewingEnquiry(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Technical Spec Matrix */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-wide text-blue-700 flex items-center gap-1.5">
                  <Compass className="w-4 h-4" /> Technical Parameter Specification
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Elevator Type</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.liftType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Quantity</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.liftQuantity} Units</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Rated Capacity</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.ratedCapacity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Rated Speed</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.ratedSpeed}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Machine Room</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.machineRoom}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Door System</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.doorType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Door Opening</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.doorOpeningDimensions}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Shaft Dimensions</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.shaftDimensions}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Cabin Dimensions</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.cabinDimensions}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pit Depth</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.pitDepth}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Overhead Height</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.overheadClearance}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Power Supply</span>
                    <span className="font-semibold text-slate-900">{viewingEnquiry.powerSupply}</span>
                  </div>
                </div>
              </div>

              {/* Finishes & Features */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Interior Finish</span>
                  <span className="font-medium text-slate-900">{viewingEnquiry.interiorFinish}</span>
                </div>
                {viewingEnquiry.specialRequirements && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Special Safety Features</span>
                    <span className="font-medium text-slate-800">{viewingEnquiry.specialRequirements}</span>
                  </div>
                )}
                {viewingEnquiry.paymentTerms && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Commercial & Payment Terms</span>
                    <span className="font-medium text-slate-800">{viewingEnquiry.paymentTerms}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-3.5 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 text-xs font-semibold"
              >
                <Printer className="w-4 h-4" /> Print Spec Sheet
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const enq = viewingEnquiry;
                    setViewingEnquiry(null);
                    if (onOpenCreateQuotationWithEnquiry) {
                      onOpenCreateQuotationWithEnquiry(enq);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <FileCheck2 className="w-4 h-4" /> Create Quotation from Enquiry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
