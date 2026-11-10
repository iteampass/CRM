import {
  Body,
  Button,
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

export interface HandymanInviteProps {
  inviteeName?: string
  inviterName?: string
  message?: string
  signupUrl?: string
}

function HandymanInviteEmail({
  inviteeName = 'there',
  inviterName = 'A HandyFlow member',
  message = '',
  signupUrl = 'https://handyflow.me/auth',
}: HandymanInviteProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to join HandyFlow</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You&apos;re invited to HandyFlow</Heading>
          <Text style={text}>Hi {inviteeName},</Text>
          <Text style={text}>
            {inviterName} thinks you&apos;d be a great fit for HandyFlow — the
            platform where skilled handymen connect with clients who need
            repairs done right.
          </Text>
          {message ? (
            <Section style={messageBox}>
              <Text style={messageText}>&ldquo;{message}&rdquo;</Text>
            </Section>
          ) : null}
          <Section style={buttonSection}>
            <Button style={button} href={signupUrl}>
              Create your account
            </Button>
          </Section>
          <Text style={text}>
            Set up your profile, choose your service area, and start receiving
            job requests from clients near you.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            You received this invitation from {inviterName} via HandyFlow. If
            you weren&apos;t expecting it, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f7f9', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = {
  backgroundColor: '#ffffff',
  margin: '32px auto',
  padding: '32px',
  borderRadius: '12px',
  maxWidth: '560px',
}
const h1 = { color: '#1a1f2e', fontSize: '24px', margin: '0 0 16px' }
const text = { color: '#3c4257', fontSize: '15px', lineHeight: '22px' }
const messageBox = {
  backgroundColor: '#f1f4fb',
  borderLeft: '3px solid #4c6fff',
  padding: '12px 16px',
  margin: '16px 0',
  borderRadius: '6px',
}
const messageText = { color: '#3c4257', fontSize: '14px', fontStyle: 'italic', margin: 0 }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: '#4c6fff',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold',
  padding: '12px 28px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e6e8ef', margin: '24px 0' }
const footer = { color: '#8a8fa3', fontSize: '12px', lineHeight: '18px' }

export const template = {
  component: HandymanInviteEmail,
  subject: (data: Record<string, any>) =>
    `${data['inviterName'] ?? 'A HandyFlow member'} invited you to join HandyFlow`,
  displayName: 'Handyman invitation',
  previewData: {
    inviteeName: 'Marko',
    inviterName: 'Jadranka Macan',
    message: "Hi! I'd love to work with you on HandyFlow.",
    signupUrl: 'https://handyflow.me/auth',
  },
} satisfies TemplateEntry
