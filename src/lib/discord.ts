import { Webhook } from 'discord-webhook-node'
import tempWrite from 'temp-write'
import fs from 'fs'

export async function sendWebhook(webhook: Webhook, text: string) {
  webhook.setUsername('gumroad alerts')
  if (text.length <= 2000) {
    await webhook.send(text)
  } else {
    const file = await tempWrite(text, 'long message.md')
    await webhook.sendFile(file)
    fs.unlink(file, (err) => {
      if (err) console.error(err)
    })
  }
}
