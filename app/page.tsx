
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import LogoutButton from "@/components/LogoutButton";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  email: string | null;
};

type Plan = {
  name: string;
  price: string;
};

type MonthlyStat = {
  month: string;
  customers: number;
  appointments: number;
};

type AppointmentStatus = {
  name: string;
  count: number;
};

function getLastSixMonths(now: Date): MonthlyStat[] {
  const months: MonthlyStat[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

    months.push({
      month: date.toLocaleString("en-IN", { month: "short" }),
      customers: 0,
      appointments: 0,
    });
  }

  return months;
}

function getMonthIndex(
  value: string | null | undefined,
  now: Date
): number {
  if (!value) return -1;

  const date = new Date(
    value.length === 10 ? `${value}T12:00:00` : value
  );

  if (Number.isNaN(date.getTime())) return -1;

  const difference =
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth());

  if (difference < 0 || difference > 5) return -1;

  return 5 - difference;
}

export default function Home() {
  const router = useRouter();

  const [active, setActive] = useState("Overview");
  const [customerCount, setCustomerCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [appointmentStatuses, setAppointmentStatuses] = useState<
    AppointmentStatus[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [businessName, setBusinessName] = useState("My Business");
  const [ownerName, setOwnerName] = useState("Admin User");
  const [businessEmail, setBusinessEmail] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  const menu = [
    "Overview",
    "Customers",
    "Import Customers",
    "Appointments",
    "Reports",
    "Subscription",
    "Settings",
  ];

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          throw new Error("Please log in to view your dashboard.");
        }

        const userId = sessionData.session.user.id;

        setBusinessEmail(sessionData.session.user.email || "");

        const [
          customerResult,
          appointmentResult,
          pendingResult,
          completedResult,
          recentResult,
          customerHistoryResult,
          appointmentHistoryResult,
        ] = await Promise.all([
          supabase
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),

          supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),

          supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "Scheduled"),

          supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "Completed"),

          supabase
            .from("customers")
            .select("id, name, email")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("customers")
            .select("created_at")
            .eq("user_id", userId),

          supabase
            .from("appointments")
            .select("status, appointment_date")
            .eq("user_id", userId),
        ]);

        if (customerResult.error) throw customerResult.error;
        if (appointmentResult.error) throw appointmentResult.error;
        if (pendingResult.error) throw pendingResult.error;
        if (completedResult.error) throw completedResult.error;
        if (recentResult.error) throw recentResult.error;
        if (customerHistoryResult.error) throw customerHistoryResult.error;
        if (appointmentHistoryResult.error) {
          throw appointmentHistoryResult.error;
        }

        setCustomerCount(customerResult.count ?? 0);
        setAppointmentCount(appointmentResult.count ?? 0);
        setPendingCount(pendingResult.count ?? 0);
        setCompletedCount(completedResult.count ?? 0);
        setCustomers(recentResult.data ?? []);

        // Calculate dates only after the component has loaded.
        const now = new Date();
        const updatedMonthlyStats = getLastSixMonths(now);

        (customerHistoryResult.data ?? []).forEach((customer) => {
          const index = getMonthIndex(customer.created_at, now);

          if (index !== -1) {
            updatedMonthlyStats[index].customers++;
          }
        });

        const statusCounts: Record<string, number> = {};

        (appointmentHistoryResult.data ?? []).forEach((appointment) => {
          const index = getMonthIndex(appointment.appointment_date, now);

          if (index !== -1) {
            updatedMonthlyStats[index].appointments++;
          }

          const status = appointment.status || "Other";
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        setMonthlyStats(updatedMonthlyStats);

        setAppointmentStatuses(
          Object.entries(statusCounts).map(([name, count]) => ({
            name,
            count,
          }))
        );
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    localStorage.setItem("manageMateBusinessName", businessName);
    localStorage.setItem("manageMateOwnerName", ownerName);
    setSavedMessage("Settings saved successfully!");
  }

  useEffect(() => {
    setBusinessName(
      localStorage.getItem("manageMateBusinessName") || "My Business"
    );
    setOwnerName(
      localStorage.getItem("manageMateOwnerName") || "Admin User"
    );
  }, []);

  const stats = [
    {
      title: "Total Customers",
      value: loading ? "..." : customerCount,
      icon: "👥",
    },
    {
      title: "Appointments",
      value: loading ? "..." : appointmentCount,
      icon: "📅",
    },
    {
      title: "Completed",
      value: loading ? "..." : completedCount,
      icon: "✅",
    },
    {
      title: "Scheduled",
      value: loading ? "..." : pendingCount,
      icon: "📋",
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "₹0",
      features: [
        "Basic dashboard",
        "Customer management",
        "Appointment management",
      ],
    },
    {
      name: "Pro",
      price: "₹299",
      features: [
        "Everything in Free",
        "Advanced reports",
        "Business insights",
      ],
    },
    {
      name: "Premium",
      price: "₹599",
      features: [
        "Everything in Pro",
        "Priority support",
        "Advanced analytics",
      ],
    },
  ];

  const maxMonthlyValue = Math.max(
    1,
    ...monthlyStats.map((item) =>
      Math.max(item.customers, item.appointments)
    )
  );

  const statusTotal = appointmentStatuses.reduce(
    (total, item) => total + item.count,
    0
  );

  const statusColors = [
    "bg-emerald-500",
    "bg-indigo-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-slate-400",
  ];

  let currentPercentage = 0;

  const statusGradient =
    statusTotal === 0
      ? "#e2e8f0 0% 100%"
      : appointmentStatuses
          .map((item, index) => {
            const start = currentPercentage;
            currentPercentage += (item.count / statusTotal) * 100;

            const color = [
              "#10b981",
              "#6366f1",
              "#f59e0b",
              "#a855f7",
              "#94a3b8",
            ][index % 5];

            return `${color} ${start}% ${currentPercentage}%`;
          })
          .join(", ");

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
        <aside className="w-full border-r border-slate-200 bg-white p-6 md:min-h-screen md:w-64">
          <h1 className="mb-10 text-2xl font-bold text-indigo-600">
            ManageMate<span className="text-slate-800">.</span>
          </h1>

          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <nav className="space-y-2">
            {menu.map((item) => (
              <button
                key={item}
                onClick={() => {
                  if (item === "Customers") {
                    router.push("/customers");
                  } else if (item === "Import Customers") {
                    router.push("/import-customers");
                  } else if (item === "Appointments") {
                    router.push("/appointments");
                  } else {
                    setActive(item);
                  }
                }}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  active === item
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="mt-12 rounded-2xl bg-indigo-50 p-4">
            <p className="font-semibold text-indigo-700">Upgrade your plan</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Unlock advanced reports and business tools.
            </p>
            <button
              onClick={() => {
                setActive("Subscription");
                setSelectedPlan(null);
                setPaymentDone(false);
              }}
              className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-sm text-white"
            >
              View Plans
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-5 md:p-9">
          <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">
                Workspace / {active}
              </p>
              <h2 className="mt-1 text-3xl font-bold">{active}</h2>
              <p className="mt-2 text-sm text-slate-500">
                Welcome back! Here's what's happening with your business.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-indigo-100 px-4 py-2 font-semibold text-indigo-700">
                NS
              </div>
              <div>
                <p className="text-sm font-semibold">{ownerName}</p>
                <p className="text-xs text-slate-500">Free Plan</p>
              </div>
              <LogoutButton />
            </div>
          </header>

          {message && (
            <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {message}
            </p>
          )}

          {active === "Overview" && (
            <>
              <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.title}
                    className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">{stat.title}</p>
                      <span className="text-2xl">{stat.icon}</span>
                    </div>
                    <h3 className="mt-4 text-2xl font-bold">{stat.value}</h3>
                  </div>
                ))}
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold">Customer Growth</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    New customers added over the last six months
                  </p>

                  <div className="mt-8 flex h-52 items-end justify-between gap-3">
                    {monthlyStats.map((item) => (
                      <div
                        key={item.month}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                      >
                        <span className="text-xs font-semibold text-slate-600">
                          {item.customers}
                        </span>
                        <div className="flex h-36 w-full items-end justify-center">
                          <div
                            className="w-full max-w-12 rounded-t-lg bg-indigo-500 transition-all"
                            style={{
                              height: `${
                                (item.customers / maxMonthlyValue) * 100
                              }%`,
                              minHeight: item.customers > 0 ? "5px" : "0px",
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {item.month}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold">Appointment Activity</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Appointments by month
                  </p>

                  <div className="mt-8 flex h-52 items-end justify-between gap-3">
                    {monthlyStats.map((item) => (
                      <div
                        key={item.month}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                      >
                        <span className="text-xs font-semibold text-slate-600">
                          {item.appointments}
                        </span>
                        <div className="flex h-36 w-full items-end justify-center">
                          <div
                            className="w-full max-w-12 rounded-t-lg bg-emerald-500 transition-all"
                            style={{
                              height: `${
                                (item.appointments / maxMonthlyValue) * 100
                              }%`,
                              minHeight:
                                item.appointments > 0 ? "5px" : "0px",
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {item.month}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold">Appointment Status</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Distribution of your appointments
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
                    <div
                      className="flex h-36 w-36 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(${statusGradient})`,
                      }}
                    >
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{statusTotal}</p>
                          <p className="text-xs text-slate-500">Total</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {appointmentStatuses.length === 0 && (
                        <p className="text-sm text-slate-500">
                          No appointment data yet.
                        </p>
                      )}

                      {appointmentStatuses.map((item, index) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span
                            className={`h-3 w-3 rounded-full ${
                              statusColors[index % statusColors.length]
                            }`}
                          />
                          <span className="text-slate-600">{item.name}</span>
                          <span className="font-semibold">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
                  <h3 className="text-lg font-bold">Recent Customers</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Your latest customer activity
                  </p>

                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-slate-400">
                          <th className="pb-4 font-medium">Customer</th>
                          <th className="pb-4 font-medium">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((customer) => (
                          <tr
                            key={customer.id}
                            className="border-b border-slate-100"
                          >
                            <td className="py-4 font-semibold">
                              {customer.name}
                            </td>
                            <td className="py-4 text-slate-500">
                              {customer.email || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {!loading && customers.length === 0 && (
                      <p className="py-5 text-sm text-slate-500">
                        No customers added yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold">Subscription</h3>
                <div className="mt-5 max-w-sm rounded-xl bg-indigo-50 p-5">
                  <p className="text-sm text-indigo-600">Current Plan</p>
                  <h3 className="mt-2 text-2xl font-bold text-indigo-800">
                    Free
                  </h3>
                  <p className="mt-2 text-xs text-slate-500">
                    Perfect for getting started.
                  </p>
                </div>
                <button
                  onClick={() => setActive("Subscription")}
                  className="mt-5 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Explore Plans →
                </button>
              </section>
            </>
          )}

          {active === "Reports" && (
            <section className="space-y-6">
              <div>
                <h3 className="text-xl font-bold">Business Reports</h3>
                <p className="mt-1 text-sm text-slate-500">
                  An overview of your business activity.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Total Customers", customerCount],
                  ["Total Appointments", appointmentCount],
                  ["Completed Appointments", completedCount],
                  ["Scheduled Appointments", pendingCount],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border bg-white p-6 shadow-sm"
                  >
                    <p className="text-sm text-slate-500">{label}</p>
                    <h3 className="mt-3 text-3xl font-bold text-indigo-700">
                      {loading ? "..." : value}
                    </h3>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold">Monthly Customer Growth</h3>
                  <div className="mt-6 space-y-4">
                    {monthlyStats.map((item) => (
                      <div key={item.month}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{item.month}</span>
                          <span className="font-semibold">
                            {item.customers}
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100">
                          <div
                            className="h-3 rounded-full bg-indigo-500"
                            style={{
                              width: `${
                                (item.customers / maxMonthlyValue) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold">Appointment Summary</h3>
                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Completed</span>
                        <span>{completedCount}</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-emerald-500"
                          style={{
                            width: `${
                              appointmentCount
                                ? (completedCount / appointmentCount) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Scheduled</span>
                        <span>{pendingCount}</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-indigo-500"
                          style={{
                            width: `${
                              appointmentCount
                                ? (pendingCount / appointmentCount) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 text-xs text-slate-400">
                    Reports are based on records currently stored in your account.
                  </p>
                </div>
              </div>
            </section>
          )}

          {active === "Subscription" && (
            <section>
              {!selectedPlan ? (
                <>
                  <h3 className="text-xl font-bold">Choose Your Plan</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Select the plan that suits your business.
                  </p>

                  <div className="mt-6 grid gap-6 md:grid-cols-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.name}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                      >
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="mt-4 text-3xl font-bold text-indigo-700">
                          {plan.price}
                          <span className="text-sm font-normal text-slate-500">
                            {" "} / month
                          </span>
                        </p>

                        <ul className="my-7 space-y-3 text-sm text-slate-600">
                          {plan.features.map((feature) => (
                            <li key={feature}>✓ {feature}</li>
                          ))}
                        </ul>

                        <button
                          onClick={() => {
                            setSelectedPlan({
                              name: plan.name,
                              price: plan.price,
                            });
                            setPaymentDone(false);
                          }}
                          className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
                        >
                          Choose {plan.name}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : paymentDone ? (
                <div className="max-w-xl rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
                  <div className="text-4xl text-emerald-600">✓</div>
                  <h3 className="mt-4 text-2xl font-bold text-emerald-700">
                    Demo Payment Successful!
                  </h3>
                  <p className="mt-3 text-slate-600">
                    You selected the {selectedPlan.name} plan for{" "}
                    {selectedPlan.price} per month.
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    This is a simulated transaction. No real payment was
                    processed and your account plan has not been changed.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedPlan(null);
                      setPaymentDone(false);
                    }}
                    className="mt-6 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
                  >
                    Back to Plans
                  </button>
                </div>
              ) : (
                <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <h3 className="text-2xl font-bold">Checkout</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Review your selected subscription plan.
                  </p>

                  <div className="mt-6 rounded-xl bg-indigo-50 p-5">
                    <p className="text-sm text-indigo-600">Selected Plan</p>
                    <h4 className="mt-2 text-2xl font-bold">
                      {selectedPlan.name}
                    </h4>
                    <p className="mt-2 text-3xl font-bold text-indigo-700">
                      {selectedPlan.price}
                      <span className="text-sm font-normal text-slate-500">
                        {" "} / month
                      </span>
                    </p>
                  </div>

                  <p className="mt-5 text-sm text-amber-700">
                    Demo checkout only. No actual payment will be collected.
                  </p>

                  <button
                    onClick={() => setPaymentDone(true)}
                    className="mt-5 w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
                  >
                    Simulate Payment
                  </button>

                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="mt-3 w-full rounded-lg border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Back to Plans
                  </button>
                </div>
              )}
            </section>
          )}

          {active === "Settings" && (
            <section className="max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">Business Settings</h3>
              <p className="mt-1 text-sm text-slate-500">
                Manage your workspace information.
              </p>

              <form onSubmit={saveSettings} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Business Name
                  </label>
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Owner Name
                  </label>
                  <input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Account Email
                  </label>
                  <input
                    type="email"
                    value={businessEmail}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  Save Settings
                </button>

                {savedMessage && (
                  <p className="text-sm text-emerald-600">{savedMessage}</p>
                )}
              </form>
            </section>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
