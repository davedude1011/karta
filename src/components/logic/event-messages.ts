// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function recieve_message(key: string, callback: (message: any) => void) {
    window.addEventListener("message", (event: {data: {message_key: string, message_data: unknown}}) => {
        if (event.data.message_key == key) {
            callback(event.data.message_data)
        }
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function send_message(key: string, message: any) {
    window.postMessage({
        message_key: key,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message_data: message
    }, window.origin)
}