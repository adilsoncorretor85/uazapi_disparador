import type { WhatsAppInstance } from "@/types/entities"

export const mockInstances: WhatsAppInstance[] = [
  {
    id: "inst_01",
    name: "Instância Principal",
    provider: "Uazapi",
    base_url: "https://api.uazapi.com",
    instance_name: "prod-01",
    owner_number: "+551199999999",
    webhook_secret: null,
    is_active: true,
    send_readchat: true,
    send_composing: true,
    throttle_per_minute: 120,
    token: null
  }
]

