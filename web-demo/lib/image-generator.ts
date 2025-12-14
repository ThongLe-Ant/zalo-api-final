import puppeteer from 'puppeteer';
import { PriceData, PriceChange } from './price-storage';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Format số với dấu phẩy
 */
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}


/**
 * Tạo HTML template chuyên nghiệp cho ảnh giá bạc (theo mẫu Vàng bạc Hoa Vinh)
 */
export async function createPriceImageHTML(priceData: PriceData, priceChange: PriceChange, previousPrice?: PriceData | null): Promise<string> {
  const { 
    productName, 
    unit = 'Vnđ/Lượng',
    updateTime, 
    lastDate, 
    lastTime,
    allProducts 
  } = priceData;

  // Parse thời gian
  const timeParts = updateTime ? updateTime.split(' ') : (lastTime ? [lastDate, lastTime] : ['', '']);
  const updateDate = timeParts[0] || '';
  const updateTimeOnly = timeParts[1] || '';

  // Lấy đơn vị từ unit (Vnđ/Lượng -> LƯỢNG, Vnđ/Kg -> KG)
  const unitDisplay = unit.replace('Vnđ/', '').toUpperCase();

  // Đọc logo và convert sang base64
  let logoBase64 = '';
  try {
    const logoPath = join(process.cwd(), 'public', 'vinh_hoa_logo3.png');
    const logoBuffer = await readFile(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error reading logo:', error);
    // Fallback: sử dụng logo box CSS nếu không đọc được file
    logoBase64 = '';
  }

  let tableRows = '';
  
  if (allProducts && allProducts.length > 0) {
    const productsByCategory = allProducts.reduce((acc, product) => {
      const cat = product.category || 'KHÁC';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(product);
      return acc;
    }, {} as Record<string, typeof allProducts>);

    Object.entries(productsByCategory).forEach(([categoryName, products]) => {
      // Category header row
      tableRows += `
        <tr class="category-header">
          <td colspan="4" class="category-cell">${categoryName}</td>
        </tr>
      `;

      // Product rows
      products.forEach((product) => {
        const isSelected = product.productName === productName;
        const buyPriceFormatted = formatNumber(product.buyPrice);
        const sellPriceFormatted = product.sellPrice > 0 ? formatNumber(product.sellPrice) : '-';
        const productUnit = product.unit || unitDisplay;

        tableRows += `
          <tr class="${isSelected ? 'selected' : ''}">
            <td>${product.productName}</td>
            <td class="unit-cell">${productUnit}</td>
            <td class="price-buy">${buyPriceFormatted}</td>
            <td class="price-sell">${sellPriceFormatted}</td>
          </tr>
        `;
      });
    });
  }

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>Bảng giá bạc hôm nay</title>
      <style>
        /* ================= BASE ================= */
        body{
          margin:0;
          font-family:"Segoe UI",Roboto,Arial,sans-serif;
          background:#efefef;
          color:#1a1a1a;
        }
        .wrapper{
          width:720px;
          margin:0 auto;
          background:#ffffff;
          box-shadow:0 8px 24px rgba(0,0,0,.10);
        }

        /* ================= HEADER – CHUỖI VÀNG LỚN ================= */
        .header{
          display:grid;
          grid-template-columns:170px 1fr 190px;
          align-items:center;
          padding:14px 18px 15px;
          background:linear-gradient(135deg,#fff9e6,#efd07a);
          border-bottom:4px solid #8b1515;
        }
        .header-left{
          display:flex;
          flex-direction:column;
          align-items:center;
        }
        .header-left img{
          height:46px;
          display:block;
          margin-bottom:4px;
        }
        .header-left .brand{
          font-size:13px;
          font-weight:800;
          letter-spacing:.6px;
          color:#8b1515;
          text-align:center;
        }
        .header-center{
          text-align:center;
          font-size:24px;
          font-weight:900;
          letter-spacing:1.2px;
          text-transform:uppercase;
          color:#1a1a1a;
        }
        .header-right{
          text-align:right;
        }
        .header-right .time{
          font-size:32px;
          font-weight:900;
          color:#9b1111;
          line-height:1;
        }
        .header-right .date{
          font-size:12px;
          color:#333;
        }

        /* ================= TABLE ================= */
        table{
          width:100%;
          border-collapse:collapse;
        }

        thead th{
          background:#8b1515;
          color:#ffffff;
          padding:11px 10px;
          font-size:14px;
          letter-spacing:.5px;
        }
        thead th:first-child{
          text-align:left;
          padding-left:16px;
        }
        thead th:nth-child(2){
          text-align:center;
        }
        thead th:nth-child(3),
        thead th:nth-child(4){
          text-align:center;
        }
        tbody tr{
          border-bottom:1px solid rgba(0,0,0,.08);
        }
        tbody tr:nth-child(even){
          background:#fffaf0;
        }
        tbody tr.selected{
          background:#fff9e6;
        }

        tbody td{
          padding:13px 10px;
          font-size:16px;
          line-height:1.35;
        }
        tbody td:first-child{
          padding-left:16px;
          font-weight:600;
        }
        .category-header{
          background:#f0f0f0;
        }
        .category-cell{
          font-weight:bold;
          font-size:15px;
          text-align:center;
          padding:10px 15px;
          color:#1e3c72;
        }
        .unit-cell{
          text-align:center;
          color:#666;
          font-size:14px;
        }
        .price-buy{
          color:#8b1515;
          font-weight:900;
          text-align:center;
        }
        .price-sell{
          color:#1f6f43;
          font-weight:900;
          text-align:center;
        }

        /* ================= FOOTER ================= */
        .footer{
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:10px 16px 14px;
          font-size:12px;
          color:#333;
          border-top:1px solid #e6dcc0;
          background:#fffdf6;
        }
        .footer .line{
          height:1px;
          flex:1;
          background:linear-gradient(to right,#ddd,#aaa,#ddd);
          margin:0 10px;
        }
      </style>
    </head>
    <body>

      <div class="wrapper">

        <!-- HEADER -->
        <div class="header">
          <div class="header-left">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo">` : ''}
            <div class="brand">VÀNG BẠC VINH HOA</div>
          </div>
          <div class="header-center">GIÁ BẠC HÔM NAY</div>
          <div class="header-right">
            <div class="time">${updateTimeOnly}</div>
            <div class="date">Cập nhật lần cuối<br>${updateDate}</div>
          </div>
        </div>

        <!-- TABLE -->
        <table>
          <thead>
            <tr>
              <th>SẢN PHẨM</th>
              <th>ĐƠN VỊ</th>
              <th>GIÁ MUA VÀO</th>
              <th>GIÁ BÁN RA</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <!-- FOOTER -->
        <div class="footer">
          <span>Đơn giá đã bao gồm thuế GTGT</span>
          <div class="line"></div>
          <span>Niêm yết toàn hệ thống</span>
        </div>

      </div>

    </body>
    </html>
  `;
}

/**
 * Generate ảnh từ HTML template
 */
export async function generatePriceImage(priceData: PriceData, priceChange: PriceChange, previousPrice?: PriceData | null): Promise<Buffer> {
  const html = await createPriceImageHTML(priceData, priceChange, previousPrice);
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport cho portrait (720px width)
    await page.setViewport({
      width: 720,
      height: 1000,
      deviceScaleFactor: 2,
    });
    
    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });
    
    // Đợi một chút để đảm bảo render xong
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Lấy chiều cao thực tế của content
    const bodyHeight = await page.evaluate(() => {
      return document.body.scrollHeight;
    });
    
    // Take screenshot với chiều cao vừa đủ
    const screenshot = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: 720,
        height: Math.min(bodyHeight, 2000), // Giới hạn tối đa 2000px
      },
    });
    
    return screenshot as Buffer;
  } finally {
    await browser.close();
  }
}
