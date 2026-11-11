// Email Service Utility for Automatic Silent Background Status Update Emails from Admin Panel via EmailJS

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

export const sendBookingConfirmationEmail = async (data: InvoiceData): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`[ADMIN AUTOMATIC EMAIL] Sending EmailJS invoice to ${data.customerEmail}...`)

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
          to_name: data.customerName,
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
    console.log('[Admin EmailJS Response]', res.status, resText)

    return {
      success: true,
      message: `⚡ Invoice PDF & booking details sent to ${data.customerEmail}`
    }
  } catch (err: any) {
    console.error('Email dispatch error:', err)
    return {
      success: false,
      message: err.message || 'Failed to send email'
    }
  }
}

export const sendBookingStatusUpdateEmail = async (data: StatusUpdateData): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`[ADMIN AUTOMATIC STATUS DISPATCH] Sending EmailJS status '${data.newStatus}' to ${data.customerEmail}...`)

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
          to_name: data.customerName,
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
    console.log('[Admin EmailJS Status Response]', res.status, resText)

    return {
      success: true,
      message: `⚡ Status update email '${data.newStatus}' sent automatically`
    }
  } catch (err: any) {
    console.error('Status update email error:', err)
    return {
      success: false,
      message: err.message || 'Failed to dispatch status email'
    }
  }
}
