// =============================================================
// Doctors.jsx — Clinical Care Team & Neonatal Staff Directory
// Level-III NICU Care Specialists, Shift Allocation, and Bedside Coverage
// Human-crafted modern hospital UI (White & Clinical Blue)
// =============================================================

import { useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Plus,
  Search,
  Phone,
  Mail,
  Bed,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Calendar,
  X,
  Radio,
  Building2,
  Stethoscope,
  Activity,
} from "lucide-react";
import { useApp, DEFAULT_CLINICAL_STAFF } from "../context/AppContext";

export default function Doctors() {
  const {
    staffList,
    beds,
    updateStaffAvailability,
    addStaff,
    assignBedStaff,
    alertLog,
  } = useApp();

  // Active roster with robust fallback to sample clinical staff
  const activeRoster = useMemo(() => {
    if (staffList && Array.isArray(staffList) && staffList.length > 0) {
      return staffList;
    }
    return DEFAULT_CLINICAL_STAFF;
  }, [staffList]);

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
    specialization: "Consultant Neonatologist (DM Neonatology)",
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
  const totalStaffCount = activeRoster.length;
  const doctorsOnDutyCount = activeRoster.filter(
    (s) => s.role === "Doctor" && (s.availability === "On Duty" || s.availability === "On Call")
  ).length;
  const nursesOnDutyCount = activeRoster.filter(
    (s) => s.role === "Nurse" && s.availability === "On Duty"
  ).length;
  const staffUnavailableCount = activeRoster.filter(
    (s) => s.availability === "Off Duty"
  ).length;

  // Filtered staff directory
  const filteredStaff = useMemo(() => {
    return activeRoster.filter((s) => {
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
  }, [activeRoster, searchQuery, roleFilter, shiftFilter, availabilityFilter]);

  const handleCreateStaff = (e) => {
    e.preventDefault();
    if (!newStaffForm.name) return;
    const cleanShort =
      newStaffForm.shortName ||
      newStaffForm.name.split(" ")[0] + " " + (newStaffForm.name.split(" ")[1] || "");

    addStaff({
      ...newStaffForm,
      shortName: cleanShort,
      contact: {
        email: newStaffForm.email || `${cleanShort.toLowerCase().replace(/\s+/g, ".")}@nicucenter.org`,
        phone: newStaffForm.phone || "+91 98401 23456",
        ext: "4199",
      },
      avatar:
        newStaffForm.role === "Doctor"
          ? "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80"
          : "https://images.unsplash.com/photo-1594824813576-96b610c144a1?w=150&auto=format&fit=crop&q=80",
    });
    setIsAddStaffOpen(false);
    setNewStaffForm({
      name: "",
      shortName: "",
      role: "Doctor",
      specialization: "Consultant Neonatologist (DM Neonatology)",
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header & Quick Clinical Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Stethoscope size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Clinical Care Team &amp; Staff Rostering
                </h1>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Level-III NICU Care
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Attending Neonatologists · Pediatric Intensivists · Bedside Charge Nurses · Shift Allocation
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <Bed size={15} className="text-blue-600 dark:text-blue-400" />
            <span>Station Allocation</span>
          </button>
          <button
            onClick={() => setIsAddStaffOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Clinician</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Counters ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Staff */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <Users size={22} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Roster
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-tight">
              {totalStaffCount}
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              Registered clinicians
            </div>
          </div>
        </div>

        {/* Doctors on Duty */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Doctors on Duty / Call
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-tight">
              {doctorsOnDutyCount}
            </div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              Attending Neonatologists
            </div>
          </div>
        </div>

        {/* Nurses on Duty */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Nurses on Station
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-tight">
              {nursesOnDutyCount}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Active bedside care
            </div>
          </div>
        </div>

        {/* Staff Off Duty / Standby */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
            <UserX size={22} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Off Duty / Standby
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-tight">
              {staffUnavailableCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Next rotation standby
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clinician, specialization, or ID..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="Doctor">Attending Doctors</option>
            <option value="Nurse">Care Nurses</option>
          </select>

          {/* Shift Filter */}
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="ALL">All Shifts</option>
            <option value="Morning">Morning Shift (07:00 - 15:00)</option>
            <option value="Evening">Evening Shift (15:00 - 23:00)</option>
            <option value="Night">Night Shift (23:00 - 07:00)</option>
          </select>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
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
              className="px-3 py-2 rounded-xl text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Clinicians Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {filteredStaff.map((staff) => (
          <div
            key={staff.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400/50 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Card Header: Avatar, Name, Role Tag, Duty Status */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={staff.avatar}
                    alt={staff.name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
                        {staff.id}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span
                        className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md font-mono ${
                          staff.role === "Doctor"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        }`}
                      >
                        {staff.role}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
                      {staff.name}
                    </h3>
                  </div>
                </div>

                {/* Duty Toggle Dropdown */}
                <select
                  value={staff.availability}
                  onChange={(e) => updateStaffAvailability(staff.id, e.target.value)}
                  className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-lg border cursor-pointer font-mono outline-none transition-colors ${
                    staff.availability === "On Duty"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                      : staff.availability === "On Call"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <option value="On Duty">On Duty</option>
                  <option value="On Call">On Call</option>
                  <option value="Off Duty">Off Duty</option>
                </select>
              </div>

              {/* Specialization & Shift Info */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-2.5 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <div className="text-[11.5px] font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                  {staff.specialization}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <Clock size={12} className="text-blue-600 dark:text-blue-400" />
                  <span>{staff.shift}</span>
                </div>
                {staff.supervisingDoctor && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Lead: <strong className="text-slate-700 dark:text-slate-300">{staff.supervisingDoctor}</strong>
                  </div>
                )}
              </div>

              {/* Bedside Coverage Assignment */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Assigned Beds ({staff.assignedBeds?.length || 0}):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {staff.assignedBeds && staff.assignedBeds.length > 0 ? (
                    staff.assignedBeds.map((bedId) => (
                      <span
                        key={bedId}
                        className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      >
                        {bedId}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No current beds assigned</span>
                  )}
                </div>
              </div>

              {/* Clinical Response Statistics */}
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Events Handled</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {staff.totalAlertsHandled || 0} alerts
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Response Time</div>
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    {staff.medianResponseTime || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer: Quick Contact Links & Profile Modal */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center gap-3 text-slate-500">
                <a
                  href={`tel:${staff.contact?.phone}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
                  title={`Call ${staff.contact?.phone}`}
                >
                  <Phone size={14} />
                </a>
                <a
                  href={`mailto:${staff.contact?.email}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
                  title={`Email ${staff.contact?.email}`}
                >
                  <Mail size={14} />
                </a>
                <span className="font-mono text-[10.5px] text-slate-400">Ext: {staff.contact?.ext || "4100"}</span>
              </div>

              <button
                onClick={() => setSelectedStaff(staff)}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Profile</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal: Add Doctor or Nurse ── */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
                  <Stethoscope size={18} />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Register NICU Clinician
                </h3>
              </div>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name &amp; Clinical Title:
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Clinical Role:
                  </label>
                  <select
                    value={newStaffForm.role}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, role: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Doctor">Doctor (Attending Neonatologist)</option>
                    <option value="Nurse">Nurse (NICU Specialist)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duty Shift:
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Morning">Morning (07:00 - 15:00)</option>
                    <option value="Evening">Evening (15:00 - 23:00)</option>
                    <option value="Night">Night (23:00 - 07:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Specialization &amp; Credentials:
                </label>
                <select
                  value={newStaffForm.specialization}
                  onChange={(e) =>
                    setNewStaffForm({ ...newStaffForm, specialization: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none text-xs"
                >
                  <optgroup label="Neonatal &amp; Perinatal Medicine">
                    <option value="Lead Neonatologist (MD, DNB Neonatology)">Lead Neonatologist (MD, DNB Neonatology)</option>
                    <option value="Consultant Neonatologist (DM Neonatology)">Consultant Neonatologist (DM Neonatology)</option>
                    <option value="Senior Pediatric Intensivist (MD, FAAP)">Senior Pediatric Intensivist (MD, FAAP)</option>
                    <option value="Attending Neonatologist (MD Pediatrics)">Attending Neonatologist (MD Pediatrics)</option>
                    <option value="Fellow in Neonatal Resuscitation &amp; ECMO">Fellow in Neonatal Resuscitation &amp; ECMO</option>
                  </optgroup>
                  <optgroup label="Neonatal Nursing Specializations">
                    <option value="Senior NICU Care Specialist (BSc Nursing, NALS)">Senior NICU Care Specialist (BSc Nursing, NALS)</option>
                    <option value="Neonatal Resuscitation &amp; Critical Care Nurse">Neonatal Resuscitation &amp; Critical Care Nurse</option>
                    <option value="Staff Nurse - Incubator Care &amp; Phototherapy">Staff Nurse - Incubator Care &amp; Phototherapy</option>
                    <option value="Critical Care Staff Nurse (MSc Nursing)">Critical Care Staff Nurse (MSc Nursing)</option>
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Email:
                  </label>
                  <input
                    type="email"
                    placeholder="doctor@hospital.org"
                    value={newStaffForm.email}
                    onChange={(e) =>
                      setNewStaffForm({ ...newStaffForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Register Clinician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Assign Beds & Shifts ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
                  <Bed size={18} />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Bed &amp; Shift Assignment
                </h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Bed Station:
                </label>
                <select
                  value={assignBedId}
                  onChange={(e) => setAssignBedId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-semibold"
                >
                  {(beds || []).map((b) => (
                    <option key={b.bedId} value={b.bedId}>
                      {b.bedId} — {b.babyName ? b.babyName : "Standby / Available"} {b.patientId ? `(${b.patientId})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Attending Doctor:
                </label>
                <select
                  value={assignDoctorId}
                  onChange={(e) => setAssignDoctorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {activeRoster
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
                  Select Bedside Care Nurses:
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  {activeRoster
                    .filter((s) => s.role === "Nurse")
                    .map((nurse) => (
                      <label
                        key={nurse.id}
                        className="flex items-center gap-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="rounded text-blue-600 focus:ring-blue-500"
                          checked={assignNurseIds.includes(nurse.id)}
                          onChange={() => {
                            setAssignNurseIds(
                              assignNurseIds.includes(nurse.id)
                                ? assignNurseIds.filter((id) => id !== nurse.id)
                                : [...assignNurseIds, nurse.id]
                            );
                          }}
                        />
                        <span className="text-slate-800 dark:text-slate-200">
                          {nurse.name} <span className="text-slate-400 font-mono text-[10.5px]">({nurse.shiftType})</span>
                        </span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300">
                Staff changes automatically update clinical telemetry alarm routing and duty records.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBedAssignment}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Confirm Station Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Clinician Profile & Alert History Drawer ── */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={selectedStaff.avatar}
                  alt={selectedStaff.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/40"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {selectedStaff.id}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {selectedStaff.role}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedStaff.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-slate-400 text-[10.5px] uppercase font-bold">Specialization</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {selectedStaff.specialization}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10.5px] uppercase font-bold">Duty Shift</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">
                    {selectedStaff.shift}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10.5px] uppercase font-bold">Direct Phone</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">
                    {selectedStaff.contact?.phone} (Ext {selectedStaff.contact?.ext})
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10.5px] uppercase font-bold">Official Email</div>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {selectedStaff.contact?.email}
                  </div>
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assigned Bed Stations:
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedStaff.assignedBeds && selectedStaff.assignedBeds.length > 0 ? (
                    selectedStaff.assignedBeds.map((bId) => {
                      const bedObj = (beds || []).find((b) => b.bedId === bId);
                      return (
                        <div
                          key={bId}
                          className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 flex items-center gap-2"
                        >
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{bId}</span>
                          <span className="text-slate-600 dark:text-slate-300">{bedObj?.babyName || "Station Active"}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">No current beds assigned</span>
                  )}
                </div>
              </div>

              {/* Alert history for this staff member */}
              <div>
                <div className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Recent Telemetry Event Response:
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(alertLog || [])
                    .filter((a) =>
                      a.assignedStaff?.includes(selectedStaff.shortName) ||
                      a.assignedStaff?.includes(selectedStaff.name)
                    )
                    .map((a) => (
                      <div
                        key={a.alertId || a._id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px]"
                      >
                        <div className="flex items-center justify-between font-mono font-semibold">
                          <span>{a.alertId} — {a.alertType}</span>
                          <span className={a.status === "Resolved" ? "text-emerald-600" : "text-amber-500"}>
                            {a.status}
                          </span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          Detected: {a.detectedAt} · Ack: {a.acknowledgedAt || "Pending"}
                        </div>
                      </div>
                    ))}
                  {(alertLog || []).filter((a) =>
                    a.assignedStaff?.includes(selectedStaff.shortName) ||
                    a.assignedStaff?.includes(selectedStaff.name)
                  ).length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                      Zero unhandled critical events. Clinician is active on station.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors cursor-pointer"
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
