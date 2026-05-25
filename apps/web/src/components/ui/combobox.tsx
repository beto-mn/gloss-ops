'use client'

import { useRef, useState } from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Buscar…',
  disabled = false,
  className,
}: ComboboxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)

  const selectedLabel = options.find(o => o.value === value)?.label ?? ''

  const filtered = inputValue
    ? options.filter(o =>
        o.label.toLowerCase().includes(inputValue.toLowerCase())
      )
    : options

  function handleFocus() {
    setInputValue('')
    setOpen(true)
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false)
      // Restore selected label in input when losing focus without selecting
      setInputValue('')
    }, 150)
  }

  function handleSelect(option: ComboboxOption) {
    onChange(option.value)
    setInputValue('')
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault()
    onChange('')
    setInputValue('')
    inputRef.current?.focus()
  }

  return (
    <div className={cn('relative', className)}>
      <div className='flex items-center gap-1 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background'>
        <input
          ref={inputRef}
          value={open ? inputValue : selectedLabel}
          placeholder={placeholder}
          disabled={disabled}
          className='flex-1 h-10 text-sm bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50'
          onChange={e => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {value && !disabled && (
          <button
            type='button'
            className='text-muted-foreground hover:text-foreground'
            onMouseDown={handleClear}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className='absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-popover shadow-md text-sm'>
          {filtered.slice(0, 60).map(option => (
            <li
              key={option.value}
              className={cn(
                'px-3 py-2 cursor-pointer hover:bg-accent',
                option.value === value && 'bg-accent/50 font-medium'
              )}
              onMouseDown={() => handleSelect(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
