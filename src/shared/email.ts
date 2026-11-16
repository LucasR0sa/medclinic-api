/** "  Admin@MedClinic.com " e "admin@medclinic.com" são o mesmo e-mail. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
