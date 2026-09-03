import Link from 'next/link';
import { 
  WrenchIcon, 
  PackageIcon, 
  SearchIcon, 
  ReceiptIcon, 
  ShieldCheckIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  PrinterIcon, 
  ArrowRightIcon, 
  LogInIcon,
  UsersIcon,
  SmartphoneIcon,
  LaptopIcon,
  CpuIcon,
  ZapIcon,
  CheckIcon
} from '@/components/home/Icons';
import HomeTicketSearch from '@/components/home/HomeTicketSearch';
import styles from './page.module.css';

export const metadata = {
  title: 'FIX Workshop - Sistema de Control y Gestión para Talleres de Electrónica',
  description: 'Controla la operación completa de tu taller: órdenes de reparación, repuestos, diagnósticos, punto de venta (POS) y seguimiento en tiempo real para clientes.',
  openGraph: {
    title: 'FIX Workshop - Gestión Eficiente para Talleres',
    description: 'Aumenta la rentabilidad y el control de tu taller. Tickets, inventario, cotizaciones y entregas con total transparencia.',
  },
};

export default function Home() {
  return (
    <div className={styles['container']}>
      {/* Top Navigation */}
      <header className={styles['header']}>
        <div className={styles['navContainer']}>
          <Link href="/" className={styles['logoArea']}>
            <div className={styles['logoIcon']}>
              <WrenchIcon size={22} />
            </div>
            <div>
              <span className={styles['logoTitle']}>FIX Workshop</span>
              <span className={styles['logoSubtitle']}>Gestión Integral de Talleres</span>
            </div>
          </Link>

          <nav className={styles['navMenu']}>
            <Link href="#servicios" className={styles['navMenuLink']}>Servicios</Link>
            <Link href="#caracteristicas" className={styles['navMenuLink']}>Funciones</Link>
            <Link href="#flujo" className={styles['navMenuLink']}>Flujo Operativo</Link>
            <Link href="#roles" className={styles['navMenuLink']}>Equipo</Link>
          </nav>

          <div className={styles['navLinks']}>
            <Link href="/tickets/status" className={styles['navBtnSecondary']}>
              <SearchIcon size={16} />
              <span>Consultar Ticket</span>
            </Link>
            <Link href="/login" className={styles['navBtnPrimary']}>
              <LogInIcon size={16} />
              <span>Acceso al Taller</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles['hero']}>
        <div className={styles['heroContent']}>
          <div className={styles['heroBadge']}>
            <CheckCircleIcon size={16} />
            <span>Control Operativo, Repuestos y Caja en un Solo Lugar</span>
          </div>

          <h1 className={styles['title']}>
            La plataforma definitiva para la gestión de <span className={styles['highlightText']}>tu taller de electrónica</span>
          </h1>

          <p className={styles['subtitle']}>
            Optimiza cada etapa de tu negocio: desde la recepción y el diagnóstico inicial con tickets térmicos, 
            hasta el consumo automatizado de repuestos, arqueo de caja y seguimiento en vivo para tus clientes.
          </p>

          {/* Quick Tracker Widget for Customers */}
          <HomeTicketSearch />

          <div className={styles['ctaGroup']}>
            <Link href="/login" className={styles['primaryHeroBtn']}>
              <span>Ingresar al Sistema</span>
              <ArrowRightIcon size={18} />
            </Link>
            <Link href="/tickets/status" className={styles['secondaryHeroBtn']}>
              <SearchIcon size={18} />
              <span>Portal de Clientes (Rastrear Equipo)</span>
            </Link>
          </div>

          {/* Quick Stats / Value Props */}
          <div className={styles['statsGrid']}>
            <div className={styles['statItem']}>
              <div className={styles['statValue']}>+50%</div>
              <div className={styles['statLabel']}>Rapidez en Recepción y Entregas</div>
            </div>
            <div className={styles['statItem']}>
              <div className={styles['statValue']}>100%</div>
              <div className={styles['statLabel']}>Trazabilidad de Reparaciones</div>
            </div>
            <div className={styles['statItem']}>
              <div className={styles['statValue']}>0%</div>
              <div className={styles['statLabel']}>Pérdidas o Fugas de Repuestos</div>
            </div>
            <div className={styles['statItem']}>
              <div className={styles['statValue']}>24/7</div>
              <div className={styles['statLabel']}>Consulta en Línea para Clientes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Common Workshop Services / Templates */}
      <section id="servicios" className={styles['servicesSection']}>
        <div className={styles['sectionHeader']}>
          <span className={styles['sectionBadge']}>Plantillas Preconfiguradas</span>
          <h2 className={styles['sectionTitle']}>Estandariza los servicios más comunes de tu taller</h2>
          <p className={styles['sectionSubtitle']}>
            Crea órdenes de trabajo en segundos utilizando precios, repuestos sugeridos y tiempos estimados predeterminados.
          </p>
        </div>

        <div className={styles['servicesGrid']}>
          <div className={styles['serviceCard']}>
            <span className={styles['serviceTag']}>Smartphones & Tablets</span>
            <div className={styles['roleHeader']}>
              <div className={styles['roleIcon']}>
                <SmartphoneIcon size={22} />
              </div>
              <h3 className={styles['serviceTitle']}>Cambio de Pantalla y Módulos</h3>
            </div>
            <p className={styles['serviceDesc']}>
              Reemplazo de display táctil con checklist de pruebas de cámaras, sensor de proximidad y biométricos.
            </p>
            <div className={styles['serviceMeta']}>
              <span>Tiempo est: 1 - 2 hrs</span>
              <span>Incluye garantía</span>
            </div>
          </div>

          <div className={styles['serviceCard']}>
            <span className={styles['serviceTag']}>Laptops & Computadoras</span>
            <div className={styles['roleHeader']}>
              <div className={styles['roleIcon']}>
                <LaptopIcon size={22} />
              </div>
              <h3 className={styles['serviceTitle']}>Mantenimiento Térmico</h3>
            </div>
            <p className={styles['serviceDesc']}>
              Limpieza profunda, cambio de pasta térmica de alto rendimiento y reemplazo de pads de disipación.
            </p>
            <div className={styles['serviceMeta']}>
              <span>Tiempo est: 2 - 4 hrs</span>
              <span>Pruebas de estrés</span>
            </div>
          </div>

          <div className={styles['serviceCard']}>
            <span className={styles['serviceTag']}>Microelectrónica</span>
            <div className={styles['roleHeader']}>
              <div className={styles['roleIcon']}>
                <CpuIcon size={22} />
              </div>
              <h3 className={styles['serviceTitle']}>Reparación de Placa & Reballing</h3>
            </div>
            <p className={styles['serviceDesc']}>
              Diagnóstico de cortos en líneas principales, reemplazo de integrados de carga (PMIC) y microsoldadura.
            </p>
            <div className={styles['serviceMeta']}>
              <span>Tiempo est: 24 - 48 hrs</span>
              <span>Diagnóstico avanzado</span>
            </div>
          </div>

          <div className={styles['serviceCard']}>
            <span className={styles['serviceTag']}>Energía y Puertos</span>
            <div className={styles['roleHeader']}>
              <div className={styles['roleIcon']}>
                <ZapIcon size={22} />
              </div>
              <h3 className={styles['serviceTitle']}>Baterías y Pines de Carga</h3>
            </div>
            <p className={styles['serviceDesc']}>
              Instalación de celdas originales o de alta capacidad con verificación de amperaje y ciclos de carga.
            </p>
            <div className={styles['serviceMeta']}>
              <span>Tiempo est: 1 hr</span>
              <span>Stock inmediato</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Business Features */}
      <section id="caracteristicas" className={styles['featuresSection']}>
        <div className={styles['sectionHeader']}>
          <span className={styles['sectionBadge']}>Soluciones Integrales</span>
          <h2 className={styles['sectionTitle']}>Todo lo que necesitas para operar con precisión</h2>
          <p className={styles['sectionSubtitle']}>
            Herramientas diseñadas exclusivamente para talleres que manejan alto volumen de equipos y clientes exigentes.
          </p>
        </div>

        <div className={styles['featureGrid']}>
          {/* Card 1 */}
          <div className={styles['featureCard']}>
            <div className={styles['iconWrapper']}>
              <PrinterIcon size={24} />
            </div>
            <h3 className={styles['featureTitle']}>Tickets Térmicos 80mm y PDF</h3>
            <p className={styles['featureText']}>
              Imprime comprobantes térmicos instantáneos con código QR al recibir el equipo. El cliente puede escanearlo en cualquier momento para ver fotos del diagnóstico y avances.
            </p>
          </div>

          {/* Card 2 */}
          <div className={styles['featureCard']}>
            <div className={styles['iconWrapper']}>
              <PackageIcon size={24} />
            </div>
            <h3 className={styles['featureTitle']}>Inventario y Repuestos Atómico</h3>
            <p className={styles['featureText']}>
              Descuenta partes automáticamente en el momento exacto en que se utilizan en una reparación. Mantén alertas de stock bajo y conoce la rentabilidad neta por servicio.
            </p>
          </div>

          {/* Card 3 */}
          <div className={styles['featureCard']}>
            <div className={styles['iconWrapper']}>
              <SearchIcon size={24} />
            </div>
            <h3 className={styles['featureTitle']}>Portal de Clientes en Vivo</h3>
            <p className={styles['featureText']}>
              Tus clientes revisan el estado de su orden desde el celular, aprueban cotizaciones adicionales y reciben alertas por correo cuando el equipo está listo para retiro.
            </p>
          </div>

          {/* Card 4 */}
          <div className={styles['featureCard']}>
            <div className={styles['iconWrapper']}>
              <ReceiptIcon size={24} />
            </div>
            <h3 className={styles['featureTitle']}>Punto de Venta (POS) y Caja Diaria</h3>
            <p className={styles['featureText']}>
              Cobra mano de obra, anticipos y venta de accesorios directamente en mostrador. Arqueos de caja por turno y control total de medios de pago (efectivo, transferencias, tarjetas).
            </p>
          </div>

          {/* Card 5 */}
          <div className={styles['featureCard']}>
            <div className={styles['iconWrapper']}>
              <ClockIcon size={24} />
            </div>
            <h3 className={styles['featureTitle']}>Control de Tiempos y SLA</h3>
            <p className={styles['featureText']}>
              Asigna reparaciones a tus técnicos de acuerdo con su especialidad y monitorea que ningún equipo exceda el tiempo prometido de entrega mediante semáforos de urgencia.
            </p>
          </div>

          {/* Card 6 */}
          <div className={styles['featureCard']}>
            <div className={styles['iconWrapper']}>
              <ShieldCheckIcon size={24} />
            </div>
            <h3 className={styles['featureTitle']}>Garantías y Actas de Entrega</h3>
            <p className={styles['featureText']}>
              Emite actas de entrega con checklist de pruebas de salida (audio, touch, carga) y plazos de garantía específicos para proteger a tu taller contra reclamos indebidos.
            </p>
          </div>
        </div>
      </section>

      {/* Operational Workflow */}
      <section id="flujo" className={styles['workflowSection']}>
        <div className={styles['sectionHeader']}>
          <span className={styles['sectionBadge']}>Flujo Paso a Paso</span>
          <h2 className={styles['sectionTitle']}>Un proceso ágil y transparente de inicio a fin</h2>
          <p className={styles['sectionSubtitle']}>
            Estandariza la atención en mostrador y el trabajo de laboratorio para brindar una experiencia profesional.
          </p>
        </div>

        <div className={styles['stepsGrid']}>
          <div className={styles['stepCard']}>
            <div className={styles['stepNumber']}>1</div>
            <h3 className={styles['stepTitle']}>Recepción & Checklist</h3>
            <p className={styles['stepDescription']}>
              Registro rápido del cliente, estado físico del equipo, accesorios entregados y emisión del ticket con código QR.
            </p>
          </div>

          <div className={styles['stepCard']}>
            <div className={styles['stepNumber']}>2</div>
            <h3 className={styles['stepTitle']}>Diagnóstico Técnico</h3>
            <p className={styles['stepDescription']}>
              Revisión técnica, cotización de mano de obra y asignación de repuestos requeridos con cálculo automático de costos.
            </p>
          </div>

          <div className={styles['stepCard']}>
            <div className={styles['stepNumber']}>3</div>
            <h3 className={styles['stepTitle']}>Aprobación y Reparación</h3>
            <p className={styles['stepDescription']}>
              El cliente aprueba el presupuesto en línea. El técnico realiza la reparación con descuento automático de inventario.
            </p>
          </div>

          <div className={styles['stepCard']}>
            <div className={styles['stepNumber']}>4</div>
            <h3 className={styles['stepTitle']}>Cierre, Cobro y Entrega</h3>
            <p className={styles['stepDescription']}>
              Checklist de control de calidad, facturación en el POS, entrega de comprobante de garantía y entrega final.
            </p>
          </div>
        </div>
      </section>

      {/* Role Organization */}
      <section id="roles" className={styles['rolesSection']}>
        <div className={styles['sectionHeader']}>
          <span className={styles['sectionBadge']}>Organización por Roles</span>
          <h2 className={styles['sectionTitle']}>Diseñado a la medida de cada miembro de tu equipo</h2>
          <p className={styles['sectionSubtitle']}>
            Interfaces claras y permisos específicos para que cada usuario se concentre en lo que mejor sabe hacer.
          </p>
        </div>

        <div className={styles['rolesGrid']}>
          <div className={styles['roleCard']}>
            <div className={styles['roleHeader']}>
              <div className={styles['roleIcon']}>
                <UsersIcon size={22} />
              </div>
              <h3 className={styles['roleTitle']}>Recepción & Mostrador</h3>
            </div>
            <ul className={styles['roleList']}>
              <li className={styles['roleListItem']}>
                <CheckIcon className={styles['checkIcon']} size={18} />
                <span>Recepción y búsqueda ágil de clientes</span>
              </li>
              <li className={styles['roleListItem']}>
                <CheckIcon className={styles['checkIcon']} size={18} />
                <span>Emisión instantánea de tickets 80mm</span>
              </li>
              <li className={styles['roleListItem']}>
                <CheckIcon className={styles['checkIcon']} size={18} />
                <span>Cobro de anticipos y ventas POS de mostrador</span>
              </li>
            </ul>
          </div>

          <div className={styles['roleCard']}>
            <div className={styles['roleHeader']}>
              <div className={styles['roleIcon']}>
                <WrenchIcon size={22} />
              </div>
              <h3 className={styles['roleTitle']}>Técnicos Especialistas</h3>
            </div>
            <ul className={styles['roleList']}>
              <li className={styles['roleListItem']}>
                <CheckIcon className={styles['checkIcon']} size={18} />
                <span>Tablero de órdenes asignadas por prioridad</span>
              </li>
              <li className={styles['roleListItem']}>
                <CheckIcon className={styles['checkIcon']} size={18} />
                <span>Solicitud y consumo de repuestos en 1 clic</span>
              </li>
              <li className={styles['roleListItem']}>
                <CheckIcon className={styles['checkIcon']} size={18} />
                <span>Checklist de pruebas técnicas de salida</span>
              </li>
            </ul>
          </div>

          <div className={styles['roleCard']}>
            <div className={styles['roleHeader']}>
              <div className={styles['roleIcon']}>
                <ReceiptIcon size={22} />
              </div>
              <h3 className={styles['roleTitle']}>Administrador / Dueño</h3>
            </div>
            <ul className={styles['roleList']}>
              <li className={styles['roleListItem']}>
                <CheckIcon className={styles['checkIcon']} size={18} />
                <span>Reportes de rentabilidad y facturación</span>
              </li>
              <li className={styles['roleListItem']}>
                <CheckIcon className={styles['checkIcon']} size={18} />
                <span>Control de inventario con alertas de stock</span>
              </li>
              <li className={styles['roleListItem']}>
                <CheckIcon className={styles['checkIcon']} size={18} />
                <span>Auditoría de cortes de caja y productividad</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Customer Quick Lookup Banner */}
      <section className={styles['portalBanner']}>
        <div className={styles['bannerCard']}>
          <div className={styles['bannerContent']}>
            <h2 className={styles['bannerTitle']}>¿Dejaste un equipo en reparación?</h2>
            <p className={styles['bannerText']}>
              Ingresa el código de tu ticket o número telefónico para verificar en vivo si tu diagnóstico está listo o si ya puedes pasar a recogerlo.
            </p>
          </div>
          <Link href="/tickets/status" className={styles['bannerBtn']}>
            <SearchIcon size={18} />
            <span>Consultar Estado de Mi Orden</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles['footer']}>
        <div className={styles['footerContent']}>
          <div className={styles['footerTop']}>
            <div className={styles['footerBrand']}>
              <div className={styles['footerBrandName']}>FIX Workshop</div>
              <p className={styles['footerBrandDesc']}>
                Plataforma de gestión integral para talleres de servicio técnico, microelectrónica y reparación de dispositivos.
              </p>
            </div>

            <div className={styles['footerLinksCol']}>
              <div className={styles['footerLinksTitle']}>Accesos Rápidos</div>
              <Link href="/login" className={styles['footerLink']}>Ingreso al Taller</Link>
              <Link href="/tickets/status" className={styles['footerLink']}>Portal de Clientes</Link>
            </div>

            <div className={styles['footerLinksCol']}>
              <div className={styles['footerLinksTitle']}>Módulos</div>
              <Link href="/login" className={styles['footerLink']}>Órdenes de Trabajo</Link>
              <Link href="/login" className={styles['footerLink']}>Inventario de Repuestos</Link>
              <Link href="/login" className={styles['footerLink']}>Punto de Venta (POS)</Link>
            </div>
          </div>

          <div className={styles['footerBottom']}>
            <div>
              &copy; {new Date().getFullYear()} FIX Workshop. Todos los derechos reservados.
            </div>
            <div>
              Solución para Talleres de Electrónica &bull; Soporte y Control Total
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
