'use client'

import { AlertCircle } from 'lucide-react'

interface ErrorAlertProps {
  message: string
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div
      role='alert'
      className='flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive'
    >
      <AlertCircle size={15} strokeWidth={1.5} className='mt-0.5 shrink-0' />
      <span>{message}</span>
    </div>
  )
}
