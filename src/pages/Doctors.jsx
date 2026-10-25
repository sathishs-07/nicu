// =============================================================
// Doctors.jsx — Staff Directory & Care Team Management
// Manages Neonatologists, Pediatric Intensivists, and NICU Nurses.
// Includes Bed Assignments, Duty Availability, and Alert Response Tracking.
// =============================================================

import { useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Bed,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Edit2,
  Calendar,
} from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Doctors() {
  const {
    staffList,
    beds,
    updateStaffAvailability,
    addStaff,
    assignBedStaff,
    alertLog,
  } = useApp();

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL"); // ALL | Doctor | Nurse
  const [shiftFilter, setShiftFilter] = useState("ALL"); // ALL | Morning | Evening | Night
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL"); // ALL | On Duty | Off Duty | On Call

  // Modals state
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // New Staff form state
  const [newStaffForm, setNewStaffForm] = useState({
    name: "",
    shortName: "",
    role: "Doctor",
    specialization: "Neonatologist",
    shift: "Morning (07:00 - 15:00)",
    shiftType: "Morning",
    email: "",
    phone: "",
    availability: "On Duty",
    assignedBeds: ["NICU-01"],
  });

  // Bed assignment form state
  const [assignBedId, setAssignBedId] = useState("NICU-01");
  const [assignDoctorId, setAssignDoctorId] = useState("DOC-01");
  const [assignNurseIds, setAssignNurseIds] = useState(["NUR-01"]);

  // Calculate top KPI statistics
  const totalStaffCount = staffList.length;
  const doctorsOnDutyCount = staffList.filter(
    (s) => s.role === "Doctor" && s.availability === "On Duty"
  ).length;
  const nursesOnDutyCount = staffList.filter(
    (s) => s.role === "Nurse" && s.availability === "On Duty"
  ).length;
  const staffUnavailableCount = staffList.filter(
    (s) => s.availability === "Off Duty"
  ).length;

  // Filtered staff directory
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === "ALL" || s.role === roleFilter;
      const matchShift = shiftFilter === "ALL" || s.shiftType === shiftFilter;
      const matchAvail =
        availabilityFilter === "ALL" || s.availability === availabilityFilter;
      return matchSearch && matchRole && matchShift && matchAvail;
    });
  }, [staffList, searchQuery, roleFilter, shiftFilter, availabilityFilter]);

  const handleCreateStaff = (e) => {
    e.preventDefault();
    if (!newStaffForm.name) return;
    addStaff({
      ...newStaffForm,
      contact: {
        email: newStaffForm.email || `${newStaffForm.shortName.toLowerCase()}@nicucenter.org`,
        phone: newStaffForm.phone || "+91 98401 99999",
        ext: "4199",
      },
    });
    setIsAddStaffOpen(false);
    setNewStaffForm({
      name: "",
      shortName: "",
      role: "Doctor",
      specialization: "Neonatologist",
      shift: "Morning (07:00 - 15:00)",
      shiftType: "Morning",
      email: "",
      phone: "",
      availability: "On Duty",
      assignedBeds: ["NICU-01"],
    });
  };

  const handleSaveBedAssignment = () => {
    assignBedStaff(assignBedId, assignDoctorId, assignNurseIds);
    setIsAssignModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Top Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Doctors &amp; Staff Management
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-500/30">
              CARE TEAM
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Neonatal clinical directory, duty shifts, bedside patient assignments, and response analytics
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bed size={14} />
            <span>Assign Beds &amp; Shifts</span>
          </button>
          <button
            onClick={() => setIsAddStaffOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add Doctor / Nurse</span>
          </button>
        </div>
      </div>

      {/* ── 4.1 Four Compact Staff Directory Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Staff */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
            <Users size={22} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Staff
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {totalStaffCount}
            </div>
            <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
              Registered clinicians
            </div>
          </div>
        </div>

        {/* Doctors on Duty */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Doctors on Duty
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {doctorsOnDutyCount}
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              Neonatologists active
            </div>
          </div>
        </div>

        {/* Nurses on Duty */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Nurses on Duty
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {nursesOnDutyCount}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Bedside monitoring active
            </div>
          </div>
        </div>

        {/* Staff Unavailable */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
            <UserX size={22} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Off Duty / Standby
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {staffUnavailableCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Next shift rotation
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="clinical-card p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, or specialization..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-1 focus:ring-teal-500 outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="Doctor">Doctors Only</option>
            <option value="Nurse">Nurses Only</option>
          </select>

          {/* Shift Filter */}
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-1 focus:ring-teal-500 outline-none"
          >
            <option value="ALL">All Shifts</option>
            <option value="Morning">Morning Shift</option>
            <option value="Evening">Evening Shift</option>
            <option value="Night">Night Shift</option>
          </select>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-1 focus:ring-teal-500 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="On Duty">On Duty</option>
            <option value="On Call">On Call</option>
            <option value="Off Duty">Off Duty</option>
          </select>

          {(searchQuery || roleFilter !== "ALL" || shiftFilter !== "ALL" || availabilityFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("ALL");
                setShiftFilter("ALL");
                setAvailabilityFilter("ALL");
              }}
              className="px-2.5 py-1.5 rounded-xl text-teal-600 dark:text-teal-400 font-semibold hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── 4.2 Staff Directory Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredStaff.map((staff) => (
          <div
            key={staff.id}
            className="clinical-card p-5 flex flex-col justify-between hover:border-teal-500/40 transition-all duration-200"
          >
            <div>
              {/* Card Top: Avatar, Name, Role, Availability Badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={staff.avatar}
                    alt={staff.name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        {staff.id}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded font-mono ${
                          staff.role === "Doctor"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-500/20"
                            : "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-500/20"
                        }`}
                      >
                        {staff.role}
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-snug">
                      {staff.name}
                    </h2>
                  </div>
                </div>

                {/* Duty Toggle Button */}
                <select
                  value={staff.availability}
                  onChange={(e) => updateStaffAvailability(staff.id, e.target.value)}
                  className={`text-[10.5px] font-semibold px-2 py-1 rounded-full border cursor-pointer font-mono outline-none ${
                    staff.availability === "On Duty"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-500/30"
                      : staff.availability === "On Call"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-500/30"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300"
                  }`}
                >
                  <option value="On Duty">On Duty</option>
                  <option value="On Call">On Call</option>
                  <option value="Off Duty">Off Duty</option>
                </select>
              </div>

              {/* Specialization & Shift */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-2">
                <div className="text-[11.5px] font-medium text-slate-700 dark:text-slate-200">
                  {staff.specialization}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <Clock size={12} className="text-teal-600" />
                  <span>{staff.shift}</span>
                </div>
                {staff.supervisingDoctor && (
                  <div className="text-[11px] text-slate-400">
                    Supervised by: <strong className="text-slate-600 dark:text-slate-300">{staff.supervisingDoctor}</strong>
                  </div>
                )}
              </div>

              {/* Assigned Beds Chips */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Assigned Beds ({staff.assignedBeds?.length || 0}):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {staff.assignedBeds && staff.assignedBeds.length > 0 ? (
                    staff.assignedBeds.map((bedId) => (
                      <span
                        key={bedId}
                        className="px-2 py-0.5 rounded-md font-mono text-[10.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {bedId}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No current beds assigned</span>
                  )}
                </div>
              </div>

              {/* Response Metrics */}
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">Handled Alerts</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {staff.totalAlertsHandled} events
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Median Response</div>
                  <div className="font-bold text-teal-600 dark:text-teal-400">
                    {staff.medianResponseTime}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer: Contact & Details Drawer Trigger */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center gap-3 text-slate-400">
                <a
                  href={`tel:${staff.contact?.phone}`}
                  className="hover:text-teal-600 transition-colors p-1"
                  title={`Call ${staff.contact?.phone}`}
                >
                  <Phone size={14} />
                </a>
                <a
                  href={`mailto:${staff.contact?.email}`}
                  className="hover:text-teal-600 transition-colors p-1"
                  title={`Email ${staff.contact?.email}`}
                >
                  <Mail size={14} />
                </a>
                <span className="font-mono text-[10px]">Ext: {staff.contact?.ext}</span>
              </div>

              <button
                onClick={() => setSelectedStaff(staff)}
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span>View Profile</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal: Add Doctor or Nurse ── */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="clinical-card p-6 max-w-lg w-full shadow-2xl border border-slate-300 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                Add Doctor or Nurse to NICU Directory
              </h3>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name &amp; Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Kavita Ramanathan or Nurse Sunita Rao"
                  value={newStaffForm.name}
                  onChange={(e) =>
                    setNewStaffForm({
                      ...newStaffForm,
                      name: e.target.value,
                      shortName: e.target.value.split(" ")[0] + " " + (e.target.value.split(" ")[1] || ""),
                    })
                  }
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role:
                  </label>
                  <select
                    value={newStaffForm.role}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, role: e.target.value })
                    }
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                  >
                    <option value="Doctor">Doctor (Neonatologist)</option>
                    <option value="Nurse">Nurse (NICU Specialist)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shift:
                  </label>
                  <select
                    value={newStaffForm.shiftType}
                    onChange={(e) => {
                      const s = e.target.value;
                      const label =
                        s === "Morning"
                          ? "Morning (07:00 - 15:00)"
                          : s === "Evening"
                          ? "Evening (15:00 - 23:00)"
                          : "Night (23:00 - 07:00)";
                      setNewStaffForm({
                        ...newStaffForm,
                        shiftType: s,
                        shift: label,
                      });
                    }}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                  >
                    <option value="Morning">Morning (07:00 - 15:00)</option>
                    <option value="Evening">Evening (15:00 - 23:00)</option>
                    <option value="Night">Night (23:00 - 07:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pediatric / Neonatal Specialization:
                </label>
                <select
                  value={newStaffForm.specialization}
                  onChange={(e) =>
                    setNewStaffForm({ ...newStaffForm, specialization: e.target.value })
                  }
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none text-xs"
                >
                  <optgroup label="Neonatal & Perinatal Medicine">
                    <option value="Consultant Neonatologist (DM Neonatology)">Consultant Neonatologist (DM Neonatology)</option>
                    <option value="Associate Neonatologist">Associate Neonatologist</option>
                    <option value="Neonatal-Perinatal Medicine Specialist">Neonatal-Perinatal Medicine Specialist</option>
                    <option value="Fellow in Neonatal Resuscitation & ECMO">Fellow in Neonatal Resuscitation & ECMO</option>
                    <option value="Neonatal Neuro-Intensivist">Neonatal Neuro-Intensivist</option>
                  </optgroup>
                  <optgroup label="Pediatric Critical Care & Surgery">
                    <option value="Senior Pediatric Intensivist (PICU/NICU)">Senior Pediatric Intensivist (PICU/NICU)</option>
                    <option value="Pediatric Cardiologist & Neonatal Hemodynamics">Pediatric Cardiologist & Neonatal Hemodynamics</option>
                    <option value="Pediatric Pulmonologist (Neonatal Airway)">Pediatric Pulmonologist (Neonatal Airway)</option>
                    <option value="Pediatric Surgeon (Neonatal Emergencies)">Pediatric Surgeon (Neonatal Emergencies)</option>
                    <option value="Staff Pediatrician (Inpatient Care)">Staff Pediatrician (Inpatient Care)</option>
                    <option value="NICU Medical Officer (Pediatrics Resident)">NICU Medical Officer (Pediatrics Resident)</option>
                  </optgroup>
                  <optgroup label="Neonatal Nursing Specializations">
                    <option value="Lead Neonatal Intensive Care Nurse (RN-NICU)">Lead Neonatal Intensive Care Nurse (RN-NICU)</option>
                    <option value="Clinical Nurse Specialist - Neonatology">Clinical Nurse Specialist - Neonatology</option>
                    <option value="Staff Nurse - Incubator Station Care">Staff Nurse - Incubator Station Care</option>
                    <option value="Pediatric Transport & Resuscitation Nurse">Pediatric Transport & Resuscitation Nurse</option>
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address:
                  </label>
                  <input
                    type="email"
                    placeholder="doctor@hospital.org"
                    value={newStaffForm.email}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, email: e.target.value })
                    }
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Extension:
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98401 23456"
                    value={newStaffForm.phone}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, phone: e.target.value })
                    }
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs"
                >
                  Save Clinician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Assign Beds & Shifts ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="clinical-card p-6 max-w-md w-full shadow-2xl border border-slate-300 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                Bed &amp; Shift Assignment
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select NICU Bed Station:
                </label>
                <select
                  value={assignBedId}
                  onChange={(e) => setAssignBedId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none font-mono font-semibold"
                >
                  {beds.map((b) => (
                    <option key={b.bedId} value={b.bedId}>
                      {b.bedId} — {b.babyName} ({b.patientId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Lead Doctor:
                </label>
                <select
                  value={assignDoctorId}
                  onChange={(e) => setAssignDoctorId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                >
                  {staffList
                    .filter((s) => s.role === "Doctor")
                    .map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.specialization}) — {doc.availability}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Care Nurses:
                </label>
                <div className="space-y-1 max-h-36 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  {staffList
                    .filter((s) => s.role === "Nurse")
                    .map((nurse) => (
                      <label
                        key={nurse.id}
                        className="flex items-center gap-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={assignNurseIds.includes(nurse.id)}
                          onChange={(e) => {
                            if (e.target.value) {
                              setAssignNurseIds(
                                assignNurseIds.includes(nurse.id)
                                  ? assignNurseIds.filter((id) => id !== nurse.id)
                                  : [...assignNurseIds, nurse.id]
                              );
                            }
                          }}
                        />
                        <span>
                          {nurse.name} ({nurse.shiftType})
                        </span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-500/20 text-[11px] text-teal-800 dark:text-teal-300">
                Staff changes automatically update alert routing and access permissions for this baby.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBedAssignment}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs"
                >
                  Update Bed Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Staff Profile & Alert History Drawer ── */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="clinical-card p-6 max-w-lg w-full shadow-2xl border border-slate-300 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={selectedStaff.avatar}
                  alt={selectedStaff.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-teal-500/40"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {selectedStaff.id}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                      {selectedStaff.role}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedStaff.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-slate-400 text-[11px]">Specialization</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedStaff.specialization}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Duty Shift</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {selectedStaff.shift}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Direct Phone</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {selectedStaff.contact?.phone} (Ext {selectedStaff.contact?.ext})
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Official Email</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedStaff.contact?.email}
                  </div>
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Beds:
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedStaff.assignedBeds?.map((bId) => {
                    const bedObj = beds.find((b) => b.bedId === bId);
                    return (
                      <div
                        key={bId}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center gap-2"
                      >
                        <span className="font-mono font-bold text-teal-600">{bId}</span>
                        <span className="text-slate-500">{bedObj?.babyName || "Patient"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Alert history for this staff member */}
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Alert Response History:
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {alertLog
                    .filter((a) => a.assignedStaff.includes(selectedStaff.shortName) || a.assignedStaff.includes(selectedStaff.name))
                    .map((a) => (
                      <div
                        key={a.alertId}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-[11px]"
                      >
                        <div className="flex items-center justify-between font-mono font-semibold">
                          <span>{a.alertId} — {a.alertType}</span>
                          <span className={a.status === "Resolved" ? "text-teal-600" : "text-amber-500"}>
                            {a.status}
                          </span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          Detected: {a.detectedAt} · Ack: {a.acknowledgedAt || "Pending"}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 text-white font-medium text-xs"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
