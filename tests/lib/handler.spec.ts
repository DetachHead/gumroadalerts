import { DownloadPageWithContent } from '../../src/lib/gumroad'
import { getFolderPaths } from '../../src/handler'
import assert from 'typed-nodejs-assert'
// eslint-disable-next-line @typescript-eslint/no-var-requires -- https://github.com/microsoft/TypeScript/issues/45358
const items: DownloadPageWithContent = require('../fixtures/gumroadItems.json')

test('getFolderPaths', () => {
    assert.deepStrictEqual(getFolderPaths(items), [
        'embed group folder/file inside embed group',
        'top level file',
    ])
})
