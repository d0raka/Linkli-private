/** The exact message Linkli prepares for sharing, shown as it lands in a chat, plus the guest's reply. */
export default function WhatsAppPreview({ message, reply, contact }: { message: string; reply: string; contact: string }) {
  return (
    <figure className="wa-preview" aria-label="דוגמה להודעת וואטסאפ">
      <div className="wa-preview__head">
        <span className="wa-preview__avatar" aria-hidden="true">{contact.slice(0, 1)}</span>
        <b>{contact}</b>
      </div>
      <div className="wa-preview__thread">
        <p className="wa-preview__bubble is-out">{message}</p>
        <p className="wa-preview__bubble is-in">{reply}</p>
      </div>
    </figure>
  );
}
