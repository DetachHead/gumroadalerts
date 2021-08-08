import { AxiosResponse } from 'axios'
import { load } from 'cheerio'
import { throwIfUndefined } from 'throw-expression'

export const getAttribute = (response: AxiosResponse, selector: string, attr: string): string => {
    const $ = load(response.data)
    return throwIfUndefined(
        throwIfUndefined($(selector)[0], `failed to find selector: ${selector}`).attribs[attr],
        `failed to find "${attr}" attr on $("${selector}")`,
    )
}
