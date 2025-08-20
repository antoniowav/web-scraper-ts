import { useId } from "react"
import { cn } from "./utils"

type Props = {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label?: string
}

export function Switch({ checked, onCheckedChange, label }: Props) {
  const id = useId()
  return (
    <div className="inline-flex items-center gap-2">
      <button
        aria-pressed={checked}
        aria-labelledby={id}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "h-6 w-10 rounded-full transition-colors",
          checked ? "bg-black" : "bg-gray-300"
        )}
        type="button"
      >
        <span
          className={cn(
            "block h-5 w-5 bg-white rounded-full translate-x-0.5 transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
      {label ? <span id={id} className="text-sm text-gray-700">{label}</span> : null}
    </div>
  )
}
