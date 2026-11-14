import React, { useEffect, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Minus,
  Subscript,
  Superscript,
  Table,
  Type,
  Underline,
} from 'lucide-react'

const exec = (command, value) => document.execCommand(command, false, value)

const TABLE_HTML =
  '<table border="1" style="border-collapse:collapse;width:100%"><tbody>' +
  '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>' +
  '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>' +
  '</tbody></table><p></p>'

/**
 * Small WYSIWYG editor (no extra library). Stores HTML.
 * Remount it with a different `key` to load another document.
 */
const RichTextEditor = ({ value, onChange, minHeight = 160, placeholder = '' }) => {
  const ref = useRef(null)
  const [source, setSource] = useState(false)

  useEffect(() => {
    if (ref.current && !source) ref.current.innerHTML = value || ''
    // only when switching back from Source view; normal typing is uncontrolled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  const emit = () => onChange?.(ref.current?.innerHTML || '')

  const btn = (title, Icon, run) => (
    <button
      key={title}
      type="button"
      title={title}
      aria-label={title}
      disabled={source}
      onMouseDown={(e) => {
        e.preventDefault()
        run()
        emit()
      }}
      className="rounded p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <Icon className="h-4 w-4" />
    </button>
  )

  const sep = (k) => <span key={k} className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800/60">
        <button
          type="button"
          onClick={() => setSource((s) => !s)}
          className={`mr-1 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${source ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'}`}
        >
          <Code className="h-3.5 w-3.5" />
          Source
        </button>
        {sep('s0')}
        {btn('Bold', Bold, () => exec('bold'))}
        {btn('Italic', Italic, () => exec('italic'))}
        {btn('Underline', Underline, () => exec('underline'))}
        {btn('Subscript', Subscript, () => exec('subscript'))}
        {btn('Superscript', Superscript, () => exec('superscript'))}
        {sep('s1')}
        {btn('Numbered list', ListOrdered, () => exec('insertOrderedList'))}
        {btn('Bullet list', List, () => exec('insertUnorderedList'))}
        {sep('s2')}
        {btn('Align left', AlignLeft, () => exec('justifyLeft'))}
        {btn('Center', AlignCenter, () => exec('justifyCenter'))}
        {btn('Align right', AlignRight, () => exec('justifyRight'))}
        {btn('Justify', AlignJustify, () => exec('justifyFull'))}
        {sep('s3')}
        {btn('Insert table', Table, () => exec('insertHTML', TABLE_HTML))}
        {btn('Horizontal line', Minus, () => exec('insertHorizontalRule'))}
        {sep('s4')}
        <select
          aria-label="Text size"
          disabled={source}
          defaultValue=""
          onChange={(e) => {
            ref.current?.focus()
            exec('fontSize', e.target.value)
            emit()
            e.target.value = ''
          }}
          className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="" disabled>
            Size
          </option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">Larger</option>
        </select>
        <label className="ml-1 inline-flex cursor-pointer items-center rounded p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700" title="Text colour">
          <Type className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          <input
            type="color"
            className="sr-only"
            disabled={source}
            onChange={(e) => {
              exec('foreColor', e.target.value)
              emit()
            }}
          />
        </label>
        <label className="inline-flex cursor-pointer items-center rounded p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700" title="Highlight colour">
          <Highlighter className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          <input
            type="color"
            defaultValue="#fff59d"
            className="sr-only"
            disabled={source}
            onChange={(e) => {
              exec('hiliteColor', e.target.value)
              emit()
            }}
          />
        </label>
      </div>

      {source ? (
        <textarea
          className="block w-full bg-slate-950 p-3 font-mono text-xs text-slate-100 outline-none"
          style={{ minHeight }}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          data-placeholder={placeholder}
          className="prose-sm block w-full overflow-auto bg-white p-3 text-sm text-slate-900 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] dark:bg-slate-950 dark:text-slate-100 [&_ol]:list-decimal [&_ol]:pl-6 [&_table_td]:border [&_table_td]:border-slate-400 [&_table_td]:p-1 [&_ul]:list-disc [&_ul]:pl-6"
          style={{ minHeight }}
        />
      )}
    </div>
  )
}

export default RichTextEditor
