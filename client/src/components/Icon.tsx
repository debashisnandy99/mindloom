/** A 24×24 line icon expressed as one or two SVG path `d` strings. */
export function Icon({
  d,
  d2,
  size = 20,
  sw = 2,
  fill = 'none',
  stroke = 'currentColor',
}: {
  d: string
  d2?: string
  size?: number
  sw?: number
  fill?: string
  stroke?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
      {d2 ? <path d={d2} /> : null}
    </svg>
  )
}
