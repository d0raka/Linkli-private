"use client";

export default function PasswordMeter({ value }: { value: string }) {
  const length = Array.from(value.normalize("NFC")).length;
  const enough = length >= 15;
  return (
    <span className="password-meter" role="status" aria-live="polite" data-enough={enough ? "" : undefined}>
      <meter min={0} max={15} value={Math.min(length, 15)} aria-label="אורך הסיסמה" />
      <span>{enough ? "האורך מתאים. כדאי לבחור משפט ייחודי שקל לכם לזכור." : `עוד ${15 - length} תווים לפחות. אפשר לכתוב משפט קצר עם רווחים.`}</span>
    </span>
  );
}
