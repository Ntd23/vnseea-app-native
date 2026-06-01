// English description: Keeps the local PHP-CGI upstream ports alive for the Nginx proxy by auto-starting php-cgi workers when 9003 or 9004 are down.

import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { spawn, spawnSync } from "node:child_process"
import net from "node:net"

const host = String(process.env.PHP_UPSTREAM_HOST || "127.0.0.1").trim()
const ports = String(process.env.PHP_UPSTREAM_PORTS || "9003,9004")
  .split(",")
  .map(value => Number(value.trim()))
  .filter(value => Number.isInteger(value) && value > 0)
const checkIntervalMs = Number(process.env.PHP_UPSTREAM_CHECK_INTERVAL_MS || 5000)
const respawnCooldownMs = Number(process.env.PHP_UPSTREAM_RESPAWN_COOLDOWN_MS || 15000)

const lastSpawnByPort = new Map()

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const readCommandOutput = (command, args = []) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })

  if (result.status !== 0) {
    return ""
  }

  return String(result.stdout || "").trim()
}

const resolvePhpCgiPath = () => {
  const configuredPath = String(process.env.PHP_CGI_BIN || "").trim()

  if (configuredPath && existsSync(configuredPath)) {
    return configuredPath
  }

  const whereOutput = readCommandOutput("where.exe", ["php-cgi"])
  const firstMatch = whereOutput
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean)

  if (firstMatch && existsSync(firstMatch)) {
    return firstMatch
  }

  return ""
}

const resolvePhpIniPath = (phpCgiPath) => {
  const configuredPath = String(process.env.PHP_INI_PATH || "").trim()

  if (configuredPath && existsSync(configuredPath)) {
    return configuredPath
  }

  const siblingPhpIni = join(dirname(phpCgiPath), "php.ini")
  return existsSync(siblingPhpIni) ? siblingPhpIni : ""
}

const isPortListening = (targetHost, targetPort) =>
  new Promise((resolve) => {
    if (process.platform === "win32") {
      const output = readCommandOutput("netstat.exe", ["-ano", "-p", "tcp"])
      const escapedHost = targetHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const pattern = new RegExp(`\\s(?:${escapedHost}|0\\.0\\.0\\.0):${targetPort}\\s+\\S+\\s+LISTENING\\s+\\d+`, "i")

      resolve(pattern.test(output))
      return
    }

    const socket = new net.Socket()

    const finalize = (value) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(value)
    }

    socket.setTimeout(1200)
    socket.once("connect", () => finalize(true))
    socket.once("timeout", () => finalize(false))
    socket.once("error", () => finalize(false))
    socket.connect(targetPort, targetHost)
  })

const spawnPhpWorker = (phpCgiPath, phpIniPath, targetPort) => {
  const workingDirectory = dirname(phpCgiPath)
  const args = [
    "-c",
    phpIniPath,
    "-d",
    "display_errors=0",
    "-d",
    "log_errors=1",
    "-b",
    `${host}:${targetPort}`,
  ]

  const child = spawn(phpCgiPath, args, {
    cwd: workingDirectory,
    detached: true,
    env: {
      ...process.env,
      PHP_FCGI_CHILDREN: process.env.PHP_FCGI_CHILDREN || "1",
      PHP_FCGI_MAX_REQUESTS: process.env.PHP_FCGI_MAX_REQUESTS || "0",
    },
    stdio: "ignore",
    windowsHide: true,
  })

  child.unref()
}

const logPrefix = "[vnseea-php-upstreams]"

const ensurePhpWorkers = async () => {
  const phpCgiPath = resolvePhpCgiPath()

  if (!phpCgiPath) {
    console.error(`${logPrefix} Unable to resolve php-cgi.exe. Set PHP_CGI_BIN if it is not on PATH.`)
    return
  }

  const phpIniPath = resolvePhpIniPath(phpCgiPath)

  if (!phpIniPath) {
    console.error(`${logPrefix} Unable to resolve php.ini for ${phpCgiPath}. Set PHP_INI_PATH explicitly.`)
    return
  }

  for (const port of ports) {
    const listening = await isPortListening(host, port)

    if (listening) {
      continue
    }

    const lastSpawnAt = lastSpawnByPort.get(port) || 0
    const now = Date.now()

    if (now - lastSpawnAt < respawnCooldownMs) {
      continue
    }

    lastSpawnByPort.set(port, now)
    console.warn(`${logPrefix} Port ${port} is down. Starting php-cgi worker.`)

    try {
      spawnPhpWorker(phpCgiPath, phpIniPath, port)
      await sleep(900)
    }
    catch (error) {
      console.error(`${logPrefix} Failed to start php-cgi on ${host}:${port}`, error)
    }
  }
}

if (ports.length === 0) {
  console.error(`${logPrefix} No valid PHP upstream ports configured.`)
  process.exit(1)
}

console.log(`${logPrefix} Watching ${host}:${ports.join(",")} every ${checkIntervalMs}ms`)
await ensurePhpWorkers()
const timer = setInterval(() => {
  void ensurePhpWorkers()
}, checkIntervalMs)

const shutdown = () => {
  clearInterval(timer)
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
