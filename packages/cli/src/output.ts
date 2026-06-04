const G = '\x1b[32m'
const R = '\x1b[31m'
const Y = '\x1b[33m'
const Z = '\x1b[0m'

export function pass(msg: string): void {
  console.log(`  ${G}✅${Z} ${msg}`)
}

export function fail(msg: string): void {
  console.log(`  ${R}❌${Z} ${msg}`)
}

export function warn(msg: string): void {
  console.log(`${Y}⚠️ ${Z} ${msg}`)
}

export function info(msg: string): void {
  console.log(msg)
}
