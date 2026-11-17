
import { supabase } from "./supabase";

export async function getAppointments() {
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Please log in to view appointments.");
  }

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", user.id)
    .order("appointment_date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function addAppointment(appointment: {
  customer_name: string;
  service?: string;
  appointment_date: string;
  notes?: string;
}) {
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Please log in to add appointments.");
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      user_id: user.id,
      customer_name: appointment.customer_name,
      service: appointment.service || null,
      appointment_date: appointment.appointment_date,
      notes: appointment.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAppointmentStatus(
  id: string,
  status: string
) {
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Please log in.");
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function deleteAppointment(id: string) {
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Please log in.");
  }

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}
