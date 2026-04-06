import type { WhatsAppInstance } from "@/types/entities"

export const mockInstances: WhatsAppInstance[] = [
  {
    id: "inst_01",
    name: "Instância Principal",
    provider: "Uazapi",
    instance_name: "prod-01",
    owner_number: "+551199999999",
    webhook_secret: null,
    descricao: "Instância principal",
    cep: "01310930",
    rua: "Avenida Paulista",
    bairro: "Bela Vista",
    numero_residencia: "1000",
    complemento: "Sala 1201",
    cidade: "São Paulo",
    estado: "SP",
    acessores: [],
    prazo_solicitacoes: null,
    conexao_w: "Desconectado",
    campanha_pause: false,
    campanha_horario_pause: "20:00",
    campanha_horario_reinicio: "07:00",
    is_active: true,
    throttle_per_minute: 120,
    token: null
  }
]

