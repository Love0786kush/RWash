/**
 * Helper to export reports dynamically as PDF via the browser printing system.
 * Generates a clean, beautifully formatted invoice/report receipt window.
 */
interface ReportData {
  timeframe: string;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  revenue: number;
  customers: number;
  popularServices: Array<{ name: string; count: number; price: number }>;
}

export const downloadPDF = (data: ReportData, businessName = 'RWash') => {
  const printWindow = window.open('', '_blank', 'width=800,height=900')
  if (!printWindow) return

  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const popularServicesRows = data.popularServices
    .map(
      (s) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 0; font-weight: 600;">${s.name}</td>
      <td style="padding: 10px 0; text-align: center;">${s.count}</td>
      <td style="padding: 10px 0; text-align: right;">$${s.price.toFixed(2)}</td>
      <td style="padding: 10px 0; text-align: right; font-weight: 700;">$${(s.count * s.price).toFixed(2)}</td>
    </tr>
  `
    )
    .join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${businessName} - ${data.timeframe} Report</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #334155;
            padding: 40px;
            background-color: #ffffff;
            margin: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0ea5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .brand {
            font-size: 28px;
            font-weight: 800;
            color: #0284c7;
          }
          .title {
            font-size: 18px;
            color: #64748b;
            font-weight: 600;
          }
          .meta-info {
            font-size: 13px;
            color: #94a3b8;
            margin-bottom: 30px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
          }
          .card {
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
          }
          .card-title {
            font-size: 11px;
            color: #94a3b8;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 5px;
          }
          .card-value {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
          }
          .card-value.revenue {
            color: #0284c7;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            margin-bottom: 40px;
          }
          th {
            color: #64748b;
            font-weight: 700;
            padding-bottom: 10px;
            border-bottom: 2px solid #f1f5f9;
          }
          .footer {
            margin-top: 60px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">${businessName}</div>
            <div class="title">${data.timeframe} Performance Report</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 750; font-size: 14px;">RWash Control Center</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Status: Approved</div>
          </div>
        </div>

        <div class="meta-info">
          Generated on: <strong>${dateStr}</strong> | Filter scope: <strong>${data.timeframe}</strong>
        </div>

        <div class="section-title">Key Performance Indicators</div>
        <div class="grid">
          <div class="card">
            <div class="card-title">Total Bookings</div>
            <div class="card-value">${data.totalBookings}</div>
          </div>
          <div class="card">
            <div class="card-title">Completed</div>
            <div class="card-value" style="color: #10b981;">${data.completedBookings}</div>
          </div>
          <div class="card">
            <div class="card-title">Cancelled</div>
            <div class="card-value" style="color: #ef4444;">${data.cancelledBookings}</div>
          </div>
          <div class="card">
            <div class="card-title">Revenue Generated</div>
            <div class="card-value revenue">$${data.revenue.toFixed(2)}</div>
          </div>
        </div>

        <div class="section-title">Popular Services Breakdown</div>
        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Service Name</th>
              <th style="text-align: center; width: 100px;">Orders</th>
              <th style="text-align: right; width: 120px;">Unit Rate</th>
              <th style="text-align: right; width: 140px;">Gross Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${popularServicesRows || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #94a3b8;">No service data available</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Confidential Business Analytics. © ${new Date().getFullYear()} ${businessName}. All rights reserved.
        </div>

        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
