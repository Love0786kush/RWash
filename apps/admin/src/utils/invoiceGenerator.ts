// RWash Detailing - Luxury Invoice PDF & Automatic HTML Email Template Generator

export interface InvoiceData {
  invoiceNumber: string;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  vehicleInfo?: string;
  serviceName: string;
  servicePrice: number;
  discountAmount?: number;
  couponCode?: string;
  bookingDate: string;
  bookingTime: string;
  status: string;
  createdAt: string;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  paymentMode?: string;
  paidAmount?: number;
  dueAtDoorstep?: number;
  utrNumber?: string;
}

// 1. PRINTABLE TAX INVOICE PDF HTML TEMPLATE
export const generateInvoiceHTML = (data: InvoiceData): string => {
  const finalPrice = Math.max(0, data.servicePrice - (data.discountAmount || 0))
  const taxAmount = Math.round(finalPrice * 0.18) // 18% GST (inclusive breakdown)
  const netAmount = finalPrice - taxAmount
  const paid = data.paidAmount !== undefined ? data.paidAmount : (finalPrice > 99 ? 99 : finalPrice)
  const due = data.dueAtDoorstep !== undefined ? data.dueAtDoorstep : Math.max(0, finalPrice - paid)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice #${data.invoiceNumber} - RWash Detailing</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #0f172a; color: #1e293b; padding: 40px 20px; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 48px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 48px; height: 48px; background: linear-gradient(135deg, #d97706, #b45309); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px; }
    .brand-name { font-size: 22px; font-weight: 900; color: #0f172a; }
    .brand-sub { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; }
    .inv-title { text-align: right; }
    .inv-badge { font-size: 12px; font-weight: 800; text-transform: uppercase; background: #fef3c7; color: #b45309; padding: 4px 12px; border-radius: 8px; display: inline-block; margin-bottom: 6px; }
    .inv-num { font-size: 18px; font-weight: 800; color: #0f172a; }
    .inv-date { font-size: 12px; color: #64748b; margin-top: 2px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin: 32px 0; }
    .meta-box h4 { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 8px; }
    .meta-box p { font-size: 13px; color: #334155; font-weight: 600; line-height: 1.5; }
    .meta-box strong { color: #0f172a; font-weight: 700; }
    .table-container { margin: 32px 0; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f8fafc; padding: 14px 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 18px 20px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; }
    .total-section { display: flex; justify-content: flex-end; margin-top: 24px; }
    .total-box { width: 320px; background: #f8fafc; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; }
    .total-row { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; margin-bottom: 8px; }
    .total-row.grand { font-size: 18px; font-weight: 900; color: #0f172a; padding-top: 12px; border-top: 2px solid #cbd5e1; margin-bottom: 0; }
    .status-stamp { display: inline-block; padding: 6px 16px; background: #dcfce7; color: #15803d; border: 1px solid #86efac; border-radius: 20px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 16px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px dashed #cbd5e1; text-align: center; color: #94a3b8; font-size: 11px; }
    @media print {
      body { background: white; padding: 0; }
      .invoice-card { box-shadow: none; border-radius: 0; padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="brand">
        <div class="brand-logo">🏎️</div>
        <div>
          <div class="brand-name">${data.businessName || 'RWash Auto Detailing'}</div>
          <div class="brand-sub">Premium Doorstep Detailing Specialist</div>
        </div>
      </div>
      <div class="inv-title">
        <span class="inv-badge">Official Tax Invoice</span>
        <div class="inv-num">#${data.invoiceNumber}</div>
        <div class="inv-date">Issued Date: ${new Date(data.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h4>Customer Information</h4>
        <p><strong>${data.customerName}</strong></p>
        <p>Email: ${data.customerEmail}</p>
        ${data.customerPhone ? `<p>Phone: ${data.customerPhone}</p>` : ''}
        ${data.customerAddress ? `<p>Doorstep Address: ${data.customerAddress}</p>` : ''}
        ${data.vehicleInfo ? `<p>Vehicle Model: ${data.vehicleInfo}</p>` : ''}
      </div>
      <div class="meta-box">
        <h4>Appointment Booking Info</h4>
        <p>Booking Ref: <strong>#${data.bookingId}</strong></p>
        <p>Scheduled Date: <strong>${data.bookingDate}</strong></p>
        <p>Scheduled Time: <strong>${data.bookingTime}</strong></p>
        <p>Payment Mode: <strong>${data.paymentMode || 'Pay on Service (₹99 Token Advance)'}</strong></p>
        <div><span class="status-stamp">✓ Slot Reserved (${data.status})</span></div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Wash Service Package</th>
            <th>Booking Schedule</th>
            <th style="text-align: right;">Price (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>${data.serviceName}</strong><br>
              <span style="font-size: 11px; color: #64748b;">Complete Premium Detailing & Foam Wash Pack</span>
            </td>
            <td>${data.bookingDate} at ${data.bookingTime}</td>
            <td style="text-align: right; font-weight: 700;">₹${data.servicePrice.toLocaleString('en-IN')}</td>
          </tr>
          ${data.couponCode ? `
          <tr>
            <td colspan="2" style="color: #059669; font-weight: 600;">Coupon Discount (${data.couponCode})</td>
            <td style="text-align: right; color: #059669; font-weight: 700;">-₹${(data.discountAmount || 0).toLocaleString('en-IN')}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
    </div>

    <div class="total-section">
      <div class="total-box">
        <div class="total-row">
          <span>Package Subtotal</span>
          <span>₹${netAmount.toLocaleString('en-IN')}</span>
        </div>
        <div class="total-row">
          <span>GST (18% Incl.)</span>
          <span>₹${taxAmount.toLocaleString('en-IN')}</span>
        </div>
        <div class="total-row grand">
          <span>Total Package Amount</span>
          <span>₹${finalPrice.toLocaleString('en-IN')}</span>
        </div>
        <div class="total-row" style="color: #d97706; font-weight: 800; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
          <span>Paid Online Today (UPI Token)</span>
          <span>₹${paid.toLocaleString('en-IN')}</span>
        </div>
        <div class="total-row" style="color: #2563eb; font-weight: 800;">
          <span>Balance Due at Doorstep</span>
          <span>₹${due.toLocaleString('en-IN')}</span>
        </div>
        ${data.utrNumber ? `
        <div style="font-size: 11px; color: #64748b; margin-top: 6px; font-weight: 600;">
          <strong>UPI Ref UTR:</strong> ${data.utrNumber}
        </div>
        ` : ''}
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing RWash Premium Detailing Services!</p>
      <p style="margin-top: 4px;">For support, call: ${data.businessPhone || '+91 7852081659'} | Email: support@rwash.com</p>
    </div>
  </div>
</body>
</html>
  `
}

// 2. STUNNING HIGH-END AUTOMATIC HTML EMAIL TEMPLATE (GMAIL & MOBILE READY)
export const generateBookingEmailHTML = (data: InvoiceData): string => {
  const finalPrice = Math.max(0, data.servicePrice - (data.discountAmount || 0))
  const paid = data.paidAmount !== undefined ? data.paidAmount : (finalPrice > 99 ? 99 : finalPrice)
  const due = data.dueAtDoorstep !== undefined ? data.dueAtDoorstep : Math.max(0, finalPrice - paid)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - RWash Detailing</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #0f172a; border-radius: 24px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- TOP HERO HEADER BANNER -->
          <tr>
            <td align="center" style="padding: 35px 30px 25px 30px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #1e293b;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left">
                    <span style="font-size: 22px; font-weight: 900; color: #f59e0b; letter-spacing: -0.5px; text-transform: uppercase;">🏎️ RWASH</span>
                    <span style="display: block; font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px;">DOORSTEP DETAILING SPECIALIST</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 6px 14px; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 20px;">
                      SLOT LOCKED ✓
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- GREETING & STATUS -->
          <tr>
            <td style="padding: 30px 35px 20px 35px;">
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 10px 0; tracking: -0.5px;">
                Booking Confirmed, ${data.customerName}! 🎉
              </h1>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
                Your doorstep car detailing appointment has been successfully scheduled. Our detailing specialist will arrive at your location on time with professional equipment.
              </p>
            </td>
          </tr>

          <!-- BOOKING SUMMARY BOX -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1e293b; border-radius: 18px; border: 1px solid #334155;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="display: block; font-size: 10px; font-weight: 900; color: #f59e0b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
                      📋 APPOINTMENT SPECIFICATIONS
                    </span>

                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;" width="40%">Booking ID:</td>
                        <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: 800;" align="right">#${data.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Tax Invoice No:</td>
                        <td style="padding: 6px 0; color: #38bdf8; font-size: 12px; font-weight: 800;" align="right">${data.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Wash Package:</td>
                        <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: 800;" align="right">${data.serviceName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Vehicle Model:</td>
                        <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: 800;" align="right">${data.vehicleInfo || 'Car'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Date & Time Slot:</td>
                        <td style="padding: 6px 0; color: #f59e0b; font-size: 12px; font-weight: 800;" align="right">${data.bookingDate} @ ${data.bookingTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Doorstep Address:</td>
                        <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: 700;" align="right">${data.customerAddress || 'Doorstep Location'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PAYMENT BREAKDOWN CARD -->
          <tr>
            <td style="padding: 0 35px 30px 35px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1e293b; border-radius: 18px; border: 1px solid #334155;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="display: block; font-size: 10px; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
                      💳 PAYMENT & DEPOSIT BREAKDOWN
                    </span>

                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Payment Mode Selected:</td>
                        <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: 800;" align="right">
                          ${data.paymentMode || 'Pay on Service (₹99 Token Advance)'}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Total Package Cost:</td>
                        <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: 700;" align="right">₹${data.servicePrice.toLocaleString('en-IN')}</td>
                      </tr>
                      ${data.discountAmount ? `
                      <tr>
                        <td style="padding: 6px 0; color: #10b981; font-size: 12px;">Coupon Saved (${data.couponCode}):</td>
                        <td style="padding: 6px 0; color: #10b981; font-size: 12px; font-weight: 800;" align="right">-₹${data.discountAmount.toLocaleString('en-IN')}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 10px 0 6px 0; color: #f59e0b; font-size: 13px; font-weight: 900; border-top: 1px dashed #334155;">Paid Online Today (Token):</td>
                        <td style="padding: 10px 0 6px 0; color: #f59e0b; font-size: 15px; font-weight: 900; border-top: 1px dashed #334155;" align="right">₹${paid.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #38bdf8; font-size: 13px; font-weight: 900;">Balance Due at Doorstep:</td>
                        <td style="padding: 6px 0; color: #38bdf8; font-size: 15px; font-weight: 900;" align="right">₹${due.toLocaleString('en-IN')}</td>
                      </tr>
                      ${data.utrNumber ? `
                      <tr>
                        <td style="padding: 6px 0 0 0; color: #64748b; font-size: 11px;" colspan="2">
                          <strong>UPI UTR / Ref No:</strong> ${data.utrNumber}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding: 25px 35px 35px 35px; background-color: #0b1120; border-top: 1px solid #1e293b;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0; font-weight: 600;">
                Thank you for choosing RWash Auto Detailing Services!
              </p>
              <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5;">
                Need help with your booking? Call us at <strong>${data.businessPhone || '+91 7852081659'}</strong> or reply directly to this email.<br>
                © ${new Date().getFullYear()} RWash Auto Detailing Inc. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export const downloadInvoicePDF = (data: InvoiceData) => {
  const htmlContent = generateInvoiceHTML(data)
  const printWindow = window.open('', '_blank', 'width=900,height=900')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }
}
