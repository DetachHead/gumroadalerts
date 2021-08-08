import { Email } from '@detachhead/ts-helpers/dist/utilityTypes/String'
import axios from 'axios'
import { getAttribute } from './helper'
import { CookieJar } from 'tough-cookie'
import axiosCookieJarSupport from 'axios-cookiejar-support'

export type DownloadPage_FileList_Item = {
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
      children: DownloadPage_FileList_Item[]
    }
)

export interface DownloadPage_FileList {
  content_items: DownloadPage_FileList_Item[]
}

export async function getFiles(
  gumroadID: string,
  email: Email,
): Promise<DownloadPage_FileList_Item[]> {
  const instance = axios.create({ baseURL: 'https://app.gumroad.com', withCredentials: true })
  axiosCookieJarSupport(instance)
  instance.defaults.jar = new CookieJar()
  const authResponse = await instance.get(`/d/${gumroadID}`, {
    withCredentials: true,
  })
  const authenticityToken = getAttribute(authResponse, 'input[name=authenticity_token]', 'value')
  return (JSON.parse(
    getAttribute(
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
      'div[data-react-class="DownloadPage/FileList"]',
      'data-react-props',
    ),
  ) as DownloadPage_FileList).content_items
}
