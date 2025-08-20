import { forwardRef } from "react"
import { cn } from "./utils"

type Props = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, Props>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn("input select pr-9", className)} {...props} />
})
