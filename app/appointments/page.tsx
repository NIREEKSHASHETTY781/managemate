
"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import LogoutButton from "@/components/LogoutButton";
import {
  getAppointments,
  addAppointment,
  updateAppointmentStatus,
  deleteAppointment,
} from "@/lib/appointmentService";

type Appointment = {
  id: string;
  customer_name: string;
  service: string | null;
  appointment_date: string;
  status: string;
  notes: string | null;
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAppointments() {
    try {
      const data = await getAppointments();
      setAppointments(data as Appointment[]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load appointments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  async function handleAddAppointment(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setMessage("");

    if (!date) {
      setMessage("Please select an appointment date and time.");
      return;
    }

    setSaving(true);

    try {
      await addAppointment({
        customer_name: customerName.trim(),
        service: service.trim(),
        appointment_date: new Date(date).toISOString(),
        notes: notes.trim(),
      });

      setCustomerName("");
      setService("");
      setDate("");
      setNotes("");

      setMessage("Appointment added successfully!");
      await loadAppointments();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to add appointment."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateAppointmentStatus(id, status);
      await loadAppointments();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update appointment."
      );
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this appointment?")) {
      return;
    }

    try {
      await deleteAppointment(id);
      setMessage("Appointment deleted successfully!");
      await loadAppointments();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete appointment."
      );
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-9">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Appointments</h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage and track your business appointments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/")}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Dashboard
            </button>
            <LogoutButton />
          </div>
        </header>

        {message && (
          <p className="mb-5 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
            {message}
          </p>
        )}

        <section className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">Add New Appointment</h2>

          <form onSubmit={handleAddAppointment} className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500"
            />

            <input
              type="text"
              placeholder="Service"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500"
            />

            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500"
            />

            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 md:col-span-2"
            >
              {saving ? "Adding..." : "Add Appointment"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">All Appointments</h2>

          {loading ? (
            <p className="text-slate-500">Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <p className="py-6 text-center text-slate-500">
              No appointments yet. Add your first appointment above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-400">
                    <th className="p-3">Customer</th>
                    <th className="p-3">Service</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="border-b border-slate-100">
                      <td className="p-3 font-semibold">
                        {appointment.customer_name}
                      </td>
                      <td className="p-3">{appointment.service || "—"}</td>
                      <td className="p-3">
                        {new Date(appointment.appointment_date).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <select
                          value={appointment.status}
                          onChange={(e) =>
                            handleStatusChange(appointment.id, e.target.value)
                          }
                          className="rounded-lg border border-slate-200 p-2"
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDelete(appointment.id)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
