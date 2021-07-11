import { Email, UrlString } from '@detachhead/ts-helpers/dist/utilityTypes/String'
import axios from 'axios'
import { getAttribute } from './helper'
import { CookieJar } from 'tough-cookie'
import axiosCookieJarSupport from 'axios-cookiejar-support'

export interface DownloadPage_FileList {
  content_items: DownloadPage_FileList_File[]
  download_info: Record<string, DownloadPage_FileList_Info>
}

export interface DownloadPage_FileList_File {
  file_name: string
  description: string
  extension: string
  file_size: number
  pagelength: unknown | null
  duration: number
  is_streamable: boolean
  is_transcoding_in_progress: boolean
  id: string
  attached_product_name: string
  file_icon_class: string
  subtitle_files: unknown[]
  url: UrlString
}

export interface DownloadPage_FileList_Info {
  download_url: string
  stream_url: string
  audio_params: unknown | null
  kindle_data: unknown | null
  read_url: unknown | null
  subtitle_data: {}
}

export async function getFiles(
  gumroadID: string,
  email: Email,
): Promise<DownloadPage_FileList_File[]> {
  const instance = axios.create({ baseURL: 'https://gumroad.com', withCredentials: true })
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
