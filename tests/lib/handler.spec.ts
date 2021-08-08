import { DownloadPage_FileList_Item } from '../../src/lib/gumroad'
import { getFolderPaths } from '../../src/handler'
import assert from 'typed-nodejs-assert'
// eslint-disable-next-line @typescript-eslint/no-var-requires -- https://github.com/microsoft/TypeScript/issues/45358
const items: DownloadPage_FileList_Item[] = require('../fixtures/gumroadItems.json')

describe('getFolderPathsFromId', () => {
  test('asdf', () => {
    assert.deepStrictEqual(
      [
        'a folder/a file',
        'folder with nested folder/asdf',
        'folder with nested folder/nested folder/file within nested folder',
        'top level file',
      ],
      getFolderPaths(items),
    )
  })
})
