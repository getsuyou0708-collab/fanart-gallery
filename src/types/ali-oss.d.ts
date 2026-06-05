declare module 'ali-oss' {
  export default class OSS {
    constructor(options: {
      region: string
      accessKeyId: string
      accessKeySecret: string
      bucket: string
    })
    put(name: string, file: Buffer | Blob | string): Promise<{ name: string; url: string }>
  }
}