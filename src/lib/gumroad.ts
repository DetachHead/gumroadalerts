import { Email } from '@detachhead/ts-helpers/dist/utilityTypes/String'
import axios from 'axios'
import { getAttribute, getSelector } from './helper'
import { CookieJar } from 'tough-cookie'
import axiosCookieJarSupport from 'axios-cookiejar-support'
import { DataNode } from 'domhandler/lib/node'

interface ContentItem {
    id: string
}

export interface File extends ContentItem {
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

/**
 * @deprecated i don't think this is used anymore but i'm keeping this type here just in case.
 * {@link FileEmbedGroup} is the replacement
 */
export interface Folder extends ContentItem {
    type: 'folder'
    name: string
    children: ContentItem[]
}

export interface FileEmbedGroup {
    type: 'fileEmbedGroup'
    attrs: {
        uid: string
        name: string
    }
    content: {
        type: 'fileEmbed'
        attrs: {
            id: string
            uid: string
        }
    }[]
}

export interface Paragraph {
    type: 'paragraph'
}

interface RichContentPage {
    page_id: string
    title: string | null
    variant_id: string
    description: {
        type: string
        content: (FileEmbedGroup | Paragraph)[]
    }
}

export interface DownloadPageWithContent {
    content: {
        content_items: (File | Folder)[]
        rich_content_pages: RichContentPage[]
    }
}

export const getFiles = async (
    gumroadID: string,
    email: Email,
): Promise<DownloadPageWithContent> => {
    const instance = axios.create({ baseURL: 'https://app.gumroad.com', withCredentials: true })
    axiosCookieJarSupport(instance)
    instance.defaults.jar = new CookieJar()
    const authResponse = await instance.get(`/d/${gumroadID}`, {
        withCredentials: true,
    })
    const authenticityToken = getAttribute(authResponse, 'input[name=authenticity_token]', 'value')
    const response = await instance.post(
        '/confirm-redirect',
        {
            authenticity_token: authenticityToken,
            id: gumroadID,
            destination: 'download_page',
            email,
        },
        { withCredentials: true },
    )
    return JSON.parse(
        (getSelector(response, 'script[data-component-name="DownloadPageWithContent"]')
            .children[0] as DataNode).data,
    ) as DownloadPageWithContent
}
