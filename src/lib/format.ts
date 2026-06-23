import { format } from 'date-fns'

export type NumberFormatLanguage = 'en' | 'id'

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0
  return typeof value === 'number' ? value : Number(value)
}

export function parseWholeNumberInput(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\D/g, '')
}

export function formatWholeNumberInput(
  value: unknown,
  language: NumberFormatLanguage,
) {
  const digits = parseWholeNumberInput(value).replace(/^0+(?=\d)/, '')
  if (!digits) return ''
  const separator = language === 'id' ? '.' : ','
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
}

export function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(toNumber(value))
    .replace(/^Rp[\s\u00a0\u202f]*/, 'Rp')
}

export function number(value: number, language: NumberFormatLanguage = 'id') {
  return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US').format(value)
}

export function shortDate(value: string, language: NumberFormatLanguage = 'en') {
  if (language === 'id') {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  }

  return format(new Date(value), 'dd MMM yyyy')
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function readError(error: unknown, language: NumberFormatLanguage = 'en') {
  return error instanceof Error
    ? humanizeErrorMessage(
        error.message,
        language === 'id' ? 'Terjadi kesalahan' : 'Something went wrong',
        language,
      )
    : language === 'id'
      ? 'Terjadi kesalahan'
      : 'Something went wrong'
}

export function readFormError(
  message: unknown,
  language: NumberFormatLanguage = 'en',
) {
  return humanizeErrorMessage(
    message,
    language === 'id' ? 'Periksa kembali field ini' : 'Please check this field',
    language,
  )
}

function humanizeErrorMessage(
  message: unknown,
  fallback: string,
  language: NumberFormatLanguage,
) {
  if (typeof message !== 'string') return fallback
  const text = message.trim()
  if (!text) return fallback
  const copy = (en: string, id: string) => (language === 'id' ? id : en)

  const minCharacters = text.match(
    /(?:expected string to have >=|at least )(\d+) character/i,
  )
  if (minCharacters) {
    return copy(
      `Enter at least ${minCharacters[1]} characters`,
      `Isi minimal ${minCharacters[1]} karakter`,
    )
  }

  const maxCharacters = text.match(
    /(?:expected string to have <=|at most )(\d+) character/i,
  )
  if (maxCharacters) {
    return copy(
      `Use ${maxCharacters[1]} characters or fewer`,
      `Gunakan maksimal ${maxCharacters[1]} karakter`,
    )
  }

  if (/expected number|received nan|must be a number/i.test(text)) {
    return copy('Enter a valid number', 'Masukkan angka yang valid')
  }
  if (/expected string|received undefined|required/i.test(text)) {
    return copy('Please fill this field', 'Field ini wajib diisi')
  }
  if (/expected int|integer/i.test(text)) {
    return copy('Enter a whole number', 'Masukkan angka bulat')
  }
  if (/must not be greater than 100|less than or equal to 100|0-100/i.test(text)) {
    return copy(
      'Use a percentage from 0 to 100',
      'Gunakan persentase 0 sampai 100',
    )
  }
  if (/must not be less than 0|greater than or equal to 0|number to be >=0/i.test(text)) {
    return copy(
      'Enter 0 or a positive number',
      'Masukkan 0 atau angka positif',
    )
  }
  if (/number to be >=1|greater than or equal to 1/i.test(text)) {
    return copy('Enter at least 1', 'Masukkan minimal 1')
  }
  if (/iso ?8601|valid date|valid .*time/i.test(text)) {
    return copy(
      'Choose a valid date and time',
      'Pilih tanggal dan waktu yang valid',
    )
  }
  if (/invalid input|invalid option|expected one of/i.test(text)) {
    return copy(
      'Choose one of the available options',
      'Pilih salah satu opsi yang tersedia',
    )
  }
  if (/unexpected response format/i.test(text)) {
    return copy(
      "We couldn't read the server response. Please try again.",
      'Respons server tidak bisa dibaca. Coba lagi.',
    )
  }
  if (/request timed out/i.test(text)) {
    return copy(
      'Request timed out. Please try again.',
      'Request terlalu lama. Coba lagi.',
    )
  }

  return text
}
