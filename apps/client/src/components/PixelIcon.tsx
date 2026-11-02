interface Props {
  rows: string[]
  className: string
}

export function PixelIcon({ rows, className }: Props) {
  return (
    <svg
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {rows.flatMap((row, y) =>
        [...row].flatMap((pixel, x) =>
          pixel === '#' ? [<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />] : [],
        ),
      )}
    </svg>
  )
}
