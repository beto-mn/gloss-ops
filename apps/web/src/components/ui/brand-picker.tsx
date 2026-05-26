'use client'

import { useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface BrandOption {
  value: string
  label: string
  logoUrl?: string | null
}

interface BrandPickerProps {
  options: BrandOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function BrandPicker({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar marca…',
  disabled = false,
}: BrandPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = options.find(o => o.value === value)

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  function handleSelect(option: BrandOption) {
    onChange(option.value)
    setOpen(false)
    setSearch('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSearch('')
  }

  return (
    <>
      <button
        type='button'
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selected && 'text-muted-foreground'
        )}
      >
        {selected ? <BrandInitial brand={selected} size='sm' /> : null}
        <span className='flex-1 truncate text-left'>
          {selected ? selected.label : placeholder}
        </span>
        {selected && !disabled ? (
          <X
            size={14}
            className='text-muted-foreground hover:text-foreground shrink-0'
            onMouseDown={handleClear}
          />
        ) : (
          <ChevronDown size={14} className='text-muted-foreground shrink-0' />
        )}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className='sm:max-w-md max-h-[80vh] flex flex-col gap-0 p-0'
          aria-describedby={undefined}
        >
          <DialogHeader className='px-4 pt-4 pb-3 border-b'>
            <DialogTitle>Seleccionar marca</DialogTitle>
          </DialogHeader>

          <div className='px-4 py-3 border-b'>
            <div className='relative'>
              <Search
                size={14}
                className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
              />
              <Input
                autoFocus
                placeholder='Buscar marca…'
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='pl-8'
              />
            </div>
          </div>

          <div className='overflow-y-auto flex-1 p-4'>
            {filtered.length === 0 ? (
              <p className='text-sm text-muted-foreground text-center py-8'>
                No se encontraron marcas
              </p>
            ) : (
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                {filtered.map(option => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left transition-colors',
                      'hover:bg-accent hover:border-accent-foreground/20',
                      option.value === value
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-border bg-background'
                    )}
                  >
                    <BrandInitial brand={option} size='sm' />
                    <span className='truncate'>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className='px-4 py-3 border-t flex justify-end'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function BrandInitial({
  brand,
  size,
}: {
  brand: BrandOption
  size: 'sm' | 'md'
}) {
  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt={brand.label}
        className={cn(
          'rounded object-contain shrink-0',
          size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        'flex items-center justify-center rounded bg-muted text-muted-foreground font-medium uppercase shrink-0',
        size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-8 h-8 text-xs'
      )}
    >
      {brand.label.charAt(0)}
    </span>
  )
}
