import { diff } from 'fast-array-diff'
import { entries } from '@detachhead/ts-helpers/dist/utilityFunctions/Any'
import dedent from 'dedent-js'
import { Webhook } from 'discord-webhook-node'
import config, { loadConfig } from '@app-config/main'
import { Gumroad } from './@types/lcdev__app-config'
import * as s3 from './lib/s3'
import * as gumroad from './lib/gumroad'
import { Email } from '@detachhead/ts-helpers/dist/utilityTypes/String'
import { sendWebhook } from './lib/discord'

export async function handler(): Promise<void> {
  await loadConfig()

  const successWebhook = new Webhook(config.webhooks.notifs)
  const errorWebhook = new Webhook(config.webhooks.errors)
  await Promise.all(
    config.gumroads.map(async (gumroad) => {
      try {
        const { newFiles, diff } = await getChangedFiles(gumroad)
        const msgText = dedent`upload(s) changed - at ${gumroad.link}
        ${entries(diff)
          .map(([changeType, files]) =>
            files.length === 0
              ? ''
              : dedent`${changeType}:
              \`\`\`
              ${files.join('\n')}\`\`\``,
          )
          .join('')}`

        // create and send the msg(s) if there were any changes:
        if (Object.values(diff).flat().length > 0) {
          await sendGumroadMessage(successWebhook, gumroad, msgText)
          // write the new files to the bucket:
          await s3.updateFiles(gumroad.name, newFiles)
        }
        console.log(`finished checking gumroad for ${gumroad.name}`)
      } catch (e) {
        await sendGumroadMessage(errorWebhook, gumroad, e.toString())
      }
    }),
  )
}

/** checks a specified gumroad for new content */
async function getChangedFiles(gumroadConfig: Gumroad) {
  console.log(`checking gumroad for ${gumroadConfig.name}`)
  const files = await s3.getFiles(gumroadConfig.name)
  const newFiles = (await gumroad.getFiles(gumroadConfig.linkid, gumroadConfig.email as Email)).map(
    (file) => file.file_name,
  )

  if (newFiles.length > 0) {
    return { newFiles, diff: diff(files, newFiles) }
  } else {
    throw new Error(`failed to find any files for ${gumroadConfig.name}`)
  }
}

/** outputs a message for the given {@link Gumroad} to a webhook */
async function sendGumroadMessage(webhook: Webhook, gumroad: Gumroad, text: string) {
  await sendWebhook(webhook, `**${gumroad.name}** - ${text}`)
}
