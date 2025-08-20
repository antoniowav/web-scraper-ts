import { LabelHTMLAttributes } from "react"
import { cn } from "./utils"

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn("text-sm font-medium text-gray-700 mb-2", props.className)} />
}
