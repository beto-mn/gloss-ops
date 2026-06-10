import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiFetch, clearTokens, setTokens } from './api-client'

function makeFetchResponse(
  body: unknown,
  status: number,
  headers?: Record<string, string>
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    json: () => Promise.resolve(body),
  } as unknown as Response
}

describe('apiFetch', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    // Reset module-level isRefreshing flag between tests by clearing tokens
    clearTokens()
    // Stub window.location.replace so redirectToLogin doesn't throw
    vi.stubGlobal('window', {
      ...window,
      location: { replace: vi.fn() },
      localStorage,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearTokens()
  })

  it('401 + valid refresh token retries and returns data', async () => {
    setTokens('old-access', 'valid-refresh')

    const originalResponse = makeFetchResponse({}, 401)
    const refreshResponse = makeFetchResponse(
      { accessToken: 'new-access', refreshToken: 'new-refresh' },
      200
    )
    const retryResponse = makeFetchResponse({ id: 'ok' }, 200)

    fetchMock
      .mockResolvedValueOnce(originalResponse)
      .mockResolvedValueOnce(refreshResponse)
      .mockResolvedValueOnce(retryResponse)

    const result = await apiFetch<{ id: string }>('/test')

    expect(result).toEqual({ id: 'ok' })
    // 1st call: original, 2nd: refresh, 3rd: retry
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('401 + refresh fails → clearTokens and rejects with ApiError(401)', async () => {
    setTokens('old-access', 'bad-refresh')

    const originalResponse = makeFetchResponse({}, 401)
    const failedRefresh = makeFetchResponse({ error: 'invalid' }, 401)

    fetchMock
      .mockResolvedValueOnce(originalResponse)
      .mockResolvedValueOnce(failedRefresh)

    const error = await apiFetch('/test').catch(e => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(401)
  })

  it('401 + no refresh token → rejects immediately with ApiError(401)', async () => {
    // No tokens set — refresh token is null
    const unauthorizedResponse = makeFetchResponse(
      { message: 'Unauthorized' },
      401
    )
    fetchMock.mockResolvedValueOnce(unauthorizedResponse)

    const error = await apiFetch('/test').catch(e => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(401)
    // Only 1 fetch call — no refresh attempted
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('network error propagates as rejection', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(apiFetch('/test')).rejects.toThrow(TypeError)
  })

  it('non-401 error throws ApiError with correct status', async () => {
    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({ message: 'Not found' }, 404)
    )

    const error = await apiFetch('/test').catch(e => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(404)
  })
})
