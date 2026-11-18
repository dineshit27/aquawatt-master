"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface CircuitNode {
  id: string
  x: number
  y: number
  label?: string
  sublabel?: string
  icon?: React.ReactNode
  status?: "active" | "inactive" | "processing" | "error" | "operational" | "pending" | "planned"
  size?: "sm" | "md" | "lg"
}

export interface CircuitConnection {
  from: string
  to: string
  animated?: boolean
  bidirectional?: boolean
  dashed?: boolean
  arrow?: boolean
  color?: string
  pulseColor?: string
}

export interface CircuitBoardProps extends React.HTMLAttributes<HTMLDivElement> {
  nodes: CircuitNode[]
  connections: CircuitConnection[]
  width?: number
  height?: number
  gridSize?: number
  showGrid?: boolean
  showArrows?: boolean
  gridColor?: string
  traceColor?: string
  pulseColor?: string
  nodeColor?: string
  pulseSpeed?: number
  traceWidth?: number
  /** Force a specific theme variant. Defaults to auto-detect from system. */
  variant?: "light" | "dark" | "auto"
}

export function CircuitBoard({
  nodes,
  connections,
  width = 600,
  height = 400,
  gridSize = 20,
  showGrid = true,
  showArrows = false,
  gridColor,
  traceColor,
  pulseColor,
  nodeColor,
  pulseSpeed = 2,
  traceWidth = 2,
  variant = "auto",
  className,
  ...props
}: CircuitBoardProps) {
  // Theme-aware color defaults
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    if (variant !== "auto") {
      setIsDark(variant === "dark")
      return
    }

    // Check for dark class on html/body
    const checkTheme = () => {
      const isDarkMode =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark")
      setIsDark(isDarkMode)
    }

    checkTheme()

    // Listen for changes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] })

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    mediaQuery.addEventListener("change", checkTheme)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener("change", checkTheme)
    }
  }, [variant])

  // Compute theme-aware colors
  const computedGridColor = gridColor || (isDark ? "rgba(163, 163, 163, 0.08)" : "rgba(64, 64, 64, 0.12)")
  const computedTraceColor = traceColor || (isDark ? "rgba(163, 163, 163, 0.25)" : "rgba(64, 64, 64, 0.35)")
  const computedPulseColor = pulseColor || (isDark ? "rgba(163, 163, 163, 0.6)" : "rgba(64, 64, 64, 0.7)")
  const computedNodeColor = nodeColor || (isDark ? "rgba(163, 163, 163, 0.5)" : "rgba(64, 64, 64, 0.6)")

  const instanceId = React.useId().replace(/:/g, "")
  const glowFilterId = `circuit-glow-${instanceId}`
  const gridPatternId = `circuit-grid-${instanceId}`

  const nodeMap = React.useMemo(() => {
    return new Map(nodes.map((node) => [node.id, node]))
  }, [nodes])

  const getNodeSize = React.useCallback((size?: CircuitNode["size"]) => {
    switch (size) {
      case "sm":
        return 24
      case "lg":
        return 48
      default:
        return 36
    }
  }, [])

  const calculatePath = React.useCallback(
    (from: CircuitNode, to: CircuitNode): { d: string; length: number } => {
      const fromSize = getNodeSize(from.size) / 2 + 4
      const toSize = getNodeSize(to.size) / 2 + 4

      const dx = to.x - from.x
      const dy = to.y - from.y

      // Calculate start and end points offset from node centers
      let startX = from.x
      let startY = from.y
      let endX = to.x
      let endY = to.y

      // Create circuit-like paths with right angles
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal first, then vertical
        startX = from.x + (dx > 0 ? fromSize : -fromSize)
        endX = to.x + (dx > 0 ? -toSize : toSize)
        const midX = from.x + dx / 2
        const d = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`
        const length = Math.max(
          20,
          Math.abs(midX - startX) + Math.abs(endY - startY) + Math.abs(endX - midX)
        )
        return { d, length }
      } else {
        // Vertical first, then horizontal
        startY = from.y + (dy > 0 ? fromSize : -fromSize)
        endY = to.y + (dy > 0 ? -toSize : toSize)
        const midY = from.y + dy / 2
        const d = `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`
        const length = Math.max(
          20,
          Math.abs(midY - startY) + Math.abs(endX - startX) + Math.abs(endY - midY)
        )
        return { d, length }
      }
    },
    [getNodeSize]
  )

  const getStatusColor = (status?: CircuitNode["status"]) => {
    if (isDark) {
      switch (status) {
        case "operational":
          return "#10b981"
        case "pending":
          return "#f59e0b"
        case "planned":
          return "#64748b"
        case "active":
          return "rgba(163, 163, 163, 0.7)"
        case "processing":
          return "rgba(163, 163, 163, 0.5)"
        case "error":
          return "rgba(120, 113, 108, 0.6)"
        default:
          return computedNodeColor
      }
    } else {
      switch (status) {
        case "operational":
          return "#15803d"
        case "pending":
          return "#b45309"
        case "planned":
          return "#64748b"
        case "active":
          return "rgba(64, 64, 64, 0.8)"
        case "processing":
          return "rgba(64, 64, 64, 0.6)"
        case "error":
          return "rgba(180, 83, 83, 0.7)"
        default:
          return computedNodeColor
      }
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        className
      )}
      style={{ width, height }}
      {...props}
    >
      <svg
        width={width}
        height={height}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Glow filter in userSpaceOnUse so purely horizontal/vertical traces never clip to zero bounding box */}
          <filter
            id={glowFilterId}
            filterUnits="userSpaceOnUse"
            x={-40}
            y={-40}
            width={width + 80}
            height={height + 80}
          >
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Grid pattern */}
          {showGrid && (
            <pattern
              id={gridPatternId}
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={gridSize / 2} cy={gridSize / 2} r="0.5" fill={computedGridColor} />
            </pattern>
          )}

          {/* Directional arrowhead markers per connection */}
          {connections.map((conn, i) => {
            const arrowColor = conn.pulseColor || conn.color || computedTraceColor
            return (
              <marker
                key={`arrow-${i}`}
                id={`circuit-arrow-${instanceId}-${i}`}
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 1 1.5 L 9 5 L 1 8.5 z" fill={arrowColor} />
              </marker>
            )
          })}
        </defs>

        {/* Grid background */}
        {showGrid && (
          <rect width={width} height={height} fill={`url(#${gridPatternId})`} />
        )}

        {/* Connection traces */}
        {connections.map((conn, i) => {
          const fromNode = nodeMap.get(conn.from)
          const toNode = nodeMap.get(conn.to)

          if (!fromNode || !toNode) return null

          const { d: path, length } = calculatePath(fromNode, toNode)
          const hasArrow = conn.arrow ?? showArrows
          const pulseStroke = conn.pulseColor || computedPulseColor
          const dashLen = Math.max(18, Math.min(34, Math.round(length * 0.28)))
          const gapLen = Math.round(length * 1.15)
          const period = dashLen + gapLen
          const staggerDelay = ((i * 0.25) % pulseSpeed).toFixed(2)

          return (
            <g key={`connection-${i}`}>
              {/* Base trace */}
              <motion.path
                d={path}
                fill="none"
                stroke={conn.color || computedTraceColor}
                strokeWidth={traceWidth}
                strokeDasharray={conn.dashed ? "5 4" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd={hasArrow ? `url(#circuit-arrow-${instanceId}-${i})` : undefined}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.85, delay: i * 0.08 }}
              />

              {/* Animated electricity pulse along exact path length */}
              {conn.animated !== false && (
                <>
                  <path
                    d={path}
                    fill="none"
                    stroke={pulseStroke}
                    strokeWidth={traceWidth + 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={`url(#${glowFilterId})`}
                    strokeDasharray={`${dashLen} ${gapLen}`}
                    strokeDashoffset={dashLen}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from={dashLen}
                      to={dashLen - period}
                      dur={`${pulseSpeed}s`}
                      begin={`${staggerDelay}s`}
                      repeatCount="indefinite"
                    />
                  </path>
                  <circle
                    r={traceWidth + 1.2}
                    fill={pulseStroke}
                    filter={`url(#${glowFilterId})`}
                    opacity="0.95"
                  >
                    <animateMotion
                      path={path}
                      dur={`${pulseSpeed}s`}
                      begin={`${staggerDelay}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </>
              )}

              {/* Bidirectional pulse */}
              {conn.bidirectional && (
                <path
                  d={path}
                  fill="none"
                  stroke={pulseStroke}
                  strokeWidth={traceWidth + 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={`url(#${glowFilterId})`}
                  strokeDasharray={`${dashLen} ${gapLen}`}
                  strokeDashoffset={dashLen - period}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from={dashLen - period}
                    to={dashLen}
                    dur={`${pulseSpeed}s`}
                    begin={`${((Number(staggerDelay) + pulseSpeed / 2) % pulseSpeed).toFixed(2)}s`}
                    repeatCount="indefinite"
                  />
                </path>
              )}
            </g>
          )
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node, i) => {
        const size = getNodeSize(node.size)
        const statusColor = getStatusColor(node.status)

        return (
          <motion.div
            key={node.id}
            className="absolute flex items-center justify-center"
            style={{
              left: node.x - size / 2,
              top: node.y - size / 2,
              width: size,
              height: size,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.07 + 0.25, type: "spring" }}
          >
            {/* Node background with pulse */}
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{ backgroundColor: statusColor }}
              animate={
                node.status === "processing"
                  ? { opacity: [0.2, 0.5, 0.2] }
                  : { opacity: 0.18 }
              }
              transition={
                node.status === "processing"
                  ? { duration: 1.5, repeat: Infinity }
                  : {}
              }
            />

            {/* Node border */}
            <div
              className={cn(
                "absolute inset-0 rounded-lg border-2",
                node.status === "planned" && "border-dashed"
              )}
              style={{ borderColor: statusColor }}
            />

            {/* Inner glow for active / operational nodes */}
            {(node.status === "active" || node.status === "operational") && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{
                  boxShadow: `0 0 16px ${statusColor}2e, inset 0 0 6px ${statusColor}18`,
                }}
                animate={{ opacity: [0.55, 0.95, 0.55] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
            )}

            {/* Node content */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {node.icon && (
                <div style={{ color: statusColor }}>{node.icon}</div>
              )}
            </div>

            {/* Label & Sublabel */}
            {(node.label || node.sublabel) && (
              <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-[144px] text-center pointer-events-none">
                {node.label && (
                  <div
                    className="text-[11px] font-semibold leading-tight"
                    style={{ color: statusColor }}
                  >
                    {node.label}
                  </div>
                )}
                {node.sublabel && (
                  <div
                    className={cn(
                      "text-[9.5px] font-mono leading-tight mt-0.5 break-words",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}
                  >
                    {node.sublabel}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

// Pre-built circuit patterns
export interface CircuitPatternProps extends Omit<CircuitBoardProps, "nodes" | "connections"> {
  pattern: "data-flow" | "network" | "processor" | "tree"
}

export function CircuitPattern({ pattern, ...props }: CircuitPatternProps) {
  const patterns = {
    "data-flow": {
      nodes: [
        { id: "input", x: 50, y: 200, label: "Input", status: "active" as const },
        { id: "process1", x: 200, y: 100, label: "Process", status: "processing" as const },
        { id: "process2", x: 200, y: 300, label: "Validate", status: "active" as const },
        { id: "merge", x: 400, y: 200, label: "Merge", status: "active" as const },
        { id: "output", x: 550, y: 200, label: "Output", status: "active" as const },
      ],
      connections: [
        { from: "input", to: "process1", animated: true },
        { from: "input", to: "process2", animated: true },
        { from: "process1", to: "merge", animated: true },
        { from: "process2", to: "merge", animated: true },
        { from: "merge", to: "output", animated: true },
      ],
    },
    network: {
      nodes: [
        { id: "server", x: 300, y: 80, label: "Server", status: "active" as const, size: "lg" as const },
        { id: "client1", x: 100, y: 200, label: "Client 1", status: "active" as const },
        { id: "client2", x: 300, y: 250, label: "Client 2", status: "processing" as const },
        { id: "client3", x: 500, y: 200, label: "Client 3", status: "active" as const },
        { id: "db", x: 300, y: 350, label: "Database", status: "active" as const },
      ],
      connections: [
        { from: "server", to: "client1", bidirectional: true },
        { from: "server", to: "client2", bidirectional: true },
        { from: "server", to: "client3", bidirectional: true },
        { from: "server", to: "db", bidirectional: true },
      ],
    },
    processor: {
      nodes: [
        { id: "alu", x: 300, y: 200, label: "ALU", status: "processing" as const, size: "lg" as const },
        { id: "reg1", x: 150, y: 100, label: "R1", status: "active" as const, size: "sm" as const },
        { id: "reg2", x: 150, y: 200, label: "R2", status: "active" as const, size: "sm" as const },
        { id: "reg3", x: 150, y: 300, label: "R3", status: "active" as const, size: "sm" as const },
        { id: "cache", x: 450, y: 200, label: "Cache", status: "active" as const },
        { id: "out", x: 550, y: 200, label: "Out", status: "active" as const, size: "sm" as const },
      ],
      connections: [
        { from: "reg1", to: "alu", animated: true },
        { from: "reg2", to: "alu", animated: true },
        { from: "reg3", to: "alu", animated: true },
        { from: "alu", to: "cache", animated: true },
        { from: "cache", to: "out", animated: true },
      ],
    },
    tree: {
      nodes: [
        { id: "root", x: 300, y: 50, label: "Root", status: "active" as const },
        { id: "l1", x: 150, y: 150, label: "L1", status: "active" as const },
        { id: "r1", x: 450, y: 150, label: "R1", status: "processing" as const },
        { id: "l1l", x: 80, y: 280, label: "L1L", status: "active" as const, size: "sm" as const },
        { id: "l1r", x: 220, y: 280, label: "L1R", status: "active" as const, size: "sm" as const },
        { id: "r1l", x: 380, y: 280, label: "R1L", status: "error" as const, size: "sm" as const },
        { id: "r1r", x: 520, y: 280, label: "R1R", status: "active" as const, size: "sm" as const },
      ],
      connections: [
        { from: "root", to: "l1", animated: true },
        { from: "root", to: "r1", animated: true },
        { from: "l1", to: "l1l", animated: true },
        { from: "l1", to: "l1r", animated: true },
        { from: "r1", to: "r1l", animated: true },
        { from: "r1", to: "r1r", animated: true },
      ],
    },
  }

  const selectedPattern = patterns[pattern]
  return <CircuitBoard nodes={selectedPattern.nodes} connections={selectedPattern.connections} {...props} />
}

// Interactive circuit node for building custom circuits
export interface CircuitNodeComponentProps {
  status?: "active" | "inactive" | "processing" | "error"
  size?: "sm" | "md" | "lg"
  glowColor?: string
  children?: React.ReactNode
  className?: string
  onClick?: () => void
}

export function CircuitNode({
  status = "inactive",
  size = "md",
  glowColor,
  children,
  className,
  onClick,
}: CircuitNodeComponentProps) {
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    const checkTheme = () => {
      const isDarkMode =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark")
      setIsDark(isDarkMode)
    }

    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] })

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    mediaQuery.addEventListener("change", checkTheme)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener("change", checkTheme)
    }
  }, [])

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  const statusColors = isDark
    ? {
        active: "rgba(163, 163, 163, 0.7)",
        inactive: "rgba(115, 115, 115, 0.4)",
        processing: "rgba(163, 163, 163, 0.5)",
        error: "rgba(120, 113, 108, 0.6)",
      }
    : {
        active: "rgba(64, 64, 64, 0.8)",
        inactive: "rgba(100, 100, 100, 0.5)",
        processing: "rgba(64, 64, 64, 0.6)",
        error: "rgba(180, 83, 83, 0.7)",
      }

  const color = glowColor || statusColors[status]

  return (
    <motion.div
      className={cn(
        "relative flex items-center justify-center rounded-lg border",
        isDark ? "bg-neutral-900/50" : "bg-neutral-200/60",
        sizeClasses[size],
        className
      )}
      style={{ borderColor: color }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      {/* Pulse animation for processing state */}
      {status === "processing" && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{ backgroundColor: color }}
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Active glow */}
      {status === "active" && (
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            boxShadow: `0 0 20px ${color}60, 0 0 40px ${color}30`,
          }}
        />
      )}

      {/* Error pulse */}
      {status === "error" && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{ boxShadow: `0 0 20px ${color}80` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}

      <div className="relative z-10" style={{ color }}>
        {children}
      </div>
    </motion.div>
  )
}

// Animated trace line component for custom layouts
export interface CircuitTraceProps {
  path: string
  animated?: boolean
  color?: string
  pulseColor?: string
  width?: number
  pulseSpeed?: number
}

export function CircuitTrace({
  path,
  animated = true,
  color,
  pulseColor,
  width = 2,
  pulseSpeed = 2,
}: CircuitTraceProps) {
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    const checkTheme = () => {
      const isDarkMode =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark")
      setIsDark(isDarkMode)
    }

    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] })

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    mediaQuery.addEventListener("change", checkTheme)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener("change", checkTheme)
    }
  }, [])

  const computedColor = color || (isDark ? "rgba(163, 163, 163, 0.25)" : "rgba(64, 64, 64, 0.35)")
  const computedPulseColor = pulseColor || (isDark ? "rgba(163, 163, 163, 0.6)" : "rgba(64, 64, 64, 0.7)")
  const pathLength = 500

  return (
    <svg className="absolute inset-0 overflow-visible pointer-events-none">
      <defs>
        <filter id="traceGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Base trace */}
      <motion.path
        d={path}
        fill="none"
        stroke={computedColor}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />

      {/* Animated pulse */}
      {animated && (
        <motion.path
          d={path}
          fill="none"
          stroke={computedPulseColor}
          strokeWidth={width + 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#traceGlow)"
          strokeDasharray={`${pathLength * 0.1} ${pathLength * 0.9}`}
          initial={{ strokeDashoffset: pathLength }}
          animate={{ strokeDashoffset: -pathLength }}
          transition={{
            duration: pulseSpeed,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}
    </svg>
  )
}

export {
  type CircuitNode as CircuitNodeType,
}

export default CircuitBoard
