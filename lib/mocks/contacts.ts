import type { Contact } from "@/types/entities"

export const mockContacts: Contact[] = [
  {
    id: "contact_1",
    first_name: "Marina",
    full_name: "Marina Costa",
    whatsapp_e164: "+5511987654321",
    whatsapp_digits: "11987654321",
    email: "marina@exemplo.com",
    city: "São Paulo",
    state: "SP",
    tags: ["vip", "recente"],
    opted_in: true,
    is_valid: true,
    last_interaction_at: new Date().toISOString()
  }
]

