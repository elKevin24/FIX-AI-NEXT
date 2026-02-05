
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface SLABreachEmailProps {
  ticketKey?: string;
  ticketNumber?: string;
  title: string;
  status: 'WARNING' | 'CRITICAL';
  timeRemaining: string;
  ticketLink: string;
}

export const SLABreachEmail = ({
  ticketKey = undefined,
  ticketNumber = "T-123456",
  title = "Laptop Repair",
  status = "WARNING",
  timeRemaining = "2 hours",
  ticketLink = "https://example.com/tickets/123",
}: SLABreachEmailProps) => (
  <Html>
    <Head />
    <Preview>SLA Alert: Ticket #{ticketKey || ticketNumber}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={status === 'CRITICAL' ? criticalHeading : warningHeading}>
          SLA {status} Alert
        </Heading>
        <Text style={text}>
          Ticket <strong>#{ticketKey || ticketNumber}</strong> is approaching its SLA deadline.
        </Text>
        <Text style={text}>
          <strong>Title:</strong> {title}
        </Text>
        <Text style={text}>
          <strong>Time Remaining:</strong> {timeRemaining}
        </Text>
        <Link href={ticketLink} style={button}>
          View Ticket
        </Link>
      </Container>
    </Body>
  </Html>
);

export default SLABreachEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#333",
};

const warningHeading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#f59e0b", // Amber
};

const criticalHeading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#ef4444", // Red
};

const button = {
  backgroundColor: "#007bff",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "200px",
  padding: "10px",
  marginTop: "20px",
};
