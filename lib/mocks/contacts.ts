import type { Contact } from "@/types/entities"

export const mockContacts: Contact[] = [
  {
    id: "contact_01",
    first_name: "Eduardo",
    full_name: "Eduardo Dias",
    instance_id: "inst_01",
    whatsapp_e164: "+554799999999",
    whatsapp_digits: "4799999999",
    email: "eduardo@example.com",
    city: "Joinville",
    state: "SC",
    bairro: "Centro",
    cep: "89221100",
    rua: "Rua das Palmeiras",
    numero_residencia: "120",
    complemento: "Ap 101",
    ponto_referencia: "Proximo ao mercado",
    genero: "Masculino",
    data_nascimento: "1990-05-10",
    tags: ["Cliente", "Premium"],
    custom_fields: {},
    opted_in: true,
    is_valid: true,
    notes: "Contato prioritario",
    last_interaction_at: null
  }
]
