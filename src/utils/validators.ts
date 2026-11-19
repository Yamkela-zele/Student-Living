export const validEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value)
export const validPassword = (value: string) => value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value)
export function validateRegistration(form: Record<string, string>, student: boolean) {
  const errors: Record<string, string[]> = {}
  if (!validEmail(form.email || '')) errors.email = ['Enter a valid email address.']
  if (!validPassword(form.password || '')) errors.password = ['Use 8+ characters, an uppercase letter and a number.']
  if (student && (form.studentNumber || '').length < 5) errors.studentNumber = ['Student number must be at least 5 characters.']
  return Object.keys(errors).length ? errors : null
}
