import { S3 } from 'aws-sdk'
import { throwIfUndefined } from 'throw-expression'

const s3 = new S3({
  signatureVersion: 'v4',
})

const defaultOptions = { Bucket: 'gumroadalerts' }

/**
 * gets an array of existing file names from the specified gumroad name. creates an empty one and returns an empty array if it doesnt exist
 */
export async function getFiles(gumroad: string): Promise<string[]> {
  const options = { ...defaultOptions, Key: gumroad }
  try {
    return JSON.parse(throwIfUndefined((await s3.getObject(options).promise()).Body).toString())
  } catch (e) {
    const emptyBody: string[] = []
    await s3.putObject({ ...options, Body: JSON.stringify(emptyBody) }).promise()
    return emptyBody
  }
}

/**
 * updates the array of known files for the given gumroad
 */
export async function updateFiles(gumroad: string, files: string[]): Promise<void> {
  await s3.deleteObjects({ ...defaultOptions, Delete: { Objects: [{ Key: gumroad }] } }).promise()
  await s3.putObject({ ...defaultOptions, Key: gumroad, Body: JSON.stringify(files) }).promise()
}
