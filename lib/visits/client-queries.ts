import type { ClientVisit } from "@/types/database";

export type ClientVisitAppointmentMeta = {
  id: string;
  start_time: string;
  end_time: string;
  business_id: string;
  businesses: { name: string } | null;
};

export type ClientVisitListItem = ClientVisit & {
  appointment: ClientVisitAppointmentMeta | null;
};

export function buildClientVisitListItems(
  visits: ClientVisit[],
  appointments: ClientVisitAppointmentMeta[],
): ClientVisitListItem[] {
  const appointmentById = new Map(appointments.map((a) => [a.id, a]));

  return visits.map((visit) => ({
    ...visit,
    appointment: appointmentById.get(visit.appointment_id) ?? null,
  }));
}
