export const openWhatsApp = (message: string) => {
  const phoneNumber = '593993385551'
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
}
