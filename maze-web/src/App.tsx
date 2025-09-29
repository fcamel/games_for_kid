import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Point = { x: number; y: number }
// Removed unused Segment type
type Rect = { x: number; y: number; w: number; h: number }

const MAZE_WIDTH = 1600
const MAZE_HEIGHT = 1200
const BASE_PLAYER_RADIUS = 10

function App() {
  const [player, setPlayer] = useState<Point>({ x: 40, y: 40 })
  const [isDragging, setIsDragging] = useState(false)
  const [won, setWon] = useState(false)
  const [keyCount, setKeyCount] = useState(0)
  const [playerImgOk, setPlayerImgOk] = useState(true)
  const [exitImgOk, setExitImgOk] = useState(true)
  const [keyImgOk, setKeyImgOk] = useState(true)
  const [lockImgOk, setLockImgOk] = useState(true)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Live refs to avoid stale closures
  const keyCountRef = useRef(0)
  const playerRef = useRef<Point>({ x: 0, y: 0 })
  useEffect(() => { keyCountRef.current = keyCount }, [keyCount])
  useEffect(() => { playerRef.current = player }, [player])

  // Maze loaded from text file as rows of characters
  const [cells, setCells] = useState<string[]>([])

  // Keyboard movement state
  const keysRef = useRef<Set<string>>(new Set())
  const velocityRef = useRef<Point>({ x: 0, y: 0 })
  const lastTsRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const rafLoopIdRef = useRef<number>(0)

  useEffect(() => {
    fetch('/mazes/000.txt')
      .then((r) => r.text())
      .then((txt) => {
        // Keep spaces — they represent roads. Only normalize newlines.
        const lines = txt.replace(/\r/g, '').split('\n')
        const filtered = lines.filter((l) => l.length > 0)
        setCells(filtered)
      })
      .catch(() => {
        // minimal fallback using S/E/K/L/space format
        setCells([
          '################',
          '#S   K         #',
          '# ###### ##### #',
          '# #    # #   # #',
          '# # ## # # # # #',
          '#   ##   # #   #',
          '#### ##### # ####',
          '#     L     E   #',
          '################',
        ])
      })
  }, [])

  // --- Procedural maze generation (DFS backtracker) ---
  function generateMazeForCanvas(): string[] {
    // Choose a target cell size and compute odd grid dimensions
    const targetCellPx = 40
    let cols = Math.max(3, Math.floor(MAZE_WIDTH / targetCellPx))
    let rows = Math.max(3, Math.floor(MAZE_HEIGHT / targetCellPx))
    if (cols % 2 === 0) cols -= 1
    if (rows % 2 === 0) rows -= 1

    // Build grid filled with walls '#'
    const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill('#'))

    // Visited cells on odd coords
    const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))

    function inBounds(x: number, y: number) {
      return x > 0 && x < cols - 1 && y > 0 && y < rows - 1
    }

    function carve(x: number, y: number) {
      visited[y][x] = true
      grid[y][x] = ' '
      const dirs: Point[] = [
        { x: 0, y: -2 },
        { x: 2, y: 0 },
        { x: 0, y: 2 },
        { x: -2, y: 0 },
      ]
      // shuffle
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = dirs[i]
        dirs[i] = dirs[j]
        dirs[j] = tmp
      }
      for (const d of dirs) {
        const nx = x + d.x
        const ny = y + d.y
        if (!inBounds(nx, ny) || visited[ny][nx]) continue
        // knock down wall between
        grid[y + d.y / 2][x + d.x / 2] = ' '
        carve(nx, ny)
      }
    }

    // Start at (1,1)
    carve(1, 1)

    // Place S and E
    grid[1][1] = 'S'
    grid[rows - 2][cols - 2] = 'E'

    // Drop a key and a lock
    grid[1][Math.min(cols - 3, 3)] = 'K'
    grid[rows - 2][Math.max(2, cols - 4)] = 'L'

    return grid.map((r) => r.join(''))
  }

  const maze = useMemo(() => {
    if (cells.length === 0) return { rects: [] as Rect[], start: null as Point | null, exit: null as Rect | null, keyRects: [] as Rect[], lockRects: [] as Rect[], cellSize: 0, rows: 0, cols: 0, offsetX: 0, offsetY: 0 }
    const rows = cells.length
    const cols = Math.max(...cells.map((r) => r.length))

    // Base size to fit
    const baseSize = Math.floor(Math.min(MAZE_WIDTH / cols, MAZE_HEIGHT / rows))
    // Try to grow by 1px if still fits
    let size = baseSize
    if (cols * (baseSize + 1) <= MAZE_WIDTH && rows * (baseSize + 1) <= MAZE_HEIGHT) {
      size = baseSize + 1
    }

    // Center the maze
    const contentW = cols * size
    const contentH = rows * size
    const offsetX = Math.floor((MAZE_WIDTH - contentW) / 2)
    const offsetY = Math.floor((MAZE_HEIGHT - contentH) / 2)

    const rects: Rect[] = []
    const keyRects: Rect[] = []
    const lockRects: Rect[] = []
    let start: Point | null = null
    let exit: Rect | null = null

    for (let y = 0; y < rows; y++) {
      const row = cells[y]
      for (let x = 0; x < cols; x++) {
        const ch = row[x] ?? ' '
        const px = offsetX + x * size
        const py = offsetY + y * size
        if (ch === '#') {
          rects.push({ x: px, y: py, w: size, h: size })
        } else if (ch === 'S') {
          start = { x: px + size / 2, y: py + size / 2 }
        } else if (ch === 'E') {
          exit = { x: px + size * 0.1, y: py + size * 0.1, w: size * 0.8, h: size * 0.8 }
        } else if (ch === 'K') {
          keyRects.push({ x: px + size * 0.15, y: py + size * 0.15, w: size * 0.7, h: size * 0.7 })
        } else if (ch === 'L') {
          lockRects.push({ x: px + size * 0.1, y: py + size * 0.1, w: size * 0.8, h: size * 0.8 })
        }
      }
    }
    return { rects, start, exit, keyRects, lockRects, cellSize: size, rows, cols, offsetX, offsetY }
  }, [cells])

  // Dynamic player radius based on cell size (fallback to base)
  const playerRadius = useMemo(() => {
    return Math.max(BASE_PLAYER_RADIUS, Math.floor(maze.cellSize * 0.35))
  }, [maze.cellSize])

  // Dynamic entities (keys and locks that remain)
  const [keysLeft, setKeysLeft] = useState<Rect[]>([])
  const [locksLeft, setLocksLeft] = useState<Rect[]>([])
  const keysLeftRef = useRef<Rect[]>([])
  const locksLeftRef = useRef<Rect[]>([])
  useEffect(() => { keysLeftRef.current = keysLeft }, [keysLeft])
  useEffect(() => { locksLeftRef.current = locksLeft }, [locksLeft])

  // When a start is present, place the player there and reset dynamic state
  useEffect(() => {
    if (maze.start) setPlayer(maze.start)
    setWon(false)
    setKeyCount(0)
    setKeysLeft(maze.keyRects)
    setLocksLeft(maze.lockRects)
    console.log('[reset] start', maze.start, 'keys', maze.keyRects.length, 'locks', maze.lockRects.length)
  }, [maze])

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
  }

  function circleIntersectsRect(center: Point, rect: Rect, radius: number) {
    const closestX = clamp(center.x, rect.x, rect.x + rect.w)
    const closestY = clamp(center.y, rect.y, rect.y + rect.h)
    const dx = center.x - closestX
    const dy = center.y - closestY
    return dx * dx + dy * dy <= radius * radius
  }

  function pointInsideRect(point: Point, rect: Rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h
  }

  function collidesWithWalls(next: Point) {
    for (const r of maze.rects) {
      if (circleIntersectsRect(next, r, playerRadius)) return true
    }
    // Locks behave as walls only when no keys held
    if (keyCountRef.current <= 0) {
      for (const lr of locksLeftRef.current) {
        if (circleIntersectsRect(next, lr, playerRadius * 0.9)) return true
      }
    }
    return false
  }

  function getSvgPoint(evt: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX
    pt.y = evt.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const inv = ctm.inverse()
    const { x, y } = pt.matrixTransform(inv)
    return { x, y }
  }

  // Shared post-move checks for pickups, unlocking, win
  function postMoveChecks(p: Point, source: 'mouse' | 'keyboard') {
    // Use refs for latest arrays to avoid stale captures
    const keysNow = keysLeftRef.current
    const locksNow = locksLeftRef.current

    // Key pickup (idempotent + immediate ref update)
    const keyIdx = keysNow.findIndex((kr) => pointInsideRect(p, kr))
    if (keyIdx !== -1) {
      const kr = keysNow[keyIdx]
      console.log('[pickup-hit]', source, 'playerState', player, 'playerRef', playerRef.current, 'calcPoint', p, 'keyRect', { x: kr.x, y: kr.y, w: kr.w, h: kr.h })
      const remaining = keysNow.filter((_, i) => i !== keyIdx)
      keysLeftRef.current = remaining
      setKeysLeft(remaining)
      const nextCount = keyCountRef.current + 1
      keyCountRef.current = nextCount
      console.log('[pickup] keyCount', keyCount, '->', nextCount)
      setKeyCount(nextCount)
    }

    // Unlock (idempotent + immediate ref update)
    if (keyCountRef.current > 0) {
      const lockIdx = locksNow.findIndex((lr) => pointInsideRect(p, lr))
      if (lockIdx !== -1) {
        const lr = locksNow[lockIdx]
        console.log('[unlock-hit]', source, 'playerState', player, 'playerRef', playerRef.current, 'calcPoint', p, 'lockRect', { x: lr.x, y: lr.y, w: lr.w, h: lr.h }, 'keyCountRef', keyCountRef.current)
        const remainingLocks = locksNow.filter((_, i) => i !== lockIdx)
        locksLeftRef.current = remainingLocks
        setLocksLeft(remainingLocks)
        const nextCount = Math.max(0, keyCountRef.current - 1)
        console.log('[unlock] keyCount', keyCountRef.current, '->', nextCount)
        keyCountRef.current = nextCount
        setKeyCount(nextCount)
      }
    }

    if (maze.exit && pointInsideRect(p, maze.exit)) {
      console.log('[win]', source, 'pos', p)
      setWon(true)
    }
  }

  // Movement helpers
  function moveWithCollision(from: Point, dx: number, dy: number): Point {
    const maxStep = 3
    const distance = Math.hypot(dx, dy)
    if (distance === 0) return from
    const steps = Math.ceil(distance / maxStep)
    let lastAllowed: Point = from
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const cand = { x: from.x + dx * t, y: from.y + dy * t }
      if (collidesWithWalls(cand)) break
      lastAllowed = cand
    }
    return lastAllowed
  }

  function onPointerDown(evt: React.MouseEvent<any>) {
    evt.preventDefault()
    setIsDragging(true)
  }

  function onPointerUp() {
    setIsDragging(false)
  }

  function onMouseMove(evt: React.MouseEvent<SVGSVGElement>) {
    if (!isDragging || won) return
    const p = getSvgPoint(evt)
    const target = { x: p.x, y: p.y }

    const dx = target.x - playerRef.current.x
    const dy = target.y - playerRef.current.y
    const next = moveWithCollision(playerRef.current, dx, dy)
    if (next.x !== playerRef.current.x || next.y !== playerRef.current.y) {
      setPlayer(next)
      postMoveChecks(next, 'mouse')
    }
  }

  useEffect(() => {
    const handleUp = () => setIsDragging(false)
    window.addEventListener('mouseup', handleUp)
    return () => window.removeEventListener('mouseup', handleUp)
  }, [])

  function resetToStart() {
    if (maze.start) setPlayer(maze.start)
    setWon(false)
    setKeyCount(0)
    setKeysLeft(maze.keyRects)
    setLocksLeft(maze.lockRects)
    console.log('[reset-click]')
  }

  function newMaze() {
    const generated = generateMazeForCanvas()
    setWon(false)
    setKeyCount(0)
    setCells(generated)
    console.log('[new-maze] generated')
  }

  // Keyboard listeners and animation loop
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (won) return
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }
      keysRef.current.add(e.key)
    }
    function onKeyUp(e: KeyboardEvent) {
      keysRef.current.delete(e.key)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [won])

  useEffect(() => {
    const ACCEL = 1200 // px/s^2
    const MAX_SPEED = 500 // px/s
    const FRICTION = 1800 // px/s^2

    const loopId = ++rafLoopIdRef.current
    console.log('[raf-setup]', loopId)
    function tick(ts: number) {
      if (rafRef.current !== null) rafRef.current = null
      const last = lastTsRef.current
      lastTsRef.current = ts
      if (last == null) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const dt = Math.min(0.033, (ts - last) / 1000) // clamp to 33ms

      if (!won && !isDragging) {
        // Determine desired acceleration from keys
        let ax = 0
        let ay = 0
        const keys = keysRef.current
        if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) ax -= ACCEL
        if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) ax += ACCEL
        if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) ay -= ACCEL
        if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) ay += ACCEL

        // Update velocity
        let vx = velocityRef.current.x + ax * dt
        let vy = velocityRef.current.y + ay * dt

        // Apply friction if no input on an axis
        if (ax === 0) {
          const sign = Math.sign(vx)
          const mag = Math.max(0, Math.abs(vx) - FRICTION * dt)
          vx = mag * sign
        }
        if (ay === 0) {
          const sign = Math.sign(vy)
          const mag = Math.max(0, Math.abs(vy) - FRICTION * dt)
          vy = mag * sign
        }

        // Clamp speed
        const speed = Math.hypot(vx, vy)
        if (speed > MAX_SPEED) {
          const scale = MAX_SPEED / speed
          vx *= scale
          vy *= scale
        }
        velocityRef.current = { x: vx, y: vy }

        // Move with collision
        const dx = vx * dt
        const dy = vy * dt
        if (dx !== 0 || dy !== 0) {
          const next = moveWithCollision(playerRef.current, dx, dy)
          if (next.x !== playerRef.current.x || next.y !== playerRef.current.y) {
            setPlayer(next)
            postMoveChecks(next, 'keyboard')
          } else {
            // collided: stop velocity in that direction(s)
            if (dx !== 0) velocityRef.current.x = 0
            if (dy !== 0) velocityRef.current.y = 0
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
      console.log('[raf-cleanup]', loopId)
    }
  }, [player, keysLeft, locksLeft, maze.exit, isDragging, won, keyCount])

  const playerSize = playerRadius * 2

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 16 }}>
      <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18, textAlign: 'left' }}>Panel</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* @ts-ignore */}
          <img src="/images/key.webp" width={24} height={24} alt="key" onError={() => setKeyImgOk(false)} />
          <span style={{ fontSize: 16 }}>Keys: {keyCount}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={newMaze} style={{ padding: '6px 10px' }}>New Maze</button>
          <button onClick={resetToStart} style={{ padding: '6px 10px' }}>Reset</button>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={MAZE_WIDTH}
        height={MAZE_HEIGHT}
        viewBox={`0 0 ${MAZE_WIDTH} ${MAZE_HEIGHT}`}
        onMouseMove={onMouseMove}
        onMouseUp={onPointerUp}
        style={{ border: '1px solid #ccc', touchAction: 'none', background: '#fff' }}
      >
        {/* Maze walls from text grid (# = wall) */}
        {maze.rects.map((r, idx) => (
          <rect key={idx} x={r.x} y={r.y} width={r.w} height={r.h} fill="#222" />
        ))}

        {/* Locks */}
        {locksLeft.map((r, idx) => (
          lockImgOk ? (
            // @ts-ignore React accepts xlinkHref on SVG elements
            <image key={`lock-${idx}`} href="/images/lock.webp" xlinkHref="/images/lock.webp" x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="xMidYMid meet" onError={() => setLockImgOk(false)} />
          ) : (
            <rect key={`lock-${idx}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="#8b0000" />
          )
        ))}

        {/* Keys */}
        {keysLeft.map((r, idx) => (
          keyImgOk ? (
            // @ts-ignore React accepts xlinkHref on SVG elements
            <image key={`key-${idx}`} href="/images/key.webp" xlinkHref="/images/key.webp" x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="xMidYMid meet" onError={() => setKeyImgOk(false)} />
          ) : (
            <rect key={`key-${idx}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="#daa520" />
          )
        ))}

        {/* Exit */}
        {maze.exit ? (
          exitImgOk ? (
            // @ts-ignore React accepts xlinkHref on SVG elements
            <image href="/images/zelda.png" xlinkHref="/images/zelda.png" x={maze.exit.x} y={maze.exit.y} width={maze.exit.w} height={maze.exit.h} preserveAspectRatio="xMidYMid meet" onError={() => setExitImgOk(false)} />
          ) : (
            <rect x={maze.exit.x} y={maze.exit.y} width={maze.exit.w} height={maze.exit.h} fill="#28a745" />
          )
        ) : null}

        {/* Player */}
        {playerImgOk ? (
          // @ts-ignore React accepts xlinkHref on SVG elements
          <image
            href="/images/link.jpeg"
            xlinkHref="/images/link.jpeg"
            x={player.x - playerSize / 2}
            y={player.y - playerSize / 2}
            width={playerSize}
            height={playerSize}
            preserveAspectRatio="xMidYMid meet"
            onMouseDown={onPointerDown}
            onError={() => setPlayerImgOk(false)}
            style={{ cursor: 'grab' }}
            className={won ? 'pulse' : ''}
          />
        ) : (
          <circle
            className={won ? 'pulse' : ''}
            cx={player.x}
            cy={player.y}
            r={playerRadius}
            fill="#1e90ff"
            stroke="#0b62c4"
            strokeWidth={2}
            onMouseDown={onPointerDown}
            style={{ cursor: 'grab' }}
          />
        )}
      </svg>

      {won && (
        <div className="win-overlay" onClick={resetToStart}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>You Win!</div>
            <button onClick={resetToStart} style={{ padding: '8px 14px', fontSize: 16 }}>Play again</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
