import { chromium } from 'playwright'
import fs from 'fs'
import { diff } from 'fast-array-diff'
import { entries } from '@detachhead/ts-helpers/dist/utilityFunctions/Any'
import dedent from 'dedent-js'
import { Webhook } from 'discord-webhook-node'
import tempWrite from 'temp-write'
import { isDefined } from 'ts-is-present'
import config, { loadConfig } from '@app-config/main'
import { Gumroad } from './@types/lcdev__app-config'
import { getFiles, updateFiles } from './s3'

process.on('unhandledRejection', (err) => {
  throw err
})

export async function handler(): Promise<void> {
  await loadConfig()

  const successWebhook = new Webhook(config.webhooks.notifs)
  const errorWebhook = new Webhook(config.webhooks.errors)
  await Promise.all(config.gumroads.map((gumroad) => checkGumroad(gumroad)))

  // checks a specified gumroad for new content and messages the discord if new content is found
  async function checkGumroad(gumroad: Gumroad) {
    console.log(`checking gumroad for ${gumroad.name}`)
    const files = await getFiles(gumroad.name)
    let newFiles: string[] = []

    // open browser:
    const browser = await chromium.launch({
      headless: !config.debug,
      args: ['--disable-gpu', '--single-process'],
    })
    try {
      const page = await browser.newPage()
      // dont load useless shit:
      await page.route('**', (route) => {
        if (['image', 'stylesheet', 'font'].indexOf(route.request().resourceType()) !== -1) {
          route.abort()
        } else {
          route.continue()
        }
      })

      // get to the content list:
      await page.goto(`https://gumroad.com/d/${gumroad.linkid}`, { waitUntil: 'domcontentloaded' })
      const filenameSelector = '//div[@class="file-row-content-component__info"]/h4'
      if ((await page.$(`xpath=${filenameSelector}`)) === null) {
        // some gumroads make u enter ur email
        await page.type('input#email', gumroad.email)
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
          page.click('button.button.button-primary'),
        ])
      }

      // get the titles of each upload:
      newFiles = (
        await Promise.all(
          await (await page.$$(filenameSelector)).map((element) => element.innerText()),
        )
      ).filter(isDefined)
    } catch (e) {
      await sendMessage('error', e.toString())
    } finally {
      try {
        await browser.close()
      } catch (e) {
        console.log('failed to close browser, it may have already been closed????', e)
      }
    }

    // compare the current list to the previously saved list & msg the discord webhook if theres a difference:
    if (newFiles.length > 0) {
      const diffFiles = diff(files, newFiles)

      const msgText = dedent`**${gumroad.name}** upload(s) changed - at ${gumroad.link}
    ${entries(diffFiles)
      .map(([changeType, files]) =>
        files.length === 0
          ? ''
          : dedent`${changeType}:
              \`\`\`
              ${files.join('\n')}\`\`\``,
      )
      .join('')}`

      // create and send the msg(s) if there were any changes:
      if (Object.values(diffFiles).flat().length > 0) {
        await sendMessage('success', msgText)
        // write the new files to the bucket:
        await updateFiles(gumroad.name, newFiles)
      }
    } else {
      await sendMessage('error', `failed to find any files for ${gumroad.name}`)
    }
    console.log(`finished checking gumroad for ${gumroad.name}`)
  }

  async function sendMessage(type: 'success' | 'error', text: string) {
    const webhook = { success: successWebhook, error: errorWebhook }[type]
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
}
