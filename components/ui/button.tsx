import { forwardRef } from "react"
import { cn } from "./utils"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost"
  size?: "sm" | "md"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref
) {
  const base = "btn"
  const v = variant === "primary" ? "btn-primary" : "btn-ghost"
  const s = size === "sm" ? "text-sm px-3 py-2" : ""
  return <button ref={ref} className={cn(base, v, s, className)} {...props} />
})
