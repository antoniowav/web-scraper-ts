import { HTMLAttributes } from "react"
import { cn } from "./utils"

export function Badge(props: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={cn("badge", props.className)} />
}
