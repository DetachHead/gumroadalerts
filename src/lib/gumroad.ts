import { Email } from '@detachhead/ts-helpers/dist/utilityTypes/String'
import axios from 'axios'
import { getAttribute, getSelector } from './helper'
import { CookieJar } from 'tough-cookie'
import axiosCookieJarSupport from 'axios-cookiejar-support'
import { DataNode } from 'domhandler/lib/node'

export type ContentItem = {
    id: string
} & (
    | {
          type: 'file'
          file_name: string
          description: string
          extension: string
          file_size: number
          pagelength: unknown | null
          duration: number
          download_url: `/r/${string}`
          stream_url: `/s/${string}` | null
          subtitle_files: unknown[]
          audio_params: unknown
          kindle_data: unknown
          latest_media_location: unknown
          content_length: unknown
          read_url: unknown
      }
    | {
          type: 'folder'
          name: string
          children: ContentItem[]
      }
)

export interface DownloadPageWithContent {
    content: {
        content_items: ContentItem[]
    }
}

export const getFiles = async (gumroadID: string, email: Email): Promise<ContentItem[]> => {
    const instance = axios.create({ baseURL: 'https://app.gumroad.com', withCredentials: true })
    axiosCookieJarSupport(instance)
    instance.defaults.jar = new CookieJar()
    const authResponse = await instance.get(`/d/${gumroadID}`, {
        withCredentials: true,
    })
    const authenticityToken = getAttribute(authResponse, 'input[name=authenticity_token]', 'value')
    return (JSON.parse(
        (getSelector(
            await instance.post(
                '/confirm-redirect',
                {
                    authenticity_token: authenticityToken,
                    id: gumroadID,
                    destination: 'download_page',
                    email,
                },
                { withCredentials: true },
            ),
            'script[data-component-name="DownloadPageWithContent"]',
        ).children[0] as DataNode).data,
    ) as DownloadPageWithContent).content.content_items
}
