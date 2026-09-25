import Link from "next/link";

export default function WhatsAppDevice({
  message,
  href,
  name = "שירה",
  caption = "ככה זה נשלח",
}: {
  message: string;
  href: string;
  name?: string;
  caption?: string;
}) {
  return (
    <figure className="device-frame whatsapp-device">
      <div className="device-bezel">
        <i className="device-notch" aria-hidden="true" />
        <div className="wa-chrome">
          <header className="wa-header">
            <span className="wa-avatar" aria-hidden="true">{name.slice(0, 1)}</span>
            <div>
              <strong>{name}</strong>
              <small>הודעה מוכנה לשליחה</small>
            </div>
          </header>
          <div className="wa-thread">
            <p className="wa-bubble wa-in">יש לך דקה?</p>
            <div className="wa-bubble wa-out">
              <pre>{message}</pre>
            </div>
            <Link href={href} className="wa-link-card">פתיחת ההזמנה</Link>
          </div>
        </div>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
