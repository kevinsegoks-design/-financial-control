import { type CSSProperties, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  floatClass?: string
  fadeClass?: string
  onClick?: () => void
}

export default function GlassCard({ children, className = '', style, floatClass, fadeClass, onClick }: Props) {
  return (
    <div
      className={`glass ${floatClass ?? ''} ${fadeClass ?? ''} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
