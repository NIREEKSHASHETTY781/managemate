
"use client";

import AuthGuard from "@/components/AuthGuard";
import LogoutButton from "@/components/LogoutButton";
import { useEffect, useState } from "react";
import {
  getCustomers,
  addCustomer,
  deleteCustomer,
} from "@/lib/customerService";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Loading customers...");
  const [loading, setLoading] = useState(false);

  async function loadCustomers() {
    try {
      const data = await getCustomers();
      setCustomers(data as Customer[]);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load customers."
      );
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleAddCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await addCustomer({ name, email, phone });
      setName("");
      setEmail("");
      setPhone("");
      await loadCustomers();
      setMessage("Customer added successfully!");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not add customer."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCustomer(id: string) {
    try {
      await deleteCustomer(id);
      await loadCustomers();
      setMessage("Customer deleted successfully!");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete customer."
      );
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-100 p-6 text-slate-800">
        <div className="mx-auto mb-8 flex max-w-4xl items-center justify-between">
          <button
            onClick={() => (window.location.href = "/")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Dashboard
          </button>
          <LogoutButton />
        </div>

        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">
            ManageMate Customers
          </h1>
          <p className="mb-8 text-slate-600">
            Add and manage your business customers.
          </p>

          <form
            onSubmit={handleAddCustomer}
            className="mb-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-slate-900">
              Add New Customer
            </h2>

            <input
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500"
              placeholder="Customer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Add Customer"}
            </button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Your Customers ({customers.length})
            </h2>

            {message && (
              <p className="mb-4 text-sm font-medium text-indigo-700">
                {message}
              </p>
            )}

            {customers.length === 0 && !message && (
              <p className="py-5 text-slate-500">
                No customers added yet.
              </p>
            )}

            {customers.map((customer) => (
              <div
                key={customer.id}
                className="mb-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {customer.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    {customer.email || "No email"}
                  </p>
                  <p className="text-sm text-slate-600">
                    {customer.phone || "No phone number"}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteCustomer(customer.id)}
                  className="rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            ))}
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}
