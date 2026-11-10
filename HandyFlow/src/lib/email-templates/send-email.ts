import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from './registry'
import { sendResendEmail } from './resend.server'

export type SendTemplateEmailResult = { sent: true }
export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  idempotencyKey?: string
  replyTo?: string
}

export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const template = TEMPLATES[templateName]
  if (!template) throw new Error(`Unknown email template: ${templateName}`)
  const recipient = template.to || to
  if (!recipient) throw new Error('Email recipient is required')
  const data = options.templateData ?? {}
  const element = React.createElement(template.component, data)
  await sendResendEmail({
    to: [recipient],
    subject: typeof template.subject === 'function' ? template.subject(data) : template.subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
    ...(options.replyTo ? { reply_to: options.replyTo } : {}),
  }, options.idempotencyKey)
  return { sent: true }
}
