class Ajax {
    constructor (public action: string, public data: any, public file?: Blob) {}
    post(callback: (data: any) => any, apiKey: string | null = null, timeout: number = 120000) {}
}
