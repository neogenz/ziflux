import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { DevtoolsLogger } from './devtools-logger'

// isDevMode() returns true in test environment

describe('DevtoolsLogger', () => {
  let logger: DevtoolsLogger
  let logSpy: MockInstance
  let warnSpy: MockInstance
  let debugSpy: MockInstance

  beforeEach(() => {
    vi.restoreAllMocks()
    logger = new DevtoolsLogger()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function firstCallFormat(spy: MockInstance): string {
    return spy.mock.calls[0][0] as string
  }

  // --- logSet ---

  it('logs SET with green badge', () => {
    logger.logSet('orders', ['order', 'list'], [{ id: 1 }])
    expect(logSpy).toHaveBeenCalledOnce()
    const format = firstCallFormat(logSpy)
    expect(format).toContain('ziflux')
    expect(format).toContain('orders')
    expect(format).toContain('SET')
    expect(format).toContain('order > list')
  })

  it('passes data as last argument to console.log', () => {
    const data = { id: 42 }
    logger.logSet('users', ['user', 'me'], data)
    const args = logSpy.mock.calls[0] as unknown[]
    expect(args[args.length - 1]).toBe(data)
  })

  // --- logInvalidate ---

  it('logs INVALIDATE with console.warn', () => {
    logger.logInvalidate('orders', ['order'])
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(firstCallFormat(warnSpy)).toContain('INVALIDATE')
  })

  // --- logEvict ---

  it('logs EVICT with console.log', () => {
    logger.logEvict('orders', ['order', '42'])
    expect(logSpy).toHaveBeenCalledOnce()
    const format = firstCallFormat(logSpy)
    expect(format).toContain('EVICT')
    expect(format).toContain('order > 42')
  })

  // --- logClear ---

  it('logs CLEAR with console.warn', () => {
    logger.logClear('orders')
    expect(warnSpy).toHaveBeenCalledOnce()
    const format = firstCallFormat(warnSpy)
    expect(format).toContain('CLEAR')
    expect(format).toContain('orders')
  })

  // --- logDeduplicate ---

  it('logs DEDUP HIT with console.debug', () => {
    logger.logDeduplicate('orders', ['order', 'list'], true)
    expect(debugSpy).toHaveBeenCalledOnce()
    expect(firstCallFormat(debugSpy)).toContain('DEDUP HIT')
  })

  it('logs DEDUP MISS with console.debug', () => {
    logger.logDeduplicate('orders', ['order', 'list'], false)
    expect(debugSpy).toHaveBeenCalledOnce()
    expect(firstCallFormat(debugSpy)).toContain('DEDUP MISS')
  })

  // --- logOperations config ---

  it('disables logging when logOperations is false', () => {
    const silentLogger = new DevtoolsLogger({ logOperations: false })
    silentLogger.logSet('orders', ['key'], 'data')
    silentLogger.logInvalidate('orders', ['key'])
    silentLogger.logEvict('orders', ['key'])
    silentLogger.logClear('orders')
    silentLogger.logDeduplicate('orders', ['key'], true)

    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(debugSpy).not.toHaveBeenCalled()
  })

  it('defaults logOperations to true', () => {
    const defaultLogger = new DevtoolsLogger()
    defaultLogger.logSet('test', ['key'], 'data')
    expect(logSpy).toHaveBeenCalledOnce()
  })
})
