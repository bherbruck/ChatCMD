export const handleDockerExecStream = async (
  stream: NodeJS.ReadableStream,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let output = ''

    stream.on('data', (chunk) => (output += chunk.toString()))
    stream.on('end', () => resolve(output))
    stream.on('error', (error) => reject(error))
  })
}
