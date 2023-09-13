import { FastifyInstance } from 'fastify'
import { createReadStream } from 'node:fs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { openai } from '../lib/openai'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  prompt: z.string(),
})

export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post('/videos/:id/transcription', async (req) => {
    const { id } = paramsSchema.parse(req.params)
    const { prompt } = bodySchema.parse(req.body)

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id,
      },
    })

    const videoPath = video.path

    const audioReadStream = createReadStream(videoPath)

    const response = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: 'whisper-1',
      response_format: 'json',
      language: 'en',
      temperature: 0,
      prompt,
    })

    const transcription = response.text

    await prisma.video.update({
      where: {
        id: video.id,
      },
      data: {
        transcription: response.text,
      },
    })

    return { transcription }
  })
}
