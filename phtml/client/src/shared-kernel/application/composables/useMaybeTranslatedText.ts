export function useMaybeTranslatedText() {
  const { t, te } = useI18n()

  return (value?: string | null, fallback = "") => {
    if (!value) return fallback
    return te(value) ? t(value) : value
  }
}
