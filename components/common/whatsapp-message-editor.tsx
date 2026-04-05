"use client"

import { useRef } from "react"
import { Bold, Italic, Strikethrough, Code, User, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface WhatsAppMessageEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  rows?: number
}

const VARIABLE_OPTIONS = [
  { label: "primeiro_nome", value: "{{primeiro_nome}}", icon: User },
  { label: "nome_completo", value: "{{nome_completo}}", icon: Users }
]

function wrapSelection(
  textarea: HTMLTextAreaElement | null,
  value: string,
  onChange: (value: string) => void,
  prefix: string,
  suffix: string
) {
  if (!textarea) return
  const start = textarea.selectionStart ?? value.length
  const end = textarea.selectionEnd ?? value.length
  const before = value.slice(0, start)
  const selected = value.slice(start, end)
  const after = value.slice(end)
  const newValue = `${before}${prefix}${selected}${suffix}${after}`
  onChange(newValue)
  requestAnimationFrame(() => {
    textarea.focus()
    const cursorStart = start + prefix.length
    const cursorEnd = end + prefix.length
    textarea.setSelectionRange(cursorStart, cursorEnd)
  })
}

function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  value: string,
  onChange: (value: string) => void,
  insertValue: string
) {
  if (!textarea) return
  const start = textarea.selectionStart ?? value.length
  const end = textarea.selectionEnd ?? value.length
  const before = value.slice(0, start)
  const after = value.slice(end)
  const newValue = `${before}${insertValue}${after}`
  onChange(newValue)
  requestAnimationFrame(() => {
    textarea.focus()
    const cursor = start + insertValue.length
    textarea.setSelectionRange(cursor, cursor)
  })
}

export function WhatsAppMessageEditor({
  value,
  onChange,
  placeholder,
  disabled,
  id,
  rows = 6
}: WhatsAppMessageEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={() => wrapSelection(textareaRef.current, value, onChange, "*", "*")}
          disabled={disabled}
          aria-label="Negrito"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={() => wrapSelection(textareaRef.current, value, onChange, "_", "_")}
          disabled={disabled}
          aria-label="Itálico"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={() => wrapSelection(textareaRef.current, value, onChange, "~", "~")}
          disabled={disabled}
          aria-label="Riscado"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={() => wrapSelection(textareaRef.current, value, onChange, "```", "```")}
          disabled={disabled}
          aria-label="Monospace"
        >
          <Code className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex flex-wrap gap-2">
          {VARIABLE_OPTIONS.map((variable) => {
            const Icon = variable.icon
            return (
              <Button
                key={variable.value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  insertAtCursor(textareaRef.current, value, onChange, variable.value)
                }
                disabled={disabled}
              >
                <Icon className="mr-2 h-3.5 w-3.5" />
                {variable.label}
              </Button>
            )
          })}
        </div>
      </div>

      <Textarea
        id={id}
        ref={textareaRef}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />

      <p className="text-xs text-muted-foreground">
        Formatação WhatsApp: *negrito*, _itálico_, ~riscado~, ```monospace```.
      </p>
    </div>
  )
}
