import { Button, Card, CardHeader, CardTitle, CardBody, Badge, Input, Textarea, Select, Alert } from '@/components/ui';
import type { SelectOption } from '@/components/ui';

export default function DesignSystemPage() {
  const statusOptions: SelectOption[] = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-8)', paddingBottom: 'var(--spacing-8)' }}>
      <header style={{ marginBottom: 'var(--spacing-12)' }}>
        <h1>Design System</h1>
        <p className="text-secondary" style={{ fontSize: 'var(--font-size-lg)', marginTop: 'var(--spacing-4)' }}>
          FIX-AI NEXT - Professional Multi-Tenant Workshop Management
        </p>
      </header>

      {/* Color Palette */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>Color Palette</h2>

        <h3 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-xl)' }}>Primary Colors</h3>
        <div className="flex gap-4" style={{ marginBottom: 'var(--spacing-8)' }}>
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
            <div key={shade} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: `var(--color-primary-${shade})`,
                  borderRadius: 'var(--radius-base)',
                  marginBottom: 'var(--spacing-2)',
                }}
              />
              <div style={{ fontSize: 'var(--font-size-xs)' }}>{shade}</div>
            </div>
          ))}
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-xl)' }}>Semantic Colors</h3>
        <div className="flex gap-6" style={{ marginBottom: 'var(--spacing-8)' }}>
          <div>
            <div
              style={{
                width: '100px',
                height: '60px',
                backgroundColor: 'var(--color-success-500)',
                borderRadius: 'var(--radius-base)',
                marginBottom: 'var(--spacing-2)',
              }}
            />
            <div className="text-center" style={{ fontSize: 'var(--font-size-sm)' }}>Success</div>
          </div>
          <div>
            <div
              style={{
                width: '100px',
                height: '60px',
                backgroundColor: 'var(--color-warning-500)',
                borderRadius: 'var(--radius-base)',
                marginBottom: 'var(--spacing-2)',
              }}
            />
            <div className="text-center" style={{ fontSize: 'var(--font-size-sm)' }}>Warning</div>
          </div>
          <div>
            <div
              style={{
                width: '100px',
                height: '60px',
                backgroundColor: 'var(--color-error-500)',
                borderRadius: 'var(--radius-base)',
                marginBottom: 'var(--spacing-2)',
              }}
            />
            <div className="text-center" style={{ fontSize: 'var(--font-size-sm)' }}>Error</div>
          </div>
          <div>
            <div
              style={{
                width: '100px',
                height: '60px',
                backgroundColor: 'var(--color-info-500)',
                borderRadius: 'var(--radius-base)',
                marginBottom: 'var(--spacing-2)',
              }}
            />
            <div className="text-center" style={{ fontSize: 'var(--font-size-sm)' }}>Info</div>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>Typography</h2>
        <div style={{ marginBottom: 'var(--spacing-8)' }}>
          <h1>Heading 1 - The quick brown fox</h1>
          <h2>Heading 2 - The quick brown fox</h2>
          <h3>Heading 3 - The quick brown fox</h3>
          <h4>Heading 4 - The quick brown fox</h4>
          <h5>Heading 5 - The quick brown fox</h5>
          <h6>Heading 6 - The quick brown fox</h6>
          <p>Paragraph - The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </div>
      </section>

      {/* Buttons */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>Buttons</h2>

        <h3 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-xl)' }}>Variants</h3>
        <div className="flex gap-4" style={{ marginBottom: 'var(--spacing-6)', flexWrap: 'wrap' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="success">Success</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-xl)' }}>Sizes</h3>
        <div className="flex gap-4 items-center" style={{ marginBottom: 'var(--spacing-6)' }}>
          <Button size="sm">Small</Button>
          <Button size="base">Base</Button>
          <Button size="lg">Large</Button>
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-xl)' }}>States</h3>
        <div className="flex gap-4" style={{ marginBottom: 'var(--spacing-6)' }}>
          <Button>Normal</Button>
          <Button disabled>Disabled</Button>
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-xl)' }}>Full Width</h3>
        <Button fullWidth>Full Width Button</Button>
      </section>

      {/* Badges */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>Badges</h2>
        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="gray">Gray</Badge>
        </div>
      </section>

      {/* Alerts */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>Alerts</h2>
        <Alert variant="success">
          <strong>Success!</strong> Your ticket has been created successfully.
        </Alert>
        <Alert variant="warning">
          <strong>Warning!</strong> This action cannot be undone.
        </Alert>
        <Alert variant="error">
          <strong>Error!</strong> Something went wrong. Please try again.
        </Alert>
        <Alert variant="info">
          <strong>Info:</strong> You have 3 pending tickets waiting for parts.
        </Alert>
      </section>

      {/* Form Elements */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>Form Elements</h2>

        <div style={{ maxWidth: '600px' }}>
          <Input
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            helper="We'll never share your email with anyone else."
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            error="Password must be at least 8 characters"
          />

          <Select
            label="Ticket Status"
            options={statusOptions}
            placeholder="Select status"
            helper="Choose the current status of the ticket"
          />

          <Textarea
            label="Description"
            placeholder="Describe the issue..."
            helper="Provide as much detail as possible"
            rows={4}
          />
        </div>
      </section>

      {/* Cards */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>Cards</h2>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-6)' }}>
          <Card>
            <CardHeader>
              <CardTitle>Basic Card</CardTitle>
            </CardHeader>
            <CardBody>
              <p>This is a basic card component with header and body sections.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ticket #1234</CardTitle>
              <div style={{ marginTop: 'var(--spacing-2)' }}>
                <Badge variant="success">Resolved</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <p><strong>Customer:</strong> John Doe</p>
              <p><strong>Device:</strong> iPhone 13 Pro</p>
              <p><strong>Issue:</strong> Screen not responding</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-5xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary-600)' }}>42</div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>Active Tickets</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Spacing Scale */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>Spacing Scale</h2>
        <div>
          {[0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24].map((size) => (
            <div key={size} className="flex items-center gap-4" style={{ marginBottom: 'var(--spacing-2)' }}>
              <div style={{ width: '100px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                spacing-{size}
              </div>
              <div
                style={{
                  width: `var(--spacing-${size})`,
                  height: '20px',
                  backgroundColor: 'var(--color-primary-500)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Shadows */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>Shadows</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-6)' }}>
          {['xs', 'sm', 'base', 'md', 'lg', 'xl'].map((shadow) => (
            <div key={shadow} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '100%',
                  height: '100px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-base)',
                  boxShadow: `var(--shadow-${shadow})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--spacing-2)',
                }}
              >
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                  shadow-{shadow}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
