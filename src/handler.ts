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
import toError from 'to-error'
import { throwIfUndefined } from 'throw-expression'

export const handler = async (): Promise<void> => {
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
                await sendGumroadMessage(errorWebhook, gumroad, toError(e).toString())
            }
        }),
    )
}

/** checks a specified gumroad for new content */
const getChangedFiles = async (gumroadConfig: Gumroad) => {
    console.log(`checking gumroad for ${gumroadConfig.name}`)
    const files = await s3.getFiles(gumroadConfig.name)
    const newFiles = getFolderPaths(
        await gumroad.getFiles(gumroadConfig.linkid, gumroadConfig.email as Email),
    )

    if (newFiles.length > 0) {
        return { newFiles, diff: diff(files, newFiles) }
    } else {
        throw new Error(`failed to find any files for ${gumroadConfig.name}`)
    }
}

/**
 * gets an array of folder paths to each file
 *
 * @example
 * const paths = getFolderPaths(items)
 * console.log(paths) // ["folder/filename", "folder/subfolder/otherfile"]
 */
export const getFolderPaths = (data: gumroad.DownloadPageWithContent): string[] => {
    let allFiles = data.content.content_items.filter(
        (item): item is gumroad.File => item.type === 'file',
    )
    const result = data.content.rich_content_pages.flatMap((contentPage) =>
        contentPage.description.content
            .filter((group): group is gumroad.FileEmbedGroup => group.type === 'fileEmbedGroup')
            .flatMap((group) =>
                group.content.flatMap((fileEmbed) => {
                    allFiles = allFiles.filter((file) => file.id !== fileEmbed.attrs.id)
                    return `${group.attrs.name}/${
                        throwIfUndefined(
                            data.content.content_items.find(
                                (item): item is gumroad.File => item.id === fileEmbed.attrs.id,
                            ),
                        ).file_name
                    }`
                }),
            ),
    )
    return [...result, ...allFiles.map((file) => file.file_name)]
}
/** outputs a message for the given {@link Gumroad} to a webhook */
const sendGumroadMessage = async (webhook: Webhook, gumroad: Gumroad, text: string) => {
    await sendWebhook(webhook, `**${gumroad.name}** - ${text}`)
}
