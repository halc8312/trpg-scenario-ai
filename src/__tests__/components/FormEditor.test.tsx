import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListEditor } from '@/components/editor/FormEditor'
import { FieldDef, RefOptions } from '@/components/editor/schema'

const refs: RefOptions = {
  revelation: [],
  location: [{ value: 'loc-1', label: '神社' }],
  npc: [{ value: 'npc-1', label: '宗像' }, { value: 'npc-2', label: '佐伯' }],
  clue: [],
  scene: []
}

const fields: FieldDef[] = [
  { key: 'name', label: '名前', type: 'text' },
  { key: 'locationId', label: '場所', type: 'ref', refType: 'location' },
  { key: 'npcIds', label: '登場NPC', type: 'refList', refType: 'npc' },
  { key: 'tags', label: 'タグ', type: 'stringList' }
]

function Harness({ initial, onChange }: { initial: Record<string, any>[]; onChange: (items: Record<string, any>[]) => void }) {
  const [items, setItems] = useState(initial)
  return (
    <ListEditor
      items={items}
      fields={fields}
      refs={refs}
      itemLabel="name"
      idPrefix="item"
      addLabel="項目を追加"
      newItem={() => ({ name: '', npcIds: [], tags: [] })}
      onChange={next => {
        setItems(next)
        onChange(next)
      }}
    />
  )
}

describe('ListEditor', () => {
  it('adds items with unique ids and edits their fields', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<Harness initial={[{ id: 'item-1', name: 'A', npcIds: [], tags: [] }]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '＋ 項目を追加' }))
    // 新しい項目は名前が空なので開いた状態で追加される
    const nameInputs = screen.getAllByLabelText('名前')
    await user.type(nameInputs[nameInputs.length - 1], 'B')
    await user.selectOptions(screen.getAllByLabelText('場所').at(-1)!, 'loc-1')
    await user.click(screen.getAllByRole('checkbox', { name: '佐伯' }).at(-1)!)

    const last = onChange.mock.calls.at(-1)[0]
    expect(last).toHaveLength(2)
    expect(last[1]).toMatchObject({ id: 'item-2', name: 'B', locationId: 'loc-1', npcIds: ['npc-2'] })
  })

  it('reorders and deletes items', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(
      <Harness
        initial={[
          { id: 'item-1', name: 'A', npcIds: [], tags: [] },
          { id: 'item-2', name: 'B', npcIds: [], tags: [] }
        ]}
        onChange={onChange}
      />
    )

    await user.click(screen.getAllByRole('button', { name: '下へ移動' })[0])
    expect(onChange.mock.calls.at(-1)[0].map((i: any) => i.name)).toEqual(['B', 'A'])

    await user.click(screen.getAllByRole('button', { name: '削除' })[0])
    expect(onChange.mock.calls.at(-1)[0].map((i: any) => i.name)).toEqual(['A'])
  })

  it('keeps an item open while its title is being typed', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[]} onChange={() => {}} />)
    await user.click(screen.getByRole('button', { name: '＋ 項目を追加' }))
    await user.type(screen.getByLabelText('名前'), '長い名前')
    expect(screen.getByLabelText('名前')).toHaveValue('長い名前')
  })

  it('splits string lists by line and marks references to missing items', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<Harness initial={[{ id: 'item-1', name: '', npcIds: [], tags: [], locationId: 'loc-9' }]} onChange={onChange} />)

    expect(screen.getByRole('option', { name: 'loc-9（存在しません）' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/タグ/), 'a{enter}b')
    expect(onChange.mock.calls.at(-1)[0][0].tags).toEqual(['a', 'b'])
  })
})
