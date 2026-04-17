import { config } from 'dotenv'
import { resolve } from 'path'

export default async function () {
  config({ path: resolve(__dirname, '../.env.test') })
}
