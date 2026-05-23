import { http, HttpResponse } from 'msw'

const API = 'http://localhost:4000'

const mockTokens = {
  accessToken: 'mock.access.token',
  refreshToken: 'mock-account-id:mock-token-id',
  expiresIn: 900,
}

export const mswHandlers = {
  auth: [
    http.post(`${API}/auth/login`, () => HttpResponse.json(mockTokens)),
    http.post(`${API}/auth/register`, () =>
      HttpResponse.json(mockTokens, { status: 201 })
    ),
    http.post(
      `${API}/auth/logout`,
      () => new HttpResponse(null, { status: 204 })
    ),
  ],
  authErrors: [
    http.post(`${API}/auth/login`, () =>
      HttpResponse.json(
        { error: 'invalid_credentials', statusCode: 401 },
        { status: 401 }
      )
    ),
    http.post(`${API}/auth/register`, () =>
      HttpResponse.json(
        { error: 'email_already_registered', statusCode: 409 },
        { status: 409 }
      )
    ),
  ],
}
