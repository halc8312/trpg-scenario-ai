'use client'

import { ReactNode, useState } from 'react'
import { FieldDef, RefOptions, nextId } from './schema'
import { cn } from '@/lib/utils'

type Obj = Record<string, any>

const inputClass =
  'block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'
const smallButton =
  'rounded border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40'

interface ObjectEditorProps {
  value: Obj
  fields: FieldDef[]
  refs: RefOptions
  onChange: (value: Obj) => void
}

export function ObjectEditor({ value, fields, refs, onChange }: ObjectEditorProps) {
  return (
    <div className="space-y-3">
      {fields.map(field => (
        <FieldEditor
          key={field.key}
          field={field}
          value={value[field.key]}
          refs={refs}
          onChange={next => onChange({ ...value, [field.key]: next })}
        />
      ))}
    </div>
  )
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {hint && <span className="ml-2 font-normal text-gray-500">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function FieldEditor({ field, value, refs, onChange }: { field: FieldDef; value: any; refs: RefOptions; onChange: (v: any) => void }) {
  switch (field.type) {
    case 'text':
      return (
        <Labeled label={field.label}>
          <input className={inputClass} value={value ?? ''} onChange={e => onChange(e.target.value)} />
        </Labeled>
      )
    case 'number':
      return (
        <Labeled label={field.label}>
          <input
            className={cn(inputClass, 'max-w-[8rem]')}
            type="number"
            min={1}
            value={value ?? 1}
            onChange={e => onChange(Math.max(1, Number(e.target.value) || 1))}
          />
        </Labeled>
      )
    case 'textarea':
      return (
        <Labeled label={field.label}>
          <textarea className={inputClass} rows={3} value={value ?? ''} onChange={e => onChange(e.target.value)} />
        </Labeled>
      )
    case 'stringList':
      return (
        <Labeled label={field.label} hint={field.hint}>
          <textarea
            className={inputClass}
            rows={3}
            value={(value ?? []).join('\n')}
            onChange={e => onChange(e.target.value.split('\n'))}
            onBlur={e => onChange(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
          />
        </Labeled>
      )
    case 'select':
      return (
        <Labeled label={field.label}>
          <select className={inputClass} value={value ?? ''} onChange={e => onChange(e.target.value)}>
            {field.options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Labeled>
      )
    case 'ref':
      return (
        <Labeled label={field.label}>
          <select className={inputClass} value={value ?? ''} onChange={e => onChange(e.target.value || undefined)}>
            <option value="">（なし）</option>
            {refs[field.refType].map(o => (
              <option key={o.value} value={o.value}>{truncate(o.label)}</option>
            ))}
            {value && !refs[field.refType].some(o => o.value === value) && (
              <option value={value}>{value}（存在しません）</option>
            )}
          </select>
        </Labeled>
      )
    case 'refList': {
      const selected: string[] = value ?? []
      const options = refs[field.refType]
      return (
        <fieldset>
          <legend className={labelClass}>{field.label}</legend>
          {options.length === 0 ? (
            <p className="text-xs text-gray-500">選べる項目がありません</p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {options.map(o => (
                <label key={o.value} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(o.value)}
                    onChange={e =>
                      onChange(e.target.checked ? [...selected, o.value] : selected.filter(id => id !== o.value))
                    }
                  />
                  {truncate(o.label)}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )
    }
    case 'objectList':
      return (
        <fieldset className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
          <legend className="px-1 text-xs font-medium text-gray-600 dark:text-gray-400">{field.label}</legend>
          <ListEditor
            items={value ?? []}
            fields={field.fields}
            refs={refs}
            itemLabel={field.itemLabel}
            idPrefix={field.idPrefix}
            newItem={field.newItem}
            onChange={onChange}
            compact
          />
        </fieldset>
      )
    case 'optionalObject':
      return (
        <fieldset className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
          <legend className="px-1 text-xs font-medium text-gray-600 dark:text-gray-400">{field.label}</legend>
          {value ? (
            <>
              <ObjectEditor value={value} fields={field.fields} refs={refs} onChange={onChange} />
              <button type="button" className={cn(smallButton, 'mt-2')} onClick={() => onChange(undefined)}>
                {field.label}を削除
              </button>
            </>
          ) : (
            <button type="button" className={smallButton} onClick={() => onChange(field.newValue())}>
              ＋ {field.label}を追加
            </button>
          )}
        </fieldset>
      )
  }
}

interface ListEditorProps {
  items: Obj[]
  fields: FieldDef[]
  refs: RefOptions
  itemLabel: string
  idPrefix?: string
  newItem: () => Obj
  onChange: (items: Obj[]) => void
  compact?: boolean
  addLabel?: string
}

export function ListEditor({ items, fields, refs, itemLabel, idPrefix, newItem, onChange, compact, addLabel }: ListEditorProps) {
  const update = (index: number, item: Obj) => onChange(items.map((it, i) => (i === index ? item : it)))
  const move = (index: number, delta: number) => {
    const next = [...items]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }
  const add = () => onChange([...items, idPrefix ? { id: nextId(idPrefix, items), ...newItem() } : newItem()])

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <ItemCard
          key={item.id ?? index}
          title={truncate(String(item[itemLabel] || '（未入力）'), 40)}
          initiallyOpen={compact || !item[itemLabel]}
          compact={compact}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
          onMove={delta => move(index, delta)}
          onDelete={() => onChange(items.filter((_, i) => i !== index))}
        >
          <ObjectEditor value={item} fields={fields} refs={refs} onChange={next => update(index, next)} />
        </ItemCard>
      ))}
      <button type="button" className={smallButton} onClick={add}>
        ＋ {addLabel ?? '追加'}
      </button>
    </div>
  )
}

interface ItemCardProps {
  title: string
  initiallyOpen?: boolean
  compact?: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (delta: number) => void
  onDelete: () => void
  children: ReactNode
}

function ItemCard({ title, initiallyOpen, compact, canMoveUp, canMoveDown, onMove, onDelete, children }: ItemCardProps) {
  // 入力中に開閉状態が変わらないよう、初期状態だけ props から決める
  const [open, setOpen] = useState(!!initiallyOpen)

  return (
    <div className={cn('rounded-md border border-gray-200 dark:border-gray-700', compact ? 'p-2' : 'bg-white dark:bg-gray-800 p-4 shadow-sm')}>
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          className="flex flex-grow items-center gap-2 truncate text-left font-medium text-gray-900 dark:text-white"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <span className="text-xs text-gray-500">{open ? '▼' : '▶'}</span>
          <span className="truncate">{title}</span>
        </button>
        <button type="button" className={smallButton} disabled={!canMoveUp} onClick={() => onMove(-1)} aria-label="上へ移動">
          ↑
        </button>
        <button type="button" className={smallButton} disabled={!canMoveDown} onClick={() => onMove(1)} aria-label="下へ移動">
          ↓
        </button>
        <button type="button" className={cn(smallButton, 'text-red-600 dark:text-red-400')} onClick={onDelete}>
          削除
        </button>
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

function truncate(text: string, max = 30): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
