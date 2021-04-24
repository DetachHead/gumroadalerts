import puppeteer from 'puppeteer'
import fs from 'fs'
import { diff } from 'fast-array-diff'
import { entries } from '@detachhead/ts-helpers/dist/utilityFunctions/Any'
import dedent from 'dedent-js'
import { Config, Gumroad } from './types'
import path from 'path'
import { Webhook } from 'discord-webhook-node'
import tempWrite from 'temp-write'

const config: Config = require('../config.json')

const successWebhook = new Webhook(config.webhooks.notifs)
const errorWebhook = new Webhook(config.webhooks.errors)

;(async () => {
  await Promise.all(config.gumroads.map((gumroad) => checkGumroad(gumroad)))
})()

// returns an array of existing file names from the specified saved json. creates an empty one and returns an empty array if it doesnt exist
function getExistingFilesArray(jsonpath: string): string[] {
  if (fs.existsSync(jsonpath)) return JSON.parse(fs.readFileSync(jsonpath).toString())
  fs.writeFileSync(jsonpath, '[]')
  return []
}

// checks a specified gumroad for new content and messages the discord if new content is found
async function checkGumroad(gumroad: Gumroad) {
  console.log(`checking gumroad for ${gumroad.name}`)
  const filepath = path.join(__dirname, `../${gumroad.name}_files.json`)
  const files = getExistingFilesArray(filepath)
  const newFiles: string[] = []

  // open browser:
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setRequestInterception(true)

    // dont load useless shit:
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
        request.abort()
      } else {
        request.continue()
      }
    })

    // get to the content list:
    await page.goto(`https://gumroad.com/d/${gumroad.linkid}`)
    const filenameXpath = '//div[@class="file-row-content-component__info"]/h4'
    if ((await page.$x(filenameXpath)).length === 0) {
      // some gumroads make u enter ur email
      await page.type('input#email', gumroad.email)
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click('button.button.button-primary'),
      ])
    }

    // get the titles of each upload:
    for (const element of await page.$x(filenameXpath)) {
      newFiles.push(await page.evaluate((el) => el.innerText, element))
    }
  } catch (e) {
    await sendMessage('error', e)
  } finally {
    await browser.close()
  }

  // compare the current list to the previously saved list & msg the discord webhook if theres a difference:
  if (newFiles.length > 0) {
    const diffFiles = diff(files, newFiles)

    const msgText = dedent`**${gumroad.name}** upload(s) changed - at ${gumroad.link}
    ${entries(diffFiles)
      .map(
        ([changeType, files]) =>
          dedent`${changeType}:
            \`\`\`
            ${files.join('\n')}\`\`\``,
      )
      .join('')}`

    // create and send the msg(s) if there were any changes:
    if (Object.values(diffFiles).flat().length > 0) {
      await sendMessage('success', msgText)
      // write the new files to the files json:
      fs.writeFileSync(filepath, JSON.stringify(newFiles))
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
