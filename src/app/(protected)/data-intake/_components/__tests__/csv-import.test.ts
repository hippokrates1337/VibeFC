import { readFileSync } from 'fs'
import { join } from 'path'
import { parseCsvRecords, parseHeaderDate, parseNumberCell, parseVariablesCsv } from '../csv-import'

const fixture = (name: string): string =>
  readFileSync(join(process.cwd(), 'tests', 'e2e', 'fixtures', 'synthetic', name), 'utf8')

const series = (result: ReturnType<typeof parseVariablesCsv>, name: string): string =>
  (result.variables.find((v) => v.name === name)?.points ?? []).map((p) => `${p.month}=${p.value}`).join(' ')

describe('parseVariablesCsv with the synthetic fixtures', () => {
  it('reads the main file (ISO months, dot decimals, empty cells = no value)', () => {
    const result = parseVariablesCsv(fixture('e2e-main.csv'))

    expect(result.errors).toEqual([])
    expect(result.delimiter).toBe(',')
    expect(result.decimal).toEqual({ value: 'dot', ambiguous: false })
    expect(result.months).toHaveLength(24)
    expect(result.variables.map((v) => `${v.name}:${v.type}:${v.points.length}`)).toEqual([
      'E2E Revenue Actual:ACTUAL:12',
      'E2E Revenue Budget:BUDGET:24',
      'E2E Units:INPUT:12',
      'E2E Price:INPUT:12',
      'E2E Growth:INPUT:12',
      'E2E Gappy:INPUT:11',
      'E2E Cost Actual:ACTUAL:12',
      'E2E Cost Budget:BUDGET:24',
      'E2E Headcount:UNKNOWN:24',
    ])
    expect(series(result, 'E2E Price').split(' ').slice(0, 3)).toEqual(['2026-01=10', '2026-02=10.5', '2026-03=11'])
    expect(series(result, 'E2E Gappy')).not.toContain('2026-06')
  })

  it('reads German numbers and dates (semicolons, 1.235,56, 01.01.2026)', () => {
    const result = parseVariablesCsv(fixture('e2e-german.csv'))

    expect(result.errors).toEqual([])
    expect(result.delimiter).toBe(';')
    expect(result.decimal).toEqual({ value: 'comma', ambiguous: false })
    expect(series(result, 'E2E DE Price').split(' ').slice(0, 2)).toEqual(['2026-01=1235.56', '2026-02=1236.56'])
    expect(series(result, 'E2E DE Small').split(' ').slice(0, 2)).toEqual(['2026-01=13.5', '2026-02=14.5'])
  })

  it('reads quoted cells, CRLF, MM/yyyy, lower-case types, negatives and scientific notation', () => {
    const result = parseVariablesCsv(fixture('e2e-edge.csv'))

    expect(result.errors).toEqual([])
    expect(result.months).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(series(result, 'E2E Edge Negative')).toBe('2026-01=-100 2026-02=-200.5 2026-03=-300')
    expect(series(result, 'E2E Edge Sci')).toBe('2026-01=1000 2026-02=250 2026-03=30')
    expect(series(result, 'E2E Edge, Quoted')).toBe('2026-01=1 2026-02=2 2026-03=3')
    expect(series(result, 'E2E Edge Thousands')).toBe('2026-01=1234.5 2026-02=2000 2026-03=3000')
    expect(result.variables.find((v) => v.name === 'E2E Edge Negative')?.type).toBe('INPUT')
  })

  it('reports two columns that fall into the same month instead of mixing date orders', () => {
    // 03/04/2026 alone is open; 13/04/2026 forces day/month, so both columns are April 2026
    const result = parseVariablesCsv(fixture('e2e-ambiguous-dates.csv'))

    expect(result.dateOrder).toEqual({ value: 'DMY', relevant: true, ambiguous: false })
    expect(result.errors.map((e) => e.message)).toEqual(['Two columns fall into 04/2026; each month may appear once.'])
  })
})

describe('format detection', () => {
  it('asks for the date order when every slash date could be either', () => {
    const csv = 'Variable,Type,03/04/2026,05/06/2026\nX,INPUT,1,2\n'

    const detected = parseVariablesCsv(csv)
    expect(detected.dateOrder).toEqual({ value: 'DMY', relevant: true, ambiguous: true })
    expect(detected.months).toEqual(['2026-04', '2026-06'])

    const us = parseVariablesCsv(csv, { dateOrder: 'MDY' })
    expect(us.dateOrder.ambiguous).toBe(false)
    expect(us.months).toEqual(['2026-03', '2026-05'])
  })

  it('treats 1.234 as open and follows the delimiter until the user decides', () => {
    expect(parseVariablesCsv('Variable;Type;2026-01\nX;INPUT;1.234\n').decimal).toEqual({ value: 'comma', ambiguous: true })
    expect(series(parseVariablesCsv('Variable;Type;2026-01\nX;INPUT;1.234\n'), 'X')).toBe('2026-01=1234')
    expect(series(parseVariablesCsv('Variable;Type;2026-01\nX;INPUT;1.234\n', { decimal: 'dot' }), 'X')).toBe('2026-01=1.234')
    expect(parseVariablesCsv('Variable,Type,2026-01\nX,INPUT,1000\n').decimal).toEqual({ value: 'dot', ambiguous: false })
  })

  it('reports cells that do not fit the chosen format instead of truncating them', () => {
    const result = parseVariablesCsv('Variable;Type;2026-01;2026-02\nX;INPUT;10,5;10.5\n')

    expect(result.decimal.ambiguous).toBe(true)
    expect(result.errors).toEqual([
      { row: 2, column: '2026-02', message: '"10.5" in "X" is not a number in the 1.234,56 format.' },
    ])
  })
})

describe('row and header errors', () => {
  it('rejects an unknown type, duplicate names and an empty name, but keeps the valid rows', () => {
    const result = parseVariablesCsv('Variable,Type,2026-01\nA,INPUT,1\nB,FORECAST,2\na,INPUT,3\n,INPUT,4\n')

    expect(result.variables.map((v) => v.name)).toEqual(['A'])
    expect(result.errors.map((e) => `${e.row}: ${e.message}`)).toEqual([
      '3: Type "FORECAST" of "B" must be ACTUAL, BUDGET, INPUT or UNKNOWN.',
      '4: "a" already appears in row 2.',
      '5: The variable name is empty.',
    ])
  })

  it('needs Variable and Type columns and at least one month column', () => {
    expect(parseVariablesCsv('Name,Kind,Jan 2026\nX,INPUT,1\n').errors[0].message).toMatch(/"Variable" column and a "Type" column/)
    expect(parseVariablesCsv('Variable,Type,Total\nX,INPUT,1\n').errors[0].message).toMatch(/No month columns found/)
    expect(parseVariablesCsv('').errors[0].message).toBe('The file is empty.')
  })

  it('warns about ignored non-month columns', () => {
    const result = parseVariablesCsv('Variable,Type,Unit,2026-01\nX,INPUT,EUR,1\n')

    expect(result.errors).toEqual([])
    expect(result.warnings.map((w) => w.message)).toEqual(['Column "Unit" is not a month and is ignored.'])
  })
})

describe('building blocks', () => {
  it('parses quoted cells with delimiters, escaped quotes and line breaks', () => {
    expect(parseCsvRecords('a,"b, c","say ""hi""","line\nbreak"\r\nx,y\n', ',')).toEqual([
      ['a', 'b, c', 'say "hi"', 'line\nbreak'],
      ['x', 'y'],
    ])
  })

  it.each([
    ['2026-01-31', '2026-01'],
    ['2026-1', '2026-01'],
    ['2026/03/15', '2026-03'],
    ['31.12.2025', '2025-12'],
    ['01.12.25', '2025-12'],
    ['12.2025', '2025-12'],
    ['12/2025', '2025-12'],
    ['Jan 2026', '2026-01'],
    ['März 2026', '2026-03'],
    ['Dez-25', '2025-12'],
    ['oct 2026', '2026-10'],
  ])('reads the header %s as %s', (header, month) => {
    expect(parseHeaderDate(header)).toEqual({ kind: 'month', month })
  })

  it.each(['2026-13', '31.02.2026', 'Total', 'Q1 2026'])('does not read %s as a month', (header) => {
    expect(parseHeaderDate(header)).toBeNull()
  })

  it.each([
    ['1,234.56', 'dot', 1234.56],
    ['-0.5', 'dot', -0.5],
    ['2.5e2', 'dot', 250],
    ['(1,000.00)', 'dot', -1000],
    ['1 234.5', 'dot', 1234.5],
    ['1.234,56', 'comma', 1234.56],
    ['-13,5', 'comma', -13.5],
    ['1.234', 'comma', 1234],
  ] as const)('parses %s with %s decimals as %s', (raw, decimal, expected) => {
    expect(parseNumberCell(raw, decimal)).toBe(expected)
  })

  it.each([
    ['1,234.5', 'comma'],
    ['12,5', 'dot'],
    ['5%', 'dot'],
    ['abc', 'dot'],
    ['1.2.3', 'dot'],
  ] as const)('rejects %s with %s decimals', (raw, decimal) => {
    expect(parseNumberCell(raw, decimal)).toBeNull()
  })
})
