
import { supabase } from "./supabase";

export async function getCustomers() {
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Please log in to view customers.");
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function addCustomer(customer: {
  name: string;
  email?: string;
  phone?: string;
}) {
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Please log in to add customers.");
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      user_id: user.id,
      name: customer.name,
      email: customer.email || null,
      phone: customer.phone || null,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteCustomer(id: string) {
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Please log in to delete customers.");
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}
