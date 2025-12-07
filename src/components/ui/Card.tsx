import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return <div className={`card ${className}`} {...props}>{children}</div>;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return <div className={`card-header ${className}`} {...props}>{children}</div>;
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function CardTitle({ children, className = '', ...props }: CardTitleProps) {
  return <h3 className={`card-title ${className}`} {...props}>{children}</h3>;
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function CardDescription({ children, className = '', ...props }: CardDescriptionProps) {
  return <p className={`card-description ${className}`} {...props}>{children}</p>;
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return <div className={`card-body ${className}`} {...props}>{children}</div>;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return <div className={`card-footer ${className}`} {...props}>{children}</div>;
}
