
"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import LogoutButton from "@/components/LogoutButton";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

type Requirement = {
  job_role: string;
  workers_required: number;
  skills: string;
  location: string;
  required_date: string;
  start_time: string;
  duration_hours: number | null;
  payment_per_worker: number | null;
  description: string;
};

type PreviewRow = {
  data: Requirement;
  errors: string[];
};

function formatDate(value: unknown): string {
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
      parsed.d
    ).padStart(2, "0")}`;
  }

  const text = String(value ?? "").trim();
  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    return `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
  }

  return "";
}

function formatTime(value: unknown): string {
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:00`;
  }

  const text = String(value ?? "").trim();
  if (!text) return "";

  const match = text.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return "";

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (minutes > 59 || hours > 23) return "";

  if (period) {
    if (hours < 1 || hours > 12) return "";
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:00`;
}

function Home() {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const validRows = preview.filter((row) => row.errors.length === 0);
  const invalidRows = preview.filter((row) => row.errors.length > 0);

  function downloadTemplate() {
    const data = [
      {
        job_role: "Mason",
        workers_required: 3,
        skills: "Brickwork, plastering",
        location: "Bangalore",
        required_date: "2026-11-25",
        start_time: "08:00",
        duration_hours: 8,
        payment_per_worker: 800,
        description: "Workers required for construction site",
      },
      {
        job_role: "Electrician",
        workers_required: 2,
        skills: "Wiring, installation",
        location: "Bangalore",
        required_date: "2026-11-26",
        start_time: "09:00",
        duration_hours: 6,
        payment_per_worker: 1000,
        description: "Electrical installation work",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Requirements");
    XLSX.writeFile(workbook, "ManageMate_Bulk_Template.xlsx");
  }

  async function handleFileUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setPreview([]);
    setFileName(file.name);
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!worksheet) {
        throw new Error("The uploaded file is empty.");
      }

      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        { defval: "" }
      );

      if (records.length === 0) {
        throw new Error("No records found in the uploaded file.");
      }

      const rows: PreviewRow[] = records.map((record) => {
        const normalized: Record<string, unknown> = {};

        Object.entries(record).forEach(([key, value]) => {
          normalized[key.trim().toLowerCase().replace(/\s+/g, "_")] = value;
        });

        const data: Requirement = {
          job_role: String(normalized.job_role ?? "").trim(),
          workers_required: Number(normalized.workers_required),
          skills: String(normalized.skills ?? "").trim(),
          location: String(normalized.location ?? "").trim(),
          required_date: formatDate(normalized.required_date),
          start_time: formatTime(normalized.start_time),
          duration_hours:
            normalized.duration_hours === ""
              ? null
              : Number(normalized.duration_hours),
          payment_per_worker:
            normalized.payment_per_worker === ""
              ? null
              : Number(normalized.payment_per_worker),
          description: String(normalized.description ?? "").trim(),
        };

        const errors: string[] = [];

        if (!data.job_role) errors.push("Job role is missing");

        if (
          !Number.isInteger(data.workers_required) ||
          data.workers_required <= 0
        ) {
          errors.push("Worker count must be a positive whole number");
        }

        if (!data.location) errors.push("Location is missing");

        if (!data.required_date) {
          errors.push("Date must use YYYY-MM-DD format");
        } else {
          const parsed = new Date(
            `${data.required_date}T00:00:00`
          );

          if (
            Number.isNaN(parsed.getTime()) ||
            parsed.toISOString().slice(0, 10) !== data.required_date
          ) {
            errors.push("Invalid date");
          }
        }

        if (!data.start_time) errors.push("Time is missing");

        if (
          data.duration_hours !== null &&
          (!Number.isFinite(data.duration_hours) ||
            data.duration_hours <= 0)
        ) {
          errors.push("Duration must be a positive number");
        }

        if (
          data.payment_per_worker !== null &&
          (!Number.isFinite(data.payment_per_worker) ||
            data.payment_per_worker < 0)
        ) {
          errors.push("Payment cannot be negative");
        }

        return { data, errors };
      });

      setPreview(rows);
      setMessage(`Successfully read ${rows.length} records.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to read the uploaded file."
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  async function importRequirements() {
    if (validRows.length === 0) {
      setMessage("There are no valid records to import.");
      return;
    }

    setImporting(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again before importing.");
      }

      const records = validRows.map((row) => ({
        ...row.data,
        user_id: user.id,
        status: "Open",
      }));

      const { error } = await supabase
        .from("worker_requirements")
        .insert(records);

      if (error) throw error;

      setMessage(
        `Success! ${records.length} requirements imported into ManageMate.`
      );

      setPreview([]);
      setFileName("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to import requirements."
      );
    } finally {
      setImporting(false);
    }
  }

  function exportRequirements() {
    if (preview.length === 0) {
      setMessage("Upload a file first to export its records.");
      return;
    }

    const data = preview.map((row) => ({
      ...row.data,
      validation: row.errors.length ? row.errors.join(", ") : "Valid",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Requirements");
    XLSX.writeFile(workbook, "ManageMate_Requirements.xlsx");
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50 p-6 text-gray-900">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Bulk Workforce Requirements
              </h1>
              <p className="mt-2 text-gray-600">
                Upload and manage multiple worker requirements at once.
              </p>
            </div>

            <LogoutButton />
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Records</p>
              <h2 className="mt-2 text-3xl font-bold">{preview.length}</h2>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Valid Records</p>
              <h2 className="mt-2 text-3xl font-bold text-green-600">
                {validRows.length}
              </h2>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Invalid Records</p>
              <h2 className="mt-2 text-3xl font-bold text-red-600">
                {invalidRows.length}
              </h2>
            </div>
          </div>

          <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold">
              Upload Requirements
            </h2>

            <p className="mb-5 text-sm text-gray-500">
              Download the template, enter multiple job requirements, and
              upload your completed Excel or CSV file.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadTemplate}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
              >
                Download Excel Template
              </button>

              <label className="cursor-pointer rounded-lg bg-gray-800 px-5 py-3 font-medium text-white hover:bg-gray-700">
                {loading ? "Reading file..." : "Upload Excel / CSV"}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </label>

              <button
                onClick={exportRequirements}
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium hover:bg-gray-100"
              >
                Export Preview
              </button>
            </div>

            {fileName && (
              <p className="mt-4 text-sm text-gray-600">
                Selected file: {fileName}
              </p>
            )}

            {message && (
              <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                {message}
              </p>
            )}
          </div>

          {preview.length > 0 && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    Uploaded Data Preview
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review the records before importing them.
                  </p>
                </div>

                <button
                  onClick={importRequirements}
                  disabled={validRows.length === 0 || importing}
                  className="rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {importing
                    ? "Importing..."
                    : `Import ${validRows.length} Valid Records`}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="p-3">Job Role</th>
                      <th className="p-3">Workers</th>
                      <th className="p-3">Skills</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Validation</th>
                    </tr>
                  </thead>

                  <tbody>
                    {preview.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b align-top hover:bg-gray-50"
                      >
                        <td className="p-3">{row.data.job_role || "-"}</td>
                        <td className="p-3">
                          {row.data.workers_required || "-"}
                        </td>
                        <td className="p-3">{row.data.skills || "-"}</td>
                        <td className="p-3">{row.data.location || "-"}</td>
                        <td className="p-3">
                          {row.data.required_date || "-"}
                        </td>
                        <td className="p-3">{row.data.start_time || "-"}</td>
                        <td className="p-3">
                          {row.data.payment_per_worker ?? "-"}
                        </td>
                        <td className="p-3">
                          {row.errors.length === 0 ? (
                            <span className="font-medium text-green-600">
                              Valid
                            </span>
                          ) : (
                            <span className="text-red-600">
                              {row.errors.join(", ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Only valid records will be imported. Invalid records will be
                skipped.
              </p>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}

export default Home;
