// English description: Starts optional local PHP-CGI upstream watchdog before launching Nuxt dev.

import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const clientRoot = resolve(scriptDir, "..")

process.loadEnvFile?.(join(clientRoot, ".env"))

const children = new Set()

const spawnChild = (command, args, options = {}) => {
  const child = spawn(command, args, {
    cwd: clientRoot,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  })

  children.add(child)
  child.once("exit", () => children.delete(child))

  return child
}

const stopChildren = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM")
    }
  }
}

process.once("SIGINT", () => {
  stopChildren()
  process.exit(130)
})

process.once("SIGTERM", () => {
  stopChildren()
  process.exit(143)
})

const phpCgiBin = String(process.env.PHP_CGI_BIN || "").trim()
const shouldStartPhpWatchdog = phpCgiBin && existsSync(phpCgiBin)

if (shouldStartPhpWatchdog) {
  spawnChild("node", [join("realtime", "php-upstream-watchdog.mjs")])
}
else if (phpCgiBin) {
  console.warn(`[vnseea-dev] PHP_CGI_BIN does not exist: ${phpCgiBin}`)
}

const nuxt = spawnChild("nuxt", ["dev"])

nuxt.once("exit", (code, signal) => {
  stopChildren()

  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
