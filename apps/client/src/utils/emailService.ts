// Email Service Utility for Automatic Booking Confirmation & Status Update Emails via EmailJS

import { InvoiceData } from './invoiceGenerator'

export interface StatusUpdateData {
  customerEmail: string;
  customerName: string;
  bookingId: string;
  newStatus: 'Pending' | 'Confirmed' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  vehicleInfo?: string;
}

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_caw5auv'
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_9f59ra8'
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'fR-Acs-Nvu2OGJMmu'

// Automatic Booking Confirmation Email Sender via EmailJS API
export const sendBookingConfirmationEmail = async (data: InvoiceData): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`[AUTOMATIC EMAIL DISPATCH] Sending EmailJS to ${data.customerEmail}...`)

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: data.customerEmail,
          email: data.customerEmail,
          user_email: data.customerEmail,
          recipient_email: data.customerEmail,
          customer_email: data.customerEmail,
          to_name: data.customerName,
          name: data.customerName,
          booking_id: data.bookingId,
          invoice_number: data.invoiceNumber,
          service_name: data.serviceName,
          service_price: data.servicePrice,
          paid_amount: data.paidAmount || 99,
          due_amount: data.dueAtDoorstep || 0,
          booking_date: data.bookingDate,
          booking_time: data.bookingTime,
          customer_address: data.customerAddress || 'Doorstep Location',
          vehicle_info: data.vehicleInfo || 'Car',
          payment_mode: data.paymentMode || 'Pay on Service (₹99 Token Advance)',
          utr_number: data.utrNumber || 'N/A'
        }
      })
    })

    const resText = await res.text()
    console.log('[EmailJS Confirmation Response]', res.status, resText)

    if (res.ok || res.status === 200) {
      return {
        success: true,
        message: `⚡ Email automatically delivered to ${data.customerEmail}`
      }
    } else {
      console.warn('EmailJS notice:', resText)
      return {
        success: false,
        message: `EmailJS API Notice: ${resText}`
      }
    }
  } catch (err: any) {
    console.error('EmailJS dispatch error:', err)
    return {
      success: false,
      message: err.message || 'Failed to dispatch email'
    }
  }
}

// Automatic Booking Status Update Email Sender via EmailJS API
export const sendBookingStatusUpdateEmail = async (data: StatusUpdateData): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`[AUTOMATIC STATUS DISPATCH] Sending EmailJS status '${data.newStatus}' to ${data.customerEmail}...`)

    const statusIcons: Record<string, string> = {
      'Confirmed': '✅ Appointment Confirmed & Slot Locked',
      'Assigned': '🚘 Detailer Assigned to your Wash',
      'In Progress': '🧼 Wash in Progress at your Doorstep',
      'Completed': '🎉 Detailing Completed! Enjoy your Shiny Vehicle',
      'Cancelled': '❌ Appointment Status Update'
    }

    const subjectText = statusIcons[data.newStatus] || `RWash Appointment Update: ${data.newStatus}`

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: data.customerEmail,
          email: data.customerEmail,
          user_email: data.customerEmail,
          recipient_email: data.customerEmail,
          customer_email: data.customerEmail,
          to_name: data.customerName,
          name: data.customerName,
          subject: subjectText,
          status_title: data.newStatus,
          booking_id: data.bookingId,
          service_name: data.serviceName,
          booking_date: data.bookingDate,
          booking_time: data.bookingTime,
          vehicle_info: data.vehicleInfo || ''
        }
      })
    })

    const resText = await res.text()
    console.log('[EmailJS Status Response]', res.status, resText)

    return {
      success: true,
      message: `⚡ Status update email '${data.newStatus}' sent for ${data.customerEmail}`
    }
  } catch (err: any) {
    console.error('Status update email error:', err)
    return {
      success: false,
      message: err.message || 'Failed to dispatch status email'
    }
  }
}

// Optional Manual Gmail Composer Helper
export const openGmailComposer = (data: InvoiceData) => {
  const subject = encodeURIComponent(`🚗 Booking Confirmed - RWash Invoice #${data.invoiceNumber}`)
  const bodyText = encodeURIComponent(
`Hi ${data.customerName},

Thank you for choosing RWash Auto Detailing! Your appointment slot is confirmed.

=== BOOKING DETAILS ===
Booking ID: #${data.bookingId}
Invoice Number: ${data.invoiceNumber}
Service Package: ${data.serviceName} (₹${data.servicePrice})
Vehicle Info: ${data.vehicleInfo || 'N/A'}
Date & Slot: ${data.bookingDate} at ${data.bookingTime}
Doorstep Location: ${data.customerAddress}

=== PAYMENT SUMMARY ===
Payment Mode: ${data.paymentMode || 'Pay on Service'}
Paid Today (UPI Token): ₹${data.paidAmount || 99}
Balance Due at Doorstep: ₹${data.dueAtDoorstep || 0}
${data.utrNumber ? 'UPI UTR Ref No: ' + data.utrNumber : ''}

Thank you for choosing RWash Auto Detailing!`
  )

  const gmailWebComposerUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(data.customerEmail)}&su=${subject}&body=${bodyText}`
  window.open(gmailWebComposerUrl, '_blank')
}
