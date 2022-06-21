import { AxiosResponse } from 'axios'
import { load } from 'cheerio'
import { throwIfUndefined } from 'throw-expression'
import { Element } from 'domhandler'

export const getAttribute = (response: AxiosResponse, selector: string, attr: string): string =>
    throwIfUndefined(
        getSelector(response, selector).attribs[attr],
        `failed to find "${attr}" attr on $("${selector}")`,
    )

export const getSelector = (response: AxiosResponse, selector: string): Element => {
    const $ = load(response.data)
    return throwIfUndefined($(selector)[0], `failed to find selector: ${selector}`)
}
