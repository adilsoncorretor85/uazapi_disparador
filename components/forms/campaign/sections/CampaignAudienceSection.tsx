import { Users, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FormControl,
  FormItem,
  FormLabel
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TEMPLATE_FILE_URL } from "../helpers/import-template"

interface FilterOptions {
  tags: string[]
  cities: string[]
  bairros: string[]
  ruas: string[]
}

interface ImportSummary {
  total: number
  inserted: number
  ignored: number
}

interface CampaignAudienceSectionProps {
  audienceMode: "all" | "file"
  onAudienceModeChange: (mode: "all" | "file") => void
  watchedInstanceId?: string
  isFilterOptionsLoading?: boolean
  filterOptions: FilterOptions
  tagIncludeOptions: string[]
  tagExcludeOptions: string[]
  audienceTags: string[]
  audienceTagsExclude: string[]
  citySearch: string
  onCitySearchChange: (value: string) => void
  debouncedCitySearch: string
  selectedCity: string
  selectedBairro: string
  selectedRua: string
  onClearField: (
    field:
      | "audience_tags"
      | "audience_tags_exclude"
      | "audience_cities"
      | "audience_bairros"
      | "audience_ruas"
  ) => void
  onToggleField: (
    field:
      | "audience_tags"
      | "audience_tags_exclude"
      | "audience_cities"
      | "audience_bairros"
      | "audience_ruas",
    value: string
  ) => void
  onCitySelect: (value: string) => void
  onBairroSelect: (value: string) => void
  onRuaSelect: (value: string) => void
  defaultDdd: string
  onDefaultDddChange: (value: string) => void
  onImportFile: (file: File) => void
  importing: boolean
  importError: string | null
  importSummary: ImportSummary | null
  importedContacts: Array<{ id: string; whatsapp_e164: string; first_name?: string | null; full_name?: string | null }>
  onRemoveContact: (contactId: string) => void
  audienceError?: string | null
}

export function CampaignAudienceSection({
  audienceMode,
  onAudienceModeChange,
  watchedInstanceId,
  isFilterOptionsLoading,
  filterOptions,
  tagIncludeOptions,
  tagExcludeOptions,
  audienceTags,
  audienceTagsExclude,
  citySearch,
  onCitySearchChange,
  debouncedCitySearch,
  selectedCity,
  selectedBairro,
  selectedRua,
  onClearField,
  onToggleField,
  onCitySelect,
  onBairroSelect,
  onRuaSelect,
  defaultDdd,
  onDefaultDddChange,
  onImportFile,
  importing,
  importError,
  importSummary,
  importedContacts,
  onRemoveContact,
  audienceError
}: CampaignAudienceSectionProps) {

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Público alvo</h2>
          <p className="text-sm text-muted-foreground">
            Selecione todos os contatos ou importe uma planilha e use apenas quem foi
            carregado.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            className={cn(
              "rounded-xl border p-4 text-left transition",
              audienceMode === "all"
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 hover:border-muted-foreground/40"
            )}
            onClick={() => onAudienceModeChange("all")}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <p className="text-sm font-semibold">Todos os contatos</p>
            </div>
            <p className="text-xs text-muted-foreground">Disparar para toda a base.</p>
          </button>
          <button
            type="button"
            className={cn(
              "rounded-xl border p-4 text-left transition",
              audienceMode === "file"
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 hover:border-muted-foreground/40"
            )}
            onClick={() => onAudienceModeChange("file")}
          >
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <p className="text-sm font-semibold">Importar planilha</p>
            </div>
            <p className="text-xs text-muted-foreground">XLSX ou CSV com coluna de WhatsApp.</p>
          </button>
        </div>

        {audienceMode === "all" ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              Selecione filtros para segmentar a base. Sem filtros, a campanha será enviada
              para todos os contatos válidos da instância.
            </div>

            {!watchedInstanceId ? (
              <p className="text-sm text-muted-foreground">
                Selecione uma instância para carregar os filtros disponíveis.
              </p>
            ) : isFilterOptionsLoading ? (
              <p className="text-sm text-muted-foreground">Carregando filtros...</p>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Tags incluídas</p>
                      {audienceTags.length > 0 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => onClearField("audience_tags")}>
                          Limpar
                        </Button>
                      ) : null}
            
                    </div>
                    {tagIncludeOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma tag cadastrada.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {tagIncludeOptions.map((tag) => (
                          <button
                            key={`tag-${tag}`}
                            type="button"
                            className="focus:outline-none"
                            onClick={() => onToggleField("audience_tags", tag)}
                          >
                            <Badge variant={audienceTags.includes(tag) ? "default" : "secondary"}>
                              {tag}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Tags excluídas</p>
                      {audienceTagsExclude.length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onClearField("audience_tags_exclude")}
                        >
                          Limpar
                        </Button>
                      ) : null}
            
                    </div>
                    {tagExcludeOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma tag cadastrada.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {tagExcludeOptions.map((tag) => (
                          <button
                            key={`tag-exclude-${tag}`}
                            type="button"
                            className="focus:outline-none"
                            onClick={() => onToggleField("audience_tags_exclude", tag)}
                          >
                            <Badge
                              variant={audienceTagsExclude.includes(tag) ? "destructive" : "secondary"}
                            >
                              {tag}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Cidades</p>
                      {selectedCity ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => onCitySelect("")}>
                          Limpar
                        </Button>
                      ) : null}
            
                    </div>
                    <Input
                      placeholder="Buscar cidade..."
                      value={citySearch}
                      onChange={(event) => onCitySearchChange(event.target.value)}
                      className="h-9"
                    />
                    {selectedCity ? (
                      <p className="text-xs text-muted-foreground">
                        Cidade selecionada: <span className="font-medium">{selectedCity}</span>
                      </p>
                    ) : null}
            
                    <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
                      {filterOptions.cities.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {debouncedCitySearch
                            ? "Nenhuma cidade encontrada."
                            : "Nenhuma cidade cadastrada."}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={!selectedCity}
                              onCheckedChange={() => onCitySelect("")}
                            />
                            <span>Todas as cidades</span>
                          </label>
                          {filterOptions.cities.map((city) => (
                            <label key={city} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={selectedCity === city}
                                onCheckedChange={() => onCitySelect(city)}
                              />
                              <span>{city}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Bairros</p>
                      {selectedBairro ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => onBairroSelect("")}>
                          Limpar
                        </Button>
                      ) : null}
            
                    </div>
                    <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
                      {!selectedCity ? (
                        <p className="text-xs text-muted-foreground">
                          Selecione uma cidade para listar os bairros.
                        </p>
                      ) : filterOptions.bairros.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhum bairro cadastrado para a cidade selecionada.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={!selectedBairro}
                              onCheckedChange={() => onBairroSelect("")}
                            />
                            <span>Todos os bairros</span>
                          </label>
                          {filterOptions.bairros.map((bairro) => (
                            <label key={bairro} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={selectedBairro === bairro}
                                onCheckedChange={() => onBairroSelect(bairro)}
                              />
                              <span>{bairro}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Ruas</p>
                      {selectedRua ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => onRuaSelect("")}>
                          Limpar
                        </Button>
                      ) : null}
            
                    </div>
                    <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
                      {!selectedCity ? (
                        <p className="text-xs text-muted-foreground">
                          Selecione uma cidade para listar as ruas.
                        </p>
                      ) : !selectedBairro ? (
                        <p className="text-xs text-muted-foreground">
                          Selecione um bairro para listar as ruas.
                        </p>
                      ) : filterOptions.ruas.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhuma rua cadastrada para o bairro selecionado.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={!selectedRua}
                              onCheckedChange={() => onRuaSelect("")}
                            />
                            <span>Todas as ruas</span>
                          </label>
                          {filterOptions.ruas.map((rua) => (
                            <label key={rua} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={selectedRua === rua}
                                onCheckedChange={() => onRuaSelect(rua)}
                              />
                              <span>{rua}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
            

        {audienceMode === "file" ? (
          <div className="space-y-3">
            <div className="grid gap-4 md:grid-cols-3">
              <FormItem>
                <FormLabel>DDD padrão</FormLabel>
                <FormControl>
                  <Input
                    value={defaultDdd}
                    onChange={(event) => onDefaultDddChange(event.target.value)}
                    placeholder="47"
                  />
                </FormControl>
              </FormItem>
              <FormItem className="md:col-span-2">
                <FormLabel>Arquivo de contatos</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    disabled={importing}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      onImportFile(file)
                    }}
                  />
                </FormControl>
              </FormItem>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <span>Use somente o template padrão. Tags devem ser separadas por vírgula.</span>
              <Button asChild variant="link" size="sm">
                <a href={TEMPLATE_FILE_URL} download>
                  Baixar template
                </a>
              </Button>
            </div>

            {importing ? <p className="text-sm text-muted-foreground">Importando contatos...</p> : null}
            {importError ? <p className="text-sm text-destructive">{importError}</p> : null}
            {audienceError ? <p className="text-sm text-destructive">{audienceError}</p> : null}

            {importSummary ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p>
                  Contatos processados: {importSummary.total} | Importados: {importSummary.inserted} | Ignorados:{" "}
                  {importSummary.ignored}
                </p>
                <p className="text-xs text-muted-foreground">
                  Selecionados automaticamente: {importedContacts.length}
                </p>
              </div>
            ) : null}

            {importedContacts.length > 0 ? (
              <div className="rounded-lg border bg-background p-3 text-sm">
                <p className="mb-2 text-xs text-muted-foreground">Primeiros contatos importados</p>
                <div className="space-y-1">
                  {importedContacts.slice(0, 5).map((contact) => (
                    <div key={contact.id} className="flex justify-between text-xs">
                      <span>{contact.full_name ?? contact.first_name ?? "Contato"}</span>
                      <span className="text-muted-foreground">{contact.whatsapp_e164}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {importedContacts.length > 0 ? (
              <div className="rounded-lg border bg-background p-3 text-sm">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Contatos selecionados</span>
                  <span>{importedContacts.length}</span>
                </div>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {importedContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="truncate">
                            {contact.full_name ?? contact.first_name ?? "Contato"}
                          </p>
                          <p className="text-muted-foreground truncate">{contact.whatsapp_e164}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveContact(contact.id)}
                          title="Remover contato"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : null}            

            
          </div>
        ) : null}
            
      </div>
    </Card>
  )
}











