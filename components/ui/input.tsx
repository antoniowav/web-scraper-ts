import { forwardRef } from "react"
import { cn } from "./utils"

type Props = React.InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("input mt-2", className)} {...props} />
})
