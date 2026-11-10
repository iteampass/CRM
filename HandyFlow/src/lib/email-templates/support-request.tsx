import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface SupportRequestProps {
  userName?: string
  userEmail?: string
  userRole?: string
  subject?: string
  details?: string
}

function SupportRequestEmail({
  userName = 'A HandyFlow user',
  userEmail = 'unknown',
  userRole = 'member',
  subject = 'Support request',
  details = '',
}: SupportRequestProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Support request from ${userName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New support request</Heading>
          <Text style={meta}>
            <strong>From:</strong> {userName} ({userEmail})
          </Text>
          <Text style={meta}>
            <strong>Role:</strong> {userRole}
          </Text>
          <Text style={meta}>
            <strong>Subject:</strong> {subject}
          </Text>
          <Section style={messageBox}>
            <Text style={messageText}>{details}</Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Sent from the HandyFlow in-app support form.</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = {
  backgroundColor: '#ffffff',
  margin: '32px auto',
  padding: '32px',
  borderRadius: '12px',
  maxWidth: '560px',
  border: '1px solid #e6e8ef',
}
const h1 = { color: '#1a1f2e', fontSize: '22px', margin: '0 0 16px' }
const meta = { color: '#3c4257', fontSize: '14px', lineHeight: '20px', margin: '0 0 6px' }
const messageBox = {
  backgroundColor: '#f1f4fb',
  borderLeft: '3px solid #4c6fff',
  padding: '12px 16px',
  margin: '16px 0',
  borderRadius: '6px',
}
const messageText = {
  color: '#3c4257',
  fontSize: '14px',
  lineHeight: '21px',
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
}
const hr = { borderColor: '#e6e8ef', margin: '24px 0' }
const footer = { color: '#8a8fa3', fontSize: '12px', lineHeight: '18px' }

export const template = {
  component: SupportRequestEmail,
  subject: (data: Record<string, any>) =>
    `HandyFlow support: ${data['subject'] || 'New request'}`,
  displayName: 'Support request',
  to: 'admin@handyflow.me',
  previewData: {
    userName: 'Jadranka Macan',
    userEmail: 'jadranka@example.com',
    userRole: 'client',
    subject: 'Cannot accept an offer',
    details: 'When I click accept nothing happens.',
  },
} satisfies TemplateEntry
