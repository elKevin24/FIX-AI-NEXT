import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface EmailLayoutProps {
  previewText: string;
  heading: string;
  children: React.ReactNode;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fix-ai-next.vercel.app';

export const EmailLayout = ({
  previewText,
  heading,
  children,
}: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
           <Section style={header}>
              <Text style={logoText}>FIX-AI</Text>
           </Section>
           <Section style={content}>
             <Text style={headingStyle}>{heading}</Text>
             {children}
           </Section>
           <Hr style={hr} />
           <Section style={footer}>
             <Text style={footerText}>
               © {new Date().getFullYear()} FIX-AI Workshop System. Todos los derechos reservados.
             </Text>
             <Text style={footerText}>
               <Link href={`${baseUrl}/dashboard`} style={link}>
                 Ir al Dashboard
               </Link>
             </Text>
           </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EmailLayout;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px', // Standard email width
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
};

const header = {
  padding: '32px',
  textAlign: 'center' as const,
  backgroundColor: '#2563EB', // Brand Primary Blue
  borderTopLeftRadius: '8px',
  borderTopRightRadius: '8px',
};

const logoText = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '32px',
};

const headingStyle = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '400',
  color: '#484848',
  padding: '17px 0 0',
  marginTop: '0',
  marginBottom: '16px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  padding: '0 32px',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '12px',
  marginBottom: '0',
};

const link = {
  color: '#2563EB',
};
