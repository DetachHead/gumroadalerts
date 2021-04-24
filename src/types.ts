import { Email, UrlString } from '@detachhead/ts-helpers/dist/utilityTypes/String'

export interface Config {
  gumroads: Gumroad[]
  tagrole: string
  webhooks: {
    notifs: UrlString
    errors: UrlString
  }
}

export interface Gumroad {
  name: string
  link: UrlString
  linkid: string
  email: Email
}
