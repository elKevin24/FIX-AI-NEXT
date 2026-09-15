import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button
} from '@react-email/components';
import * as React from 'react';

interface ResetPasswordEmailProps {
  resetLink: string;
  userEmail: string;
}

export const ResetPasswordEmail = ({
  resetLink,
  userEmail,
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Restablece tu contraseña de FIX Workshop</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Restablecer Contraseña</Heading>
          
          <Text style={text}>Hola {userEmail},</Text>
          <Text style={text}>
            Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en FIX Workshop.
            Si no fuiste tú, puedes ignorar este correo sin problemas.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={resetLink}>
              Restablecer Contraseña
            </Button>
          </Section>

          <Text style={text}>
            O copia y pega este enlace en tu navegador:
            <br />
            <Link href={resetLink} style={link}>
              {resetLink}
            </Link>
          </Text>

          <Text style={footer}>
            Este enlace expira en 1 hora.
            <br />
            El equipo de FIX Workshop.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
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
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 20px',
  padding: '0 48px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  padding: '0 48px',
};

const buttonContainer = {
  padding: '24px 48px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
};

const link = {
  color: '#5469d4',
  textDecoration: 'underline',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 48px',
  marginTop: '32px',
};

export default ResetPasswordEmail;
