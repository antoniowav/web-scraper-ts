import { HTMLAttributes } from "react"
import { cn } from "./utils"

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("card", props.className)} />
}

export function CardHeader(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("px-5 pt-5", props.className)} />
}

export function CardContent(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("px-5 pb-5", props.className)} />
}
