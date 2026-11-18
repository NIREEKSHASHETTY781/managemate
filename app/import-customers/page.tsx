"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import LogoutButton from "@/components/LogoutButton";
import { getCustomers, addCustomer } from "@/lib/customerService";

type ExternalUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
};

export default function ImportCustomersPage() {
  const [users, setUsers] = useState<ExternalUser[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchUsers() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/external-users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to fetch records.");
      }

      setUsers(data.users);
      setSelected(data.users.map((user: ExternalUser) => user.id));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleUser(id: number) {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  }

  async function importCustomers() {
    if (selected.length === 0) {
      setMessage("Please select at least one record.");
      return;
    }

    setImporting(true);
    setMessage("");

    try {
      const existingCustomers = await getCustomers();

      const existingEmails = new Set(
        existingCustomers
          .map((customer) => customer.email?.toLowerCase())
          .filter(Boolean)
      );

      let imported = 0;
      let skipped = 0;

      for (const user of users.filter((item) =>
        selected.includes(item.id)
      )) {
        if (existingEmails.has(user.email.toLowerCase())) {
          skipped++;
          continue;
        }

        await addCustomer({
          name: user.name,
          email: user.email,
          phone: user.phone,
        });

        existingEmails.add(user.email.toLowerCase());
        imported++;
      }

      setMessage(
        `Successfully imported ${imported} customers. ${skipped} duplicate records skipped.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Import failed."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Import Customers</h1>
              <p className="mt-2 text-gray-500">
                Extract and import customer records from an external data source.
              </p>
            </div>
            <LogoutButton />
          </div>

          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <h2 className="font-semibold text-blue-900">
              External Data Source: DummyJSON
            </h2>
            <p className="mt-1 text-sm text-blue-800">
              Fetch sample records, select the customers you need, and import
              them into your ManageMate database. These are fictional demo records.
            </p>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              onClick={fetchUsers}
              disabled={loading || importing}
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Fetching..." : "Fetch External Data"}
            </button>

            {users.length > 0 && (
              <>
                <span className="text-sm text-gray-600">
                  {selected.length} of {users.length} selected
                </span>

                <button
                  onClick={() =>
                    setSelected(
                      selected.length === users.length
                        ? []
                        : users.map((user) => user.id)
                    )
                  }
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm hover:bg-gray-100"
                >
                  {selected.length === users.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </>
            )}
          </div>

          {message && (
            <div className="mb-5 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              {message}
            </div>
          )}

          {users.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    Extracted Records
                  </h2>
                  <p className="text-sm text-gray-500">
                    {users.length} records retrieved from the external API
                  </p>
                </div>

                <button
                  onClick={importCustomers}
                  disabled={importing || selected.length === 0}
                  className="rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {importing ? "Importing..." : "Import Selected"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-4">Select</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t hover:bg-gray-50">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selected.includes(user.id)}
                            onChange={() => toggleUser(user.id)}
                            disabled={importing}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="p-4 font-medium">{user.name}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">{user.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {users.length === 0 && !loading && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <h2 className="text-lg font-semibold">
                No external records loaded
              </h2>
              <p className="mt-2 text-gray-500">
                Click Fetch External Data to retrieve records.
              </p>
            </div>
          )}

          <div className="mt-6">
            <a
              href="/customers"
              className="font-medium text-blue-600 hover:underline"
            >
              ← Back to Customers
            </a>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}